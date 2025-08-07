import { create } from 'zustand';
import { Contact, Lead, Deal, Company, Project, DashboardStats } from '@/types';

interface CrmState {
  // Data states
  contacts: Contact[];
  leads: Lead[];
  deals: Deal[];
  companies: Company[];
  projects: Project[];
  stats: DashboardStats | null;
  
  // Loading states
  contactsLoading: boolean;
  leadsLoading: boolean;
  dealsLoading: boolean;
  companiesLoading: boolean;
  projectsLoading: boolean;
  statsLoading: boolean;
  
  // Actions
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  setContactsLoading: (loading: boolean) => void;
  
  setLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, lead: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  setLeadsLoading: (loading: boolean) => void;
  
  setDeals: (deals: Deal[]) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, deal: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  setDealsLoading: (loading: boolean) => void;
  
  setCompanies: (companies: Company[]) => void;
  addCompany: (company: Company) => void;
  updateCompany: (id: string, company: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  setCompaniesLoading: (loading: boolean) => void;
  
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setProjectsLoading: (loading: boolean) => void;
  
  setStats: (stats: DashboardStats) => void;
  setStatsLoading: (loading: boolean) => void;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  // Initial states
  contacts: [],
  leads: [],
  deals: [],
  companies: [],
  projects: [],
  stats: null,
  
  contactsLoading: false,
  leadsLoading: false,
  dealsLoading: false,
  companiesLoading: false,
  projectsLoading: false,
  statsLoading: false,
  
  // Contact actions
  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) => set((state) => ({ contacts: [...state.contacts, contact] })),
  updateContact: (id, contactData) => 
    set((state) => ({
      contacts: state.contacts.map(c => c.id === id ? { ...c, ...contactData } : c)
    })),
  deleteContact: (id) => 
    set((state) => ({ contacts: state.contacts.filter(c => c.id !== id) })),
  setContactsLoading: (contactsLoading) => set({ contactsLoading }),
  
  // Lead actions
  setLeads: (leads) => set({ leads }),
  addLead: (lead) => set((state) => ({ leads: [...state.leads, lead] })),
  updateLead: (id, leadData) => 
    set((state) => ({
      leads: state.leads.map(l => l.id === id ? { ...l, ...leadData } : l)
    })),
  deleteLead: (id) => 
    set((state) => ({ leads: state.leads.filter(l => l.id !== id) })),
  setLeadsLoading: (leadsLoading) => set({ leadsLoading }),
  
  // Deal actions
  setDeals: (deals) => set({ deals }),
  addDeal: (deal) => set((state) => ({ deals: [...state.deals, deal] })),
  updateDeal: (id, dealData) => 
    set((state) => ({
      deals: state.deals.map(d => d.id === id ? { ...d, ...dealData } : d)
    })),
  deleteDeal: (id) => 
    set((state) => ({ deals: state.deals.filter(d => d.id !== id) })),
  setDealsLoading: (dealsLoading) => set({ dealsLoading }),
  
  // Company actions
  setCompanies: (companies) => set({ companies }),
  addCompany: (company) => set((state) => ({ companies: [...state.companies, company] })),
  updateCompany: (id, companyData) => 
    set((state) => ({
      companies: state.companies.map(c => c.id === id ? { ...c, ...companyData } : c)
    })),
  deleteCompany: (id) => 
    set((state) => ({ companies: state.companies.filter(c => c.id !== id) })),
  setCompaniesLoading: (companiesLoading) => set({ companiesLoading }),
  
  // Project actions
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, projectData) => 
    set((state) => ({
      projects: state.projects.map(p => p.id === id ? { ...p, ...projectData } : p)
    })),
  deleteProject: (id) => 
    set((state) => ({ projects: state.projects.filter(p => p.id !== id) })),
  setProjectsLoading: (projectsLoading) => set({ projectsLoading }),
  
  // Stats actions
  setStats: (stats) => set({ stats }),
  setStatsLoading: (statsLoading) => set({ statsLoading }),
}));