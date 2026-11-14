import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign, CampaignDocument, CampaignFollow } from './schemas/campaign.schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(Campaign.name) private readonly campaigns: Model<Campaign>,
    @InjectModel(CampaignFollow.name) private readonly follows: Model<CampaignFollow>,
  ) {}

  private view(c: CampaignDocument) {
    return {
      id: c.id, title: c.title, summary: c.summary, description: c.description,
      category: c.category, goalMinor: c.goalMinor, currency: c.currency,
      beneficiaryCount: c.beneficiaryCount, learningGoal: c.learningGoal,
      selectionCriteria: c.selectionCriteria, insufficientFundsPolicy: c.insufficientFundsPolicy,
      surplusPolicy: c.surplusPolicy, deadline: c.deadline.toISOString(), budget: c.budget,
      isDemo: c.isDemo,
      // No payment integration yet: never accept financial totals from a browser.
      raisedMinor: 0, paymentAvailable: false,
      status: c.deadline.getTime() <= Date.now() ? 'closed' : 'open',
    };
  }

  async list() {
    return (await this.campaigns.find().sort({ _id: -1 }).limit(100).exec()).map(c => this.view(c));
  }

  async detail(id: Types.ObjectId) {
    const campaign = await this.campaigns.findById(id).exec();
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return this.view(campaign);
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
    return { campaigns: campaigns.map(c => this.view(c)), paymentAvailable: false };
  }
}
