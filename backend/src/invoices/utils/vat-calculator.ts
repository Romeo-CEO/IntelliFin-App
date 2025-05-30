/**
 * VAT Calculator for Zambian Tax Compliance
 *
 * This utility handles VAT calculations according to Zambian tax regulations.
 * Standard VAT rate in Zambia is 16% as of 2024.
 *
 * References:
 * - Zambia Revenue Authority (ZRA) VAT regulations
 * - Value Added Tax Act (Chapter 331 of the Laws of Zambia)
 */

export interface VatCalculationResult {
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  isVatInclusive: boolean;
}

export interface InvoiceItemCalculation {
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  discountAmount: number;
  lineTotal: number;
  vatRate: number;
  vatAmount: number;
  lineTotalWithVat: number;
}

export interface InvoiceTotalsCalculation {
  subtotal: number;
  totalDiscountAmount: number;
  subtotalAfterDiscount: number;
  totalVatAmount: number;
  grandTotal: number;
  items: InvoiceItemCalculation[];
}

/**
 * Zambian VAT rates and categories
 */
export const ZambianVatRates = {
  STANDARD: 16, // Standard VAT rate (16%)
  ZERO_RATED: 0, // Zero-rated supplies (exports, basic foodstuffs, etc.)
  EXEMPT: -1, // VAT-exempt supplies (financial services, education, etc.)
} as const;

/**
 * VAT-exempt categories in Zambia
 */
export const VatExemptCategories = [
  'financial_services',
  'insurance',
  'education',
  'healthcare',
  'residential_rent',
  'public_transport',
  'postal_services',
] as const;

/**
 * Zero-rated categories in Zambia
 */
export const ZeroRatedCategories = [
  'exports',
  'basic_foodstuffs',
  'agricultural_inputs',
  'medical_supplies',
  'educational_materials',
] as const;

export class VatCalculator {
  /**
   * Calculate VAT for a given amount
   */
  static calculateVat(
    amount: number,
    vatRate: number = ZambianVatRates.STANDARD,
    isVatInclusive: boolean = false
  ): VatCalculationResult {
    if (vatRate < 0) {
      // VAT-exempt
      return {
        subtotal: amount,
        vatAmount: 0,
        total: amount,
        vatRate: 0,
        isVatInclusive,
      };
    }

    if (vatRate === 0) {
      // Zero-rated
      return {
        subtotal: amount,
        vatAmount: 0,
        total: amount,
        vatRate: 0,
        isVatInclusive,
      };
    }

    let subtotal: number;
    let vatAmount: number;
    let total: number;

    if (isVatInclusive) {
      // Amount includes VAT - extract VAT
      total = amount;
      subtotal = amount / (1 + vatRate / 100);
      vatAmount = amount - subtotal;
    } else {
      // Amount excludes VAT - add VAT
      subtotal = amount;
      vatAmount = amount * (vatRate / 100);
      total = amount + vatAmount;
    }

    return {
      subtotal: this.roundToTwoDecimals(subtotal),
      vatAmount: this.roundToTwoDecimals(vatAmount),
      total: this.roundToTwoDecimals(total),
      vatRate,
      isVatInclusive,
    };
  }

  /**
   * Calculate invoice item totals with VAT
   */
  static calculateInvoiceItem(
    quantity: number,
    unitPrice: number,
    vatRate: number = ZambianVatRates.STANDARD,
    discountRate: number = 0,
    discountAmount: number = 0
  ): InvoiceItemCalculation {
    // Calculate line subtotal
    const lineSubtotal = quantity * unitPrice;

    // Calculate discount
    let totalDiscountAmount = discountAmount;
    if (discountRate > 0) {
      totalDiscountAmount = lineSubtotal * (discountRate / 100);
    }

    // Line total after discount
    const lineTotal = lineSubtotal - totalDiscountAmount;

    // Calculate VAT
    const vatCalculation = this.calculateVat(lineTotal, vatRate, false);

    return {
      quantity: this.roundToThreeDecimals(quantity),
      unitPrice: this.roundToTwoDecimals(unitPrice),
      lineSubtotal: this.roundToTwoDecimals(lineSubtotal),
      discountAmount: this.roundToTwoDecimals(totalDiscountAmount),
      lineTotal: this.roundToTwoDecimals(lineTotal),
      vatRate,
      vatAmount: vatCalculation.vatAmount,
      lineTotalWithVat: vatCalculation.total,
    };
  }

  /**
   * Calculate invoice totals from multiple items
   */
  static calculateInvoiceTotals(
    items: Array<{
      quantity: number;
      unitPrice: number;
      vatRate?: number;
      discountRate?: number;
      discountAmount?: number;
    }>,
    invoiceDiscountAmount: number = 0
  ): InvoiceTotalsCalculation {
    // Calculate each item
    const calculatedItems = items.map(item =>
      this.calculateInvoiceItem(
        item.quantity,
        item.unitPrice,
        item.vatRate || ZambianVatRates.STANDARD,
        item.discountRate || 0,
        item.discountAmount || 0
      )
    );

    // Sum up subtotals and VAT amounts
    const subtotal = calculatedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
    const totalItemDiscounts = calculatedItems.reduce(
      (sum, item) => sum + item.discountAmount,
      0
    );

    // Apply invoice-level discount
    const subtotalAfterDiscount = subtotal - invoiceDiscountAmount;
    const totalDiscountAmount = totalItemDiscounts + invoiceDiscountAmount;

    // Calculate VAT on the discounted subtotal
    // Note: In Zambia, VAT is typically calculated after discounts
    const totalVatAmount = calculatedItems.reduce((sum, item) => {
      // Recalculate VAT if there's an invoice-level discount
      if (invoiceDiscountAmount > 0) {
        const itemProportion = item.lineTotal / subtotal;
        const itemDiscountedAmount =
          item.lineTotal - invoiceDiscountAmount * itemProportion;
        const itemVatCalc = this.calculateVat(
          itemDiscountedAmount,
          item.vatRate,
          false
        );
        return sum + itemVatCalc.vatAmount;
      }
      return sum + item.vatAmount;
    }, 0);

    const grandTotal = subtotalAfterDiscount + totalVatAmount;

    return {
      subtotal: this.roundToTwoDecimals(subtotal),
      totalDiscountAmount: this.roundToTwoDecimals(totalDiscountAmount),
      subtotalAfterDiscount: this.roundToTwoDecimals(subtotalAfterDiscount),
      totalVatAmount: this.roundToTwoDecimals(totalVatAmount),
      grandTotal: this.roundToTwoDecimals(grandTotal),
      items: calculatedItems,
    };
  }

  /**
   * Validate VAT rate for Zambian compliance
   */
  static validateVatRate(vatRate: number, category?: string): boolean {
    // Check if it's a valid Zambian VAT rate
    const validRates = [
      ZambianVatRates.STANDARD,
      ZambianVatRates.ZERO_RATED,
      ZambianVatRates.EXEMPT,
    ];

    if (validRates.includes(vatRate)) {
      return true;
    }

    // Allow custom rates between 0 and 25% for special cases
    return vatRate >= 0 && vatRate <= 25;
  }

  /**
   * Get recommended VAT rate for a category
   */
  static getVatRateForCategory(category: string): number {
    if (VatExemptCategories.includes(category as any)) {
      return ZambianVatRates.EXEMPT;
    }

    if (ZeroRatedCategories.includes(category as any)) {
      return ZambianVatRates.ZERO_RATED;
    }

    return ZambianVatRates.STANDARD;
  }

  /**
   * Format amount for display in Zambian Kwacha
   */
  static formatZmwAmount(amount: number): string {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format VAT rate for display
   */
  static formatVatRate(vatRate: number): string {
    if (vatRate === ZambianVatRates.EXEMPT) {
      return 'VAT Exempt';
    }

    if (vatRate === ZambianVatRates.ZERO_RATED) {
      return 'Zero Rated';
    }

    return `${vatRate}% VAT`;
  }

  /**
   * Round to two decimal places (for currency)
   */
  private static roundToTwoDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Round to three decimal places (for quantities)
   */
  private static roundToThreeDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }

  /**
   * Calculate VAT breakdown for reporting
   */
  static calculateVatBreakdown(items: InvoiceItemCalculation[]): Array<{
    vatRate: number;
    taxableAmount: number;
    vatAmount: number;
    description: string;
  }> {
    const breakdown = new Map<
      number,
      { taxableAmount: number; vatAmount: number }
    >();

    items.forEach(item => {
      const existing = breakdown.get(item.vatRate) || {
        taxableAmount: 0,
        vatAmount: 0,
      };
      existing.taxableAmount += item.lineTotal;
      existing.vatAmount += item.vatAmount;
      breakdown.set(item.vatRate, existing);
    });

    return Array.from(breakdown.entries()).map(([vatRate, amounts]) => ({
      vatRate,
      taxableAmount: this.roundToTwoDecimals(amounts.taxableAmount),
      vatAmount: this.roundToTwoDecimals(amounts.vatAmount),
      description: this.formatVatRate(vatRate),
    }));
  }

  /**
   * Validate invoice calculations for ZRA compliance
   */
  static validateInvoiceCalculations(
    items: InvoiceItemCalculation[],
    invoiceSubtotal: number,
    invoiceVatAmount: number,
    invoiceTotal: number,
    tolerance: number = 0.01
  ): {
    isValid: boolean;
    errors: string[];
    calculatedSubtotal: number;
    calculatedVatAmount: number;
    calculatedTotal: number;
  } {
    const errors: string[] = [];

    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
    const calculatedVatAmount = items.reduce(
      (sum, item) => sum + item.vatAmount,
      0
    );
    const calculatedTotal = calculatedSubtotal + calculatedVatAmount;

    // Check subtotal
    if (Math.abs(calculatedSubtotal - invoiceSubtotal) > tolerance) {
      errors.push(
        `Subtotal mismatch: calculated ${calculatedSubtotal}, provided ${invoiceSubtotal}`
      );
    }

    // Check VAT amount
    if (Math.abs(calculatedVatAmount - invoiceVatAmount) > tolerance) {
      errors.push(
        `VAT amount mismatch: calculated ${calculatedVatAmount}, provided ${invoiceVatAmount}`
      );
    }

    // Check total
    if (Math.abs(calculatedTotal - invoiceTotal) > tolerance) {
      errors.push(
        `Total amount mismatch: calculated ${calculatedTotal}, provided ${invoiceTotal}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      calculatedSubtotal: this.roundToTwoDecimals(calculatedSubtotal),
      calculatedVatAmount: this.roundToTwoDecimals(calculatedVatAmount),
      calculatedTotal: this.roundToTwoDecimals(calculatedTotal),
    };
  }
}
