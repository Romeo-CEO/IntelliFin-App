import { API_BASE_URL } from '../config/api';

export interface Invoice {
  id: string;
  organizationId: string;
  customerId: string;
  invoiceNumber: string;
  reference?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  paymentInstructions?: string;
  zraSubmissionStatus?: ZraSubmissionStatus;
  zraSubmissionId?: string;
  zraSubmissionDate?: string;
  zraReceiptNumber?: string;
  zraQrCode?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    zraTin?: string;
    address?: string;
    city?: string;
    country?: string;
    contactPerson?: string;
  };
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  vatRate: number;
  vatAmount: number;
  discountRate?: number;
  discountAmount: number;
  sortOrder: number;
}

export interface CreateInvoiceData {
  customerId: string;
  reference?: string;
  issueDate: string;
  dueDate: string;
  discountAmount?: number;
  currency?: string;
  status?: InvoiceStatus;
  notes?: string;
  terms?: string;
  paymentInstructions?: string;
  items: CreateInvoiceItemData[];
}

export interface CreateInvoiceItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
  discountRate?: number;
  discountAmount?: number;
  sortOrder?: number;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  paidAmount?: number;
  zraSubmissionStatus?: ZraSubmissionStatus;
}

export interface InvoiceQuery {
  customerId?: string;
  status?: InvoiceStatus;
  zraSubmissionStatus?: ZraSubmissionStatus;
  issueDateFrom?: string;
  issueDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  isOverdue?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  BAD_DEBT = 'BAD_DEBT',
}

export enum ZraSubmissionStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  DISABLED = 'DISABLED',
}

class InvoiceService {
  private baseUrl = `${API_BASE_URL}/invoices`;

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

  async getInvoices(query: InvoiceQuery = {}): Promise<InvoiceListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<InvoiceListResponse>(response);
  }

  async getInvoiceById(id: string): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Invoice>(response);
  }

  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<Invoice>(response);
  }

  async updateInvoice(id: string, data: UpdateInvoiceData): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<Invoice>(response);
  }

  async deleteInvoice(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  }

  async getInvoiceStats(): Promise<InvoiceStats> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<InvoiceStats>(response);
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const response = await fetch(`${this.baseUrl}/overdue`, {
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Invoice[]>(response);
  }

  async sendInvoice(id: string): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}/${id}/send`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<Invoice>(response);
  }

  async submitToZra(id: string, organizationTin: string): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}/${id}/submit-zra`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ organizationTin }),
    });

    return this.handleResponse<Invoice>(response);
  }

  async recordPayment(id: string, paidAmount: number, paymentDate?: string): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}/${id}/payment`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ paidAmount, paymentDate }),
    });

    return this.handleResponse<Invoice>(response);
  }

  async updateOverdueInvoices(): Promise<{ updatedCount: number; message: string }> {
    const response = await fetch(`${this.baseUrl}/update-overdue`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<{ updatedCount: number; message: string }>(response);
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

  getStatusColor(status: InvoiceStatus): string {
    const colors = {
      [InvoiceStatus.DRAFT]: 'gray',
      [InvoiceStatus.SENT]: 'blue',
      [InvoiceStatus.PARTIALLY_PAID]: 'yellow',
      [InvoiceStatus.PAID]: 'green',
      [InvoiceStatus.OVERDUE]: 'red',
      [InvoiceStatus.CANCELLED]: 'gray',
      [InvoiceStatus.BAD_DEBT]: 'red',
    };
    return colors[status] || 'gray';
  }

  getZraStatusColor(status: ZraSubmissionStatus): string {
    const colors = {
      [ZraSubmissionStatus.NOT_SUBMITTED]: 'gray',
      [ZraSubmissionStatus.PENDING]: 'yellow',
      [ZraSubmissionStatus.ACCEPTED]: 'green',
      [ZraSubmissionStatus.REJECTED]: 'red',
      [ZraSubmissionStatus.FAILED]: 'red',
      [ZraSubmissionStatus.CANCELLED]: 'gray',
      [ZraSubmissionStatus.VALIDATION_FAILED]: 'red',
      [ZraSubmissionStatus.DISABLED]: 'gray',
    };
    return colors[status] || 'gray';
  }

  isOverdue(invoice: Invoice): boolean {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    return dueDate < today && 
           (invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.PARTIALLY_PAID);
  }

  calculateOutstandingAmount(invoice: Invoice): number {
    return invoice.totalAmount - (invoice.paidAmount || 0);
  }

  canEdit(invoice: Invoice): boolean {
    return invoice.status === InvoiceStatus.DRAFT;
  }

  canSend(invoice: Invoice): boolean {
    return invoice.status === InvoiceStatus.DRAFT;
  }

  canSubmitToZra(invoice: Invoice): boolean {
    return invoice.status !== InvoiceStatus.DRAFT && 
           invoice.zraSubmissionStatus !== ZraSubmissionStatus.ACCEPTED;
  }

  canDelete(invoice: Invoice): boolean {
    return invoice.status !== InvoiceStatus.PAID && 
           invoice.zraSubmissionStatus !== ZraSubmissionStatus.ACCEPTED;
  }

  canRecordPayment(invoice: Invoice): boolean {
    return invoice.status === InvoiceStatus.SENT || 
           invoice.status === InvoiceStatus.PARTIALLY_PAID || 
           invoice.status === InvoiceStatus.OVERDUE;
  }

  calculateVat(amount: number, vatRate: number = 16): {
    subtotal: number;
    vatAmount: number;
    total: number;
  } {
    const subtotal = amount;
    const vatAmount = amount * (vatRate / 100);
    const total = amount + vatAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  calculateLineTotal(quantity: number, unitPrice: number, discountRate: number = 0): {
    lineSubtotal: number;
    discountAmount: number;
    lineTotal: number;
  } {
    const lineSubtotal = quantity * unitPrice;
    const discountAmount = lineSubtotal * (discountRate / 100);
    const lineTotal = lineSubtotal - discountAmount;

    return {
      lineSubtotal: Math.round(lineSubtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100,
    };
  }
}

export const invoiceService = new InvoiceService();
