import { Invoice, TaxRate } from '../models';
import { IInvoice, CreateInvoiceRequest, InvoiceStatus, TaxType } from '../types';
import { logger } from '../../config/logger';
import PDFService from './PDFService';
import EmailService from './EmailService';
import { v4 as uuidv4 } from 'uuid';

export class InvoiceService {
  private static instance: InvoiceService;

  private constructor() {}

  public static getInstance(): InvoiceService {
    if (!InvoiceService.instance) {
      InvoiceService.instance = new InvoiceService();
    }
    return InvoiceService.instance;
  }

  async createInvoice(data: CreateInvoiceRequest, createdBy: string): Promise<IInvoice> {
    try {
      const invoiceNumber = await Invoice.generateInvoiceNumber();
      
      // Process line items
      const lineItems = data.lineItems.map(item => ({
        id: uuidv4(),
        ...item,
        totalPrice: item.quantity * item.unitPrice
      }));

      // Calculate subtotal
      const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

      // Calculate taxes
      let taxDetails = [];
      let taxAmount = 0;

      if (data.taxRate && data.taxRate > 0) {
        const taxableAmount = lineItems
          .filter(item => item.taxable !== false)
          .reduce((sum, item) => sum + item.totalPrice, 0);

        if (taxableAmount > 0) {
          taxAmount = TaxRate.calculateTax(taxableAmount, data.taxRate);
          taxDetails = [{
            taxType: TaxType.SALES_TAX,
            taxRate: data.taxRate,
            taxAmount,
            taxableAmount,
            description: `Sales Tax (${data.taxRate}%)`
          }];
        }
      }

      // Calculate total
      const totalAmount = subtotal + taxAmount - (data.discountAmount || 0);

      const invoiceData = {
        invoiceNumber,
        customerId: data.customerId,
        companyId: data.companyId,
        status: InvoiceStatus.DRAFT,
        issueDate: new Date(),
        dueDate: data.dueDate,
        subtotal,
        taxAmount,
        discountAmount: data.discountAmount || 0,
        totalAmount,
        amountPaid: 0,
        remainingBalance: totalAmount,
        currency: data.currency || 'USD',
        lineItems,
        taxDetails,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        publicNotes: data.publicNotes,
        privateNotes: data.privateNotes,
        remindersSent: [],
        createdBy,
        updatedBy: createdBy
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      logger.info('Invoice created', { 
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: data.customerId 
      });

      return invoice;
    } catch (error) {
      logger.error('Failed to create invoice', { error, data });
      throw error;
    }
  }

  async updateInvoice(invoiceId: string, updates: Partial<IInvoice>, updatedBy: string): Promise<IInvoice | null> {
    try {
      const invoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        { ...updates, updatedBy, updatedAt: new Date() },
        { new: true }
      );

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      logger.info('Invoice updated', { invoiceId, updates: Object.keys(updates) });
      return invoice;
    } catch (error) {
      logger.error('Failed to update invoice', { error, invoiceId });
      throw error;
    }
  }

  async getInvoice(invoiceId: string): Promise<IInvoice | null> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      return invoice;
    } catch (error) {
      logger.error('Failed to get invoice', { error, invoiceId });
      throw error;
    }
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<IInvoice | null> {
    try {
      const invoice = await Invoice.findOne({ invoiceNumber });
      return invoice;
    } catch (error) {
      logger.error('Failed to get invoice by number', { error, invoiceNumber });
      throw error;
    }
  }

  async listInvoices(filters: {
    customerId?: string;
    companyId?: string;
    status?: InvoiceStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ invoices: IInvoice[]; total: number; page: number; totalPages: number }> {
    try {
      const query: any = {};
      
      if (filters.customerId) query.customerId = filters.customerId;
      if (filters.companyId) query.companyId = filters.companyId;
      if (filters.status) query.status = filters.status;
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const [invoices, total] = await Promise.all([
        Invoice.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Invoice.countDocuments(query)
      ]);

      return {
        invoices,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to list invoices', { error, filters });
      throw error;
    }
  }

  async sendInvoice(invoiceId: string, recipientEmail?: string): Promise<boolean> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Generate PDF if not exists
      if (!invoice.pdfPath) {
        const pdfPath = await PDFService.generateInvoicePDF(invoice);
        invoice.pdfPath = pdfPath;
      }

      // Send email
      await EmailService.sendInvoice(invoice, recipientEmail);

      // Update invoice
      invoice.status = InvoiceStatus.SENT;
      invoice.lastSentDate = new Date();
      await invoice.save();

      logger.info('Invoice sent', { invoiceId, recipientEmail });
      return true;
    } catch (error) {
      logger.error('Failed to send invoice', { error, invoiceId });
      throw error;
    }
  }

  async markAsViewed(invoiceId: string): Promise<void> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) return;

      if (invoice.status === InvoiceStatus.SENT && !invoice.viewedDate) {
        invoice.status = InvoiceStatus.VIEWED;
        invoice.viewedDate = new Date();
        await invoice.save();

        logger.info('Invoice marked as viewed', { invoiceId });
      }
    } catch (error) {
      logger.error('Failed to mark invoice as viewed', { error, invoiceId });
      throw error;
    }
  }

  async markAsPaid(invoiceId: string, paymentAmount: number, paidDate?: Date): Promise<void> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      invoice.amountPaid = paymentAmount;
      invoice.remainingBalance = invoice.totalAmount - paymentAmount;
      
      if (invoice.remainingBalance <= 0) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidDate = paidDate || new Date();
      } else {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      }

      await invoice.save();

      logger.info('Invoice payment status updated', { 
        invoiceId, 
        paymentAmount, 
        newStatus: invoice.status 
      });
    } catch (error) {
      logger.error('Failed to mark invoice as paid', { error, invoiceId });
      throw error;
    }
  }

  async cancelInvoice(invoiceId: string, reason?: string): Promise<void> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error('Cannot cancel a paid invoice');
      }

      invoice.status = InvoiceStatus.CANCELLED;
      if (reason) {
        invoice.privateNotes = (invoice.privateNotes || '') + `\nCancelled: ${reason}`;
      }
      await invoice.save();

      logger.info('Invoice cancelled', { invoiceId, reason });
    } catch (error) {
      logger.error('Failed to cancel invoice', { error, invoiceId });
      throw error;
    }
  }

  async getOverdueInvoices(customerId?: string): Promise<IInvoice[]> {
    try {
      return await Invoice.getOverdueInvoices(customerId);
    } catch (error) {
      logger.error('Failed to get overdue invoices', { error, customerId });
      throw error;
    }
  }

  async sendReminder(invoiceId: string, reminderType: 'first_reminder' | 'second_reminder' | 'final_notice', customEmail?: string): Promise<boolean> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error('Cannot send reminder for paid or cancelled invoice');
      }

      // Send reminder email
      await EmailService.sendInvoiceReminder(invoice, reminderType, customEmail);

      // Log reminder
      const reminderLog = {
        sentDate: new Date(),
        type: reminderType,
        recipientEmail: customEmail || 'customer-email@example.com',
        status: 'sent' as const
      };

      invoice.remindersSent.push(reminderLog);
      
      // Update status to overdue if past due date
      if (invoice.dueDate < new Date() && invoice.status !== InvoiceStatus.OVERDUE) {
        invoice.status = InvoiceStatus.OVERDUE;
      }

      await invoice.save();

      logger.info('Invoice reminder sent', { 
        invoiceId, 
        reminderType, 
        recipientEmail: customEmail 
      });

      return true;
    } catch (error) {
      logger.error('Failed to send invoice reminder', { error, invoiceId, reminderType });
      throw error;
    }
  }

  async generatePDF(invoiceId: string): Promise<string> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const pdfPath = await PDFService.generateInvoicePDF(invoice);
      
      // Update invoice with PDF path
      invoice.pdfPath = pdfPath;
      await invoice.save();

      logger.info('Invoice PDF generated', { invoiceId, pdfPath });
      return pdfPath;
    } catch (error) {
      logger.error('Failed to generate invoice PDF', { error, invoiceId });
      throw error;
    }
  }

  async getFinancialSummary(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      return await Invoice.getFinancialSummary(startDate, endDate);
    } catch (error) {
      logger.error('Failed to get financial summary', { error });
      throw error;
    }
  }

  async getRevenueReport(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      return await Invoice.aggregate([
        {
          $match: {
            status: InvoiceStatus.PAID,
            paidDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$paidDate' },
              month: { $month: '$paidDate' },
              day: { $dayOfMonth: '$paidDate' }
            },
            revenue: { $sum: '$totalAmount' },
            invoiceCount: { $sum: 1 },
            averageInvoiceValue: { $avg: '$totalAmount' }
          }
        },
        {
          $project: {
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day'
              }
            },
            revenue: '$revenue',
            invoiceCount: '$invoiceCount',
            averageInvoiceValue: { $round: ['$averageInvoiceValue', 2] }
          }
        },
        { $sort: { date: 1 } }
      ]);
    } catch (error) {
      logger.error('Failed to get revenue report', { error });
      throw error;
    }
  }

  async duplicateInvoice(invoiceId: string, customizations?: {
    customerId?: string;
    dueDate?: Date;
    notes?: string;
  }): Promise<IInvoice> {
    try {
      const originalInvoice = await Invoice.findById(invoiceId);
      if (!originalInvoice) {
        throw new Error('Invoice not found');
      }

      const newInvoiceNumber = await Invoice.generateInvoiceNumber();
      
      const duplicateData = {
        ...originalInvoice.toObject(),
        _id: undefined,
        invoiceNumber: newInvoiceNumber,
        status: InvoiceStatus.DRAFT,
        issueDate: new Date(),
        paidDate: undefined,
        amountPaid: 0,
        remainingBalance: originalInvoice.totalAmount,
        lastSentDate: undefined,
        viewedDate: undefined,
        remindersSent: [],
        pdfPath: undefined,
        ...customizations
      };

      const duplicateInvoice = new Invoice(duplicateData);
      await duplicateInvoice.save();

      logger.info('Invoice duplicated', { 
        originalInvoiceId: invoiceId,
        newInvoiceId: duplicateInvoice._id,
        newInvoiceNumber 
      });

      return duplicateInvoice;
    } catch (error) {
      logger.error('Failed to duplicate invoice', { error, invoiceId });
      throw error;
    }
  }
}

export default InvoiceService.getInstance();