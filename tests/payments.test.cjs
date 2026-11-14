const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {Types}=require('mongoose');
const {Webhook}=require('standardwebhooks');
const {PeyService}=require('../dist/donations/pey.service');
const {DonationsService,pesosToMinor}=require('../dist/donations/donations.service');
const secret='whsec_'+Buffer.alloc(32,7).toString('base64');
const config={get:key=>({PEY_API_KEY:'fixture-key',PEY_WEBHOOK_SECRET:secret,PEY_BANK_ACCOUNT_ID:'fixture-bank'}[key])};
const chain=value=>({exec:async()=>value,select(){return this},lean(){return this},sort(){return this},limit(){return this}});
function donation(){const _id=new Types.ObjectId();return{_id,id:String(_id),userId:new Types.ObjectId(),campaignId:new Types.ObjectId(),campaignTitle:'Fixture campaign',amountMinor:10001,currency:'MXN',status:'pending',expiresAt:new Date(Date.now()+900000),providerQrId:'QR-FIXTURE',save:async function(){return this}}}
function transaction(d,patch={}){return{id:'01JTXN00000000000000000000',status:'PAID',amount:100.01,currency:'MXN',paymentMethod:'CODI',payableType:'API_CODI_QR',payableId:d.providerQrId,datePaid:Math.floor(Date.now()/1000),metadata:{externalMetadata:{donationId:d.id,campaignId:String(d.campaignId)}},...patch}}
function fixture(d,tx){
 const entries=new Map();
 const receipts={find:()=>chain([...entries.values()]),updateOne:(query,update)=>({exec:async()=>{if(!entries.has(query.transactionId))entries.set(query.transactionId,update.$setOnInsert)}})};
 const pey={requireConfigured(){},isConfigured:()=>true,verifyWebhook:()=>({type:'codi.qr.payment_received',transactionId:tx.id}),transaction:async()=>tx};
 const donations={findById:()=>chain(d),findOne:query=>chain(String(query.userId)===String(d.userId)?d:null)};
 return{entries,pey,donations,service:new DonationsService(donations,receipts,{},pey)};
}

test('Pey QR uses exact pesos, server metadata and authenticated request; render PNG locally',async t=>{
 let captured;
 t.mock.method(global,'fetch',async(url,options)=>{captured={url,options};return new Response(JSON.stringify({id:'QR-FIXTURE',qrString:'fixture-not-a-payable-codi-qr'}),{status:201})});
 const pey=new PeyService(config);const qr=await pey.createQr('donation-1','campaign-1',10001);
 assert.equal(captured.url,'https://api.pey.mx/codi/qr');assert.equal(captured.options.headers.Authorization,'Bearer fixture-key');
 const body=JSON.parse(captured.options.body);assert.equal(body.amount,100.01);assert.equal(body.expiration,900);assert.equal(body.generateImage,false);assert.equal(body.bankAccountId,'fixture-bank');assert.deepEqual(body.metadata,{donationId:'donation-1',campaignId:'campaign-1'});
 assert.match(await pey.renderQr(qr.qrString),/^data:image\/png;base64,/);
});
test('Standard Webhooks accepts signed raw body and rejects tampering, stale timestamps and missing body',()=>{
 const pey=new PeyService(config),wh=new Webhook(secret),payload='{"type":"fixture"}',now=new Date();
 const headers={'webhook-id':'msg-fixture','webhook-timestamp':String(Math.floor(now.getTime()/1000)),'webhook-signature':wh.sign('msg-fixture',now,payload)};
 assert.deepEqual(pey.verifyWebhook(Buffer.from(payload),headers),{type:'fixture'});
 assert.throws(()=>pey.verifyWebhook(Buffer.from(payload+' '),headers),/Firma/);
 assert.throws(()=>pey.verifyWebhook(undefined,headers),/Cuerpo/);
 const old=new Date(Date.now()-600000);assert.throws(()=>pey.verifyWebhook(Buffer.from(payload),{...headers,'webhook-timestamp':String(Math.floor(old.getTime()/1000)),'webhook-signature':wh.sign('msg-fixture',old,payload)}),/Firma/);
});
test('disabled configuration prevents network calls',async()=>{
 const pey=new PeyService({get:()=>''});assert.equal(pey.isConfigured(),false);
 await assert.rejects(pey.createQr('d','c',1),/habilitadas/);
});
test('same transaction delivered repeatedly creates one confirmed receipt',async()=>{
 const d=donation(),f=fixture(d,transaction(d));
 await f.service.webhook(Buffer.from('{}'),{'webhook-id':'first'});await f.service.webhook(Buffer.from('{}'),{'webhook-id':'second'});
 assert.equal(f.entries.size,1);assert.equal([...f.entries.values()][0].status,'confirmed');assert.equal([...f.entries.values()][0].amountMinor,10001);
 const result=await f.service.detail(d._id,String(d.userId));assert.equal(result.status,'confirmed');assert.equal(result.confirmedMinor,10001);
});
test('multiple genuine payments are counted once each, not once per webhook',async()=>{
 const d=donation(),tx=transaction(d),f=fixture(d,tx);
 await f.service.webhook(Buffer.from('{}'),{});tx.id='01JTXN00000000000000000001';await f.service.webhook(Buffer.from('{}'),{});await f.service.webhook(Buffer.from('{}'),{});
 assert.equal(f.entries.size,2);assert.equal((await f.service.detail(d._id,String(d.userId))).confirmedMinor,20002);
});
test('wrong amount is held for review and excluded from confirmed totals',async()=>{
 const d=donation(),f=fixture(d,transaction(d,{amount:10}));await f.service.webhook(Buffer.from('{}'),{});
 const result=await f.service.detail(d._id,String(d.userId));assert.equal(result.status,'review');assert.equal(result.confirmedMinor,0);assert.equal([...f.entries.values()][0].reviewReason,'amount_mismatch');
});
test('wrong QR, campaign, currency, unpaid status or transaction ID cannot confirm',async()=>{
 for(const key of ['qr','campaign','currency','pending','id']){
  const d=donation(),tx=transaction(d),f=fixture(d,tx);
  if(key==='qr')tx.payableId='OTHER-QR';if(key==='campaign')tx.metadata.externalMetadata.campaignId=String(new Types.ObjectId());if(key==='currency')tx.currency='USD';if(key==='pending')tx.status='PENDING';if(key==='id')f.pey.transaction=async()=>({...tx,id:'DIFFERENT'});
  await assert.rejects(f.service.webhook(Buffer.from('{}'),{}));assert.equal(f.entries.size,0);
 }
});
test('late verified payments remain confirmed despite expired QR',async()=>{
 const d=donation();d.expiresAt=new Date(Date.now()-1000);const f=fixture(d,transaction(d));await f.service.webhook(Buffer.from('{}'),{});assert.equal((await f.service.detail(d._id,String(d.userId))).status,'confirmed');
});
test('another user cannot inspect a donation or its QR',async()=>{
 const d=donation(),f=fixture(d,transaction(d));await assert.rejects(f.service.detail(d._id,String(new Types.ObjectId())),/no encontrada/);
});
test('demo and closed campaigns cannot generate a real QR',async()=>{
 for(const campaign of [{isDemo:true,deadline:new Date(Date.now()+10000)},{isDemo:false,deadline:new Date(Date.now()-10000)}]){
  const service=new DonationsService({findOne:()=>chain(null)}, {},{findById:()=>chain(campaign)},{requireConfigured(){},createQr(){throw Error('must not call Pey')}});
  await assert.rejects(service.create(new Types.ObjectId(),String(new Types.ObjectId()),{amountMinor:1,idempotencyKey:'test'}),/demo|finalizado/);
 }
});
test('uncertain QR creation is persisted for review and never remotely retried under same key',async()=>{
 const d=donation();d.status='creating';let stored=null,calls=0;
 const service=new DonationsService({findOne:()=>chain(stored),create:async()=>{stored=d;return d},updateOne:()=>chain(null)},{find:()=>chain([])},{findById:()=>chain({title:'Real campaign',isDemo:false,deadline:new Date(Date.now()+10000)})},{requireConfigured(){},createQr:async()=>{calls++;throw Error('timeout')}});
 const dto={amountMinor:d.amountMinor,idempotencyKey:'fixture'};
 assert.equal((await service.create(d.campaignId,String(d.userId),dto)).status,'review');
 assert.equal((await service.create(d.campaignId,String(d.userId),dto)).status,'review');assert.equal(calls,1);
 await assert.rejects(service.create(d.campaignId,String(d.userId),{...dto,amountMinor:1}),/referencia/);
});
test('money conversion preserves cents and rejects invalid amounts',()=>{
 assert.equal(pesosToMinor(0.01),1);assert.equal(pesosToMinor(100.01),10001);
 for(const value of [-1,0,NaN,Infinity,0.001,'100'])assert.throws(()=>pesosToMinor(value));
});
test('manual reconciliation follows Pey pagination and checks every paid transaction',async()=>{
 const d=donation(),tx=transaction(d),f=fixture(d,tx);let calls=0;
 f.pey.transactions=async(id,token)=>{assert.equal(id,d.providerQrId);calls++;return token?{items:[tx],nextToken:null}:{items:[],nextToken:'next-fixture'}};
 const result=await f.service.reconcile(d._id,String(d.userId));assert.equal(calls,2);assert.equal(result.status,'confirmed');assert.equal(result.confirmedMinor,10001);
});
