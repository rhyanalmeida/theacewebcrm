import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { FileUpload } from '../types';

export const filesService = {
  // Upload single file with progress tracking
  async uploadFile(
    file: File,
    onUploadProgress?: (progress: number) => void
  ): Promise<{
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    url: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.upload<{
      id: string;
      filename: string;
      originalName: string;
      size: number;
      mimeType: string;
      url: string;
    }>(
      API_ENDPOINTS.files.upload,
      formData,
      onUploadProgress ? (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onUploadProgress(progress);
      } : undefined
    );

    return response.data.data!;
  },

  // Upload multiple files
  async uploadMultipleFiles(
    files: File[],
    onUploadProgress?: (fileIndex: number, progress: number) => void
  ): Promise<Array<{
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    url: string;
  }>> {
    const uploadPromises = files.map((file, index) =>
      this.uploadFile(file, onUploadProgress ? (progress) => onUploadProgress(index, progress) : undefined)
    );

    return Promise.all(uploadPromises);
  },

  // Download file
  async downloadFile(id: string, filename?: string): Promise<void> {
    const response = await apiClient.get(API_ENDPOINTS.files.download(id), {
      responseType: 'blob'
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Delete file
  async deleteFile(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.files.delete(id));
  },

  // Get file info
  async getFileInfo(id: string): Promise<{
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    url: string;
    uploadedBy: string;
    createdAt: string;
  }> {
    const response = await apiClient.get<{
      id: string;
      filename: string;
      originalName: string;
      size: number;
      mimeType: string;
      url: string;
      uploadedBy: string;
      createdAt: string;
    }>(API_ENDPOINTS.files.download(id));
    return response.data.data!;
  },

  // Utility methods
  validateFile(file: File, options?: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  }): { isValid: boolean; error?: string } {
    const { maxSize = 10 * 1024 * 1024, allowedTypes } = options || {}; // Default 10MB

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`
      };
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    return { isValid: true };
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};