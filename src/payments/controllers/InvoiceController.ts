import { Request, Response } from 'express';
import { InvoiceService } from '../services';
import { CreateInvoiceRequest, InvoiceStatus } from '../types';
import { AuthRequest } from '../../types';
import { logger } from '../../config/logger';

export class InvoiceController {
  async createInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data: CreateInvoiceRequest = req.body;
      const createdBy = req.user?._id?.toString() || 'system';

      const invoice = await InvoiceService.createInvoice(data, createdBy);

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice
      });
    } catch (error) {
      logger.error('Create invoice error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async getInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await InvoiceService.getInvoice(id);

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
        return;
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      logger.error('Get invoice error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getInvoiceByNumber(req: Request, res: Response): Promise<void> {
    try {
      const { number } = req.params;
      const invoice = await InvoiceService.getInvoiceByNumber(number);

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
        return;
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      logger.error('Get invoice by number error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async listInvoices(req: Request, res: Response): Promise<void> {
    try {
      const {
        customerId,
        companyId,
        status,
        startDate,
        endDate,
        page,
        limit
      } = req.query;

      const filters = {
        customerId: customerId as string,
        companyId: companyId as string,
        status: status as InvoiceStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      };

      const result = await InvoiceService.listInvoices(filters);

      res.json({
        success: true,
        data: result.invoices,
        meta: {
          page: result.page,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      logger.error('List invoices error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async updateInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedBy = req.user?._id?.toString() || 'system';

      const invoice = await InvoiceService.updateInvoice(id, updates, updatedBy);

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Invoice updated successfully',
        data: invoice
      });
    } catch (error) {
      logger.error('Update invoice error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async sendInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { recipientEmail } = req.body;

      const result = await InvoiceService.sendInvoice(id, recipientEmail);

      res.json({
        success: true,
        message: 'Invoice sent successfully',
        data: { sent: result }
      });
    } catch (error) {
      logger.error('Send invoice error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async markAsViewed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await InvoiceService.markAsViewed(id);

      res.json({
        success: true,
        message: 'Invoice marked as viewed'
      });
    } catch (error) {
      logger.error('Mark invoice as viewed error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async markAsPaid(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { paymentAmount, paidDate } = req.body;

      await InvoiceService.markAsPaid(
        id,
        paymentAmount,
        paidDate ? new Date(paidDate) : undefined
      );

      res.json({
        success: true,
        message: 'Invoice marked as paid'
      });
    } catch (error) {
      logger.error('Mark invoice as paid error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async cancelInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await InvoiceService.cancelInvoice(id, reason);

      res.json({
        success: true,
        message: 'Invoice cancelled successfully'
      });
    } catch (error) {
      logger.error('Cancel invoice error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async sendReminder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reminderType, customEmail } = req.body;

      const result = await InvoiceService.sendReminder(id, reminderType, customEmail);

      res.json({
        success: true,
        message: 'Reminder sent successfully',
        data: { sent: result }
      });
    } catch (error) {
      logger.error('Send reminder error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async generatePDF(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pdfPath = await InvoiceService.generatePDF(id);

      res.json({
        success: true,
        message: 'PDF generated successfully',
        data: { pdfPath }
      });
    } catch (error) {
      logger.error('Generate PDF error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async downloadPDF(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await InvoiceService.getInvoice(id);

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
        return;
      }

      let pdfPath = invoice.pdfPath;
      if (!pdfPath) {
        pdfPath = await InvoiceService.generatePDF(id);
      }

      res.download(pdfPath, `Invoice-${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      logger.error('Download PDF error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download PDF',
        errors: [error]
      });
    }
  }

  async getOverdueInvoices(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.query;

      const invoices = await InvoiceService.getOverdueInvoices(customerId as string);

      res.json({
        success: true,
        data: invoices
      });
    } catch (error) {
      logger.error('Get overdue invoices error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async duplicateInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const customizations = req.body;

      const duplicateInvoice = await InvoiceService.duplicateInvoice(id, customizations);

      res.status(201).json({
        success: true,
        message: 'Invoice duplicated successfully',
        data: duplicateInvoice
      });
    } catch (error) {
      logger.error('Duplicate invoice error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async getFinancialSummary(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const summary = await InvoiceService.getFinancialSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Get financial summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getRevenueReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }

      const report = await InvoiceService.getRevenueReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Get revenue report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }
}

export default new InvoiceController();