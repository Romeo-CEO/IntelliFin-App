import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaymentRepository, PaymentWithRelations } from '../payment.repository';

export interface ReconciliationMatch {
  paymentId: string;
  transactionId: string;
  confidence: number;
  reason: string;
  payment: PaymentWithRelations;
  transaction: {
    id: string;
    externalId: string;
    amount: number;
    transactionDate: Date;
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
  unmatchedPayments: PaymentWithRelations[];
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

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository
  ) {}

  /**
   * Perform automatic payment reconciliation
   */
  async reconcilePayments(
    organizationId: string
  ): Promise<ReconciliationResult> {
    try {
      this.logger.log(
        `Starting payment reconciliation for organization: ${organizationId}`
      );

      // Get unreconciled payments
      const unreconciledPayments =
        await this.paymentRepository.findUnreconciledPayments(organizationId);

      // Get unreconciled transactions
      const unreconciledTransactions =
        await this.getUnreconciledTransactions(organizationId);

      // Find matches
      const matches = await this.findMatches(
        unreconciledPayments,
        unreconciledTransactions
      );

      // Categorize matches by confidence
      const automaticMatches = matches.filter(match => match.confidence >= 0.9);
      const suggestedMatches = matches.filter(
        match => match.confidence >= 0.7 && match.confidence < 0.9
      );

      // Get unmatched items
      const matchedPaymentIds = new Set(matches.map(m => m.paymentId));
      const matchedTransactionIds = new Set(matches.map(m => m.transactionId));

      const unmatchedPayments = unreconciledPayments.filter(
        p => !matchedPaymentIds.has(p.id)
      );
      const unmatchedTransactions = unreconciledTransactions.filter(
        t => !matchedTransactionIds.has(t.id)
      );

      const result: ReconciliationResult = {
        automaticMatches,
        suggestedMatches,
        unmatchedPayments,
        unmatchedTransactions,
        summary: {
          totalPayments: unreconciledPayments.length,
          totalTransactions: unreconciledTransactions.length,
          automaticMatches: automaticMatches.length,
          suggestedMatches: suggestedMatches.length,
          unmatchedPayments: unmatchedPayments.length,
          unmatchedTransactions: unmatchedTransactions.length,
        },
      };

      this.logger.log(
        `Reconciliation completed: ${JSON.stringify(result.summary)}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to reconcile payments: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Apply automatic reconciliation matches
   */
  async applyAutomaticMatches(
    organizationId: string,
    matches: ReconciliationMatch[]
  ): Promise<number> {
    try {
      let appliedCount = 0;

      for (const match of matches) {
        await this.prisma.$transaction(async tx => {
          // Update payment with transaction ID
          await tx.payment.update({
            where: { id: match.paymentId },
            data: { transactionId: match.transactionId },
          });

          // Mark transaction as reconciled
          await tx.transaction.update({
            where: { id: match.transactionId },
            data: { isReconciled: true },
          });

          appliedCount++;
        });
      }

      this.logger.log(
        `Applied ${appliedCount} automatic reconciliation matches`
      );
      return appliedCount;
    } catch (error) {
      this.logger.error(
        `Failed to apply automatic matches: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Manually reconcile a payment with a transaction
   */
  async manualReconcile(
    organizationId: string,
    paymentId: string,
    transactionId: string
  ): Promise<PaymentWithRelations> {
    try {
      return await this.prisma.$transaction(async tx => {
        // Verify payment belongs to organization
        const payment = await tx.payment.findFirst({
          where: { id: paymentId, organizationId },
        });

        if (!payment) {
          throw new Error('Payment not found');
        }

        // Verify transaction belongs to organization
        const transaction = await tx.transaction.findFirst({
          where: { id: transactionId, organizationId },
        });

        if (!transaction) {
          throw new Error('Transaction not found');
        }

        // Update payment with transaction ID
        await tx.payment.update({
          where: { id: paymentId },
          data: { transactionId },
        });

        // Mark transaction as reconciled
        await tx.transaction.update({
          where: { id: transactionId },
          data: { isReconciled: true },
        });

        // Return updated payment
        return await this.paymentRepository.findById(paymentId, organizationId);
      });
    } catch (error) {
      this.logger.error(
        `Failed to manually reconcile payment: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Bulk reconcile payments with transactions
   */
  async bulkReconcile(
    organizationId: string,
    mappings: Array<{ paymentId: string; transactionId: string }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] };

    for (const mapping of mappings) {
      try {
        await this.manualReconcile(
          organizationId,
          mapping.paymentId,
          mapping.transactionId
        );
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Failed to reconcile payment ${mapping.paymentId}: ${error.message}`
        );
      }
    }

    this.logger.log(
      `Bulk reconciliation completed: ${result.success} success, ${result.failed} failed`
    );
    return result;
  }

  /**
   * Get unreconciled transactions
   */
  private async getUnreconciledTransactions(organizationId: string) {
    return await this.prisma.transaction.findMany({
      where: {
        organizationId,
        isReconciled: false,
        type: { in: ['DEPOSIT', 'PAYMENT'] }, // Only incoming transactions
      },
      select: {
        id: true,
        externalId: true,
        amount: true,
        transactionDate: true,
        counterpartyName: true,
        counterpartyNumber: true,
        description: true,
        type: true,
        status: true,
        reference: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  /**
   * Find potential matches between payments and transactions
   */
  private async findMatches(
    payments: PaymentWithRelations[],
    transactions: any[]
  ): Promise<ReconciliationMatch[]> {
    const matches: ReconciliationMatch[] = [];

    for (const payment of payments) {
      for (const transaction of transactions) {
        const match = this.calculateMatch(payment, transaction);
        if (match.confidence > 0.5) {
          matches.push(match);
        }
      }
    }

    // Sort by confidence descending and remove duplicates
    matches.sort((a, b) => b.confidence - a.confidence);
    return this.removeDuplicateMatches(matches);
  }

  /**
   * Calculate match confidence between payment and transaction
   */
  private calculateMatch(
    payment: PaymentWithRelations,
    transaction: any
  ): ReconciliationMatch {
    let confidence = 0;
    const reasons: string[] = [];

    // Exact amount match (high confidence)
    if (
      Math.abs(payment.amount.toNumber() - transaction.amount.toNumber()) < 0.01
    ) {
      confidence += 0.4;
      reasons.push('Exact amount match');
    }

    // Date proximity (within 3 days)
    const paymentDate = new Date(payment.paymentDate);
    const transactionDate = new Date(transaction.transactionDate);
    const daysDiff = Math.abs(
      (paymentDate.getTime() - transactionDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 1) {
      confidence += 0.3;
      reasons.push('Same day transaction');
    } else if (daysDiff <= 3) {
      confidence += 0.2;
      reasons.push('Within 3 days');
    }

    // Reference number match
    if (payment.reference && transaction.reference) {
      if (payment.reference === transaction.reference) {
        confidence += 0.3;
        reasons.push('Reference number match');
      } else if (
        payment.reference.includes(transaction.reference) ||
        transaction.reference.includes(payment.reference)
      ) {
        confidence += 0.15;
        reasons.push('Partial reference match');
      }
    }

    // External ID match with payment reference
    if (payment.reference && transaction.externalId) {
      if (
        payment.reference.includes(transaction.externalId) ||
        transaction.externalId.includes(payment.reference)
      ) {
        confidence += 0.2;
        reasons.push('External ID match');
      }
    }

    // Customer phone number match with counterparty
    if (payment.customer.phone && transaction.counterpartyNumber) {
      const normalizedPaymentPhone = this.normalizePhoneNumber(
        payment.customer.phone
      );
      const normalizedCounterpartyPhone = this.normalizePhoneNumber(
        transaction.counterpartyNumber
      );

      if (normalizedPaymentPhone === normalizedCounterpartyPhone) {
        confidence += 0.25;
        reasons.push('Phone number match');
      }
    }

    // Customer name similarity with counterparty name
    if (payment.customer.name && transaction.counterpartyName) {
      const similarity = this.calculateStringSimilarity(
        payment.customer.name.toLowerCase(),
        transaction.counterpartyName.toLowerCase()
      );
      if (similarity > 0.8) {
        confidence += 0.2;
        reasons.push('Customer name similarity');
      } else if (similarity > 0.6) {
        confidence += 0.1;
        reasons.push('Partial customer name match');
      }
    }

    // Payment method consistency
    if (
      payment.paymentMethod === 'MOBILE_MONEY' &&
      transaction.type === 'DEPOSIT'
    ) {
      confidence += 0.1;
      reasons.push('Payment method consistency');
    }

    return {
      paymentId: payment.id,
      transactionId: transaction.id,
      confidence: Math.min(confidence, 1.0), // Cap at 1.0
      reason: reasons.join(', '),
      payment,
      transaction,
    };
  }

  /**
   * Remove duplicate matches (one payment can only match one transaction)
   */
  private removeDuplicateMatches(
    matches: ReconciliationMatch[]
  ): ReconciliationMatch[] {
    const usedPayments = new Set<string>();
    const usedTransactions = new Set<string>();
    const uniqueMatches: ReconciliationMatch[] = [];

    for (const match of matches) {
      if (
        !usedPayments.has(match.paymentId) &&
        !usedTransactions.has(match.transactionId)
      ) {
        uniqueMatches.push(match);
        usedPayments.add(match.paymentId);
        usedTransactions.add(match.transactionId);
      }
    }

    return uniqueMatches;
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Handle Zambian phone numbers
    if (digits.startsWith('260')) {
      return digits; // Already in international format
    } else if (digits.startsWith('0')) {
      return `260${  digits.substring(1)}`; // Convert from local to international
    } else if (digits.length === 9) {
      return `260${  digits}`; // Add country code
    }

    return digits;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }
}
