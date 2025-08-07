import { Document } from 'mongoose';

// Payment Status Enums
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled'
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  OVERDUE = 'overdue',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  CASH = 'cash',
  CHECK = 'check'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  PAUSED = 'paused'
}

export enum TaxType {
  SALES_TAX = 'sales_tax',
  VAT = 'vat',
  GST = 'gst',
  EXEMPT = 'exempt'
}

export enum BillingInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

// Core Payment Interfaces
export interface IInvoice extends Document {
  invoiceNumber: string;
  customerId: string; // Reference to Contact/Company
  companyId?: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  currency: string;
  lineItems: IInvoiceLineItem[];
  taxDetails: ITaxDetail[];
  paymentTerms?: string;
  notes?: string;
  publicNotes?: string;
  privateNotes?: string;
  recurringInvoiceId?: string;
  templateId?: string;
  pdfPath?: string;
  lastSentDate?: Date;
  viewedDate?: Date;
  remindersSent: IReminderLog[];
  metadata?: Record<string, any>;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productId?: string;
  serviceId?: string;
  taxable: boolean;
  discountPercent?: number;
  discountAmount?: number;
}

export interface ITaxDetail {
  taxType: TaxType;
  taxRate: number;
  taxAmount: number;
  taxableAmount: number;
  description: string;
}

export interface IPayment extends Document {
  paymentId: string;
  invoiceId?: string;
  customerId: string;
  companyId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethodType;
  paymentMethodId?: string; // Stripe payment method ID
  transactionId?: string; // External transaction ID
  stripePaymentIntentId?: string;
  paymentDate: Date;
  description?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  refunds: IRefund[];
  fees?: IPaymentFee[];
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefund extends Document {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: 'pending' | 'completed' | 'failed';
  stripeRefundId?: string;
  processedDate?: Date;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
}

export interface IPaymentFee {
  type: 'processing' | 'transaction' | 'other';
  amount: number;
  description: string;
}

export interface IPaymentMethod extends Document {
  customerId: string;
  type: PaymentMethodType;
  isDefault: boolean;
  stripePaymentMethodId?: string;
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  bankName?: string;
  bankAccountLast4?: string;
  billingAddress?: IAddress;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ISubscription extends Document {
  subscriptionId: string;
  customerId: string;
  companyId?: string;
  planId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  cancelAt?: Date;
  endedAt?: Date;
  billingInterval: BillingInterval;
  amount: number;
  currency: string;
  quantity: number;
  metadata?: Record<string, any>;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuote extends Document {
  quoteNumber: string;
  customerId: string;
  companyId?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  issueDate: Date;
  expirationDate: Date;
  acceptedDate?: Date;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  currency: string;
  lineItems: IInvoiceLineItem[];
  taxDetails: ITaxDetail[];
  terms?: string;
  notes?: string;
  publicNotes?: string;
  privateNotes?: string;
  templateId?: string;
  pdfPath?: string;
  convertedInvoiceId?: string;
  metadata?: Record<string, any>;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReminderLog {
  sentDate: Date;
  type: 'first_reminder' | 'second_reminder' | 'final_notice';
  recipientEmail: string;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
}

// Tax Configuration
export interface ITaxRate extends Document {
  name: string;
  rate: number;
  type: TaxType;
  region?: string;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Financial Reports
export interface IFinancialSummary {
  totalRevenue: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalRefunded: number;
  paidInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  averagePaymentTime: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
}

export interface IRevenueReport {
  date: Date;
  revenue: number;
  invoiceCount: number;
  averageInvoiceValue: number;
}

// API Request/Response Types
export interface CreateInvoiceRequest {
  customerId: string;
  companyId?: string;
  dueDate: Date;
  lineItems: Omit<IInvoiceLineItem, 'id' | 'totalPrice'>[];
  taxRate?: number;
  discountAmount?: number;
  paymentTerms?: string;
  notes?: string;
  publicNotes?: string;
  privateNotes?: string;
  currency?: string;
}

export interface CreatePaymentRequest {
  invoiceId?: string;
  customerId: string;
  amount: number;
  paymentMethodId: string;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionRequest {
  customerId: string;
  planId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  quantity?: number;
  metadata?: Record<string, any>;
}

export interface CreateQuoteRequest {
  customerId: string;
  companyId?: string;
  expirationDate: Date;
  lineItems: Omit<IInvoiceLineItem, 'id' | 'totalPrice'>[];
  taxRate?: number;
  discountAmount?: number;
  terms?: string;
  notes?: string;
  publicNotes?: string;
  privateNotes?: string;
  currency?: string;
}

export interface PaymentWebhookEvent {
  type: string;
  data: {
    object: any;
  };
  created: number;
  id: string;
}

// Stripe Integration Types
export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  metadata?: Record<string, any>;
}

export interface StripeInvoice {
  id: string;
  customer: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  subscription?: string;
}