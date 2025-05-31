import { TaxType, TaxFilingStatus, TaxObligationStatus, TaxPeriodStatus } from '@prisma/client';

export interface TaxFiling {
  id: string;
  organizationId: string;
  taxType: TaxType;
  periodId: string;
  filingDate: Date;
  dueDate: Date;
  status: TaxFilingStatus;
  amount: number;
  penalty: number;
  interest: number;
  referenceNumber?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxObligation {
  id: string;
  organizationId: string;
  taxType: TaxType;
  periodId: string;
  dueDate: Date;
  amount: number;
  penalty: number;
  interest: number;
  status: TaxObligationStatus;
  paidAmount: number;
  paidAt?: Date;
  referenceNumber?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxPeriod {
  id: string;
  organizationId: string;
  taxType: TaxType;
  name: string;
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  status: TaxPeriodStatus;
  isClosed: boolean;
  isFiled: boolean;
  filedAt?: Date;
  closedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxWithholdingCertificate {
  id: string;
  organizationId: string;
  vendorId?: string;
  customerId?: string;
  taxType: TaxType;
  certificateNumber: string;
  issueDate: Date;
  amount: number;
  taxRate: number;
  taxAmount: number;
  referenceNumber?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  isSubmitted: boolean;
  submittedAt?: Date;
  submissionReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxSummary {
  taxType: TaxType;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  totalPenalty: number;
  totalInterest: number;
  upcomingObligations: number;
  overdueObligations: number;
  lastFiledDate?: Date;
  nextDueDate?: Date;
}

export interface TaxCalendarEvent {
  id: string;
  title: string;
  type: 'filing' | 'payment' | 'deadline';
  taxType: TaxType;
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  status: 'upcoming' | 'due' | 'overdue' | 'completed';
  referenceId: string;
  referenceType: 'filing' | 'obligation' | 'period';
  amount?: number;
  paidAmount?: number;
  isRecurring: boolean;
  metadata?: Record<string, unknown>;
}
