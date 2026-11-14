import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign, CampaignDocument, CampaignFollow } from './schemas/campaign.schema';
import { PeyService } from '../donations/pey.service';
import { PaymentReceipt } from '../donations/schemas/donation.schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(Campaign.name) private readonly campaigns: Model<Campaign>,
    @InjectModel(CampaignFollow.name) private readonly follows: Model<CampaignFollow>,
    @InjectModel(PaymentReceipt.name) private readonly receipts: Model<PaymentReceipt>,
    private readonly pey: PeyService,
  ) {}

  private view(c: CampaignDocument, raisedMinor = 0) {
    return {
      id: c.id, title: c.title, summary: c.summary, description: c.description,
      category: c.category, goalMinor: c.goalMinor, currency: c.currency,
      beneficiaryCount: c.beneficiaryCount, learningGoal: c.learningGoal,
      selectionCriteria: c.selectionCriteria, insufficientFundsPolicy: c.insufficientFundsPolicy,
      surplusPolicy: c.surplusPolicy, deadline: c.deadline.toISOString(), budget: c.budget,
      isDemo: c.isDemo,
      // Canonical verified receipts avoid duplicate counters across webhook retries.
      raisedMinor,
      paymentAvailable: this.pey.isConfigured() && !c.isDemo && c.deadline.getTime() > Date.now(),
      status: c.deadline.getTime() <= Date.now() ? 'closed' : 'open',
    };
  }

  private async views(campaigns: CampaignDocument[]) {
    if (!campaigns.length) return [];
    const totals = await this.receipts.aggregate([
      {$match:{campaignId:{$in:campaigns.map(c=>c._id)},status:'confirmed'}},
      {$group:{_id:'$campaignId',total:{$sum:'$amountMinor'}}},
    ]).exec();
    const byId = new Map(totals.map(t=>[String(t._id),t.total as number]));
    return campaigns.map(c=>this.view(c,byId.get(String(c._id))??0));
  }
  async list() {
    return this.views(await this.campaigns.find().sort({ _id: -1 }).limit(100).exec());
  }

  async detail(id: Types.ObjectId) {
    const campaign = await this.campaigns.findById(id).exec();
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return (await this.views([campaign]))[0];
  }

  async create(dto: CreateCampaignDto, actorId: string) {
    if (new Date(dto.deadline).getTime() <= Date.now()) {
      throw new BadRequestException('La fecha límite debe estar en el futuro');
    }
    if (dto.budget.reduce((sum, item) => sum + item.amountMinor, 0) !== dto.goalMinor) {
      throw new BadRequestException('El presupuesto debe sumar exactamente la meta');
    }
    return this.view(await this.campaigns.create({ ...dto, createdBy: new Types.ObjectId(actorId) }));
  }

  async follow(id: Types.ObjectId, actorId: string) {
    await this.detail(id);
    const query = { userId: new Types.ObjectId(actorId), campaignId: id };
    try {
      await this.follows.updateOne(query, { $setOnInsert: query }, { upsert: true }).exec();
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
    }
    return { following: true };
  }

  async unfollow(id: Types.ObjectId, actorId: string) {
    await this.follows.deleteOne({ userId: new Types.ObjectId(actorId), campaignId: id }).exec();
    return { following: false };
  }

  async dashboard(actorId: string) {
    const follows = await this.follows.find({ userId: new Types.ObjectId(actorId) }).exec();
    const campaigns = await this.campaigns.find({ _id: { $in: follows.map(f => f.campaignId) } }).sort({ _id: -1 }).exec();
    return { campaigns: await this.views(campaigns), paymentAvailable: this.pey.isConfigured() };
  }
}
