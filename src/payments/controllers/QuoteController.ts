import { Request, Response } from 'express';
import { QuoteService } from '../services';
import { CreateQuoteRequest } from '../types';
import { AuthRequest } from '../../types';
import { logger } from '../../config/logger';

export class QuoteController {
  async createQuote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data: CreateQuoteRequest = req.body;
      const createdBy = req.user?._id?.toString() || 'system';

      const quote = await QuoteService.createQuote(data, createdBy);

      res.status(201).json({
        success: true,
        message: 'Quote created successfully',
        data: quote
      });
    } catch (error) {
      logger.error('Create quote error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async getQuote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const quote = await QuoteService.getQuote(id);

      if (!quote) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }

      res.json({
        success: true,
        data: quote
      });
    } catch (error) {
      logger.error('Get quote error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getQuoteByNumber(req: Request, res: Response): Promise<void> {
    try {
      const { number } = req.params;
      const quote = await QuoteService.getQuoteByNumber(number);

      if (!quote) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }

      res.json({
        success: true,
        data: quote
      });
    } catch (error) {
      logger.error('Get quote by number error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async listQuotes(req: Request, res: Response): Promise<void> {
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
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      };

      const result = await QuoteService.listQuotes(filters);

      res.json({
        success: true,
        data: result.quotes,
        meta: {
          page: result.page,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      logger.error('List quotes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async updateQuote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedBy = req.user?._id?.toString() || 'system';

      const quote = await QuoteService.updateQuote(id, updates, updatedBy);

      if (!quote) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Quote updated successfully',
        data: quote
      });
    } catch (error) {
      logger.error('Update quote error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async sendQuote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { recipientEmail } = req.body;

      const result = await QuoteService.sendQuote(id, recipientEmail);

      res.json({
        success: true,
        message: 'Quote sent successfully',
        data: { sent: result }
      });
    } catch (error) {
      logger.error('Send quote error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async acceptQuote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const quote = await QuoteService.acceptQuote(id);

      res.json({
        success: true,
        message: 'Quote accepted successfully',
        data: quote
      });
    } catch (error) {
      logger.error('Accept quote error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async rejectQuote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const quote = await QuoteService.rejectQuote(id, reason);

      res.json({
        success: true,
        message: 'Quote rejected',
        data: quote
      });
    } catch (error) {
      logger.error('Reject quote error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async convertToInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { dueDate } = req.body;

      const invoice = await QuoteService.convertToInvoice(
        id,
        dueDate ? new Date(dueDate) : undefined
      );

      res.status(201).json({
        success: true,
        message: 'Quote converted to invoice successfully',
        data: invoice
      });
    } catch (error) {
      logger.error('Convert quote to invoice error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async duplicateQuote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const customizations = req.body;

      const duplicateQuote = await QuoteService.duplicateQuote(id, customizations);

      res.status(201).json({
        success: true,
        message: 'Quote duplicated successfully',
        data: duplicateQuote
      });
    } catch (error) {
      logger.error('Duplicate quote error:', error);
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

      const pdfPath = await QuoteService.generatePDF(id);

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
      const quote = await QuoteService.getQuote(id);

      if (!quote) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }

      let pdfPath = quote.pdfPath;
      if (!pdfPath) {
        pdfPath = await QuoteService.generatePDF(id);
      }

      res.download(pdfPath, `Quote-${quote.quoteNumber}.pdf`);
    } catch (error) {
      logger.error('Download PDF error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download PDF',
        errors: [error]
      });
    }
  }

  async getExpiringQuotes(req: Request, res: Response): Promise<void> {
    try {
      const { days } = req.query;
      const daysNumber = days ? parseInt(days as string) : 7;

      const quotes = await QuoteService.getExpiringQuotes(daysNumber);

      res.json({
        success: true,
        data: quotes
      });
    } catch (error) {
      logger.error('Get expiring quotes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getQuoteMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const metrics = await QuoteService.getQuoteMetrics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Get quote metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async extendExpirationDate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newExpirationDate } = req.body;

      if (!newExpirationDate) {
        res.status(400).json({
          success: false,
          message: 'New expiration date is required'
        });
        return;
      }

      const quote = await QuoteService.extendExpirationDate(
        id,
        new Date(newExpirationDate)
      );

      res.json({
        success: true,
        message: 'Quote expiration date extended',
        data: quote
      });
    } catch (error) {
      logger.error('Extend expiration date error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async addLineItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lineItem = req.body;

      const quote = await QuoteService.addLineItem(id, lineItem);

      res.json({
        success: true,
        message: 'Line item added successfully',
        data: quote
      });
    } catch (error) {
      logger.error('Add line item error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async removeLineItem(req: Request, res: Response): Promise<void> {
    try {
      const { id, lineItemId } = req.params;

      const quote = await QuoteService.removeLineItem(id, lineItemId);

      res.json({
        success: true,
        message: 'Line item removed successfully',
        data: quote
      });
    } catch (error) {
      logger.error('Remove line item error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async updateLineItem(req: Request, res: Response): Promise<void> {
    try {
      const { id, lineItemId } = req.params;
      const updates = req.body;

      const quote = await QuoteService.updateLineItem(id, lineItemId, updates);

      res.json({
        success: true,
        message: 'Line item updated successfully',
        data: quote
      });
    } catch (error) {
      logger.error('Update line item error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }
}

export default new QuoteController();