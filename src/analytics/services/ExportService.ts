/**
 * Advanced Export Service
 * Handles PDF, Excel, CSV exports with scheduling and email delivery
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  ExportConfig, 
  ExportFormat, 
  ExportOptions, 
  ReportConfig, 
  ScheduleConfig 
} from '../types';

interface ExportResult {
  success: boolean;
  data?: Blob;
  filename?: string;
  error?: string;
  size?: number;
}

interface EmailDeliveryOptions {
  recipients: string[];
  subject: string;
  body: string;
  attachments: Array<{
    filename: string;
    content: Blob;
    contentType: string;
  }>;
}

export class ExportService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/analytics/export') {
    this.baseUrl = baseUrl;
  }

  /**
   * Export data to various formats
   */
  async exportData(
    data: any[], 
    format: ExportFormat, 
    options: ExportOptions = {},
    filename?: string
  ): Promise<ExportResult> {
    try {
      switch (format) {
        case 'csv':
          return await this.exportToCSV(data, options.csv, filename);
        case 'excel':
          return await this.exportToExcel(data, options.excel, filename);
        case 'pdf':
          return await this.exportToPDF(data, options.pdf, filename);
        case 'json':
          return await this.exportToJSON(data, filename);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export report with visualization
   */
  async exportReport(
    reportConfig: ReportConfig,
    data: any[],
    chartBlob?: Blob,
    format: ExportFormat = 'pdf'
  ): Promise<ExportResult> {
    try {
      const filename = `${reportConfig.name}_${new Date().toISOString().split('T')[0]}`;
      
      switch (format) {
        case 'pdf':
          return await this.exportReportToPDF(reportConfig, data, chartBlob, filename);
        case 'excel':
          return await this.exportReportToExcel(reportConfig, data, chartBlob, filename);
        default:
          return await this.exportData(data, format, {}, filename);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report export failed'
      };
    }
  }

  /**
   * Schedule report for automatic delivery
   */
  async scheduleReport(
    reportConfig: ReportConfig,
    scheduleConfig: ScheduleConfig
  ): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportConfig,
          scheduleConfig
        })
      });

      if (!response.ok) {
        throw new Error(`Schedule creation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        scheduleId: result.scheduleId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Schedule creation failed'
      };
    }
  }

  /**
   * Send report via email
   */
  async emailReport(
    reportConfig: ReportConfig,
    exportResults: ExportResult[],
    recipients: string[],
    customMessage?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const attachments = exportResults
        .filter(result => result.success && result.data)
        .map(result => ({
          filename: result.filename || 'report',
          content: result.data!,
          contentType: this.getContentType(result.filename || '')
        }));

      const emailOptions: EmailDeliveryOptions = {
        recipients,
        subject: `Analytics Report: ${reportConfig.name}`,
        body: customMessage || this.generateEmailBody(reportConfig),
        attachments
      };

      const response = await fetch(`${this.baseUrl}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailOptions)
      });

      if (!response.ok) {
        throw new Error(`Email delivery failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email delivery failed'
      };
    }
  }

  /**
   * Export to CSV
   */
  private async exportToCSV(
    data: any[], 
    options: ExportOptions['csv'] = {},
    filename?: string
  ): Promise<ExportResult> {
    const {
      delimiter = ',',
      encoding = 'utf-8',
      includeHeaders = true
    } = options;

    if (!data.length) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      ...(includeHeaders ? [headers.join(delimiter)] : []),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          const stringValue = value === null || value === undefined ? '' : String(value);
          // Escape values containing delimiter or quotes
          if (stringValue.includes(delimiter) || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(delimiter)
      )
    ].join('\\n');

    const blob = new Blob([csvContent], { type: `text/csv;charset=${encoding}` });
    const finalFilename = `${filename || 'export'}.csv`;

    return {
      success: true,
      data: blob,
      filename: finalFilename,
      size: blob.size
    };
  }

  /**
   * Export to Excel
   */
  private async exportToExcel(
    data: any[],
    options: ExportOptions['excel'] = {},
    filename?: string
  ): Promise<ExportResult> {
    const {
      sheetName = 'Data',
      includeCharts = false,
      autoFilter = true,
      freezePanes
    } = options;

    if (!data.length) {
      throw new Error('No data to export');
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Apply auto filter
    if (autoFilter) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!autofilter'] = { ref: worksheet['!ref'] || 'A1' };
    }

    // Apply freeze panes
    if (freezePanes) {
      worksheet['!freeze'] = { 
        xSplit: freezePanes[1], 
        ySplit: freezePanes[0] 
      };
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });

    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const finalFilename = `${filename || 'export'}.xlsx`;

    return {
      success: true,
      data: blob,
      filename: finalFilename,
      size: blob.size
    };
  }

  /**
   * Export to PDF
   */
  private async exportToPDF(
    data: any[],
    options: ExportOptions['pdf'] = {},
    filename?: string
  ): Promise<ExportResult> {
    const {
      pageSize = 'A4',
      orientation = 'portrait',
      margins = [10, 10, 10, 10],
      header,
      footer
    } = options;

    if (!data.length) {
      throw new Error('No data to export');
    }

    const pdf = new jsPDF({
      orientation: orientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: pageSize.toLowerCase()
    });

    // Add header
    if (header) {
      pdf.setFontSize(16);
      pdf.text(header, margins[3], 20);
    }

    // Prepare table data
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(header => 
      item[header] === null || item[header] === undefined ? '' : String(item[header])
    ));

    // Add table
    (pdf as any).autoTable({
      head: [headers],
      body: rows,
      startY: header ? 30 : margins[0],
      margin: { top: margins[0], right: margins[1], bottom: margins[2], left: margins[3] },
      theme: 'striped',
      headStyles: { fillColor: [64, 133, 126] },
      alternateRowStyles: { fillColor: [240, 248, 255] }
    });

    // Add footer
    if (footer) {
      const pageCount = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        const pageHeight = pdf.internal.pageSize.height || pdf.internal.pageSize.getHeight();
        pdf.text(footer, margins[3], pageHeight - margins[2]);
      }
    }

    const pdfBlob = pdf.output('blob');
    const finalFilename = `${filename || 'export'}.pdf`;

    return {
      success: true,
      data: pdfBlob,
      filename: finalFilename,
      size: pdfBlob.size
    };
  }

  /**
   * Export to JSON
   */
  private async exportToJSON(data: any[], filename?: string): Promise<ExportResult> {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const finalFilename = `${filename || 'export'}.json`;

    return {
      success: true,
      data: blob,
      filename: finalFilename,
      size: blob.size
    };
  }

  /**
   * Export report with visualization to PDF
   */
  private async exportReportToPDF(
    reportConfig: ReportConfig,
    data: any[],
    chartBlob?: Blob,
    filename?: string
  ): Promise<ExportResult> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'A4'
    });

    const margin = 15;
    let yPosition = margin;

    // Add title
    pdf.setFontSize(20);
    pdf.text(reportConfig.name, margin, yPosition);
    yPosition += 15;

    // Add description if available
    if (reportConfig.description) {
      pdf.setFontSize(12);
      const splitDescription = pdf.splitTextToSize(reportConfig.description, 180);
      pdf.text(splitDescription, margin, yPosition);
      yPosition += splitDescription.length * 5 + 10;
    }

    // Add metadata
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Report Type: ${reportConfig.type}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Date Range: ${reportConfig.dateRange.value}`, margin, yPosition);
    yPosition += 15;

    // Add chart if provided
    if (chartBlob) {
      const chartDataUrl = await this.blobToDataUrl(chartBlob);
      pdf.addImage(chartDataUrl, 'PNG', margin, yPosition, 180, 100);
      yPosition += 110;
    }

    // Add data table
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      const rows = data.slice(0, 50).map(item => // Limit to first 50 rows for PDF
        headers.map(header => 
          item[header] === null || item[header] === undefined ? '' : String(item[header])
        )
      );

      (pdf as any).autoTable({
        head: [headers],
        body: rows,
        startY: yPosition,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: { fillColor: [64, 133, 126] },
        styles: { fontSize: 8 }
      });
    }

    const pdfBlob = pdf.output('blob');
    const finalFilename = `${filename || reportConfig.name}.pdf`;

    return {
      success: true,
      data: pdfBlob,
      filename: finalFilename,
      size: pdfBlob.size
    };
  }

  /**
   * Export report to Excel with multiple sheets
   */
  private async exportReportToExcel(
    reportConfig: ReportConfig,
    data: any[],
    chartBlob?: Blob,
    filename?: string
  ): Promise<ExportResult> {
    const workbook = XLSX.utils.book_new();

    // Add summary sheet
    const summaryData = [
      ['Report Name', reportConfig.name],
      ['Description', reportConfig.description || ''],
      ['Type', reportConfig.type],
      ['Generated', new Date().toLocaleString()],
      ['Date Range', reportConfig.dateRange.value],
      ['Total Records', data.length]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Add data sheet
    if (data.length > 0) {
      const dataSheet = XLSX.utils.json_to_sheet(data);
      dataSheet['!autofilter'] = { ref: dataSheet['!ref'] || 'A1' };
      XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');
    }

    // Add configuration sheet
    const configData = [
      ['Configuration', 'Value'],
      ['Visualization Type', reportConfig.visualization.type],
      ['Chart Title', reportConfig.visualization.title],
      ['X-Axis', reportConfig.visualization.xAxis.label],
      ['Y-Axis', reportConfig.visualization.yAxis.label],
      ['Series Count', reportConfig.visualization.series?.length || 0],
      ['Filters Applied', reportConfig.filters?.length || 0]
    ];

    const configSheet = XLSX.utils.aoa_to_sheet(configData);
    XLSX.utils.book_append_sheet(workbook, configSheet, 'Configuration');

    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });

    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const finalFilename = `${filename || reportConfig.name}.xlsx`;

    return {
      success: true,
      data: blob,
      filename: finalFilename,
      size: blob.size
    };
  }

  /**
   * Convert blob to data URL for embedding in PDF
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get content type for file extension
   */
  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      default: return 'application/octet-stream';
    }
  }

  /**
   * Generate default email body
   */
  private generateEmailBody(reportConfig: ReportConfig): string {
    return `
Dear Recipient,

Please find attached your scheduled analytics report "${reportConfig.name}".

Report Details:
- Type: ${reportConfig.type}
- Generated: ${new Date().toLocaleString()}
- Date Range: ${reportConfig.dateRange.value}

${reportConfig.description ? `Description: ${reportConfig.description}` : ''}

If you have any questions about this report, please contact your analytics team.

Best regards,
ACE CRM Analytics System
    `.trim();
  }

  /**
   * Get scheduled reports status
   */
  async getScheduledReports(): Promise<Array<{
    id: string;
    name: string;
    frequency: string;
    nextRun: Date;
    lastRun?: Date;
    status: 'active' | 'paused' | 'error';
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/schedules`);
      if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      return [];
    }
  }

  /**
   * Cancel scheduled report
   */
  async cancelScheduledReport(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/schedule/${scheduleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel schedule: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel schedule'
      };
    }
  }
}

export const exportService = new ExportService();