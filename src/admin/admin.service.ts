import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Campaign } from '../campaigns/schemas/campaign.schema';
import { DonationsService } from '../donations/donations.service';
import { Donation, DonationDocument, PaymentReceipt } from '../donations/schemas/donation.schema';
import { PeyService } from '../donations/pey.service';
import { User } from '../users/schemas/user.schema';
import { AdminListDonationsQueryDto } from './dto/admin-list-donations-query.dto';
import { AdminListReceiptsQueryDto } from './dto/admin-list-receipts-query.dto';

type ReceiptLean = {
  transactionId: string;
  amountMinor: number;
  status: string;
  reviewReason?: string;
  webhookId?: string;
  paidAt: Date;
  donationId: Types.ObjectId;
  campaignId: Types.ObjectId;
  userId: Types.ObjectId;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Donation.name) private readonly donations: Model<Donation>,
    @InjectModel(PaymentReceipt.name) private readonly receipts: Model<PaymentReceipt>,
    @InjectModel(Campaign.name) private readonly campaigns: Model<Campaign>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly donationsService: DonationsService,
    private readonly pey: PeyService,
  ) {}

  private computeStatus(
    d: Pick<DonationDocument, 'status' | 'expiresAt'>,
    payments: Array<{ status: string }>,
  ) {
    if (payments.some((p) => p.status === 'confirmed')) return 'confirmed';
    if (payments.some((p) => p.status === 'review')) return 'review';
    if (d.status === 'pending' && d.expiresAt.getTime() <= Date.now()) return 'expired';
    if (d.status === 'creating' && d.expiresAt.getTime() <= Date.now()) return 'review';
    return d.status;
  }

  private donorView(user: {
    _id: Types.ObjectId;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
  } | null) {
    if (!user) return null;
    return {
      id: String(user._id),
      email: user.email,
      username: user.username ?? '',
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  private receiptView(p: ReceiptLean) {
    return {
      transactionId: p.transactionId,
      amountMinor: p.amountMinor,
      status: p.status,
      ...(p.reviewReason ? { reviewReason: p.reviewReason } : {}),
      ...(p.webhookId ? { webhookId: p.webhookId } : {}),
      paidAt: p.paidAt.toISOString(),
      donationId: String(p.donationId),
      campaignId: String(p.campaignId),
      userId: String(p.userId),
    };
  }

  private async donationDetail(d: DonationDocument) {
    const [payments, user] = await Promise.all([
      this.receipts
        .find({ donationId: d._id })
        .select('transactionId amountMinor status reviewReason webhookId paidAt donationId campaignId userId')
        .lean<ReceiptLean[]>()
        .exec(),
      this.users
        .findById(d.userId)
        .select('email username firstName lastName')
        .lean()
        .exec(),
    ]);
    const confirmed = payments.filter((p) => p.status === 'confirmed');
    const status = this.computeStatus(d, payments);
    return {
      id: d.id,
      campaignId: d.campaignId.toString(),
      campaignTitle: d.campaignTitle,
      amountMinor: d.amountMinor,
      currency: d.currency,
      status,
      rawStatus: d.status,
      expiresAt: d.expiresAt.toISOString(),
      confirmedMinor: confirmed.reduce((sum, p) => sum + p.amountMinor, 0),
      providerQrId: d.providerQrId,
      donor: this.donorView(user),
      payments: payments.map((p) => this.receiptView(p)),
    };
  }

  async overview() {
    const now = new Date();
    const [
      donationCounts,
      receiptCounts,
      confirmedMinor,
      reviewReceipts,
      openCampaigns,
      campaignRaised,
    ] = await Promise.all([
      this.donations.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.receipts.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.receipts.aggregate<{ total: number }>([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amountMinor' } } },
      ]).exec(),
      this.receipts.countDocuments({ status: 'review' }).exec(),
      this.campaigns.countDocuments({ deadline: { $gt: now }, isDemo: false }).exec(),
      this.receipts.aggregate<{ total: number }>([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amountMinor' } } },
      ]).exec(),
    ]);
    const byDonation = Object.fromEntries(donationCounts.map((row) => [row._id, row.count]));
    const byReceipt = Object.fromEntries(receiptCounts.map((row) => [row._id, row.count]));
    return {
      paymentAvailable: this.pey.isConfigured(),
      donations: {
        creating: byDonation.creating ?? 0,
        pending: byDonation.pending ?? 0,
        failed: byDonation.failed ?? 0,
        review: byDonation.review ?? 0,
      },
      receipts: {
        confirmed: byReceipt.confirmed ?? 0,
        review: byReceipt.review ?? 0,
        confirmedMinor: confirmedMinor[0]?.total ?? 0,
        needingAttention: reviewReceipts,
      },
      campaigns: {
        openNonDemo: openCampaigns,
        raisedMinor: campaignRaised[0]?.total ?? 0,
      },
    };
  }

  async listDonations(query: AdminListDonationsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const filter: FilterQuery<DonationDocument> = {};
    if (query.campaignId) filter.campaignId = new Types.ObjectId(query.campaignId);

    if (query.status === 'confirmed' || query.status === 'expired') {
      // Computed statuses need a second pass; pull a bounded window then filter.
      const candidates = await this.donations
        .find(filter)
        .sort({ _id: -1 })
        .limit(500)
        .exec();
      const views = await Promise.all(candidates.map((d) => this.donationDetail(d)));
      const matched = views.filter((item) => item.status === query.status);
      return {
        items: matched.slice(skip, skip + limit),
        total: matched.length,
        page,
        limit,
      };
    }

    if (query.status === 'review') {
      const reviewDonationIds = await this.receipts.distinct('donationId', { status: 'review' });
      filter.$or = [{ status: 'review' }, { _id: { $in: reviewDonationIds } }];
    } else if (query.status) {
      filter.status = query.status;
    }

    if (query.search?.trim()) {
      const rx = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const donors = await this.users
        .find({ $or: [{ email: rx }, { username: rx }, { firstName: rx }, { lastName: rx }] })
        .select('_id')
        .lean()
        .exec();
      filter.$and = [
        ...(filter.$and ?? []),
        {
          $or: [
            { campaignTitle: rx },
            { providerQrId: rx },
            { userId: { $in: donors.map((u) => u._id) } },
            ...(Types.ObjectId.isValid(query.search.trim())
              ? [{ _id: new Types.ObjectId(query.search.trim()) }]
              : []),
          ],
        },
      ];
    }

    const [docs, total] = await Promise.all([
      this.donations.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).exec(),
      this.donations.countDocuments(filter).exec(),
    ]);
    return {
      items: await Promise.all(docs.map((d) => this.donationDetail(d))),
      total,
      page,
      limit,
    };
  }

  async donation(id: Types.ObjectId) {
    const d = await this.donations.findById(id).exec();
    if (!d) throw new NotFoundException('Aportación no encontrada.');
    return this.donationDetail(d);
  }

  async listReceipts(query: AdminListReceiptsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const filter: FilterQuery<PaymentReceipt> = {};
    if (query.status) filter.status = query.status;
    if (query.campaignId) filter.campaignId = new Types.ObjectId(query.campaignId);
    if (query.donationId) filter.donationId = new Types.ObjectId(query.donationId);

    const [docs, total] = await Promise.all([
      this.receipts
        .find(filter)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean<ReceiptLean[]>()
        .exec(),
      this.receipts.countDocuments(filter).exec(),
    ]);
    return {
      items: docs.map((p) => this.receiptView(p)),
      total,
      page,
      limit,
    };
  }

  async reconcileDonation(id: Types.ObjectId) {
    await this.donationsService.adminReconcile(id);
    return this.donation(id);
  }
}
