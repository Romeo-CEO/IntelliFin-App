'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Folder,
  FolderOpen,
  Tag,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { CategoryForm } from './CategoryForm';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  parentId: string | null;
  description: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  children?: Category[];
  transactionCount?: number;
  totalAmount?: number;
  lastUsed?: string | null;
}

interface CategoryFilters {
  type?: 'INCOME' | 'EXPENSE';
  search?: string;
  isActive?: boolean;
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [filters, setFilters] = useState<CategoryFilters>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [categories, filters]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/categories/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...categories];

    if (filters.type) {
      filtered = filtered.filter(cat => cat.type === filters.type);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(searchLower) ||
        (cat.description && cat.description.toLowerCase().includes(searchLower))
      );
    }

    if (filters.isActive !== undefined) {
      filtered = filtered.filter(cat => cat.isActive === filters.isActive);
    }

    setFilteredCategories(filtered);
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete category');
      }

      toast.success('Category deleted successfully');
      setDeleteCategory(null);
      fetchCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  const handleFormSubmit = async (categoryData: any) => {
    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save category');
      }

      toast.success(editingCategory ? 'Category updated successfully' : 'Category created successfully');
      setShowForm(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category');
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return 'ZMW 0.00';
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
    }).format(amount);
  };

  const formatLastUsed = (lastUsed: string | null | undefined): string => {
    if (!lastUsed) return 'Never';
    
    const date = new Date(lastUsed);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getCategoryIcon = (category: Category) => {
    if (category.children && category.children.length > 0) {
      return expandedCategories.has(category.id) ? (
        <FolderOpen className="h-4 w-4" />
      ) : (
        <Folder className="h-4 w-4" />
      );
    }
    return <Tag className="h-4 w-4" />;
  };

  const getTypeIcon = (type: string) => {
    return type === 'INCOME' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="space-y-2">
        <div 
          className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
            level > 0 ? 'ml-6 border-l-2 border-gray-200' : ''
          }`}
          style={{ marginLeft: level * 24 }}
        >
          <div className="flex items-center space-x-3 flex-1">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => hasChildren && toggleCategoryExpansion(category.id)}
            >
              {getCategoryIcon(category)}
              <div 
                className="w-4 h-4 rounded-full border-2"
                style={{ 
                  backgroundColor: category.color || '#6B7280',
                  borderColor: category.color || '#6B7280'
                }}
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">{category.name}</h4>
                {getTypeIcon(category.type)}
                {!category.isActive && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              {category.description && (
                <p className="text-sm text-gray-500">{category.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium">
                {category.transactionCount || 0} transactions
              </p>
              <p className="text-sm text-gray-500">
                {formatCurrency(category.totalAmount)}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-500">Last used</p>
              <p className="text-xs">{formatLastUsed(category.lastUsed)}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteCategory(category)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Category Management</h2>
          <p className="text-gray-600">
            Organize your transactions with custom categories
          </p>
        </div>
        
        <Button onClick={handleCreateCategory}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search categories..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />
            </div>
            
            <Select
              value={filters.type || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                type: value === 'all' ? undefined : value as 'INCOME' | 'EXPENSE'
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                isActive: value === 'all' ? undefined : value === 'active'
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setFilters({})}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>Categories ({filteredCategories.length})</CardTitle>
          <CardDescription>
            Manage your transaction categories and view usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(category => renderCategory(category))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No categories found matching your filters.</p>
                <Button 
                  variant="outline" 
                  onClick={handleCreateCategory}
                  className="mt-4"
                >
                  Create Your First Category
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Form Modal */}
      {showForm && (
        <CategoryForm
          category={editingCategory}
          categories={categories}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingCategory(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteCategory?.name}"? This action cannot be undone.
              {deleteCategory?.transactionCount && deleteCategory.transactionCount > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: This category is used in {deleteCategory.transactionCount} transaction(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCategory && handleDeleteCategory(deleteCategory)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CategoryManagement;
