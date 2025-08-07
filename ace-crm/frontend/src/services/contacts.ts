import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { Contact, ContactForm, PaginationQuery, FilterQuery, ApiResponse } from '../types';

export const contactsService = {
  // Get all contacts with pagination and filtering
  async getContacts(params?: PaginationQuery & FilterQuery): Promise<ApiResponse<Contact[]>> {
    const response = await apiClient.get<Contact[]>(API_ENDPOINTS.contacts.list, {
      params
    });
    return response.data;
  },

  // Get contact by ID
  async getContactById(id: string): Promise<Contact> {
    const response = await apiClient.get<Contact>(API_ENDPOINTS.contacts.get(id));
    return response.data.data!;
  },

  // Create new contact
  async createContact(contactData: ContactForm): Promise<Contact> {
    const response = await apiClient.post<Contact>(
      API_ENDPOINTS.contacts.create,
      contactData
    );
    return response.data.data!;
  },

  // Update contact
  async updateContact(id: string, contactData: Partial<ContactForm>): Promise<Contact> {
    const response = await apiClient.put<Contact>(
      API_ENDPOINTS.contacts.update(id),
      contactData
    );
    return response.data.data!;
  },

  // Delete contact
  async deleteContact(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.contacts.delete(id));
  },

  // Search contacts
  async searchContacts(query: string, limit?: number): Promise<Contact[]> {
    const response = await apiClient.get<Contact[]>(API_ENDPOINTS.contacts.search, {
      params: { q: query, limit }
    });
    return response.data.data!;
  },

  // Bulk operations
  async bulkCreateContacts(contacts: ContactForm[]): Promise<Contact[]> {
    const response = await apiClient.post<Contact[]>(
      `${API_ENDPOINTS.contacts.create}/bulk`,
      { contacts }
    );
    return response.data.data!;
  },

  async bulkUpdateContacts(updates: Array<{ id: string; data: Partial<ContactForm> }>): Promise<Contact[]> {
    const response = await apiClient.patch<Contact[]>(
      `${API_ENDPOINTS.contacts.list}/bulk`,
      { updates }
    );
    return response.data.data!;
  },

  async bulkDeleteContacts(ids: string[]): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.contacts.list}/bulk`, {
      data: { ids }
    });
  },

  // Export/Import
  async exportContacts(format: 'csv' | 'json' = 'csv', filters?: FilterQuery): Promise<Blob> {
    const response = await apiClient.get(`${API_ENDPOINTS.contacts.list}/export`, {
      params: { format, ...filters },
      responseType: 'blob'
    });
    return response.data;
  },

  async importContacts(file: File): Promise<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.upload<{
      imported: number;
      errors: Array<{ row: number; error: string }>;
    }>(`${API_ENDPOINTS.contacts.list}/import`, formData);
    
    return response.data.data!;
  }
};