import nodemailer from 'nodemailer';
import { IInvoice, IQuote } from '../types';
import { logger } from '../../config/logger';
import path from 'path';
import fs from 'fs';

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;

  private constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendInvoice(invoice: IInvoice, recipientEmail?: string): Promise<boolean> {
    try {
      const email = recipientEmail || await this.getCustomerEmail(invoice.customerId);
      if (!email) {
        throw new Error('No recipient email provided');
      }

      const subject = `Invoice ${invoice.invoiceNumber} from ${process.env.COMPANY_NAME || 'Ace CRM'}`;
      const html = this.generateInvoiceEmailTemplate(invoice);

      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: process.env.COMPANY_NAME || 'Ace CRM',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER!
        },
        to: email,
        subject,
        html,
        attachments: []
      };

      // Attach PDF if exists
      if (invoice.pdfPath && fs.existsSync(invoice.pdfPath)) {
        mailOptions.attachments!.push({
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          path: invoice.pdfPath
        });
      }

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Invoice email sent', {
        invoiceId: invoice._id,
        recipientEmail: email,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send invoice email', { 
        error,
        invoiceId: invoice._id,
        recipientEmail 
      });
      throw error;
    }
  }

  async sendQuote(quote: IQuote, recipientEmail?: string): Promise<boolean> {
    try {
      const email = recipientEmail || await this.getCustomerEmail(quote.customerId);
      if (!email) {
        throw new Error('No recipient email provided');
      }

      const subject = `Quote ${quote.quoteNumber} from ${process.env.COMPANY_NAME || 'Ace CRM'}`;
      const html = this.generateQuoteEmailTemplate(quote);

      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: process.env.COMPANY_NAME || 'Ace CRM',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER!
        },
        to: email,
        subject,
        html,
        attachments: []
      };

      // Attach PDF if exists
      if (quote.pdfPath && fs.existsSync(quote.pdfPath)) {
        mailOptions.attachments!.push({
          filename: `Quote-${quote.quoteNumber}.pdf`,
          path: quote.pdfPath
        });
      }

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Quote email sent', {
        quoteId: quote._id,
        recipientEmail: email,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send quote email', { 
        error,
        quoteId: quote._id,
        recipientEmail 
      });
      throw error;
    }
  }

  async sendInvoiceReminder(
    invoice: IInvoice, 
    reminderType: 'first_reminder' | 'second_reminder' | 'final_notice',
    recipientEmail?: string
  ): Promise<boolean> {
    try {
      const email = recipientEmail || await this.getCustomerEmail(invoice.customerId);
      if (!email) {
        throw new Error('No recipient email provided');
      }

      const subject = this.getReminderSubject(invoice, reminderType);
      const html = this.generateReminderEmailTemplate(invoice, reminderType);

      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: process.env.COMPANY_NAME || 'Ace CRM',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER!
        },
        to: email,
        subject,
        html,
        attachments: []
      };

      // Attach PDF if exists
      if (invoice.pdfPath && fs.existsSync(invoice.pdfPath)) {
        mailOptions.attachments!.push({
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          path: invoice.pdfPath
        });
      }

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Invoice reminder sent', {
        invoiceId: invoice._id,
        reminderType,
        recipientEmail: email,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send invoice reminder', { 
        error,
        invoiceId: invoice._id,
        reminderType,
        recipientEmail 
      });
      throw error;
    }
  }

  async sendPaymentConfirmation(
    invoice: IInvoice, 
    paymentAmount: number,
    recipientEmail?: string
  ): Promise<boolean> {
    try {
      const email = recipientEmail || await this.getCustomerEmail(invoice.customerId);
      if (!email) {
        throw new Error('No recipient email provided');
      }

      const subject = `Payment Confirmation - Invoice ${invoice.invoiceNumber}`;
      const html = this.generatePaymentConfirmationTemplate(invoice, paymentAmount);

      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: process.env.COMPANY_NAME || 'Ace CRM',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER!
        },
        to: email,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Payment confirmation sent', {
        invoiceId: invoice._id,
        paymentAmount,
        recipientEmail: email,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send payment confirmation', { 
        error,
        invoiceId: invoice._id,
        recipientEmail 
      });
      throw error;
    }
  }

  private generateInvoiceEmailTemplate(invoice: IInvoice): string {
    const paymentUrl = `${process.env.FRONTEND_URL}/payments/invoice/${invoice._id}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px 0; }
            .invoice-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; }
            .button { 
                background-color: #007bff; 
                color: white; 
                padding: 10px 20px; 
                text-decoration: none; 
                border-radius: 5px; 
                display: inline-block;
                margin: 10px 0;
            }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${process.env.COMPANY_NAME || 'Ace CRM'}</h1>
                <h2>Invoice ${invoice.invoiceNumber}</h2>
            </div>
            
            <div class="content">
                <p>Dear Customer,</p>
                
                <p>Please find attached your invoice for the services/products provided. Below are the invoice details:</p>
                
                <div class="invoice-details">
                    <strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br>
                    <strong>Issue Date:</strong> ${this.formatDate(invoice.issueDate)}<br>
                    <strong>Due Date:</strong> ${this.formatDate(invoice.dueDate)}<br>
                    <strong>Total Amount:</strong> $${invoice.totalAmount.toFixed(2)} ${invoice.currency}<br>
                    <strong>Status:</strong> ${invoice.status.replace('_', ' ').toUpperCase()}
                </div>
                
                ${invoice.publicNotes ? `<p><strong>Notes:</strong><br>${invoice.publicNotes}</p>` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${paymentUrl}" class="button">View & Pay Invoice</a>
                </div>
                
                <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            </div>
            
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>${process.env.COMPANY_NAME || 'Ace CRM'}<br>
                ${process.env.COMPANY_EMAIL || 'info@acecrm.com'}<br>
                ${process.env.COMPANY_PHONE || '(555) 123-4567'}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateQuoteEmailTemplate(quote: IQuote): string {
    const acceptUrl = `${process.env.FRONTEND_URL}/quotes/${quote._id}/accept`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Quote ${quote.quoteNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px 0; }
            .quote-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; }
            .button { 
                background-color: #28a745; 
                color: white; 
                padding: 10px 20px; 
                text-decoration: none; 
                border-radius: 5px; 
                display: inline-block;
                margin: 10px 5px;
            }
            .button.secondary { background-color: #6c757d; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${process.env.COMPANY_NAME || 'Ace CRM'}</h1>
                <h2>Quote ${quote.quoteNumber}</h2>
            </div>
            
            <div class="content">
                <p>Dear Customer,</p>
                
                <p>Thank you for your interest in our services. Please find attached your quote:</p>
                
                <div class="quote-details">
                    <strong>Quote Number:</strong> ${quote.quoteNumber}<br>
                    <strong>Issue Date:</strong> ${this.formatDate(quote.issueDate)}<br>
                    <strong>Valid Until:</strong> ${this.formatDate(quote.expirationDate)}<br>
                    <strong>Total Amount:</strong> $${quote.totalAmount.toFixed(2)} ${quote.currency}<br>
                    <strong>Status:</strong> ${quote.status.replace('_', ' ').toUpperCase()}
                </div>
                
                ${quote.publicNotes ? `<p><strong>Notes:</strong><br>${quote.publicNotes}</p>` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${acceptUrl}" class="button">Accept Quote</a>
                    <a href="${process.env.FRONTEND_URL}/quotes/${quote._id}" class="button secondary">View Details</a>
                </div>
                
                <p>This quote is valid until ${this.formatDate(quote.expirationDate)}. If you have any questions, please don't hesitate to contact us.</p>
            </div>
            
            <div class="footer">
                <p>Thank you for considering our services!</p>
                <p>${process.env.COMPANY_NAME || 'Ace CRM'}<br>
                ${process.env.COMPANY_EMAIL || 'info@acecrm.com'}<br>
                ${process.env.COMPANY_PHONE || '(555) 123-4567'}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateReminderEmailTemplate(
    invoice: IInvoice, 
    reminderType: 'first_reminder' | 'second_reminder' | 'final_notice'
  ): string {
    const paymentUrl = `${process.env.FRONTEND_URL}/payments/invoice/${invoice._id}`;
    const daysPastDue = Math.ceil((new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let reminderText = '';
    let urgencyClass = '';
    
    switch (reminderType) {
      case 'first_reminder':
        reminderText = 'This is a friendly reminder that your invoice is now past due.';
        urgencyClass = 'reminder';
        break;
      case 'second_reminder':
        reminderText = 'This is your second reminder. Please settle this invoice as soon as possible to avoid any inconvenience.';
        urgencyClass = 'urgent';
        break;
      case 'final_notice':
        reminderText = 'This is your final notice. Immediate payment is required to avoid further action.';
        urgencyClass = 'final';
        break;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Payment Reminder - Invoice ${invoice.invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .header.reminder { background-color: #fff3cd; }
            .header.urgent { background-color: #f8d7da; }
            .header.final { background-color: #d1ecf1; }
            .content { padding: 20px 0; }
            .invoice-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; }
            .overdue { color: #dc3545; font-weight: bold; }
            .button { 
                background-color: #dc3545; 
                color: white; 
                padding: 15px 25px; 
                text-decoration: none; 
                border-radius: 5px; 
                display: inline-block;
                margin: 20px 0;
                font-size: 16px;
            }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header ${urgencyClass}">
                <h1>Payment Reminder</h1>
                <h2>Invoice ${invoice.invoiceNumber}</h2>
            </div>
            
            <div class="content">
                <p>Dear Customer,</p>
                
                <p>${reminderText}</p>
                
                <div class="invoice-details">
                    <strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br>
                    <strong>Original Due Date:</strong> ${this.formatDate(invoice.dueDate)}<br>
                    <strong>Amount Due:</strong> <span class="overdue">$${invoice.remainingBalance.toFixed(2)} ${invoice.currency}</span><br>
                    <strong>Days Past Due:</strong> <span class="overdue">${daysPastDue} days</span>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${paymentUrl}" class="button">PAY NOW</a>
                </div>
                
                <p>To avoid any inconvenience, please settle this invoice immediately. If you have already made the payment, please disregard this notice.</p>
                
                <p>If you have any questions or need to discuss payment arrangements, please contact us immediately.</p>
            </div>
            
            <div class="footer">
                <p>Thank you for your prompt attention to this matter.</p>
                <p>${process.env.COMPANY_NAME || 'Ace CRM'}<br>
                ${process.env.COMPANY_EMAIL || 'info@acecrm.com'}<br>
                ${process.env.COMPANY_PHONE || '(555) 123-4567'}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generatePaymentConfirmationTemplate(invoice: IInvoice, paymentAmount: number): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Payment Confirmation - Invoice ${invoice.invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #d4edda; padding: 20px; text-align: center; }
            .content { padding: 20px 0; }
            .payment-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; }
            .success { color: #28a745; font-weight: bold; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✓ Payment Received</h1>
                <h2>Thank You!</h2>
            </div>
            
            <div class="content">
                <p>Dear Customer,</p>
                
                <p class="success">We have successfully received your payment. Thank you!</p>
                
                <div class="payment-details">
                    <strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br>
                    <strong>Payment Amount:</strong> $${paymentAmount.toFixed(2)} ${invoice.currency}<br>
                    <strong>Payment Date:</strong> ${this.formatDate(new Date())}<br>
                    <strong>Remaining Balance:</strong> $${Math.max(0, invoice.remainingBalance - paymentAmount).toFixed(2)} ${invoice.currency}
                </div>
                
                <p>This email serves as your payment confirmation receipt. Please keep it for your records.</p>
                
                <p>If you have any questions about this payment or need additional documentation, please don't hesitate to contact us.</p>
            </div>
            
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>${process.env.COMPANY_NAME || 'Ace CRM'}<br>
                ${process.env.COMPANY_EMAIL || 'info@acecrm.com'}<br>
                ${process.env.COMPANY_PHONE || '(555) 123-4567'}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getReminderSubject(
    invoice: IInvoice, 
    reminderType: 'first_reminder' | 'second_reminder' | 'final_notice'
  ): string {
    const companyName = process.env.COMPANY_NAME || 'Ace CRM';
    
    switch (reminderType) {
      case 'first_reminder':
        return `Payment Reminder: Invoice ${invoice.invoiceNumber} from ${companyName}`;
      case 'second_reminder':
        return `Second Notice: Invoice ${invoice.invoiceNumber} Past Due - ${companyName}`;
      case 'final_notice':
        return `FINAL NOTICE: Immediate Payment Required - Invoice ${invoice.invoiceNumber}`;
      default:
        return `Payment Reminder: Invoice ${invoice.invoiceNumber}`;
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private async getCustomerEmail(customerId: string): Promise<string | null> {
    // This would typically fetch the customer email from the database
    // For now, returning a placeholder
    // TODO: Integrate with Contact/Company models
    return 'customer@example.com';
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error });
      return false;
    }
  }
}

export default EmailService.getInstance();