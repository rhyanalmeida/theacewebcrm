import { Request, Response } from 'express';
import { InvoiceService, QuoteService, PaymentService } from '../services';
import { logger } from '../../config/logger';
import path from 'path';
import fs from 'fs';

export class PaymentPortal {
  private static instance: PaymentPortal;

  private constructor() {}

  public static getInstance(): PaymentPortal {
    if (!PaymentPortal.instance) {
      PaymentPortal.instance = new PaymentPortal();
    }
    return PaymentPortal.instance;
  }

  // Public invoice view (no authentication required)
  async getPublicInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const invoice = await InvoiceService.getInvoice(invoiceId);

      if (!invoice) {
        this.renderErrorPage(res, 'Invoice not found', 404);
        return;
      }

      // Mark invoice as viewed
      await InvoiceService.markAsViewed(invoiceId);

      // Render invoice view page
      const invoiceData = {
        invoice: invoice.toObject(),
        companyInfo: this.getCompanyInfo(),
        paymentUrl: `/payments/portal/invoice/${invoiceId}/pay`
      };

      res.render('invoice-view', invoiceData);
    } catch (error) {
      logger.error('Error loading public invoice:', error);
      this.renderErrorPage(res, 'Error loading invoice');
    }
  }

  // Public quote view (no authentication required)
  async getPublicQuote(req: Request, res: Response): Promise<void> {
    try {
      const { quoteId } = req.params;
      const quote = await QuoteService.getQuote(quoteId);

      if (!quote) {
        this.renderErrorPage(res, 'Quote not found', 404);
        return;
      }

      // Render quote view page
      const quoteData = {
        quote: quote.toObject(),
        companyInfo: this.getCompanyInfo(),
        acceptUrl: `/payments/portal/quote/${quoteId}/accept`,
        rejectUrl: `/payments/portal/quote/${quoteId}/reject`
      };

      res.render('quote-view', quoteData);
    } catch (error) {
      logger.error('Error loading public quote:', error);
      this.renderErrorPage(res, 'Error loading quote');
    }
  }

  // Payment form for invoice
  async showPaymentForm(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const invoice = await InvoiceService.getInvoice(invoiceId);

      if (!invoice) {
        this.renderErrorPage(res, 'Invoice not found', 404);
        return;
      }

      if (invoice.remainingBalance <= 0) {
        this.renderInfoPage(res, 'This invoice has already been paid in full', 'success');
        return;
      }

      // Render payment form
      const paymentData = {
        invoice: invoice.toObject(),
        companyInfo: this.getCompanyInfo(),
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        amount: invoice.remainingBalance,
        currency: invoice.currency
      };

      res.render('payment-form', paymentData);
    } catch (error) {
      logger.error('Error showing payment form:', error);
      this.renderErrorPage(res, 'Error loading payment form');
    }
  }

  // Process payment from portal
  async processPortalPayment(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const { paymentMethodId, billingDetails } = req.body;

      const invoice = await InvoiceService.getInvoice(invoiceId);
      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
        return;
      }

      if (invoice.remainingBalance <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invoice is already paid in full'
        });
        return;
      }

      // Process payment
      const paymentData = {
        invoiceId: invoice._id.toString(),
        customerId: invoice.customerId,
        amount: invoice.remainingBalance,
        currency: invoice.currency,
        paymentMethodId,
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        metadata: {
          source: 'payment_portal',
          billingDetails
        }
      };

      const payment = await PaymentService.processPayment(paymentData, 'portal');

      // Return success response
      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          paymentId: payment.paymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency
        }
      });

      logger.info('Portal payment processed', {
        invoiceId,
        paymentId: payment.paymentId,
        amount: payment.amount
      });
    } catch (error) {
      logger.error('Error processing portal payment:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message
      });
    }
  }

  // Accept quote from portal
  async acceptPortalQuote(req: Request, res: Response): Promise<void> {
    try {
      const { quoteId } = req.params;
      const { customerDetails } = req.body;

      const quote = await QuoteService.acceptQuote(quoteId);

      // Optionally convert to invoice immediately
      if (req.body.convertToInvoice) {
        const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : undefined;
        await QuoteService.convertToInvoice(quoteId, dueDate);
      }

      this.renderInfoPage(res, 'Quote accepted successfully!', 'success');

      logger.info('Quote accepted from portal', { quoteId });
    } catch (error) {
      logger.error('Error accepting quote from portal:', error);
      this.renderErrorPage(res, (error as Error).message);
    }
  }

  // Reject quote from portal
  async rejectPortalQuote(req: Request, res: Response): Promise<void> {
    try {
      const { quoteId } = req.params;
      const { reason } = req.body;

      await QuoteService.rejectQuote(quoteId, reason);

      this.renderInfoPage(res, 'Quote has been rejected', 'info');

      logger.info('Quote rejected from portal', { quoteId, reason });
    } catch (error) {
      logger.error('Error rejecting quote from portal:', error);
      this.renderErrorPage(res, (error as Error).message);
    }
  }

  // Payment success page
  async showPaymentSuccess(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const payment = await PaymentService.getPayment(paymentId);

      if (!payment) {
        this.renderErrorPage(res, 'Payment not found', 404);
        return;
      }

      const successData = {
        payment: payment.toObject(),
        companyInfo: this.getCompanyInfo()
      };

      res.render('payment-success', successData);
    } catch (error) {
      logger.error('Error showing payment success:', error);
      this.renderErrorPage(res, 'Error loading payment confirmation');
    }
  }

  // Payment failure page
  async showPaymentFailure(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const { error } = req.query;

      const failureData = {
        error: error || 'Payment failed',
        invoiceId,
        retryUrl: `/payments/portal/invoice/${invoiceId}/pay`,
        companyInfo: this.getCompanyInfo()
      };

      res.render('payment-failure', failureData);
    } catch (error) {
      logger.error('Error showing payment failure:', error);
      this.renderErrorPage(res, 'Error loading payment failure page');
    }
  }

  // Download invoice PDF from portal
  async downloadInvoicePDF(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const invoice = await InvoiceService.getInvoice(invoiceId);

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
        return;
      }

      let pdfPath = invoice.pdfPath;
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        pdfPath = await InvoiceService.generatePDF(invoiceId);
      }

      res.download(pdfPath, `Invoice-${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      logger.error('Error downloading invoice PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading PDF'
      });
    }
  }

  // Download quote PDF from portal
  async downloadQuotePDF(req: Request, res: Response): Promise<void> {
    try {
      const { quoteId } = req.params;
      const quote = await QuoteService.getQuote(quoteId);

      if (!quote) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }

      let pdfPath = quote.pdfPath;
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        pdfPath = await QuoteService.generatePDF(quoteId);
      }

      res.download(pdfPath, `Quote-${quote.quoteNumber}.pdf`);
    } catch (error) {
      logger.error('Error downloading quote PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading PDF'
      });
    }
  }

  // Customer portal dashboard (with basic auth via email/reference)
  async showCustomerDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      
      // Get customer's invoices and payments
      const invoicesResult = await InvoiceService.listInvoices({
        customerId,
        limit: 50
      });

      const paymentsResult = await PaymentService.getPaymentsByCustomer(customerId, {
        limit: 50
      });

      const dashboardData = {
        customerId,
        invoices: invoicesResult.invoices,
        payments: paymentsResult.payments,
        summary: {
          totalInvoices: invoicesResult.total,
          totalPayments: paymentsResult.total,
          outstandingBalance: invoicesResult.invoices.reduce((sum, inv) => sum + inv.remainingBalance, 0)
        },
        companyInfo: this.getCompanyInfo()
      };

      res.render('customer-dashboard', dashboardData);
    } catch (error) {
      logger.error('Error showing customer dashboard:', error);
      this.renderErrorPage(res, 'Error loading dashboard');
    }
  }

  private renderErrorPage(res: Response, message: string, statusCode: number = 500): void {
    res.status(statusCode).render('error', {
      message,
      companyInfo: this.getCompanyInfo()
    });
  }

  private renderInfoPage(res: Response, message: string, type: 'success' | 'info' | 'warning' = 'info'): void {
    res.render('info', {
      message,
      type,
      companyInfo: this.getCompanyInfo()
    });
  }

  private getCompanyInfo() {
    return {
      name: process.env.COMPANY_NAME || 'Ace CRM',
      email: process.env.COMPANY_EMAIL || 'info@acecrm.com',
      phone: process.env.COMPANY_PHONE || '(555) 123-4567',
      website: process.env.COMPANY_WEBSITE || 'www.acecrm.com',
      address: {
        street: process.env.COMPANY_ADDRESS || '123 Business St',
        city: process.env.COMPANY_CITY || 'Business City',
        state: process.env.COMPANY_STATE || 'BC',
        zip: process.env.COMPANY_ZIP || '12345',
        country: process.env.COMPANY_COUNTRY || 'USA'
      }
    };
  }

  // Generate secure portal links
  generateSecureInvoiceLink(invoiceId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/payments/portal/invoice/${invoiceId}`;
  }

  generateSecureQuoteLink(quoteId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/payments/portal/quote/${quoteId}`;
  }

  generateSecurePaymentLink(invoiceId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/payments/portal/invoice/${invoiceId}/pay`;
  }
}

export default PaymentPortal.getInstance();