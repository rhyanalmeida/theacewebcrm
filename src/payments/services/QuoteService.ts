import { Quote, TaxRate } from '../models';
import { IQuote, CreateQuoteRequest, TaxType } from '../types';
import { logger } from '../../config/logger';
import PDFService from './PDFService';
import EmailService from './EmailService';
import InvoiceService from './InvoiceService';
import { v4 as uuidv4 } from 'uuid';

export class QuoteService {
  private static instance: QuoteService;

  private constructor() {}

  public static getInstance(): QuoteService {
    if (!QuoteService.instance) {
      QuoteService.instance = new QuoteService();
    }
    return QuoteService.instance;
  }

  async createQuote(data: CreateQuoteRequest, createdBy: string): Promise<IQuote> {
    try {
      const quoteNumber = await Quote.generateQuoteNumber();
      
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

      const quoteData = {
        quoteNumber,
        customerId: data.customerId,
        companyId: data.companyId,
        status: 'draft' as const,
        issueDate: new Date(),
        expirationDate: data.expirationDate,
        subtotal,
        taxAmount,
        discountAmount: data.discountAmount || 0,
        totalAmount,
        currency: data.currency || 'USD',
        lineItems,
        taxDetails,
        terms: data.terms,
        notes: data.notes,
        publicNotes: data.publicNotes,
        privateNotes: data.privateNotes,
        createdBy,
        updatedBy: createdBy
      };

      const quote = new Quote(quoteData);
      await quote.save();

      logger.info('Quote created', { 
        quoteId: quote._id,
        quoteNumber: quote.quoteNumber,
        customerId: data.customerId 
      });

      return quote;
    } catch (error) {
      logger.error('Failed to create quote', { error, data });
      throw error;
    }
  }

  async updateQuote(quoteId: string, updates: Partial<IQuote>, updatedBy: string): Promise<IQuote | null> {
    try {
      const quote = await Quote.findByIdAndUpdate(
        quoteId,
        { ...updates, updatedBy, updatedAt: new Date() },
        { new: true }
      );

      if (!quote) {
        throw new Error('Quote not found');
      }

      logger.info('Quote updated', { quoteId, updates: Object.keys(updates) });
      return quote;
    } catch (error) {
      logger.error('Failed to update quote', { error, quoteId });
      throw error;
    }
  }

  async getQuote(quoteId: string): Promise<IQuote | null> {
    try {
      const quote = await Quote.findById(quoteId);
      return quote;
    } catch (error) {
      logger.error('Failed to get quote', { error, quoteId });
      throw error;
    }
  }

  async getQuoteByNumber(quoteNumber: string): Promise<IQuote | null> {
    try {
      const quote = await Quote.findOne({ quoteNumber });
      return quote;
    } catch (error) {
      logger.error('Failed to get quote by number', { error, quoteNumber });
      throw error;
    }
  }

  async listQuotes(filters: {
    customerId?: string;
    companyId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ quotes: IQuote[]; total: number; page: number; totalPages: number }> {
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

      const [quotes, total] = await Promise.all([
        Quote.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Quote.countDocuments(query)
      ]);

      return {
        quotes,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to list quotes', { error, filters });
      throw error;
    }
  }

  async sendQuote(quoteId: string, recipientEmail?: string): Promise<boolean> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      // Generate PDF if not exists
      if (!quote.pdfPath) {
        const pdfPath = await PDFService.generateQuotePDF(quote);
        quote.pdfPath = pdfPath;
      }

      // Send email
      await EmailService.sendQuote(quote, recipientEmail);

      // Update quote
      quote.status = 'sent';
      await quote.save();

      logger.info('Quote sent', { quoteId, recipientEmail });
      return true;
    } catch (error) {
      logger.error('Failed to send quote', { error, quoteId });
      throw error;
    }
  }

  async acceptQuote(quoteId: string): Promise<IQuote> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      if (quote.status === 'accepted') {
        throw new Error('Quote already accepted');
      }

      if (quote.status === 'expired' || quote.expirationDate < new Date()) {
        throw new Error('Quote has expired');
      }

      quote.status = 'accepted';
      quote.acceptedDate = new Date();
      await quote.save();

      logger.info('Quote accepted', { quoteId });
      return quote;
    } catch (error) {
      logger.error('Failed to accept quote', { error, quoteId });
      throw error;
    }
  }

  async rejectQuote(quoteId: string, reason?: string): Promise<IQuote> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      quote.status = 'rejected';
      if (reason) {
        quote.privateNotes = (quote.privateNotes || '') + `\nRejected: ${reason}`;
      }
      await quote.save();

      logger.info('Quote rejected', { quoteId, reason });
      return quote;
    } catch (error) {
      logger.error('Failed to reject quote', { error, quoteId });
      throw error;
    }
  }

  async convertToInvoice(quoteId: string, dueDate?: Date): Promise<any> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      const invoice = await quote.convertToInvoice(dueDate);
      
      logger.info('Quote converted to invoice', { 
        quoteId,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber
      });

      return invoice;
    } catch (error) {
      logger.error('Failed to convert quote to invoice', { error, quoteId });
      throw error;
    }
  }

  async duplicateQuote(quoteId: string, customizations?: {
    customerId?: string;
    expirationDate?: Date;
    notes?: string;
  }): Promise<IQuote> {
    try {
      const originalQuote = await Quote.findById(quoteId);
      if (!originalQuote) {
        throw new Error('Quote not found');
      }

      const newQuoteNumber = await Quote.generateQuoteNumber();
      
      const duplicateData = {
        ...originalQuote.toObject(),
        _id: undefined,
        quoteNumber: newQuoteNumber,
        status: 'draft' as const,
        issueDate: new Date(),
        acceptedDate: undefined,
        pdfPath: undefined,
        convertedInvoiceId: undefined,
        ...customizations
      };

      const duplicateQuote = new Quote(duplicateData);
      await duplicateQuote.save();

      logger.info('Quote duplicated', { 
        originalQuoteId: quoteId,
        newQuoteId: duplicateQuote._id,
        newQuoteNumber 
      });

      return duplicateQuote;
    } catch (error) {
      logger.error('Failed to duplicate quote', { error, quoteId });
      throw error;
    }
  }

  async generatePDF(quoteId: string): Promise<string> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      const pdfPath = await PDFService.generateQuotePDF(quote);
      
      // Update quote with PDF path
      quote.pdfPath = pdfPath;
      await quote.save();

      logger.info('Quote PDF generated', { quoteId, pdfPath });
      return pdfPath;
    } catch (error) {
      logger.error('Failed to generate quote PDF', { error, quoteId });
      throw error;
    }
  }

  async getExpiringQuotes(days: number = 7): Promise<IQuote[]> {
    try {
      return await Quote.getExpiringQuotes(days);
    } catch (error) {
      logger.error('Failed to get expiring quotes', { error, days });
      throw error;
    }
  }

  async getQuoteMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      return await Quote.getQuoteMetrics(startDate, endDate);
    } catch (error) {
      logger.error('Failed to get quote metrics', { error });
      throw error;
    }
  }

  async extendExpirationDate(quoteId: string, newExpirationDate: Date): Promise<IQuote> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      if (quote.status === 'accepted' || quote.status === 'rejected') {
        throw new Error('Cannot extend expiration date for accepted or rejected quotes');
      }

      quote.expirationDate = newExpirationDate;
      
      // Reset status if was expired
      if (quote.status === 'expired') {
        quote.status = 'sent';
      }

      await quote.save();

      logger.info('Quote expiration date extended', { quoteId, newExpirationDate });
      return quote;
    } catch (error) {
      logger.error('Failed to extend quote expiration date', { error, quoteId });
      throw error;
    }
  }

  async addLineItem(quoteId: string, lineItem: {
    description: string;
    quantity: number;
    unitPrice: number;
    productId?: string;
    serviceId?: string;
    taxable?: boolean;
  }): Promise<IQuote> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      if (quote.status === 'accepted' || quote.status === 'rejected') {
        throw new Error('Cannot modify accepted or rejected quotes');
      }

      const newLineItem = {
        id: uuidv4(),
        ...lineItem,
        totalPrice: lineItem.quantity * lineItem.unitPrice,
        taxable: lineItem.taxable !== false
      };

      quote.lineItems.push(newLineItem);
      await quote.save(); // This will trigger the pre-save middleware to recalculate totals

      logger.info('Line item added to quote', { quoteId, lineItemId: newLineItem.id });
      return quote;
    } catch (error) {
      logger.error('Failed to add line item to quote', { error, quoteId });
      throw error;
    }
  }

  async removeLineItem(quoteId: string, lineItemId: string): Promise<IQuote> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      if (quote.status === 'accepted' || quote.status === 'rejected') {
        throw new Error('Cannot modify accepted or rejected quotes');
      }

      quote.lineItems = quote.lineItems.filter(item => item.id !== lineItemId);
      await quote.save(); // This will trigger the pre-save middleware to recalculate totals

      logger.info('Line item removed from quote', { quoteId, lineItemId });
      return quote;
    } catch (error) {
      logger.error('Failed to remove line item from quote', { error, quoteId });
      throw error;
    }
  }

  async updateLineItem(quoteId: string, lineItemId: string, updates: {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    taxable?: boolean;
  }): Promise<IQuote> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      if (quote.status === 'accepted' || quote.status === 'rejected') {
        throw new Error('Cannot modify accepted or rejected quotes');
      }

      const lineItemIndex = quote.lineItems.findIndex(item => item.id === lineItemId);
      if (lineItemIndex === -1) {
        throw new Error('Line item not found');
      }

      // Update line item
      Object.assign(quote.lineItems[lineItemIndex], updates);
      
      // Recalculate total price for the line item
      const lineItem = quote.lineItems[lineItemIndex];
      lineItem.totalPrice = lineItem.quantity * lineItem.unitPrice;

      await quote.save(); // This will trigger the pre-save middleware to recalculate totals

      logger.info('Line item updated in quote', { quoteId, lineItemId, updates: Object.keys(updates) });
      return quote;
    } catch (error) {
      logger.error('Failed to update line item in quote', { error, quoteId, lineItemId });
      throw error;
    }
  }
}

export default QuoteService.getInstance();