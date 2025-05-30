import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MobileMoneyProvider, PaymentMethod } from '@prisma/client';

export interface MobileMoneyPaymentRequest {
  provider: MobileMoneyProvider;
  phoneNumber: string;
  amount: number;
  currency?: string;
  reference?: string;
  description?: string;
  callbackUrl?: string;
}

export interface MobileMoneyPaymentResponse {
  transactionId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  providerTransactionId?: string;
  message?: string;
  paymentUrl?: string;
  qrCode?: string;
}

export interface PaymentStatusResponse {
  transactionId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  amount?: number;
  currency?: string;
  completedAt?: Date;
  failureReason?: string;
  providerTransactionId?: string;
}

@Injectable()
export class MobileMoneyPaymentService {
  private readonly logger = new Logger(MobileMoneyPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Initiate a mobile money payment
   */
  async initiatePayment(
    organizationId: string,
    paymentRequest: MobileMoneyPaymentRequest
  ): Promise<MobileMoneyPaymentResponse> {
    try {
      this.logger.log(
        `Initiating ${paymentRequest.provider} payment for organization: ${organizationId}`
      );

      // Validate payment request
      this.validatePaymentRequest(paymentRequest);

      // Check if organization has linked mobile money account for this provider
      const mobileMoneyAccount = await this.getMobileMoneyAccount(
        organizationId,
        paymentRequest.provider
      );

      if (!mobileMoneyAccount || !mobileMoneyAccount.isLinked) {
        throw new BadRequestException(
          `${paymentRequest.provider} account not linked for this organization`
        );
      }

      // Route to appropriate provider
      switch (paymentRequest.provider) {
        case MobileMoneyProvider.AIRTEL_MONEY:
          return await this.initiateAirtelMoneyPayment(
            mobileMoneyAccount,
            paymentRequest
          );
        case MobileMoneyProvider.MTN_MONEY:
          return await this.initiateMtnMoneyPayment(
            mobileMoneyAccount,
            paymentRequest
          );
        case MobileMoneyProvider.ZAMTEL_KWACHA:
          return await this.initiateZamtelKwachaPayment(
            mobileMoneyAccount,
            paymentRequest
          );
        default:
          throw new BadRequestException(
            `Unsupported mobile money provider: ${paymentRequest.provider}`
          );
      }
    } catch (error) {
      this.logger.error(
        `Failed to initiate mobile money payment: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(
    organizationId: string,
    transactionId: string
  ): Promise<PaymentStatusResponse> {
    try {
      // Find the transaction in our database
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          id: transactionId,
          organizationId,
        },
        include: {
          account: true,
        },
      });

      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }

      // Check status with the provider
      switch (transaction.account.provider) {
        case MobileMoneyProvider.AIRTEL_MONEY:
          return await this.checkAirtelMoneyStatus(transaction);
        case MobileMoneyProvider.MTN_MONEY:
          return await this.checkMtnMoneyStatus(transaction);
        case MobileMoneyProvider.ZAMTEL_KWACHA:
          return await this.checkZamtelKwachaStatus(transaction);
        default:
          throw new BadRequestException(
            `Unsupported provider: ${transaction.account.provider}`
          );
      }
    } catch (error) {
      this.logger.error(
        `Failed to check payment status: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Process payment callback from mobile money provider
   */
  async processPaymentCallback(
    provider: MobileMoneyProvider,
    callbackData: any
  ): Promise<void> {
    try {
      this.logger.log(`Processing payment callback from ${provider}`);

      switch (provider) {
        case MobileMoneyProvider.AIRTEL_MONEY:
          await this.processAirtelMoneyCallback(callbackData);
          break;
        case MobileMoneyProvider.MTN_MONEY:
          await this.processMtnMoneyCallback(callbackData);
          break;
        case MobileMoneyProvider.ZAMTEL_KWACHA:
          await this.processZamtelKwachaCallback(callbackData);
          break;
        default:
          this.logger.warn(`Unsupported provider callback: ${provider}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process payment callback: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: MobileMoneyPaymentRequest): void {
    if (
      !request.phoneNumber ||
      !this.isValidZambianPhoneNumber(request.phoneNumber)
    ) {
      throw new BadRequestException('Invalid Zambian phone number');
    }

    if (!request.amount || request.amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    if (request.amount > 50000) {
      // ZMW 50,000 limit
      throw new BadRequestException('Payment amount exceeds maximum limit');
    }

    if (request.currency && request.currency !== 'ZMW') {
      throw new BadRequestException('Only ZMW currency is supported');
    }
  }

  /**
   * Validate Zambian phone number
   */
  private isValidZambianPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Check for valid Zambian phone number patterns
    const zambianPatterns = [
      /^260[79]\d{8}$/, // International format (260 + 9 digits)
      /^0[79]\d{8}$/, // Local format (0 + 9 digits)
      /^[79]\d{8}$/, // Without country/area code (9 digits)
    ];

    return zambianPatterns.some(pattern => pattern.test(digits));
  }

  /**
   * Get mobile money account for organization and provider
   */
  private async getMobileMoneyAccount(
    organizationId: string,
    provider: MobileMoneyProvider
  ) {
    return await this.prisma.mobileMoneyAccount.findFirst({
      where: {
        organizationId,
        provider,
        isActive: true,
      },
    });
  }

  /**
   * Initiate Airtel Money payment
   */
  private async initiateAirtelMoneyPayment(
    account: any,
    request: MobileMoneyPaymentRequest
  ): Promise<MobileMoneyPaymentResponse> {
    // TODO: Implement actual Airtel Money API integration
    // For now, return a mock response
    const transactionId = `airtel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`Mock Airtel Money payment initiated: ${transactionId}`);

    return {
      transactionId,
      status: 'PENDING',
      providerTransactionId: `AM${Date.now()}`,
      message:
        'Payment initiated successfully. Please complete on your Airtel Money app.',
      paymentUrl: `airtel://pay?ref=${transactionId}`,
    };
  }

  /**
   * Initiate MTN Money payment
   */
  private async initiateMtnMoneyPayment(
    account: any,
    request: MobileMoneyPaymentRequest
  ): Promise<MobileMoneyPaymentResponse> {
    // TODO: Implement actual MTN Money API integration
    // For now, return a mock response
    const transactionId = `mtn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`Mock MTN Money payment initiated: ${transactionId}`);

    return {
      transactionId,
      status: 'PENDING',
      providerTransactionId: `MTN${Date.now()}`,
      message:
        'Payment initiated successfully. Please complete on your MTN Mobile Money app.',
      paymentUrl: `mtn://pay?ref=${transactionId}`,
    };
  }

  /**
   * Initiate Zamtel Kwacha payment
   */
  private async initiateZamtelKwachaPayment(
    account: any,
    request: MobileMoneyPaymentRequest
  ): Promise<MobileMoneyPaymentResponse> {
    // TODO: Implement actual Zamtel Kwacha API integration
    // For now, return a mock response
    const transactionId = `zamtel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`Mock Zamtel Kwacha payment initiated: ${transactionId}`);

    return {
      transactionId,
      status: 'PENDING',
      providerTransactionId: `ZK${Date.now()}`,
      message:
        'Payment initiated successfully. Please complete on your Zamtel Kwacha app.',
      paymentUrl: `zamtel://pay?ref=${transactionId}`,
    };
  }

  /**
   * Check Airtel Money payment status
   */
  private async checkAirtelMoneyStatus(
    transaction: any
  ): Promise<PaymentStatusResponse> {
    // TODO: Implement actual Airtel Money status check
    // For now, return a mock response
    return {
      transactionId: transaction.id,
      status: 'COMPLETED',
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      completedAt: new Date(),
      providerTransactionId: transaction.externalId,
    };
  }

  /**
   * Check MTN Money payment status
   */
  private async checkMtnMoneyStatus(
    transaction: any
  ): Promise<PaymentStatusResponse> {
    // TODO: Implement actual MTN Money status check
    // For now, return a mock response
    return {
      transactionId: transaction.id,
      status: 'COMPLETED',
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      completedAt: new Date(),
      providerTransactionId: transaction.externalId,
    };
  }

  /**
   * Check Zamtel Kwacha payment status
   */
  private async checkZamtelKwachaStatus(
    transaction: any
  ): Promise<PaymentStatusResponse> {
    // TODO: Implement actual Zamtel Kwacha status check
    // For now, return a mock response
    return {
      transactionId: transaction.id,
      status: 'COMPLETED',
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      completedAt: new Date(),
      providerTransactionId: transaction.externalId,
    };
  }

  /**
   * Process Airtel Money callback
   */
  private async processAirtelMoneyCallback(callbackData: any): Promise<void> {
    // TODO: Implement actual Airtel Money callback processing
    this.logger.log('Processing Airtel Money callback', callbackData);
  }

  /**
   * Process MTN Money callback
   */
  private async processMtnMoneyCallback(callbackData: any): Promise<void> {
    // TODO: Implement actual MTN Money callback processing
    this.logger.log('Processing MTN Money callback', callbackData);
  }

  /**
   * Process Zamtel Kwacha callback
   */
  private async processZamtelKwachaCallback(callbackData: any): Promise<void> {
    // TODO: Implement actual Zamtel Kwacha callback processing
    this.logger.log('Processing Zamtel Kwacha callback', callbackData);
  }

  /**
   * Normalize phone number to international format
   */
  private normalizePhoneNumber(phoneNumber: string): string {
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
