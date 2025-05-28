import { API_BASE_URL } from '../config/api';

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  zraTin?: string;
  paymentTerms: number;
  creditLimit?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zraTin?: string;
  paymentTerms?: number;
  creditLimit?: number;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {}

export interface CustomerQuery {
  search?: string;
  isActive?: boolean;
  city?: string;
  hasZraTin?: boolean;
  paymentTermsMin?: number;
  paymentTermsMax?: number;
  creditLimitMin?: number;
  creditLimitMax?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  withZraTin: number;
  averagePaymentTerms: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  details: {
    successful: any[];
    failed: any[];
  };
}

class CustomerService {
  private baseUrl = `${API_BASE_URL}/customers`;

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getCustomers(query: CustomerQuery = {}): Promise<CustomerListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<CustomerListResponse>(response);
  }

  async getCustomerById(id: string, includeStats = false): Promise<Customer> {
    const params = includeStats ? '?includeStats=true' : '';
    const response = await fetch(`${this.baseUrl}/${id}${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Customer>(response);
  }

  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<Customer>(response);
  }

  async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<Customer>(response);
  }

  async deleteCustomer(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  }

  async getCustomerStats(): Promise<CustomerStats> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<CustomerStats>(response);
  }

  async searchCustomers(searchTerm: string, limit = 10): Promise<Customer[]> {
    const params = new URLSearchParams({
      q: searchTerm,
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Customer[]>(response);
  }

  async getCustomersForSelect(): Promise<Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    zraTin?: string;
  }>> {
    const response = await fetch(`${this.baseUrl}/select-options`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Array<{
      id: string;
      name: string;
      email?: string;
      phone?: string;
      zraTin?: string;
    }>>(response);
  }

  async importCustomersFromCsv(
    file: File,
    options: { skipDuplicates?: boolean; updateExisting?: boolean } = {}
  ): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.skipDuplicates !== undefined) {
      formData.append('skipDuplicates', options.skipDuplicates.toString());
    }
    
    if (options.updateExisting !== undefined) {
      formData.append('updateExisting', options.updateExisting.toString());
    }

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${this.baseUrl}/import`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    return this.handleResponse<ImportResult>(response);
  }

  async exportCustomersToCsv(includeInactive = false): Promise<Blob> {
    const params = includeInactive ? '?includeInactive=true' : '';
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${this.baseUrl}/export/csv${params}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  async exportCustomersToJson(includeInactive = false): Promise<Customer[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    const response = await fetch(`${this.baseUrl}/export/json${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Customer[]>(response);
  }

  async downloadImportTemplate(): Promise<Blob> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${this.baseUrl}/import/template`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  // Utility methods
  formatZraTin(tin?: string): string {
    if (!tin) return '';
    const cleaned = tin.replace(/\s/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return cleaned;
  }

  validateZraTin(tin: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!tin) {
      return { isValid: true, errors: [] }; // Optional field
    }

    const cleaned = tin.replace(/\s/g, '');
    
    if (cleaned.length !== 10) {
      errors.push('TIN must be exactly 10 digits');
    }

    if (!/^\d{10}$/.test(cleaned)) {
      errors.push('TIN must contain only digits');
    }

    if (/^(\d)\1{9}$/.test(cleaned)) {
      errors.push('TIN cannot be all the same digit');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const customerService = new CustomerService();
