'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, DollarSign, FileText, Tag, User, CreditCard, Calculator } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { ReceiptUpload } from '@/components/receipts/ReceiptUpload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency } from '@/lib/utils';
import { expenseService } from '@/services/expense.service';

// Payment method options
const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'CHECK', label: 'Check' },
  { value: 'OTHER', label: 'Other' },
];

// Recurrence pattern options
const RECURRENCE_PATTERNS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
];

// Form validation schema
const expenseFormSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  vendor: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('ZMW'),
  description: z.string().min(1, 'Description is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  isTaxDeductible: z.boolean().default(true),
  vatAmount: z.number().min(0).default(0),
  withholdingTax: z.number().min(0).default(0),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.isRecurring && !data.recurrencePattern) {
    return false;
  }
  return true;
}, {
  message: 'Recurrence pattern is required for recurring expenses',
  path: ['recurrencePattern'],
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<ExpenseFormData>;
  isEditing?: boolean;
  expenseId?: string;
  showReceiptUpload?: boolean;
}

export function ExpenseForm({
  onSuccess,
  onCancel,
  initialData,
  isEditing = false,
  expenseId,
  showReceiptUpload = true,
}: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedVat, setCalculatedVat] = useState(0);

  const { categories, isLoading: categoriesLoading } = useCategories({
    type: 'EXPENSE',
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      currency: 'ZMW',
      isTaxDeductible: true,
      vatAmount: 0,
      withholdingTax: 0,
      isRecurring: false,
      ...initialData,
    },
  });

  const watchAmount = watch('amount');
  const watchIsTaxDeductible = watch('isTaxDeductible');
  const watchIsRecurring = watch('isRecurring');
  const watchVatAmount = watch('vatAmount');

  // Auto-calculate VAT when amount or tax deductible status changes
  useEffect(() => {
    if (watchAmount && watchIsTaxDeductible && !watchVatAmount) {
      const vat = watchAmount * 0.16; // 16% VAT rate for Zambia
      setCalculatedVat(vat);
      setValue('vatAmount', vat);
    }
  }, [watchAmount, watchIsTaxDeductible, watchVatAmount, setValue]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && expenseId) {
        await expenseService.updateExpense(expenseId, data);
        toast.success('Expense updated successfully');
      } else {
        await expenseService.createExpense(data);
        toast.success('Expense created successfully');
      }

      reset();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {isEditing ? 'Edit Expense' : 'Record New Expense'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="categoryId" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Category *
              </Label>
              <Select
                onValueChange={(value) => setValue('categoryId', value)}
                defaultValue={initialData?.categoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expense category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-red-600">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Vendor/Supplier
              </Label>
              <Input
                id="vendor"
                placeholder="Enter vendor name"
                {...register('vendor')}
              />
              {errors.vendor && (
                <p className="text-sm text-red-600">{errors.vendor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount (ZMW) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Method *
              </Label>
              <Select
                onValueChange={(value) => setValue('paymentMethod', value)}
                defaultValue={initialData?.paymentMethod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paymentMethod && (
                <p className="text-sm text-red-600">{errors.paymentMethod.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                placeholder="Enter reference number"
                {...register('reference')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the expense"
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <Separator />

          {/* Tax Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Tax Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isTaxDeductible"
                  checked={watchIsTaxDeductible}
                  onCheckedChange={(checked) => setValue('isTaxDeductible', !!checked)}
                />
                <Label htmlFor="isTaxDeductible">Tax Deductible</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatAmount">VAT Amount (ZMW)</Label>
                <Input
                  id="vatAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('vatAmount', { valueAsNumber: true })}
                />
                {calculatedVat > 0 && (
                  <p className="text-sm text-gray-600">
                    Calculated: {formatCurrency(calculatedVat)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="withholdingTax">Withholding Tax (ZMW)</Label>
                <Input
                  id="withholdingTax"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('withholdingTax', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Recurring Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={watchIsRecurring}
                onCheckedChange={(checked) => setValue('isRecurring', !!checked)}
              />
              <Label htmlFor="isRecurring">Recurring Expense</Label>
            </div>

            {watchIsRecurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="recurrencePattern">Recurrence Pattern *</Label>
                  <Select
                    onValueChange={(value) => setValue('recurrencePattern', value)}
                    defaultValue={initialData?.recurrencePattern}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_PATTERNS.map((pattern) => (
                        <SelectItem key={pattern.value} value={pattern.value}>
                          {pattern.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.recurrencePattern && (
                    <p className="text-sm text-red-600">{errors.recurrencePattern.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrenceEndDate">End Date</Label>
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    {...register('recurrenceEndDate')}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes or comments"
              rows={2}
              {...register('notes')}
            />
          </div>

          {/* Receipt Upload Section */}
          {showReceiptUpload && expenseId && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Attach Receipts</h3>
                <ReceiptUpload
                  expenseId={expenseId}
                  onUploadSuccess={() => {
                    // Optionally refresh expense data or show success message
                  }}
                  onUploadError={(error) => {
                    console.error('Receipt upload error:', error);
                  }}
                />
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || categoriesLoading}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Expense' : 'Create Expense'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
