const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {Types}=require('mongoose');
const {AdminService}=require('../dist/admin/admin.service');

const chain=value=>({exec:async()=>value,select(){return this},lean(){return this},sort(){return this},skip(){return this},limit(){return this}});
function donation(patch={}){
  const _id=new Types.ObjectId();
  return{_id,id:String(_id),userId:new Types.ObjectId(),campaignId:new Types.ObjectId(),campaignTitle:'Campaña admin',amountMinor:5000,currency:'MXN',status:'pending',expiresAt:new Date(Date.now()+900000),providerQrId:'QR-ADMIN',...patch};
}
function fixture(d,receipts=[],users=[]){
  const donations={
    findById:(id)=>chain(String(id)===String(d._id)?d:null),
    find:()=>chain([d]),
    countDocuments:()=>chain(1),
    aggregate:()=>chain([{_id:'pending',count:1}]),
  };
  const receiptModel={
    find:()=>chain(receipts),
    countDocuments:(filter)=>chain(receipts.filter(r=>!filter?.status||r.status===filter.status).length),
    aggregate:(pipeline)=>chain(pipeline.some(s=>s.$match?.status==='confirmed')
      ?[{total:receipts.filter(r=>r.status==='confirmed').reduce((s,r)=>s+r.amountMinor,0)}]
      :[{_id:'confirmed',count:receipts.filter(r=>r.status==='confirmed').length},{_id:'review',count:receipts.filter(r=>r.status==='review').length}]),
    distinct:async()=>receipts.filter(r=>r.status==='review').map(r=>r.donationId),
  };
  const campaigns={countDocuments:()=>chain(2)};
  const userModel={
    findById:(id)=>chain(users.find(u=>String(u._id)===String(id))??null),
    find:()=>chain(users),
  };
  const donationsService={adminReconcile:async()=>({id:d.id,status:'confirmed'})};
  const pey={isConfigured:()=>true};
  return{service:new AdminService(donations,receiptModel,campaigns,userModel,donationsService,pey),d};
}

test('admin donation detail includes donor and review receipts without QR payloads',async()=>{
  const d=donation();
  const user={_id:d.userId,email:'ops@edupey.test',username:'ops',firstName:'Ops',lastName:'Admin'};
  const receipts=[{transactionId:'01REVIEW',amountMinor:1000,status:'review',reviewReason:'amount_mismatch',paidAt:new Date(),donationId:d._id,campaignId:d.campaignId,userId:d.userId}];
  const {service}=fixture(d,receipts,[user]);
  const detail=await service.donation(d._id);
  assert.equal(detail.status,'review');
  assert.equal(detail.donor.email,'ops@edupey.test');
  assert.equal(detail.payments[0].reviewReason,'amount_mismatch');
  assert.equal(detail.providerQrId,'QR-ADMIN');
  assert.equal('qrImage' in detail,false);
  assert.equal('qrString' in detail,false);
});

test('admin overview reports confirmed totals and review attention count',async()=>{
  const d=donation();
  const receipts=[
    {transactionId:'01OK',amountMinor:5000,status:'confirmed',paidAt:new Date(),donationId:d._id,campaignId:d.campaignId,userId:d.userId},
    {transactionId:'01REV',amountMinor:100,status:'review',paidAt:new Date(),donationId:d._id,campaignId:d.campaignId,userId:d.userId},
  ];
  const {service}=fixture(d,receipts);
  const overview=await service.overview();
  assert.equal(overview.paymentAvailable,true);
  assert.equal(overview.receipts.confirmedMinor,5000);
  assert.equal(overview.receipts.needingAttention,1);
  assert.equal(overview.campaigns.openNonDemo,2);
});

test('admin reconcile returns refreshed operational detail',async()=>{
  const d=donation({status:'pending'});
  const user={_id:d.userId,email:'donor@edupey.test',username:'donor',firstName:'Don',lastName:'Ante'};
  const {service}=fixture(d,[], [user]);
  let called=false;
  service['donationsService'].adminReconcile=async(id)=>{called=true;assert.equal(String(id),String(d._id));return{};};
  const result=await service.reconcileDonation(d._id);
  assert.equal(called,true);
  assert.equal(result.id,d.id);
  assert.equal(result.donor.email,'donor@edupey.test');
});
