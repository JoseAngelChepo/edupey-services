import { BadGatewayException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'standardwebhooks';
import * as QRCode from 'qrcode';

export type PeyTransaction = {
  id:string; status:string; amount:number; currency:string; paymentMethod:string;
  payableType?:string; payableId?:string; datePaid?:number;
  amountBreakdown?:{base?:number}; metadata?:{externalMetadata?:Record<string,string>};
};
export const QR_EXPIRATION_SECONDS = 900;
@Injectable()
export class PeyService {
  constructor(private readonly config:ConfigService) {}
  isConfigured() { return Boolean(this.config.get<string>('PEY_API_KEY')?.trim() && this.config.get<string>('PEY_WEBHOOK_SECRET')?.trim()); }
  requireConfigured() { if(!this.isConfigured()) throw new ServiceUnavailableException('Las donaciones con CoDi aún no están habilitadas.'); }

  private async request<T>(path:string, body?:unknown):Promise<T> {
    this.requireConfigured();
    let response:Response;
    try {
      response=await fetch(`https://api.pey.mx${path}`,{
        method:body===undefined?'GET':'POST',
        headers:{Authorization:`Bearer ${this.config.get<string>('PEY_API_KEY')!.trim()}`,'Content-Type':'application/json'},
        ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000),redirect:'error',
      });
    } catch { throw new BadGatewayException('No pudimos comunicarnos con Pey. Revisa el estado de tu aportación antes de volver a intentar.'); }
    if(!response.ok) throw new BadGatewayException('Pey no pudo procesar la solicitud. Intenta consultar el estado más tarde.');
    try { return await response.json() as T; } catch { throw new BadGatewayException('Pey devolvió una respuesta no válida.'); }
  }

  async createQr(donationId:string,campaignId:string,amountMinor:number) {
    const bankAccountId=this.config.get<string>('PEY_BANK_ACCOUNT_ID')?.trim();
    const result=await this.request<{id:string;qrString:string}>('/codi/qr',{
      amount:amountMinor/100,concept:`EduPey ${donationId.slice(-8)}`,expiration:QR_EXPIRATION_SECONDS,
      generateImage:false,...(bankAccountId?{bankAccountId}:{}),metadata:{donationId,campaignId},
    });
    if(!result || typeof result.id!=='string' || !result.id || result.id.length>128 || typeof result.qrString!=='string' || !result.qrString || result.qrString.length>20000) throw new BadGatewayException('Pey no devolvió un QR válido.');
    return result;
  }
  renderQr(payload:string) { return QRCode.toDataURL(payload,{type:'image/png',width:480,margin:4,errorCorrectionLevel:'M'}); }
  transaction(id:string) { return this.request<PeyTransaction>(`/transaction/${encodeURIComponent(id)}`); }
  transactions(qrId:string,nextToken?:string) {
    const query=nextToken?`?nextToken=${encodeURIComponent(nextToken)}`:'';
    return this.request<{items:PeyTransaction[];nextToken?:string|null}>(`/transaction/codi/qr/${encodeURIComponent(qrId)}${query}`);
  }

  verifyWebhook(raw:Buffer|undefined,headers:Record<string,string|string[]|undefined>):unknown {
    this.requireConfigured();
    if(!raw) throw new UnauthorizedException('Cuerpo de webhook no disponible.');
    const signatureHeaders:Record<string,string>={};
    for(const key of ['webhook-id','webhook-timestamp','webhook-signature']) {
      const value=headers[key];if(typeof value!=='string') throw new UnauthorizedException('Firma de webhook no válida.');
      signatureHeaders[key]=value;
    }
    try { return new Webhook(this.config.get<string>('PEY_WEBHOOK_SECRET')!.trim()).verify(raw.toString('utf8'),signatureHeaders); }
    catch { throw new UnauthorizedException('Firma de webhook no válida o expirada.'); }
  }
}
