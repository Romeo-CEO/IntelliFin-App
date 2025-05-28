import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateProductDto, UpdateProductDto } from '../products/dto/product.dto';

/**
 * Inventory Validation Service
 * Provides business rule validation for inventory operations
 * Ensures data integrity and compliance with Zambian business requirements
 */
@Injectable()
export class InventoryValidationService {

  /**
   * Validate product data
   */
  async validateProductData(productData: CreateProductDto | UpdateProductDto): Promise<void> {
    const errors: string[] = [];

    // Validate SKU format
    if (productData.sku) {
      if (!this.isValidSku(productData.sku)) {
        errors.push('SKU must contain only alphanumeric characters, hyphens, and underscores');
      }
    }

    // Validate pricing
    if (productData.costPrice !== undefined && productData.sellingPrice !== undefined) {
      if (productData.costPrice < 0) {
        errors.push('Cost price cannot be negative');
      }
      if (productData.sellingPrice < 0) {
        errors.push('Selling price cannot be negative');
      }
      if (productData.sellingPrice < productData.costPrice) {
        errors.push('Selling price should not be less than cost price');
      }
    }

    // Validate VAT rate for Zambian compliance
    if (productData.vatRate !== undefined) {
      if (!this.isValidZambianVatRate(productData.vatRate)) {
        errors.push('VAT rate must be a valid Zambian rate (0%, 16%)');
      }
    }

    // Validate stock levels
    if (productData.minimumStock !== undefined && productData.minimumStock < 0) {
      errors.push('Minimum stock cannot be negative');
    }

    if (productData.maximumStock !== undefined && productData.maximumStock < 0) {
      errors.push('Maximum stock cannot be negative');
    }

    if (
      productData.minimumStock !== undefined &&
      productData.maximumStock !== undefined &&
      productData.minimumStock > productData.maximumStock
    ) {
      errors.push('Minimum stock cannot be greater than maximum stock');
    }

    if (productData.reorderPoint !== undefined && productData.reorderPoint < 0) {
      errors.push('Reorder point cannot be negative');
    }

    if (productData.reorderQuantity !== undefined && productData.reorderQuantity < 0) {
      errors.push('Reorder quantity cannot be negative');
    }

    // Validate weight
    if (productData.weight !== undefined && productData.weight < 0) {
      errors.push('Weight cannot be negative');
    }

    // Validate dimensions
    if (productData.dimensions) {
      if (!this.isValidDimensions(productData.dimensions)) {
        errors.push('Dimensions must contain valid positive numbers for length, width, and height');
      }
    }

    // Validate barcode format
    if (productData.barcode) {
      if (!this.isValidBarcode(productData.barcode)) {
        errors.push('Barcode format is invalid');
      }
    }

    // Validate ZRA item code format
    if (productData.zraItemCode) {
      if (!this.isValidZraItemCode(productData.zraItemCode)) {
        errors.push('ZRA item code format is invalid');
      }
    }

    // Validate currency
    if (productData.currency) {
      if (!this.isValidCurrency(productData.currency)) {
        errors.push('Currency must be a valid ISO currency code');
      }
    }

    // Validate unit of measurement
    if (productData.unit) {
      if (!this.isValidUnit(productData.unit)) {
        errors.push('Unit of measurement is not supported');
      }
    }

    // Validate images
    if (productData.images && Array.isArray(productData.images)) {
      for (const image of productData.images) {
        if (!this.isValidImageUrl(image)) {
          errors.push(`Invalid image URL: ${image}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate supplier data
   */
  async validateSupplierData(supplierData: any): Promise<void> {
    const errors: string[] = [];

    // Validate ZRA TIN if provided
    if (supplierData.zraTin) {
      if (!this.isValidZraTin(supplierData.zraTin)) {
        errors.push('ZRA TIN must be a valid 10-digit number');
      }
    }

    // Validate VAT number if provided
    if (supplierData.vatNumber) {
      if (!this.isValidVatNumber(supplierData.vatNumber)) {
        errors.push('VAT number format is invalid');
      }
    }

    // Validate payment terms
    if (supplierData.paymentTerms !== undefined) {
      if (supplierData.paymentTerms < 0 || supplierData.paymentTerms > 365) {
        errors.push('Payment terms must be between 0 and 365 days');
      }
    }

    // Validate credit limit
    if (supplierData.creditLimit !== undefined && supplierData.creditLimit < 0) {
      errors.push('Credit limit cannot be negative');
    }

    // Validate rating
    if (supplierData.rating !== undefined) {
      if (supplierData.rating < 0 || supplierData.rating > 5) {
        errors.push('Rating must be between 0 and 5');
      }
    }

    // Validate email format
    if (supplierData.email) {
      if (!this.isValidEmail(supplierData.email)) {
        errors.push('Email format is invalid');
      }
    }

    // Validate phone format
    if (supplierData.phone) {
      if (!this.isValidZambianPhone(supplierData.phone)) {
        errors.push('Phone number format is invalid for Zambian numbers');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate purchase order data
   */
  async validatePurchaseOrderData(poData: any): Promise<void> {
    const errors: string[] = [];

    // Validate dates
    if (poData.orderDate && poData.expectedDate) {
      const orderDate = new Date(poData.orderDate);
      const expectedDate = new Date(poData.expectedDate);
      
      if (expectedDate < orderDate) {
        errors.push('Expected delivery date cannot be before order date');
      }
    }

    // Validate amounts
    if (poData.subtotal !== undefined && poData.subtotal < 0) {
      errors.push('Subtotal cannot be negative');
    }

    if (poData.vatAmount !== undefined && poData.vatAmount < 0) {
      errors.push('VAT amount cannot be negative');
    }

    if (poData.totalAmount !== undefined && poData.totalAmount < 0) {
      errors.push('Total amount cannot be negative');
    }

    // Validate order number format
    if (poData.orderNumber) {
      if (!this.isValidOrderNumber(poData.orderNumber)) {
        errors.push('Order number format is invalid');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate stock movement data
   */
  async validateStockMovementData(movementData: any): Promise<void> {
    const errors: string[] = [];

    // Validate quantity
    if (movementData.quantity !== undefined && movementData.quantity <= 0) {
      errors.push('Movement quantity must be positive');
    }

    // Validate unit cost
    if (movementData.unitCost !== undefined && movementData.unitCost < 0) {
      errors.push('Unit cost cannot be negative');
    }

    // Validate stock levels
    if (movementData.stockBefore !== undefined && movementData.stockBefore < 0) {
      errors.push('Stock before cannot be negative');
    }

    if (movementData.stockAfter !== undefined && movementData.stockAfter < 0) {
      errors.push('Stock after cannot be negative');
    }

    // Validate movement date
    if (movementData.movementDate) {
      const movementDate = new Date(movementData.movementDate);
      const now = new Date();
      
      if (movementDate > now) {
        errors.push('Movement date cannot be in the future');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate SKU format
   */
  private isValidSku(sku: string): boolean {
    // Allow alphanumeric characters, hyphens, and underscores
    const skuRegex = /^[A-Za-z0-9\-_]+$/;
    return skuRegex.test(sku);
  }

  /**
   * Validate Zambian VAT rates
   */
  private isValidZambianVatRate(vatRate: number): boolean {
    // Zambian VAT rates: 0% (exempt), 16% (standard)
    const validRates = [0, 16];
    return validRates.includes(vatRate);
  }

  /**
   * Validate dimensions object
   */
  private isValidDimensions(dimensions: any): boolean {
    if (typeof dimensions !== 'object' || dimensions === null) {
      return false;
    }

    const { length, width, height } = dimensions;
    
    if (length !== undefined && (typeof length !== 'number' || length < 0)) {
      return false;
    }
    
    if (width !== undefined && (typeof width !== 'number' || width < 0)) {
      return false;
    }
    
    if (height !== undefined && (typeof height !== 'number' || height < 0)) {
      return false;
    }

    return true;
  }

  /**
   * Validate barcode format
   */
  private isValidBarcode(barcode: string): boolean {
    // Support common barcode formats: UPC-A, EAN-13, Code 128
    const barcodeRegex = /^[0-9]{8,14}$|^[A-Za-z0-9\-\s]+$/;
    return barcodeRegex.test(barcode);
  }

  /**
   * Validate ZRA item code format
   */
  private isValidZraItemCode(zraItemCode: string): boolean {
    // ZRA item codes typically follow a specific format
    const zraRegex = /^[A-Z0-9\-]+$/;
    return zraRegex.test(zraItemCode) && zraItemCode.length <= 50;
  }

  /**
   * Validate currency code
   */
  private isValidCurrency(currency: string): boolean {
    const validCurrencies = ['ZMW', 'USD', 'EUR', 'GBP', 'ZAR'];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Validate unit of measurement
   */
  private isValidUnit(unit: string): boolean {
    const validUnits = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'mm', 'box', 'pack', 'set'];
    return validUnits.includes(unit.toLowerCase());
  }

  /**
   * Validate image URL
   */
  private isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const validProtocols = ['http:', 'https:'];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      if (!validProtocols.includes(urlObj.protocol)) {
        return false;
      }

      const hasValidExtension = validExtensions.some(ext => 
        urlObj.pathname.toLowerCase().endsWith(ext)
      );

      return hasValidExtension;
    } catch {
      return false;
    }
  }

  /**
   * Validate ZRA TIN
   */
  private isValidZraTin(tin: string): boolean {
    // ZRA TIN is a 10-digit number
    const tinRegex = /^\d{10}$/;
    return tinRegex.test(tin);
  }

  /**
   * Validate VAT number
   */
  private isValidVatNumber(vatNumber: string): boolean {
    // VAT number format for Zambia
    const vatRegex = /^[A-Z0-9]{8,15}$/;
    return vatRegex.test(vatNumber);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Zambian phone number
   */
  private isValidZambianPhone(phone: string): boolean {
    // Zambian phone numbers: +260XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+260|0)[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Validate order number format
   */
  private isValidOrderNumber(orderNumber: string): boolean {
    // Order number should be alphanumeric with optional hyphens
    const orderRegex = /^[A-Za-z0-9\-]+$/;
    return orderRegex.test(orderNumber) && orderNumber.length <= 50;
  }
}
