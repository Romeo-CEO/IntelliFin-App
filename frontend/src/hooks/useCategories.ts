'use client';

import { useState, useEffect } from 'react';

// Mock category data structure
export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  parentId?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for managing categories
 */
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockCategories: Category[] = [
        {
          id: '1',
          name: 'Sales Revenue',
          type: 'INCOME',
          color: '#10B981',
          icon: '💰',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Office Supplies',
          type: 'EXPENSE',
          color: '#EF4444',
          icon: '📎',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Marketing',
          type: 'EXPENSE',
          color: '#8B5CF6',
          icon: '📢',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '4',
          name: 'Travel',
          type: 'EXPENSE',
          color: '#F59E0B',
          icon: '✈️',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      
      setCategories(mockCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const refetch = () => {
    fetchCategories();
  };

  return {
    categories,
    loading,
    error,
    refetch,
  };
}
