import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign } from '../campaigns/schemas/campaign.schema';
import { CreateDonationDto } from './dto/create-donation.dto';
import { Donation, DonationDocument, PaymentReceipt } from './schemas/donation.schema';
import { PeyService, QR_EXPIRATION_SECONDS } from './pey.service';

const duplicate=(e:unknown)=>Boolean(e && typeof e==='object' && 'code' in e && e.code===11000);
export function pesosToMinor(value:unknown):number {
  if(typeof value!=='number' || !Number.isFinite(value) || value<=0) throw new BadGatewayException('Monto recibido no válido.');
  const minor=Math.round(value*100);
  if(!Number.isSafeInteger(minor) || Math.abs(value*100-minor)>0.000001) throw new BadGatewayException('Monto recibido no válido.');
  return minor;
}
@Injectable()
export class DonationsService implements OnModuleInit {
  constructor(
    @InjectModel(Donation.name) private readonly donations:Model<Donation>,
    @InjectModel(PaymentReceipt.name) private readonly receipts:Model<PaymentReceipt>,
    @InjectModel(Campaign.name) private readonly campaigns:Model<Campaign>,
    private readonly pey:PeyService,
  ) {}

  async onModuleInit() {
    // Payment idempotency must be protected by indexes before accepting requests.
    await Promise.all([this.donations.createIndexes(), this.receipts.createIndexes()]);
  }

  private async view(d:DonationDocument,includeQr=false) {
    const payments=await this.receipts.find({donationId:d._id}).select('transactionId amountMinor status paidAt').lean().exec();
    const confirmed=payments.filter(p=>p.status==='confirmed');
    const status=confirmed.length?'confirmed':payments.some(p=>p.status==='review')?'review':d.status==='pending' && d.expiresAt.getTime()<=Date.now()?'expired':d.status==='creating' && d.expiresAt.getTime()<=Date.now()?'review':d.status;
    return {id:d.id,campaignId:d.campaignId.toString(),campaignTitle:d.campaignTitle,amountMinor:d.amountMinor,currency:d.currency,status,
      expiresAt:d.expiresAt.toISOString(),confirmedMinor:confirmed.reduce((sum,p)=>sum+p.amountMinor,0),
      payments:confirmed.map(p=>({transactionId:p.transactionId,amountMinor:p.amountMinor,paidAt:p.paidAt.toISOString()})),
      ...(includeQr && status==='pending' && d.qrImage?{qrImage:d.qrImage}:{}),
    };
  }

  async create(campaignId:Types.ObjectId,userId:string,dto:CreateDonationDto) {
    this.pey.requireConfigured();
    const query={userId:new Types.ObjectId(userId),idempotencyKey:dto.idempotencyKey};
    const existing=await this.donations.findOne(query).select('+qrImage').exec();
    if(existing) return this.sameRequest(existing,campaignId,dto);
    const campaign=await this.campaigns.findById(campaignId).exec();
    if(!campaign) throw new NotFoundException('Campaña no encontrada.');
    if(campaign.isDemo) throw new BadRequestException('Las campañas demo no reciben dinero real.');
    if(campaign.deadline.getTime()<=Date.now()) throw new BadRequestException('La campaña ha finalizado.');
    let d:DonationDocument;
    try { d=await this.donations.create({...query,campaignId,campaignTitle:campaign.title,amountMinor:dto.amountMinor,status:'creating',expiresAt:new Date(Date.now()+QR_EXPIRATION_SECONDS*1000)}); }
    catch(e) {
      if(!duplicate(e)) throw e;
      const previous=await this.donations.findOne(query).select('+qrImage').exec();
      if(!previous) throw e;
      return this.sameRequest(previous,campaignId,dto);
    }
    try {
      const qr=await this.pey.createQr(d.id,campaignId.toString(),d.amountMinor);
      // Persist correlation before rendering, so a fast webhook can find the donation.
      d.providerQrId=qr.id;d.qrString=qr.qrString;await d.save();
      d.qrImage=await this.pey.renderQr(qr.qrString);d.status='pending';await d.save();
    } catch {
      // Pey does not document a creation idempotency key. Never repeat an uncertain remote POST.
      await this.donations.updateOne({_id:d._id},{$set:{status:'review'}}).exec();
      d.status='review';
    }
    return this.view(d,true);
  }
  private sameRequest(d:DonationDocument,campaignId:Types.ObjectId,dto:CreateDonationDto) {
    if(d.amountMinor!==dto.amountMinor || !d.campaignId.equals(campaignId)) throw new ConflictException('Esta referencia ya se usó para otra aportación.');
    return this.view(d,true);
  }
  private async owned(id:Types.ObjectId,userId:string) {
    const d=await this.donations.findOne({_id:id,userId:new Types.ObjectId(userId)}).select('+qrImage').exec();
    if(!d) throw new NotFoundException('Aportación no encontrada.');return d;
  }
  async detail(id:Types.ObjectId,userId:string) { return this.view(await this.owned(id,userId),true); }
  async history(userId:string) {
    const items=await this.donations.find({userId:new Types.ObjectId(userId)}).sort({_id:-1}).limit(100).exec();
    const total=await this.receipts.aggregate([{$match:{userId:new Types.ObjectId(userId),status:'confirmed'}},{$group:{_id:null,total:{$sum:'$amountMinor'}}}]).exec();
    return {items:await Promise.all(items.map(d=>this.view(d))),confirmedMinor:total[0]?.total??0,paymentAvailable:this.pey.isConfigured()};
  }

  async reconcile(id:Types.ObjectId,userId:string) {
    return this.reconcileDonation(await this.owned(id,userId),true);
  }
  async adminReconcile(id:Types.ObjectId) {
    const d=await this.donations.findById(id).select('+qrImage').exec();
    if(!d) throw new NotFoundException('Aportación no encontrada.');
    return this.reconcileDonation(d,false);
  }
  private async reconcileDonation(d:DonationDocument,includeQr:boolean) {
    this.pey.requireConfigured();
    if(d.providerQrId) {
      let token:string|undefined;
      let pages=0;
      do {
        const result=await this.pey.transactions(d.providerQrId,token);
        if(!Array.isArray(result.items)) throw new BadGatewayException('Respuesta de conciliación no válida.');
        for(const item of result.items) if(item.status==='PAID' && typeof item.id==='string') await this.confirm(item.id,d);
        token=typeof result.nextToken==='string' && result.nextToken?result.nextToken:undefined;
        if(++pages>=10 && token) throw new BadGatewayException('Hay más pagos por conciliar. Solicita una revisión al equipo.');
      } while(token);
    }
    return this.view(d,includeQr);
  }

  async webhook(raw:Buffer|undefined,headers:Record<string,string|string[]|undefined>) {
    const payload=this.pey.verifyWebhook(raw,headers);
    if(!payload || typeof payload!=='object') throw new BadRequestException('Evento no válido.');
    const event=payload as Record<string,unknown>;
    if(event.type!=='codi.qr.payment_received') return {received:true,ignored:true};
    if(typeof event.transactionId!=='string' || !/^[a-zA-Z0-9]{10,64}$/.test(event.transactionId)) throw new BadRequestException('Referencia no válida.');
    await this.confirm(event.transactionId,undefined,typeof headers['webhook-id']==='string'?headers['webhook-id']:undefined);
    return {received:true};
  }

  private async confirm(transactionId:string,expected?:DonationDocument,webhookId?:string) {
    const tx=await this.pey.transaction(transactionId);
    if(tx.id!==transactionId || tx.status!=='PAID' || tx.currency!=='MXN' || tx.paymentMethod!=='CODI' || tx.payableType!=='API_CODI_QR' || !tx.payableId) throw new BadRequestException('La transacción no corresponde a un pago QR CoDi confirmado.');
    const external=tx.metadata?.externalMetadata;
    const donationId=external?.donationId;
    if(!donationId || !/^[a-f0-9]{24}$/i.test(donationId)) return; // Another application may share this Pey API key.
    const d=expected ?? await this.donations.findById(donationId).exec();
    if(!d) return;
    if(d.id!==donationId || (d.providerQrId && d.providerQrId!==tx.payableId) || external?.campaignId!==d.campaignId.toString()) throw new BadRequestException('El pago no corresponde a esta aportación.');
    const amountMinor=pesosToMinor(tx.amountBreakdown?.base ?? tx.amount);
    if(typeof tx.datePaid!=='number' || !Number.isFinite(tx.datePaid) || tx.datePaid<=0 || !Number.isFinite(new Date(tx.datePaid*1000).getTime())) throw new BadGatewayException('Fecha de pago no válida.');
    const entry={transactionId,donationId:d._id,campaignId:d.campaignId,userId:d.userId,amountMinor,
      status:amountMinor===d.amountMinor?'confirmed':'review',
      ...(amountMinor!==d.amountMinor?{reviewReason:'amount_mismatch'}:{}),
      paidAt:new Date(tx.datePaid*1000),...(webhookId?{webhookId}:{}),
    };
    try { await this.receipts.updateOne({transactionId},{$setOnInsert:entry},{upsert:true}).exec(); }
    catch(e) { if(!duplicate(e)) throw e; }
  }
}
