'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, AlertCircle } from 'lucide-react';
import { useAccounting } from '../../contexts/AccountingContext';
import { Account } from '../../services/accounting.service';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Form validation schema
const accountFormSchema = z.object({
  accountCode: z.string()
    .min(4, 'Account code must be exactly 4 digits')
    .max(4, 'Account code must be exactly 4 digits')
    .regex(/^\d{4}$/, 'Account code must be a 4-digit number'),
  accountName: z.string()
    .min(1, 'Account name is required')
    .max(255, 'Account name must be less than 255 characters'),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'], {
    required_error: 'Account type is required',
  }),
  accountSubType: z.string().optional(),
  parentAccountId: z.string().optional(),
  normalBalance: z.enum(['DEBIT', 'CREDIT'], {
    required_error: 'Normal balance is required',
  }),
  isActive: z.boolean().default(true),
  isBankAccount: z.boolean().default(false),
  isTaxAccount: z.boolean().default(false),
  currentBalance: z.number().default(0),
  currency: z.string().default('ZMW'),
  description: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  taxCode: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

interface AccountFormProps {
  account?: Account | null;
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

export const AccountForm: React.FC<AccountFormProps> = ({
  account,
  onSuccess,
  onCancel,
  className = '',
}) => {
  const { state, createAccount, updateAccount } = useAccounting();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      accountCode: '',
      accountName: '',
      accountType: 'ASSET',
      normalBalance: 'DEBIT',
      isActive: true,
      isBankAccount: false,
      isTaxAccount: false,
      currentBalance: 0,
      currency: 'ZMW',
    },
  });

  const watchedAccountType = watch('accountType');
  const watchedIsBankAccount = watch('isBankAccount');

  // Set form values when editing an account
  useEffect(() => {
    if (account) {
      reset({
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        accountSubType: account.accountSubType || '',
        parentAccountId: account.parentAccountId || '',
        normalBalance: account.normalBalance,
        isActive: account.isActive,
        isBankAccount: account.isBankAccount,
        isTaxAccount: account.isTaxAccount,
        currentBalance: account.currentBalance,
        currency: account.currency,
        description: account.description || '',
        accountNumber: account.accountNumber || '',
        bankName: account.bankName || '',
        taxCode: account.taxCode || '',
      });
    }
  }, [account, reset]);

  // Auto-set normal balance based on account type
  useEffect(() => {
    const normalBalance = ['ASSET', 'EXPENSE'].includes(watchedAccountType) ? 'DEBIT' : 'CREDIT';
    setValue('normalBalance', normalBalance);
  }, [watchedAccountType, setValue]);

  const onSubmit = async (data: AccountFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      if (account) {
        await updateAccount(account.id, data);
      } else {
        await createAccount(data);
      }

      onSuccess();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get potential parent accounts (same type, not self)
  const potentialParentAccounts = state.accounts.filter(acc =>
    acc.accountType === watchedAccountType &&
    acc.id !== account?.id &&
    !acc.parentAccountId // Only root accounts can be parents
  );

  const accountSubTypeOptions = {
    ASSET: [
      { value: 'CURRENT_ASSET', label: 'Current Asset' },
      { value: 'NON_CURRENT_ASSET', label: 'Non-Current Asset' },
      { value: 'FIXED_ASSET', label: 'Fixed Asset' },
      { value: 'CASH_AND_EQUIVALENTS', label: 'Cash and Equivalents' },
      { value: 'ACCOUNTS_RECEIVABLE', label: 'Accounts Receivable' },
      { value: 'INVENTORY', label: 'Inventory' },
      { value: 'PREPAID_EXPENSES', label: 'Prepaid Expenses' },
    ],
    LIABILITY: [
      { value: 'CURRENT_LIABILITY', label: 'Current Liability' },
      { value: 'NON_CURRENT_LIABILITY', label: 'Non-Current Liability' },
      { value: 'ACCOUNTS_PAYABLE', label: 'Accounts Payable' },
      { value: 'ACCRUED_EXPENSES', label: 'Accrued Expenses' },
      { value: 'SHORT_TERM_DEBT', label: 'Short-term Debt' },
      { value: 'LONG_TERM_DEBT', label: 'Long-term Debt' },
      { value: 'TAX_LIABILITY', label: 'Tax Liability' },
    ],
    EQUITY: [
      { value: 'OWNER_EQUITY', label: 'Owner Equity' },
      { value: 'RETAINED_EARNINGS', label: 'Retained Earnings' },
      { value: 'CAPITAL_STOCK', label: 'Capital Stock' },
    ],
    REVENUE: [
      { value: 'OPERATING_REVENUE', label: 'Operating Revenue' },
      { value: 'NON_OPERATING_REVENUE', label: 'Non-Operating Revenue' },
      { value: 'SALES_REVENUE', label: 'Sales Revenue' },
      { value: 'SERVICE_REVENUE', label: 'Service Revenue' },
    ],
    EXPENSE: [
      { value: 'OPERATING_EXPENSE', label: 'Operating Expense' },
      { value: 'NON_OPERATING_EXPENSE', label: 'Non-Operating Expense' },
      { value: 'COST_OF_GOODS_SOLD', label: 'Cost of Goods Sold' },
      { value: 'ADMINISTRATIVE_EXPENSE', label: 'Administrative Expense' },
      { value: 'SELLING_EXPENSE', label: 'Selling Expense' },
    ],
  };

  return (
    <Card className={`account-form ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="form-content">
        {submitError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="form-grid">
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>

            <div className="form-row">
              <div className="form-field">
                <Label htmlFor="accountCode">Account Code *</Label>
                <Input
                  id="accountCode"
                  {...register('accountCode')}
                  placeholder="e.g., 1100"
                  disabled={!!account} // Don't allow editing code for existing accounts
                  error={errors.accountCode?.message}
                />
              </div>

              <div className="form-field">
                <Label htmlFor="accountName">Account Name *</Label>
                <Input
                  id="accountName"
                  {...register('accountName')}
                  placeholder="e.g., Cash on Hand"
                  error={errors.accountName?.message}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <Label htmlFor="accountType">Account Type *</Label>
                <Select
                  {...register('accountType')}
                  error={errors.accountType?.message}
                >
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EQUITY">Equity</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="EXPENSE">Expense</option>
                </Select>
              </div>

              <div className="form-field">
                <Label htmlFor="accountSubType">Sub Type</Label>
                <Select {...register('accountSubType')}>
                  <option value="">Select sub type...</option>
                  {accountSubTypeOptions[watchedAccountType]?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <Label htmlFor="parentAccountId">Parent Account</Label>
                <Select {...register('parentAccountId')}>
                  <option value="">No parent (root account)</option>
                  {potentialParentAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="form-field">
                <Label htmlFor="normalBalance">Normal Balance *</Label>
                <Select
                  {...register('normalBalance')}
                  error={errors.normalBalance?.message}
                >
                  <option value="DEBIT">Debit</option>
                  <option value="CREDIT">Credit</option>
                </Select>
              </div>
            </div>

            <div className="form-field">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Optional description of the account..."
                rows={3}
              />
            </div>
          </div>

          {/* Account Properties */}
          <div className="form-section">
            <h3 className="section-title">Account Properties</h3>

            <div className="form-switches">
              <div className="switch-field">
                <Checkbox
                  id="isActive"
                  {...register('isActive')}
                />
                <Label htmlFor="isActive">Active Account</Label>
              </div>

              <div className="switch-field">
                <Checkbox
                  id="isBankAccount"
                  {...register('isBankAccount')}
                />
                <Label htmlFor="isBankAccount">Bank Account</Label>
              </div>

              <div className="switch-field">
                <Checkbox
                  id="isTaxAccount"
                  {...register('isTaxAccount')}
                />
                <Label htmlFor="isTaxAccount">Tax Account</Label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <Label htmlFor="currentBalance">Current Balance</Label>
                <Input
                  id="currentBalance"
                  type="number"
                  step="0.01"
                  {...register('currentBalance', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div className="form-field">
                <Label htmlFor="currency">Currency</Label>
                <Select {...register('currency')}>
                  <option value="ZMW">ZMW (Zambian Kwacha)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          {watchedIsBankAccount && (
            <div className="form-section">
              <h3 className="section-title">Bank Account Details</h3>

              <div className="form-row">
                <div className="form-field">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    {...register('accountNumber')}
                    placeholder="Bank account number"
                  />
                </div>

                <div className="form-field">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    {...register('bankName')}
                    placeholder="e.g., Zanaco, FNB, Stanbic"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {account ? 'Update Account' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.account-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-content {
  padding: 24px;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-bottom: 32px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-neutral-300);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-switches {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.switch-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--color-neutral-300);
}

@media (max-width: 768px) {
  .form-content {
    padding: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }
}
`;
