'use client';

import React, { useState } from 'react';
import {
  Tag,
  BarChart3,
  Sparkles,
  Settings,
  PieChart
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import CategoryManagement from '@/components/categories/CategoryManagement';
import TransactionCategorization from '@/components/transactions/TransactionCategorization';
import CategoryAnalytics from '@/components/categories/CategoryAnalytics';

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState('management');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Organize and categorize your transactions for better financial insights
        </p>
      </div>

      {/* Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('management')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Category Management</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Organize</div>
            <p className="text-xs text-muted-foreground">
              Create and manage transaction categories with hierarchical organization
            </p>
            <div className="mt-2">
              <Badge variant="outline">CRUD Operations</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('categorization')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Categorization</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Automate</div>
            <p className="text-xs text-muted-foreground">
              Use AI-powered suggestions to categorize transactions automatically
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                AI Powered
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('analytics')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analytics & Insights</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Analyze</div>
            <p className="text-xs text-muted-foreground">
              Get insights into categorization patterns and spending trends
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Insights
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="management" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Management</span>
          </TabsTrigger>
          <TabsTrigger value="categorization" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Categorization</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <PieChart className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>Category Management</span>
              </CardTitle>
              <CardDescription>
                Create, edit, and organize your transaction categories. Set up hierarchical structures
                and customize colors and icons for better visual organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <span>AI-Powered Categorization</span>
              </CardTitle>
              <CardDescription>
                Leverage artificial intelligence to automatically categorize your transactions.
                Review suggestions, apply categories in bulk, and train the system for better accuracy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionCategorization />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Category Analytics</span>
              </CardTitle>
              <CardDescription>
                Analyze your categorization patterns, view spending trends by category,
                and get insights to improve your financial organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryAnalytics />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Getting Started with Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <h4 className="font-medium">Set Up Categories</h4>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Create income and expense categories that match your business needs.
                Use the default Zambian Chart of Accounts as a starting point.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <h4 className="font-medium">Auto-Categorize</h4>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Use AI-powered categorization to automatically organize your transactions.
                The system learns from your patterns to improve accuracy over time.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <h4 className="font-medium">Analyze Trends</h4>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Review analytics to understand your spending patterns,
                identify trends, and make informed financial decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
