import cron from 'node-cron';
import { InvoiceService } from '../services';
import { InvoiceStatus } from '../types';
import { logger } from '../../config/logger';

export class ReminderScheduler {
  private static instance: ReminderScheduler;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {}

  public static getInstance(): ReminderScheduler {
    if (!ReminderScheduler.instance) {
      ReminderScheduler.instance = new ReminderScheduler();
    }
    return ReminderScheduler.instance;
  }

  public startScheduler(): void {
    // Daily job to check for overdue invoices and send reminders
    const dailyReminderJob = cron.schedule('0 9 * * *', async () => {
      await this.processDailyReminders();
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    dailyReminderJob.start();
    this.jobs.set('daily-reminders', dailyReminderJob);

    logger.info('Reminder scheduler started');
  }

  public stopScheduler(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    });
    this.jobs.clear();
    logger.info('Reminder scheduler stopped');
  }

  private async processDailyReminders(): Promise<void> {
    try {
      logger.info('Processing daily payment reminders');

      // Get overdue invoices
      const overdueInvoices = await InvoiceService.getOverdueInvoices();

      for (const invoice of overdueInvoices) {
        await this.processInvoiceReminders(invoice);
      }

      logger.info(`Processed reminders for ${overdueInvoices.length} overdue invoices`);
    } catch (error) {
      logger.error('Error processing daily reminders:', error);
    }
  }

  private async processInvoiceReminders(invoice: any): Promise<void> {
    try {
      const daysPastDue = Math.ceil(
        (new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const remindersSent = invoice.remindersSent || [];
      const lastReminder = remindersSent[remindersSent.length - 1];

      // Define reminder schedule
      const reminderSchedule = [
        { days: 1, type: 'first_reminder' as const },
        { days: 7, type: 'second_reminder' as const },
        { days: 30, type: 'final_notice' as const }
      ];

      for (const reminder of reminderSchedule) {
        if (daysPastDue >= reminder.days) {
          // Check if this type of reminder was already sent
          const alreadySent = remindersSent.some(r => r.type === reminder.type);
          
          if (!alreadySent) {
            // Check if enough time has passed since last reminder (at least 24 hours)
            if (!lastReminder || this.isDaysSinceLastReminder(lastReminder.sentDate, 1)) {
              await InvoiceService.sendReminder(
                invoice._id.toString(),
                reminder.type
              );

              logger.info('Sent reminder', {
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                reminderType: reminder.type,
                daysPastDue
              });
              
              // Break after sending one reminder to avoid spam
              break;
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error processing invoice reminder:', {
        error,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber
      });
    }
  }

  private isDaysSinceLastReminder(lastReminderDate: Date, days: number): boolean {
    const timeDiff = new Date().getTime() - new Date(lastReminderDate).getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    return daysDiff >= days;
  }

  // Schedule custom reminders for specific invoices
  public scheduleCustomReminder(invoiceId: string, reminderDate: Date, reminderType: 'first_reminder' | 'second_reminder' | 'final_notice'): void {
    const jobName = `custom-reminder-${invoiceId}-${Date.now()}`;
    
    const job = cron.schedule(this.dateToCronExpression(reminderDate), async () => {
      try {
        await InvoiceService.sendReminder(invoiceId, reminderType);
        logger.info('Sent custom reminder', { invoiceId, reminderType, reminderDate });
        
        // Remove the job after execution
        this.cancelCustomReminder(jobName);
      } catch (error) {
        logger.error('Error sending custom reminder:', { error, invoiceId, reminderType });
      }
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    job.start();
    this.jobs.set(jobName, job);
    
    logger.info('Custom reminder scheduled', { invoiceId, reminderDate, reminderType });
  }

  public cancelCustomReminder(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      this.jobs.delete(jobName);
      logger.info('Custom reminder cancelled', { jobName });
    }
  }

  private dateToCronExpression(date: Date): string {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${minute} ${hour} ${day} ${month} *`;
  }

  // Get statistics about reminders
  public async getReminderStats(startDate?: Date, endDate?: Date): Promise<{
    totalReminders: number;
    remindersByType: Record<string, number>;
    successRate: number;
  }> {
    try {
      // This would typically query the database for reminder statistics
      // For now, returning mock data structure
      return {
        totalReminders: 0,
        remindersByType: {
          first_reminder: 0,
          second_reminder: 0,
          final_notice: 0
        },
        successRate: 0
      };
    } catch (error) {
      logger.error('Error getting reminder stats:', error);
      throw error;
    }
  }

  // Bulk process reminders for specific criteria
  public async processBulkReminders(criteria: {
    daysPastDue: number;
    reminderType: 'first_reminder' | 'second_reminder' | 'final_notice';
    customerId?: string;
  }): Promise<{ processed: number; failed: number }> {
    try {
      logger.info('Processing bulk reminders', criteria);

      const overdueInvoices = await InvoiceService.getOverdueInvoices(criteria.customerId);
      
      let processed = 0;
      let failed = 0;

      for (const invoice of overdueInvoices) {
        const daysPastDue = Math.ceil(
          (new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysPastDue >= criteria.daysPastDue) {
          try {
            await InvoiceService.sendReminder(
              invoice._id.toString(),
              criteria.reminderType
            );
            processed++;
          } catch (error) {
            logger.error('Failed to send bulk reminder:', {
              error,
              invoiceId: invoice._id
            });
            failed++;
          }
        }
      }

      logger.info('Bulk reminders processed', { processed, failed });
      return { processed, failed };
    } catch (error) {
      logger.error('Error processing bulk reminders:', error);
      throw error;
    }
  }
}

export default ReminderScheduler.getInstance();