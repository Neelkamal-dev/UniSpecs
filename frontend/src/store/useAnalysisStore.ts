import { create } from 'zustand';
import { ProductAttribute, Product } from '../types';

interface AnalysisStoreState {
  activeProduct: Product | null;
  selectedAttribute: ProductAttribute | null;
  isDrawerOpen: boolean;
  activeTab: 'overview' | 'specifications' | 'sources' | 'validation' | 'enrichment' | 'evidence' | 'export';
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;

  setActiveProduct: (product: Product | null) => void;
  openDrawer: (attribute: ProductAttribute) => void;
  closeDrawer: () => void;
  setActiveTab: (tab: AnalysisStoreState['activeTab']) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setStatusFilter: (status: string) => void;
}

export const useAnalysisStore = create<AnalysisStoreState>((set) => ({
  activeProduct: null,
  selectedAttribute: null,
  isDrawerOpen: false,
  activeTab: 'overview',
  searchQuery: '',
  categoryFilter: 'ALL',
  statusFilter: 'ALL',

  setActiveProduct: (product) => set({ activeProduct: product }),
  openDrawer: (attribute) => set({ selectedAttribute: attribute, isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false, selectedAttribute: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setStatusFilter: (status) => set({ statusFilter: status }),
}));
