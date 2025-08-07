import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { filesService } from '../services/files';
import { FileUpload } from '../types';
import toast from 'react-hot-toast';

export const useFileUpload = () => {
  const [uploads, setUploads] = useState<Map<string, FileUpload>>(new Map());

  // Single file upload
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) => {
      return filesService.uploadFile(file, onProgress);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload file');
    },
  });

  // Multiple file upload
  const uploadMultipleFilesMutation = useMutation({
    mutationFn: async ({ 
      files, 
      onProgress 
    }: { 
      files: File[]; 
      onProgress?: (fileIndex: number, progress: number) => void 
    }) => {
      return filesService.uploadMultipleFiles(files, onProgress);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload files');
    },
  });

  // Add file to upload queue
  const addFile = useCallback((file: File) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const fileUpload: FileUpload = {
      file,
      progress: 0,
      status: 'pending',
    };

    setUploads(prev => new Map(prev).set(id, fileUpload));
    return id;
  }, []);

  // Upload single file with progress tracking
  const uploadFile = useCallback(async (fileId: string) => {
    const fileUpload = uploads.get(fileId);
    if (!fileUpload) {
      throw new Error('File not found in upload queue');
    }

    // Validate file
    const validation = filesService.validateFile(fileUpload.file);
    if (!validation.isValid) {
      setUploads(prev => {
        const newUploads = new Map(prev);
        const upload = newUploads.get(fileId)!;
        upload.status = 'error';
        upload.error = validation.error;
        return newUploads;
      });
      throw new Error(validation.error);
    }

    // Update status to uploading
    setUploads(prev => {
      const newUploads = new Map(prev);
      const upload = newUploads.get(fileId)!;
      upload.status = 'uploading';
      return newUploads;
    });

    try {
      const result = await uploadFileMutation.mutateAsync({
        file: fileUpload.file,
        onProgress: (progress) => {
          setUploads(prev => {
            const newUploads = new Map(prev);
            const upload = newUploads.get(fileId);
            if (upload) {
              upload.progress = progress;
            }
            return newUploads;
          });
        }
      });

      // Update status to success
      setUploads(prev => {
        const newUploads = new Map(prev);
        const upload = newUploads.get(fileId)!;
        upload.status = 'success';
        upload.progress = 100;
        return newUploads;
      });

      toast.success('File uploaded successfully!');
      return result;
    } catch (error: any) {
      // Update status to error
      setUploads(prev => {
        const newUploads = new Map(prev);
        const upload = newUploads.get(fileId)!;
        upload.status = 'error';
        upload.error = error.message;
        return newUploads;
      });
      throw error;
    }
  }, [uploads, uploadFileMutation]);

  // Upload multiple files
  const uploadMultipleFiles = useCallback(async (fileIds: string[]) => {
    const filesToUpload = fileIds
      .map(id => uploads.get(id))
      .filter(Boolean) as FileUpload[];

    if (filesToUpload.length === 0) {
      throw new Error('No valid files found in upload queue');
    }

    // Validate all files first
    const validationErrors: string[] = [];
    filesToUpload.forEach((fileUpload, index) => {
      const validation = filesService.validateFile(fileUpload.file);
      if (!validation.isValid) {
        validationErrors.push(`File ${index + 1}: ${validation.error}`);
      }
    });

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    // Update all statuses to uploading
    fileIds.forEach(fileId => {
      setUploads(prev => {
        const newUploads = new Map(prev);
        const upload = newUploads.get(fileId);
        if (upload) {
          upload.status = 'uploading';
        }
        return newUploads;
      });
    });

    try {
      const results = await uploadMultipleFilesMutation.mutateAsync({
        files: filesToUpload.map(f => f.file),
        onProgress: (fileIndex, progress) => {
          const fileId = fileIds[fileIndex];
          setUploads(prev => {
            const newUploads = new Map(prev);
            const upload = newUploads.get(fileId);
            if (upload) {
              upload.progress = progress;
            }
            return newUploads;
          });
        }
      });

      // Update all statuses to success
      fileIds.forEach(fileId => {
        setUploads(prev => {
          const newUploads = new Map(prev);
          const upload = newUploads.get(fileId);
          if (upload) {
            upload.status = 'success';
            upload.progress = 100;
          }
          return newUploads;
        });
      });

      toast.success(`${results.length} files uploaded successfully!`);
      return results;
    } catch (error: any) {
      // Update all statuses to error
      fileIds.forEach(fileId => {
        setUploads(prev => {
          const newUploads = new Map(prev);
          const upload = newUploads.get(fileId);
          if (upload) {
            upload.status = 'error';
            upload.error = error.message;
          }
          return newUploads;
        });
      });
      throw error;
    }
  }, [uploads, uploadMultipleFilesMutation]);

  // Remove file from upload queue
  const removeFile = useCallback((fileId: string) => {
    setUploads(prev => {
      const newUploads = new Map(prev);
      newUploads.delete(fileId);
      return newUploads;
    });
  }, []);

  // Clear all uploads
  const clearUploads = useCallback(() => {
    setUploads(new Map());
  }, []);

  // Get upload status
  const getUploadStatus = useCallback((fileId: string) => {
    return uploads.get(fileId);
  }, [uploads]);

  // Get all uploads as array
  const getAllUploads = useCallback(() => {
    return Array.from(uploads.entries()).map(([id, upload]) => ({
      id,
      ...upload
    }));
  }, [uploads]);

  return {
    // State
    uploads: getAllUploads(),
    isUploading: uploadFileMutation.isPending || uploadMultipleFilesMutation.isPending,

    // Actions
    addFile,
    uploadFile,
    uploadMultipleFiles,
    removeFile,
    clearUploads,
    getUploadStatus,

    // Utils
    validateFile: filesService.validateFile,
    formatFileSize: filesService.formatFileSize,
  };
};

// Hook for drag and drop functionality
export const useDragAndDrop = (
  onFilesAdded: (files: File[]) => void,
  options?: {
    maxFiles?: number;
    maxSize?: number;
    allowedTypes?: string[];
  }
) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    
    // Apply filters
    let filteredFiles = files;

    if (options?.maxFiles && filteredFiles.length > options.maxFiles) {
      toast.error(`Maximum ${options.maxFiles} files allowed`);
      filteredFiles = filteredFiles.slice(0, options.maxFiles);
    }

    if (options?.allowedTypes) {
      const invalidFiles = filteredFiles.filter(file => 
        !options.allowedTypes!.includes(file.type)
      );
      if (invalidFiles.length > 0) {
        toast.error(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`);
        filteredFiles = filteredFiles.filter(file => 
          options.allowedTypes!.includes(file.type)
        );
      }
    }

    if (options?.maxSize) {
      const oversizedFiles = filteredFiles.filter(file => file.size > options.maxSize!);
      if (oversizedFiles.length > 0) {
        toast.error(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}`);
        filteredFiles = filteredFiles.filter(file => file.size <= options.maxSize!);
      }
    }

    if (filteredFiles.length > 0) {
      onFilesAdded(filteredFiles);
    }
  }, [onFilesAdded, options]);

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };

  return {
    isDragActive,
    dragProps,
  };
};