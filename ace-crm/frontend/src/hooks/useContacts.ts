import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsService } from '../services/contacts';
import { CACHE_KEYS } from '../config/api';
import { Contact, ContactForm, PaginationQuery, FilterQuery } from '../types';
import toast from 'react-hot-toast';

export const useContacts = (params?: PaginationQuery & FilterQuery) => {
  const queryClient = useQueryClient();

  // Get contacts query
  const contactsQuery = useQuery({
    queryKey: [...CACHE_KEYS.contacts, params],
    queryFn: () => contactsService.getContacts(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: (contactData: ContactForm) => contactsService.createContact(contactData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.contacts });
      toast.success('Contact created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create contact');
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactForm> }) =>
      contactsService.updateContact(id, data),
    onSuccess: (updatedContact) => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.contacts });
      queryClient.setQueryData(['contacts', updatedContact._id], updatedContact);
      toast.success('Contact updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update contact');
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => contactsService.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.contacts });
      toast.success('Contact deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete contact');
    },
  });

  // Bulk operations
  const bulkCreateMutation = useMutation({
    mutationFn: (contacts: ContactForm[]) => contactsService.bulkCreateContacts(contacts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.contacts });
      toast.success('Contacts imported successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import contacts');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => contactsService.bulkDeleteContacts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.contacts });
      toast.success('Contacts deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete contacts');
    },
  });

  // Export contacts
  const exportContactsMutation = useMutation({
    mutationFn: ({ format, filters }: { format: 'csv' | 'json'; filters?: FilterQuery }) =>
      contactsService.exportContacts(format, filters),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Contacts exported successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to export contacts');
    },
  });

  // Import contacts
  const importContactsMutation = useMutation({
    mutationFn: (file: File) => contactsService.importContacts(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.contacts });
      toast.success(`${result.imported} contacts imported successfully!`);
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} rows had errors. Check console for details.`);
        console.warn('Import errors:', result.errors);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import contacts');
    },
  });

  return {
    // Data
    contacts: contactsQuery.data?.data || [],
    meta: contactsQuery.data?.meta,

    // Loading states
    isLoading: contactsQuery.isLoading,
    isCreating: createContactMutation.isPending,
    isUpdating: updateContactMutation.isPending,
    isDeleting: deleteContactMutation.isPending,
    isBulkCreating: bulkCreateMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isExporting: exportContactsMutation.isPending,
    isImporting: importContactsMutation.isPending,

    // Error states
    error: contactsQuery.error,

    // Actions
    createContact: createContactMutation.mutate,
    updateContact: updateContactMutation.mutate,
    deleteContact: deleteContactMutation.mutate,
    bulkCreateContacts: bulkCreateMutation.mutate,
    bulkDeleteContacts: bulkDeleteMutation.mutate,
    exportContacts: exportContactsMutation.mutate,
    importContacts: importContactsMutation.mutate,
    refetch: contactsQuery.refetch,
  };
};

export const useContact = (id: string) => {
  const contactQuery = useQuery({
    queryKey: ['contacts', id],
    queryFn: () => contactsService.getContactById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    contact: contactQuery.data,
    isLoading: contactQuery.isLoading,
    error: contactQuery.error,
    refetch: contactQuery.refetch,
  };
};

export const useContactSearch = () => {
  const searchContactsMutation = useMutation({
    mutationFn: ({ query, limit }: { query: string; limit?: number }) =>
      contactsService.searchContacts(query, limit),
  });

  return {
    searchContacts: searchContactsMutation.mutate,
    results: searchContactsMutation.data || [],
    isSearching: searchContactsMutation.isPending,
    searchError: searchContactsMutation.error,
  };
};