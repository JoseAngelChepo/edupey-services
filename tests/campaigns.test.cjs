const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { CampaignsService } = require('../dist/campaigns/campaigns.service');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { CreateCampaignDto } = require('../dist/campaigns/dto/create-campaign.dto');
const valid = () => ({title:'Una oportunidad educativa',summary:'Una campaña para un taller educativo.',description:'Un taller educativo con seguimiento y revisión humana.',category:'scholarship',goalMinor:10000,beneficiaryCount:2,learningGoal:'Practicar sumas y restas.',selectionCriteria:'Revisión del progreso con facilitador.',insufficientFundsPolicy:'Ajustar alcance con autorización.',surplusPolicy:'Ampliar las plazas del programa.',deadline:new Date(Date.now()+86400000).toISOString(),budget:[{label:'Inscripciones',amountMinor:10000}]});
test('rejects fractional money, unknown category, and malformed nested budgets', async () => {
 for(const patch of [{goalMinor:1.5},{category:'cash'},{budget:[{label:'x',amountMinor:-1}]}]){
  const errors=await validate(plainToInstance(CreateCampaignDto,{...valid(),...patch}));assert.ok(errors.length);
 }
 assert.equal((await validate(plainToInstance(CreateCampaignDto,valid()))).length,0);
});
test('rejects inconsistent budgets before persisting',async()=>{
 const service=new CampaignsService({create(){throw Error('must not write');}},{});
 await assert.rejects(service.create({...valid(),goalMinor:20000},'000000000000000000000001'),/presupuesto/);
});
test('rejects expired deadlines before persisting',async()=>{
 const service=new CampaignsService({create(){throw Error('must not write');}},{});
 await assert.rejects(service.create({...valid(),deadline:'2020-01-01T00:00:00Z'},'000000000000000000000001'),/futuro/);
});
test('campaign output does not expose creator or fabricate donations',async()=>{
 const fixture={...valid(),id:'000000000000000000000002',deadline:new Date(Date.now()+86400000),createdBy:'private',currency:'MXN',isDemo:false};
 const service=new CampaignsService({findById(){return{exec:async()=>fixture};}},{});
 const view=await service.detail(fixture.id);assert.equal(view.raisedMinor,0);assert.equal(view.paymentAvailable,false);assert.equal('createdBy' in view,false);
});
