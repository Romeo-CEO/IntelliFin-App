import { apiClient } from './api.service';
import { Dashboard, DashboardWidget, CreateDashboardData, UpdateDashboardData, CreateWidgetData, UpdateWidgetData } from '../types/dashboard.types';

/**
 * Dashboard service for API communication
 * Handles all dashboard and widget-related API calls
 */
class DashboardService {
  private readonly baseUrl = '/dashboards';

  /**
   * Get all dashboards for the current organization
   */
  async getDashboards(includePrivate = false): Promise<Dashboard[]> {
    const response = await apiClient.get<Dashboard[]>(this.baseUrl, {
      params: { includePrivate },
    });
    return response.data;
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(id: string): Promise<Dashboard> {
    const response = await apiClient.get<Dashboard>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Get default dashboard for organization
   */
  async getDefaultDashboard(): Promise<Dashboard | null> {
    try {
      const response = await apiClient.get<Dashboard>(`${this.baseUrl}/default`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(data: CreateDashboardData): Promise<Dashboard> {
    const response = await apiClient.post<Dashboard>(this.baseUrl, data);
    return response.data;
  }

  /**
   * Update dashboard
   */
  async updateDashboard(id: string, data: UpdateDashboardData): Promise<Dashboard> {
    const response = await apiClient.put<Dashboard>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  /**
   * Update dashboard layout
   */
  async updateDashboardLayout(id: string, layout: any): Promise<Dashboard> {
    const response = await apiClient.put<Dashboard>(`${this.baseUrl}/${id}/layout`, layout);
    return response.data;
  }

  /**
   * Set dashboard as default
   */
  async setAsDefault(id: string): Promise<Dashboard> {
    const response = await apiClient.put<Dashboard>(`${this.baseUrl}/${id}/default`);
    return response.data;
  }

  /**
   * Duplicate dashboard
   */
  async duplicateDashboard(id: string, name?: string): Promise<Dashboard> {
    const response = await apiClient.post<Dashboard>(`${this.baseUrl}/${id}/duplicate`, { name });
    return response.data;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Get widgets for a dashboard
   */
  async getWidgets(dashboardId: string, includeHidden = false): Promise<DashboardWidget[]> {
    const response = await apiClient.get<DashboardWidget[]>(`${this.baseUrl}/${dashboardId}/widgets`, {
      params: { includeHidden },
    });
    return response.data;
  }

  /**
   * Create a new widget
   */
  async createWidget(dashboardId: string, data: CreateWidgetData): Promise<DashboardWidget> {
    const response = await apiClient.post<DashboardWidget>(`${this.baseUrl}/${dashboardId}/widgets`, data);
    return response.data;
  }

  /**
   * Get widget by ID
   */
  async getWidget(id: string): Promise<DashboardWidget> {
    const response = await apiClient.get<DashboardWidget>(`/widgets/${id}`);
    return response.data;
  }

  /**
   * Update widget
   */
  async updateWidget(id: string, data: UpdateWidgetData): Promise<DashboardWidget> {
    const response = await apiClient.put<DashboardWidget>(`/widgets/${id}`, data);
    return response.data;
  }

  /**
   * Update widget position
   */
  async updateWidgetPosition(id: string, position: any): Promise<DashboardWidget> {
    const response = await apiClient.put<DashboardWidget>(`/widgets/${id}/position`, { position });
    return response.data;
  }

  /**
   * Toggle widget visibility
   */
  async toggleWidgetVisibility(id: string): Promise<DashboardWidget> {
    const response = await apiClient.put<DashboardWidget>(`/widgets/${id}/visibility`);
    return response.data;
  }

  /**
   * Delete widget
   */
  async deleteWidget(id: string): Promise<void> {
    await apiClient.delete(`/widgets/${id}`);
  }

  /**
   * Bulk update widget positions
   */
  async bulkUpdatePositions(dashboardId: string, updates: Array<{ id: string; position: any }>): Promise<void> {
    await apiClient.put(`${this.baseUrl}/${dashboardId}/widgets/positions`, { updates });
  }

  /**
   * Get widget data from data source
   */
  async getWidgetData(widgetId: string, params?: Record<string, any>): Promise<any> {
    const response = await apiClient.get(`/widgets/${widgetId}/data`, { params });
    return response.data;
  }

  /**
   * Refresh widget data
   */
  async refreshWidgetData(widgetId: string): Promise<any> {
    const response = await apiClient.post(`/widgets/${widgetId}/refresh`);
    return response.data;
  }

  /**
   * Export dashboard configuration
   */
  async exportDashboard(id: string): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/export`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Import dashboard configuration
   */
  async importDashboard(file: File): Promise<Dashboard> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<Dashboard>(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(id: string, period = '30d'): Promise<any> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/analytics`, {
      params: { period },
    });
    return response.data;
  }

  /**
   * Get widget templates
   */
  async getWidgetTemplates(): Promise<any[]> {
    const response = await apiClient.get('/widget-templates');
    return response.data;
  }

  /**
   * Create widget from template
   */
  async createWidgetFromTemplate(dashboardId: string, templateId: string, data: any): Promise<DashboardWidget> {
    const response = await apiClient.post<DashboardWidget>(
      `${this.baseUrl}/${dashboardId}/widgets/from-template`,
      { templateId, ...data }
    );
    return response.data;
  }

  /**
   * Save widget as template
   */
  async saveWidgetAsTemplate(widgetId: string, templateData: any): Promise<any> {
    const response = await apiClient.post(`/widgets/${widgetId}/save-as-template`, templateData);
    return response.data;
  }

  /**
   * Get dashboard sharing settings
   */
  async getSharingSettings(id: string): Promise<any> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/sharing`);
    return response.data;
  }

  /**
   * Update dashboard sharing settings
   */
  async updateSharingSettings(id: string, settings: any): Promise<any> {
    const response = await apiClient.put(`${this.baseUrl}/${id}/sharing`, settings);
    return response.data;
  }

  /**
   * Generate dashboard share link
   */
  async generateShareLink(id: string, options: any): Promise<{ shareUrl: string; expiresAt: string }> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/share-link`, options);
    return response.data;
  }

  /**
   * Revoke dashboard share link
   */
  async revokeShareLink(id: string, linkId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}/share-link/${linkId}`);
  }

  /**
   * Get dashboard performance metrics
   */
  async getPerformanceMetrics(id: string): Promise<any> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/performance`);
    return response.data;
  }

  /**
   * Optimize dashboard performance
   */
  async optimizeDashboard(id: string): Promise<any> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/optimize`);
    return response.data;
  }

  /**
   * Get dashboard usage statistics
   */
  async getUsageStatistics(id: string, period = '30d'): Promise<any> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/usage`, {
      params: { period },
    });
    return response.data;
  }

  /**
   * Create default dashboard for new organization
   */
  async createDefaultDashboard(): Promise<Dashboard> {
    const response = await apiClient.post<Dashboard>(`${this.baseUrl}/create-default`);
    return response.data;
  }

  /**
   * Get dashboard themes
   */
  async getThemes(): Promise<any[]> {
    const response = await apiClient.get('/dashboard-themes');
    return response.data;
  }

  /**
   * Apply theme to dashboard
   */
  async applyTheme(id: string, themeId: string): Promise<Dashboard> {
    const response = await apiClient.put<Dashboard>(`${this.baseUrl}/${id}/theme`, { themeId });
    return response.data;
  }
}

export const dashboardService = new DashboardService();
