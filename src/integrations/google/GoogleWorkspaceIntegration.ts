// Google Workspace Integration
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { EventEmitter } from 'events';

interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GoogleFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: string;
  webViewLink?: string;
}

export class GoogleWorkspaceIntegration extends EventEmitter {
  private oauth2Client: OAuth2Client;
  private drive: any;
  private calendar: any;
  private gmail: any;
  private sheets: any;
  private docs: any;

  constructor(config: GoogleAuthConfig) {
    super();
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    this.setupServices();
  }

  private setupServices() {
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
  }

  // Generate auth URL
  generateAuthUrl(scopes: string[]): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  // Set credentials from auth code
  async setCredentials(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    this.emit('authenticated', tokens);
  }

  // Set existing tokens
  setTokens(tokens: any): void {
    this.oauth2Client.setCredentials(tokens);
  }

  // === Google Drive Integration ===
  
  // List files
  async listDriveFiles(query?: string): Promise<GoogleFile[]> {
    try {
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
        pageSize: 100
      });

      return response.data.files || [];
    } catch (error) {
      this.emit('error', { service: 'drive', error });
      throw error;
    }
  }

  // Upload file
  async uploadFile(name: string, mimeType: string, content: Buffer): Promise<GoogleFile> {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name,
          mimeType
        },
        media: {
          mimeType,
          body: content
        },
        fields: 'id, name, mimeType, webViewLink'
      });

      this.emit('file:uploaded', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { service: 'drive', error });
      throw error;
    }
  }

  // Create folder
  async createFolder(name: string, parentId?: string): Promise<GoogleFile> {
    try {
      const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType'
      });

      return response.data;
    } catch (error) {
      this.emit('error', { service: 'drive', error });
      throw error;
    }
  }

  // Download file
  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data);
    } catch (error) {
      this.emit('error', { service: 'drive', error });
      throw error;
    }
  }

  // === Google Calendar Integration ===

  // List calendars
  async listCalendars(): Promise<any[]> {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      this.emit('error', { service: 'calendar', error });
      throw error;
    }
  }

  // Create event
  async createCalendarEvent(calendarId: string, event: any): Promise<any> {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event
      });

      this.emit('event:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { service: 'calendar', error });
      throw error;
    }
  }

  // List events
  async listEvents(calendarId: string, timeMin?: Date, timeMax?: Date): Promise<any[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin?.toISOString(),
        timeMax: timeMax?.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      this.emit('error', { service: 'calendar', error });
      throw error;
    }
  }

  // === Gmail Integration ===

  // Send email
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      const encodedMessage = Buffer.from(message).toString('base64');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      this.emit('email:sent', { to, subject });
    } catch (error) {
      this.emit('error', { service: 'gmail', error });
      throw error;
    }
  }

  // List emails
  async listEmails(query?: string, maxResults: number = 10): Promise<any[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      const messages = response.data.messages || [];
      
      // Get full message details
      const fullMessages = await Promise.all(
        messages.map(msg => 
          this.gmail.users.messages.get({
            userId: 'me',
            id: msg.id
          })
        )
      );

      return fullMessages.map(res => res.data);
    } catch (error) {
      this.emit('error', { service: 'gmail', error });
      throw error;
    }
  }

  // === Google Sheets Integration ===

  // Create spreadsheet
  async createSpreadsheet(title: string): Promise<any> {
    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: { title }
        }
      });

      this.emit('spreadsheet:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { service: 'sheets', error });
      throw error;
    }
  }

  // Read spreadsheet data
  async readSpreadsheet(spreadsheetId: string, range: string): Promise<any[][]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      return response.data.values || [];
    } catch (error) {
      this.emit('error', { service: 'sheets', error });
      throw error;
    }
  }

  // Write to spreadsheet
  async writeToSpreadsheet(
    spreadsheetId: string, 
    range: string, 
    values: any[][]
  ): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
      });

      this.emit('spreadsheet:updated', { spreadsheetId, range });
    } catch (error) {
      this.emit('error', { service: 'sheets', error });
      throw error;
    }
  }

  // Export CRM data to Sheets
  async exportToSheets(data: any[], sheetTitle: string): Promise<string> {
    try {
      // Create new spreadsheet
      const spreadsheet = await this.createSpreadsheet(sheetTitle);
      
      // Prepare headers and rows
      const headers = Object.keys(data[0] || {});
      const rows = data.map(item => headers.map(h => item[h] || ''));
      const values = [headers, ...rows];

      // Write data
      await this.writeToSpreadsheet(
        spreadsheet.spreadsheetId,
        'A1',
        values
      );

      return spreadsheet.spreadsheetUrl;
    } catch (error) {
      this.emit('error', { service: 'sheets', error });
      throw error;
    }
  }

  // === Google Docs Integration ===

  // Create document
  async createDocument(title: string): Promise<any> {
    try {
      const response = await this.docs.documents.create({
        requestBody: { title }
      });

      this.emit('document:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { service: 'docs', error });
      throw error;
    }
  }

  // Update document
  async updateDocument(documentId: string, requests: any[]): Promise<void> {
    try {
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: { requests }
      });

      this.emit('document:updated', { documentId });
    } catch (error) {
      this.emit('error', { service: 'docs', error });
      throw error;
    }
  }
}