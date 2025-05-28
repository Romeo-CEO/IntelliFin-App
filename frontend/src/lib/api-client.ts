/**
 * API client for making HTTP requests
 */

interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.timeout = options.timeout || 30000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private async makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = this.timeout,
    } = options;

    const url = this.buildURL(endpoint, params);
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // Get auth token from localStorage if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('An unknown error occurred');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }

  setAuthToken(token: string): void {
    this.defaultHeaders.Authorization = `Bearer ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearAuthToken(): void {
    delete this.defaultHeaders.Authorization;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }
}

// Create and export a default instance
export const apiClient = new ApiClient();

// Export the class for custom instances
export { ApiClient };
export type { ApiClientOptions, RequestOptions };
