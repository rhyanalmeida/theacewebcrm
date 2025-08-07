import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IInvoice, IQuote } from '../types';
import { logger } from '../../config/logger';

export class PDFService {
  private static instance: PDFService;

  private constructor() {}

  public static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  async generateInvoicePDF(invoice: IInvoice): Promise<string> {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(process.env.PDF_STORAGE_PATH || './uploads/pdfs', fileName);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Pipe to file
      doc.pipe(fs.createWriteStream(filePath));

      // Add content
      this.addHeader(doc, 'INVOICE');
      this.addCompanyInfo(doc);
      this.addInvoiceInfo(doc, invoice);
      this.addBillToInfo(doc, invoice);
      this.addLineItems(doc, invoice.lineItems);
      this.addTotals(doc, invoice);
      this.addFooter(doc, invoice);

      // Finalize the document
      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
      });

      logger.info('Invoice PDF generated', { 
        invoiceId: invoice._id,
        filePath 
      });

      return filePath;
    } catch (error) {
      logger.error('Failed to generate invoice PDF', { 
        error,
        invoiceId: invoice._id 
      });
      throw error;
    }
  }

  async generateQuotePDF(quote: IQuote): Promise<string> {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const fileName = `quote-${quote.quoteNumber}.pdf`;
      const filePath = path.join(process.env.PDF_STORAGE_PATH || './uploads/pdfs', fileName);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Pipe to file
      doc.pipe(fs.createWriteStream(filePath));

      // Add content
      this.addHeader(doc, 'QUOTE');
      this.addCompanyInfo(doc);
      this.addQuoteInfo(doc, quote);
      this.addBillToInfo(doc, { customerId: quote.customerId, companyId: quote.companyId } as any);
      this.addLineItems(doc, quote.lineItems);
      this.addQuoteTotals(doc, quote);
      this.addQuoteFooter(doc, quote);

      // Finalize the document
      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
      });

      logger.info('Quote PDF generated', { 
        quoteId: quote._id,
        filePath 
      });

      return filePath;
    } catch (error) {
      logger.error('Failed to generate quote PDF', { 
        error,
        quoteId: quote._id 
      });
      throw error;
    }
  }

  private addHeader(doc: PDFKit.PDFDocument, title: string) {
    doc
      .fontSize(20)
      .text(title, 50, 50)
      .fontSize(12);
  }

  private addCompanyInfo(doc: PDFKit.PDFDocument) {
    const companyInfo = {
      name: process.env.COMPANY_NAME || 'Ace CRM',
      address: process.env.COMPANY_ADDRESS || '123 Business St',
      city: process.env.COMPANY_CITY || 'Business City, BC 12345',
      phone: process.env.COMPANY_PHONE || '(555) 123-4567',
      email: process.env.COMPANY_EMAIL || 'info@acecrm.com',
      website: process.env.COMPANY_WEBSITE || 'www.acecrm.com'
    };

    doc
      .text(companyInfo.name, 300, 50, { align: 'right' })
      .text(companyInfo.address, 300, 65, { align: 'right' })
      .text(companyInfo.city, 300, 80, { align: 'right' })
      .text(companyInfo.phone, 300, 95, { align: 'right' })
      .text(companyInfo.email, 300, 110, { align: 'right' })
      .text(companyInfo.website, 300, 125, { align: 'right' });
  }

  private addInvoiceInfo(doc: PDFKit.PDFDocument, invoice: IInvoice) {
    doc
      .text('Invoice Number:', 50, 160)
      .text(invoice.invoiceNumber, 150, 160)
      .text('Issue Date:', 50, 175)
      .text(this.formatDate(invoice.issueDate), 150, 175)
      .text('Due Date:', 50, 190)
      .text(this.formatDate(invoice.dueDate), 150, 190);

    if (invoice.status) {
      doc
        .text('Status:', 50, 205)
        .text(invoice.status.toUpperCase(), 150, 205);
    }
  }

  private addQuoteInfo(doc: PDFKit.PDFDocument, quote: IQuote) {
    doc
      .text('Quote Number:', 50, 160)
      .text(quote.quoteNumber, 150, 160)
      .text('Issue Date:', 50, 175)
      .text(this.formatDate(quote.issueDate), 150, 175)
      .text('Expiration Date:', 50, 190)
      .text(this.formatDate(quote.expirationDate), 150, 190)
      .text('Status:', 50, 205)
      .text(quote.status.toUpperCase(), 150, 205);
  }

  private addBillToInfo(doc: PDFKit.PDFDocument, invoice: IInvoice) {
    // This would typically fetch customer/company info from database
    // For now, using placeholder data
    doc
      .text('Bill To:', 50, 250)
      .text('Customer Name', 50, 265)
      .text('Customer Address', 50, 280)
      .text('City, State ZIP', 50, 295)
      .text('customer@email.com', 50, 310);
  }

  private addLineItems(doc: PDFKit.PDFDocument, lineItems: any[]) {
    const tableTop = 350;
    let y = tableTop;

    // Table headers
    doc
      .fontSize(10)
      .text('Description', 50, y)
      .text('Qty', 250, y)
      .text('Unit Price', 300, y)
      .text('Total', 450, y, { align: 'right' });

    // Draw line under headers
    doc
      .moveTo(50, y + 15)
      .lineTo(550, y + 15)
      .stroke();

    y += 30;

    // Line items
    lineItems.forEach((item) => {
      if (y > 700) { // Start new page if needed
        doc.addPage();
        y = 50;
      }

      doc
        .fontSize(10)
        .text(item.description, 50, y, { width: 190 })
        .text(item.quantity.toString(), 250, y)
        .text(`$${item.unitPrice.toFixed(2)}`, 300, y)
        .text(`$${item.totalPrice.toFixed(2)}`, 450, y, { align: 'right' });

      y += 20;
    });

    return y + 20;
  }

  private addTotals(doc: PDFKit.PDFDocument, invoice: IInvoice) {
    const y = doc.y + 30;

    doc
      .fontSize(10)
      .text('Subtotal:', 350, y)
      .text(`$${invoice.subtotal.toFixed(2)}`, 450, y, { align: 'right' });

    if (invoice.discountAmount && invoice.discountAmount > 0) {
      doc
        .text('Discount:', 350, y + 15)
        .text(`-$${invoice.discountAmount.toFixed(2)}`, 450, y + 15, { align: 'right' });
    }

    if (invoice.taxAmount && invoice.taxAmount > 0) {
      doc
        .text('Tax:', 350, y + 30)
        .text(`$${invoice.taxAmount.toFixed(2)}`, 450, y + 30, { align: 'right' });
    }

    // Total line
    doc
      .moveTo(350, y + 45)
      .lineTo(550, y + 45)
      .stroke();

    doc
      .fontSize(12)
      .text('Total:', 350, y + 50)
      .text(`$${invoice.totalAmount.toFixed(2)}`, 450, y + 50, { align: 'right' });

    if (invoice.amountPaid > 0) {
      doc
        .fontSize(10)
        .text('Amount Paid:', 350, y + 70)
        .text(`$${invoice.amountPaid.toFixed(2)}`, 450, y + 70, { align: 'right' })
        .text('Balance Due:', 350, y + 85)
        .text(`$${invoice.remainingBalance.toFixed(2)}`, 450, y + 85, { align: 'right' });
    }
  }

  private addQuoteTotals(doc: PDFKit.PDFDocument, quote: IQuote) {
    const y = doc.y + 30;

    doc
      .fontSize(10)
      .text('Subtotal:', 350, y)
      .text(`$${quote.subtotal.toFixed(2)}`, 450, y, { align: 'right' });

    if (quote.discountAmount && quote.discountAmount > 0) {
      doc
        .text('Discount:', 350, y + 15)
        .text(`-$${quote.discountAmount.toFixed(2)}`, 450, y + 15, { align: 'right' });
    }

    if (quote.taxAmount && quote.taxAmount > 0) {
      doc
        .text('Tax:', 350, y + 30)
        .text(`$${quote.taxAmount.toFixed(2)}`, 450, y + 30, { align: 'right' });
    }

    // Total line
    doc
      .moveTo(350, y + 45)
      .lineTo(550, y + 45)
      .stroke();

    doc
      .fontSize(12)
      .text('Total:', 350, y + 50)
      .text(`$${quote.totalAmount.toFixed(2)}`, 450, y + 50, { align: 'right' });
  }

  private addFooter(doc: PDFKit.PDFDocument, invoice: IInvoice) {
    const y = 650;

    if (invoice.paymentTerms) {
      doc
        .fontSize(10)
        .text('Payment Terms:', 50, y)
        .text(invoice.paymentTerms, 50, y + 15, { width: 500 });
    }

    if (invoice.notes) {
      doc
        .text('Notes:', 50, y + 40)
        .text(invoice.notes, 50, y + 55, { width: 500 });
    }

    // Footer
    doc
      .fontSize(8)
      .fillColor('gray')
      .text('Thank you for your business!', 50, 750, { align: 'center', width: 500 });
  }

  private addQuoteFooter(doc: PDFKit.PDFDocument, quote: IQuote) {
    const y = 650;

    if (quote.terms) {
      doc
        .fontSize(10)
        .text('Terms:', 50, y)
        .text(quote.terms, 50, y + 15, { width: 500 });
    }

    if (quote.notes) {
      doc
        .text('Notes:', 50, y + 40)
        .text(quote.notes, 50, y + 55, { width: 500 });
    }

    // Footer
    doc
      .fontSize(8)
      .fillColor('gray')
      .text(`This quote is valid until ${this.formatDate(quote.expirationDate)}`, 50, 750, { align: 'center', width: 500 });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  async deletePDF(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('PDF file deleted', { filePath });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to delete PDF file', { error, filePath });
      throw error;
    }
  }
}

export default PDFService.getInstance();