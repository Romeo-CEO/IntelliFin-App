import { API_BASE_URL } from '../config/api';

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId?: string;
  customerId: string;
  transactionId?: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    contactPerson?: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    issueDate: string;
    dueDate: string;
  };
  transaction?: {
    id: string;
    externalId: string;
    type: string;
    status: string;
    transactionDate: string;
    counterpartyName?: string;
    counterpartyNumber?: string;
  };
}

export interface CreatePaymentData {
  invoiceId?: string;
  customerId: string;
  transactionId?: string;
  amount: number;
  currency?: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface UpdatePaymentData extends Partial<CreatePaymentData> {}

export interface PaymentQuery {
  customerId?: string;
  invoiceId?: string;
  paymentMethod?: PaymentMethod;
  paymentDateFrom?: string;
  paymentDateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  byMethod: Array<{
    method: PaymentMethod;
    count: number;
    amount: number;
  }>;
  recentPayments: number;
}

export interface ReconciliationMatch {
  paymentId: string;
  transactionId: string;
  confidence: number;
  reason: string;
  payment: Payment;
  transaction: {
    id: string;
    externalId: string;
    amount: number;
    transactionDate: string;
    counterpartyName?: string;
    counterpartyNumber?: string;
    description?: string;
    type: string;
    status: string;
  };
}

export interface ReconciliationResult {
  automaticMatches: ReconciliationMatch[];
  suggestedMatches: ReconciliationMatch[];
  unmatchedPayments: Payment[];
  unmatchedTransactions: any[];
  summary: {
    totalPayments: number;
    totalTransactions: number;
    automaticMatches: number;
    suggestedMatches: number;
    unmatchedPayments: number;
    unmatchedTransactions: number;
  };
}

export enum PaymentMethod {
  CASH = 'CASH',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CHECK = 'CHECK',
  OTHER = 'OTHER',
}

class PaymentService {
  private baseUrl = `${API_BASE_URL}/payments`;

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

  async getPayments(query: PaymentQuery = {}): Promise<PaymentListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<PaymentListResponse>(response);
  }

  async getPaymentById(id: string): Promise<Payment> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Payment>(response);
  }

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<Payment>(response);
  }

  async updatePayment(id: string, data: UpdatePaymentData): Promise<Payment> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<Payment>(response);
  }

  async deletePayment(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  }

  async getPaymentStats(): Promise<PaymentStats> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<PaymentStats>(response);
  }

  async getUnreconciledPayments(): Promise<Payment[]> {
    const response = await fetch(`${this.baseUrl}/unreconciled`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Payment[]>(response);
  }

  async getPaymentsByInvoiceId(invoiceId: string): Promise<Payment[]> {
    const response = await fetch(`${this.baseUrl}/invoice/${invoiceId}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Payment[]>(response);
  }

  async getReconciliationSuggestions(): Promise<ReconciliationResult> {
    const response = await fetch(`${this.baseUrl}/reconcile`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<ReconciliationResult>(response);
  }

  async reconcilePayment(paymentId: string, transactionId: string, notes?: string): Promise<Payment> {
    const response = await fetch(`${this.baseUrl}/${paymentId}/reconcile`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ transactionId, notes }),
    });

    return this.handleResponse<Payment>(response);
  }

  async bulkReconcile(mappings: Array<{ paymentId: string; transactionId: string }>): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/reconcile/bulk`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ mappings }),
    });

    return this.handleResponse<{ success: number; failed: number; errors: string[] }>(response);
  }

  async applyAutomaticMatches(matches: ReconciliationMatch[]): Promise<{
    appliedCount: number;
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/reconcile/apply-automatic`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ matches }),
    });

    return this.handleResponse<{ appliedCount: number; message: string }>(response);
  }

  // Utility methods
  formatCurrency(amount: number, currency = 'ZMW'): string {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatShortDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getPaymentMethodColor(method: PaymentMethod): string {
    const colors = {
      [PaymentMethod.CASH]: 'green',
      [PaymentMethod.MOBILE_MONEY]: 'blue',
      [PaymentMethod.BANK_TRANSFER]: 'purple',
      [PaymentMethod.CREDIT_CARD]: 'orange',
      [PaymentMethod.DEBIT_CARD]: 'orange',
      [PaymentMethod.CHECK]: 'gray',
      [PaymentMethod.OTHER]: 'gray',
    };
    return colors[method] || 'gray';
  }

  getPaymentMethodIcon(method: PaymentMethod): string {
    const icons = {
      [PaymentMethod.CASH]: '💵',
      [PaymentMethod.MOBILE_MONEY]: '📱',
      [PaymentMethod.BANK_TRANSFER]: '🏦',
      [PaymentMethod.CREDIT_CARD]: '💳',
      [PaymentMethod.DEBIT_CARD]: '💳',
      [PaymentMethod.CHECK]: '📝',
      [PaymentMethod.OTHER]: '💰',
    };
    return icons[method] || '💰';
  }

  getPaymentMethodLabel(method: PaymentMethod): string {
    const labels = {
      [PaymentMethod.CASH]: 'Cash',
      [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
      [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
      [PaymentMethod.CREDIT_CARD]: 'Credit Card',
      [PaymentMethod.DEBIT_CARD]: 'Debit Card',
      [PaymentMethod.CHECK]: 'Check',
      [PaymentMethod.OTHER]: 'Other',
    };
    return labels[method] || method;
  }

  isReconciled(payment: Payment): boolean {
    return !!payment.transactionId;
  }

  calculateConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return 'green';
    if (confidence >= 0.7) return 'yellow';
    if (confidence >= 0.5) return 'orange';
    return 'red';
  }

  getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    if (confidence >= 0.5) return 'Low';
    return 'Very Low';
  }

  validatePaymentAmount(amount: number, invoiceAmount?: number): {
    isValid: boolean;
    error?: string;
  } {
    if (amount <= 0) {
      return { isValid: false, error: 'Payment amount must be greater than 0' };
    }

    if (invoiceAmount && amount > invoiceAmount) {
      return { isValid: false, error: 'Payment amount cannot exceed invoice amount' };
    }

    if (amount > 1000000) { // ZMW 1,000,000 limit
      return { isValid: false, error: 'Payment amount exceeds maximum limit' };
    }

    return { isValid: true };
  }

  validateZambianPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Check for valid Zambian phone number patterns
    const zambianPatterns = [
      /^260[79]\d{8}$/, // International format (260 + 9 digits)
      /^0[79]\d{8}$/,   // Local format (0 + 9 digits)
      /^[79]\d{8}$/,    // Without country/area code (9 digits)
    ];

    return zambianPatterns.some(pattern => pattern.test(digits));
  }

  normalizePhoneNumber(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.startsWith('260')) {
      return digits;
    } else if (digits.startsWith('0')) {
      return `260${  digits.substring(1)}`;
    } else if (digits.length === 9) {
      return `260${  digits}`;
    }
    
    return digits;
  }
}

export const paymentService = new PaymentService();
