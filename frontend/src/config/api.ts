// API Configuration for IntelliFin Frontend

// Get the API base URL from environment variables or use default
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    verifyEmail: '/auth/verify-email',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },

  // Users
  users: {
    profile: '/users/profile',
    updateProfile: '/users/profile',
    changePassword: '/users/change-password',
  },

  // Organizations
  organizations: {
    current: '/organizations/current',
    update: '/organizations/current',
  },

  // Customers
  customers: {
    list: '/customers',
    create: '/customers',
    get: (id: string) => `/customers/${id}`,
    update: (id: string) => `/customers/${id}`,
    delete: (id: string) => `/customers/${id}`,
    stats: '/customers/stats',
    search: '/customers/search',
    selectOptions: '/customers/select-options',
    import: '/customers/import',
    exportCsv: '/customers/export/csv',
    exportJson: '/customers/export/json',
    importTemplate: '/customers/import/template',
  },

  // Categories
  categories: {
    list: '/categories',
    create: '/categories',
    get: (id: string) => `/categories/${id}`,
    update: (id: string) => `/categories/${id}`,
    delete: (id: string) => `/categories/${id}`,
    stats: '/categories/stats',
    hierarchy: '/categories/hierarchy',
    defaults: '/categories/defaults',
  },

  // Invoices
  invoices: {
    list: '/invoices',
    create: '/invoices',
    get: (id: string) => `/invoices/${id}`,
    update: (id: string) => `/invoices/${id}`,
    delete: (id: string) => `/invoices/${id}`,
    stats: '/invoices/stats',
    overdue: '/invoices/overdue',
    send: (id: string) => `/invoices/${id}/send`,
    submitZra: (id: string) => `/invoices/${id}/submit-zra`,
    recordPayment: (id: string) => `/invoices/${id}/payment`,
    updateOverdue: '/invoices/update-overdue',
  },

  // Payments
  payments: {
    list: '/payments',
    create: '/payments',
    get: (id: string) => `/payments/${id}`,
    update: (id: string) => `/payments/${id}`,
    delete: (id: string) => `/payments/${id}`,
    stats: '/payments/stats',
    unreconciled: '/payments/unreconciled',
    reconcile: '/payments/reconcile',
    reconcilePayment: (id: string) => `/payments/${id}/reconcile`,
    bulkReconcile: '/payments/reconcile/bulk',
    applyAutomatic: '/payments/reconcile/apply-automatic',
    byInvoice: (invoiceId: string) => `/payments/invoice/${invoiceId}`,
  },

  // Reports & Analytics
  reports: {
    dashboard: '/reports/dashboard',
    generate: '/reports/generate',
    types: '/reports/types',
    financialMetrics: '/reports/financial-metrics',
    revenueBreakdown: '/reports/revenue-breakdown',
    expenseBreakdown: '/reports/expense-breakdown',
    cashFlow: '/reports/cash-flow',
    accountsReceivable: '/reports/accounts-receivable',
    vatReport: '/reports/vat-report',
    periodComparison: '/reports/period-comparison',
  },

  // Transactions
  transactions: {
    list: '/transactions',
    get: (id: string) => `/transactions/${id}`,
    sync: '/transactions/sync',
    categorize: '/transactions/categorize',
    bulkCategorize: '/transactions/bulk-categorize',
    suggestions: '/transactions/suggestions',
  },

  // Integrations
  integrations: {
    airtelMoney: {
      oauth: '/integrations/airtel-money/oauth',
      callback: '/integrations/airtel-money/callback',
      status: '/integrations/airtel-money/status',
      disconnect: '/integrations/airtel-money/disconnect',
    },
  },

  // Invitations
  invitations: {
    list: '/invitations',
    create: '/invitations',
    resend: (id: string) => `/invitations/${id}/resend`,
    cancel: (id: string) => `/invitations/${id}/cancel`,
    accept: '/invitations/accept',
  },

  // Dashboards
  dashboards: {
    list: '/dashboards',
    create: '/dashboards',
    get: (id: string) => `/dashboards/${id}`,
    update: (id: string) => `/dashboards/${id}`,
    delete: (id: string) => `/dashboards/${id}`,
    default: '/dashboards/default',
    setDefault: (id: string) => `/dashboards/${id}/default`,
    duplicate: (id: string) => `/dashboards/${id}/duplicate`,
    layout: (id: string) => `/dashboards/${id}/layout`,
    widgets: (id: string) => `/dashboards/${id}/widgets`,
    createWidget: (id: string) => `/dashboards/${id}/widgets`,
  },

  // Widgets
  widgets: {
    get: (id: string) => `/widgets/${id}`,
    update: (id: string) => `/widgets/${id}`,
    delete: (id: string) => `/widgets/${id}`,
    position: (id: string) => `/widgets/${id}/position`,
    visibility: (id: string) => `/widgets/${id}/visibility`,
    data: (id: string) => `/widgets/${id}/data`,
    refresh: (id: string) => `/widgets/${id}/refresh`,
  },

  // Health
  health: '/health',
} as const;

// HTTP methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000; // 30 seconds

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

// Success status codes
export const SUCCESS_CODES = [200, 201, 202, 204] as const;

// Utility function to build full API URL
export function buildApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

// Utility function to get auth headers
export function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    ...DEFAULT_HEADERS,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// Utility function to handle API responses
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  // Handle empty responses (like DELETE operations)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Utility function to make API requests
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const headers = getAuthHeaders();

  const config: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    return handleApiResponse<T>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error - please check your connection');
    }
    throw error;
  }
}

// Utility function for file uploads
export async function uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const formData = new FormData();
  formData.append('file', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  return handleApiResponse<T>(response);
}

// Utility function for downloading files
export async function downloadFile(endpoint: string): Promise<Blob> {
  const url = buildApiUrl(endpoint);
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const response = await fetch(url, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.blob();
}
