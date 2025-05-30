'use client';

import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3,
  Calendar,
  Filter,
  Download,
  Loader2,
  Tag
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategoryAnalytics {
  totalCategories: number;
  categoriesByType: {
    INCOME: number;
    EXPENSE: number;
  };
  categorizedTransactions: number;
  uncategorizedTransactions: number;
  topCategories: Array<{
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    transactionCount: number;
    totalAmount: number;
    percentage: number;
  }>;
  categoryUsageOverTime: Array<{
    date: string;
    categorized: number;
    uncategorized: number;
  }>;
}

interface DateRange {
  from: Date;
  to: Date;
}

export function CategoryAnalytics() {
  const [analytics, setAnalytics] = useState<CategoryAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [selectedType, setSelectedType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
      });

      const response = await fetch(`/api/categories/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      toast.error('Failed to load analytics');
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
    }).format(amount);
  };

  const formatPercentage = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  const getFilteredTopCategories = () => {
    if (!analytics) return [];
    
    if (selectedType === 'all') {
      return analytics.topCategories;
    }
    
    return analytics.topCategories.filter(cat => cat.type === selectedType);
  };

  const exportAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
        format: 'csv',
      });

      const response = await fetch(`/api/categories/analytics/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export analytics');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `category-analytics-${dateRange.from.toISOString().split('T')[0]}-${dateRange.to.toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Analytics exported successfully');
    } catch (error) {
      toast.error('Failed to export analytics');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No analytics data available.</p>
      </div>
    );
  }

  const categorizationRate = analytics.categorizedTransactions + analytics.uncategorizedTransactions > 0
    ? (analytics.categorizedTransactions / (analytics.categorizedTransactions + analytics.uncategorizedTransactions)) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Category Analytics</h2>
          <p className="text-gray-600">
            Insights into your transaction categorization patterns
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <DatePickerWithRange
                date={dateRange}
                onDateChange={(range) => range && setDateRange(range)}
              />
            </div>
            
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as 'all' | 'INCOME' | 'EXPENSE')}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="INCOME">Income Only</SelectItem>
                <SelectItem value="EXPENSE">Expense Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.categoriesByType.INCOME} income, {analytics.categoriesByType.EXPENSE} expense
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorization Rate</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(categorizationRate)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.categorizedTransactions} of {analytics.categorizedTransactions + analytics.uncategorizedTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorized Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.categorizedTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully categorized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uncategorized Transactions</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics.uncategorizedTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              Need categorization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top Categories by Usage</CardTitle>
          <CardDescription>
            Categories with the highest transaction volume and amounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getFilteredTopCategories().length > 0 ? (
              getFilteredTopCategories().map((category, index) => (
                <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{category.name}</h4>
                        <Badge variant={category.type === 'INCOME' ? 'default' : 'secondary'}>
                          {category.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {category.transactionCount} transactions
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(category.totalAmount)}</p>
                    <p className="text-sm text-gray-500">
                      {formatPercentage(category.percentage)} of total
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No category data available for the selected filters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Categorization Trend</CardTitle>
          <CardDescription>
            Daily categorization progress over the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.categoryUsageOverTime.length > 0 ? (
              <div className="space-y-2">
                {analytics.categoryUsageOverTime.slice(-7).map((day, index) => {
                  const total = day.categorized + day.uncategorized;
                  const categorizedPercentage = total > 0 ? (day.categorized / total) * 100 : 0;
                  
                  return (
                    <div key={day.date} className="flex items-center space-x-4">
                      <div className="w-20 text-sm text-gray-500">
                        {new Date(day.date).toLocaleDateString('en-ZM', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium">
                            {day.categorized} categorized
                          </span>
                          <span className="text-sm text-gray-500">
                            {day.uncategorized} uncategorized
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${categorizedPercentage}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="w-16 text-right text-sm font-medium">
                        {formatPercentage(categorizedPercentage)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No usage data available for the selected period.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categorizationRate < 80 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800">Improve Categorization Rate</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Your categorization rate is {formatPercentage(categorizationRate)}. 
                  Consider using auto-categorization or creating more categorization rules to improve efficiency.
                </p>
              </div>
            )}

            {analytics.uncategorizedTransactions > 50 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800">Bulk Categorization Opportunity</h4>
                <p className="text-sm text-blue-700 mt-1">
                  You have {analytics.uncategorizedTransactions} uncategorized transactions. 
                  Use the bulk categorization feature to process them efficiently.
                </p>
              </div>
            )}

            {analytics.totalCategories < 5 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800">Consider More Categories</h4>
                <p className="text-sm text-green-700 mt-1">
                  You have {analytics.totalCategories} categories. 
                  Adding more specific categories can provide better insights into your spending patterns.
                </p>
              </div>
            )}

            {categorizationRate >= 90 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800">Excellent Categorization!</h4>
                <p className="text-sm text-green-700 mt-1">
                  Your categorization rate of {formatPercentage(categorizationRate)} is excellent. 
                  Keep up the good work maintaining organized financial records.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CategoryAnalytics;
