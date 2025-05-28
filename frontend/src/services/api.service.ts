import { apiRequest } from '../config/api';

/**
 * API client service for making HTTP requests
 * Provides a consistent interface for all API calls
 */
class ApiService {
  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, config?: { params?: Record<string, any> }): Promise<{ data: T }> {
    const url = config?.params ? this.buildUrlWithParams(endpoint, config.params) : endpoint;
    const data = await apiRequest<T>(url, { method: 'GET' });
    return { data };
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, data?: any, config?: RequestInit): Promise<{ data: T }> {
    const response = await apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
    return { data: response };
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, data?: any, config?: RequestInit): Promise<{ data: T }> {
    const response = await apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
    return { data: response };
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(endpoint: string, data?: any, config?: RequestInit): Promise<{ data: T }> {
    const response = await apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
    return { data: response };
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, config?: RequestInit): Promise<{ data: T }> {
    const response = await apiRequest<T>(endpoint, {
      method: 'DELETE',
      ...config,
    });
    return { data: response };
  }

  /**
   * Build URL with query parameters
   */
  private buildUrlWithParams(endpoint: string, params: Record<string, any>): string {
    const url = new URL(endpoint, 'http://localhost'); // Base URL is not used, just for URL construction
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return url.pathname + url.search;
  }
}

export const apiClient = new ApiService();
