'use client';

import axios from 'axios';

// Types
export interface CreateOrganizationRequest {
  name: string;
  businessType: string;
  zraTin: string;
  industry?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  businessType: string;
  zraTin: string;
  industry?: string;
  address?: string;
  city?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  defaultCurrency: string;
  fiscalYearStart: number;
  createdAt: string;
  updatedAt: string;
}

export interface ZraTinValidationResponse {
  isValid: boolean;
  isAvailable: boolean;
  message: string;
}

export interface BusinessTypeOption {
  value: string;
  label: string;
}

export interface IndustryOption {
  value: string;
  label: string;
}

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Organization Service
export class OnboardingService {
  /**
   * Create a new organization
   */
  static async createOrganization(data: CreateOrganizationRequest): Promise<OrganizationResponse> {
    try {
      const response = await api.post('/organizations', data);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create organization';
      throw new Error(message);
    }
  }

  /**
   * Validate ZRA TIN availability
   */
  static async validateZraTin(zraTin: string, excludeId?: string): Promise<ZraTinValidationResponse> {
    try {
      const params = excludeId ? { excludeId } : {};
      const response = await api.get(`/organizations/validate/zra-tin/${zraTin}`, { params });
      return response.data;
    } catch (error: any) {
      // If validation fails, assume format is valid but availability unknown
      return {
        isValid: true,
        isAvailable: true,
        message: 'Unable to verify availability, but format appears valid',
      };
    }
  }

  /**
   * Get business type options
   */
  static async getBusinessTypeOptions(): Promise<BusinessTypeOption[]> {
    try {
      const response = await api.get('/organizations/options/business-types');
      return response.data;
    } catch (error) {
      // Return default options if API fails
      return [
        { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
        { value: 'PARTNERSHIP', label: 'Partnership' },
        { value: 'LIMITED_LIABILITY_COMPANY', label: 'Limited Liability Company' },
        { value: 'PUBLIC_LIMITED_COMPANY', label: 'Public Limited Company' },
        { value: 'COOPERATIVE', label: 'Cooperative' },
        { value: 'NGO', label: 'Non-Governmental Organization' },
        { value: 'TRUST', label: 'Trust' },
        { value: 'BRANCH_OFFICE', label: 'Branch Office' },
        { value: 'REPRESENTATIVE_OFFICE', label: 'Representative Office' },
      ];
    }
  }

  /**
   * Get industry options
   */
  static async getIndustryOptions(): Promise<IndustryOption[]> {
    try {
      const response = await api.get('/organizations/options/industries');
      return response.data;
    } catch (error) {
      // Return default options if API fails
      return [
        { value: 'AGRICULTURE', label: 'Agriculture, Forestry and Fishing' },
        { value: 'MINING', label: 'Mining and Quarrying' },
        { value: 'MANUFACTURING', label: 'Manufacturing' },
        { value: 'CONSTRUCTION', label: 'Construction' },
        { value: 'WHOLESALE_RETAIL', label: 'Wholesale and Retail Trade' },
        { value: 'TRANSPORT_LOGISTICS', label: 'Transportation and Storage' },
        { value: 'ACCOMMODATION_FOOD', label: 'Accommodation and Food Service' },
        { value: 'INFORMATION_COMMUNICATION', label: 'Information and Communication' },
        { value: 'FINANCIAL_INSURANCE', label: 'Financial and Insurance Activities' },
        { value: 'REAL_ESTATE', label: 'Real Estate Activities' },
        { value: 'PROFESSIONAL_SERVICES', label: 'Professional, Scientific and Technical Activities' },
        { value: 'EDUCATION', label: 'Education' },
        { value: 'HEALTH_SOCIAL', label: 'Human Health and Social Work' },
        { value: 'ARTS_ENTERTAINMENT', label: 'Arts, Entertainment and Recreation' },
        { value: 'OTHER_SERVICES', label: 'Other Service Activities' },
      ];
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(id: string): Promise<OrganizationResponse> {
    try {
      const response = await api.get(`/organizations/${id}`);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch organization';
      throw new Error(message);
    }
  }

  /**
   * Update organization
   */
  static async updateOrganization(id: string, data: Partial<CreateOrganizationRequest>): Promise<OrganizationResponse> {
    try {
      const response = await api.put(`/organizations/${id}`, data);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update organization';
      throw new Error(message);
    }
  }

  /**
   * Check if user has completed onboarding
   */
  static async checkOnboardingStatus(): Promise<{ completed: boolean; organizationId?: string }> {
    try {
      // This would typically check user profile or organization association
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const organization = localStorage.getItem('organization');
      
      return {
        completed: !!organization,
        organizationId: organization ? JSON.parse(organization).id : undefined,
      };
    } catch (error) {
      return { completed: false };
    }
  }

  /**
   * Complete onboarding process
   */
  static async completeOnboarding(organizationData: CreateOrganizationRequest): Promise<{
    organization: OrganizationResponse;
    redirectUrl: string;
  }> {
    try {
      // Create organization
      const organization = await this.createOrganization(organizationData);
      
      // Store organization data
      localStorage.setItem('organization', JSON.stringify(organization));
      
      // Update user onboarding status if needed
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.onboardingCompleted = true;
      user.organizationId = organization.id;
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        organization,
        redirectUrl: '/dashboard',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to complete onboarding');
    }
  }
}

export default OnboardingService;
