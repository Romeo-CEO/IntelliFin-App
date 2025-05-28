'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  AlertCircle, 
  Calculator,
  Search
} from 'lucide-react';
import { useAccounting } from '../../contexts/AccountingContext';
import { JournalEntry, Account } from '../../services/accounting.service';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Form validation schema
const journalEntryLineSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  debitAmount: z.number().min(0).optional(),
  creditAmount: z.number().min(0).optional(),
  description: z.string().optional(),
  reference: z.string().optional(),
}).refine(
  (data) => (data.debitAmount && data.debitAmount > 0) || (data.creditAmount && data.creditAmount > 0),
  {
    message: 'Either debit or credit amount must be greater than 0',
    path: ['debitAmount'],
  }
).refine(
  (data) => !(data.debitAmount && data.debitAmount > 0 && data.creditAmount && data.creditAmount > 0),
  {
    message: 'Cannot have both debit and credit amounts',
    path: ['debitAmount'],
  }
);

const journalEntryFormSchema = z.object({
  entryDate: z.string().min(1, 'Entry date is required'),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  entryType: z.enum(['STANDARD', 'ADJUSTING', 'CLOSING', 'REVERSING', 'OPENING', 'CORRECTION']),
  lines: z.array(journalEntryLineSchema).min(2, 'At least 2 lines are required'),
}).refine(
  (data) => {
    const totalDebits = data.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredits = data.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
    return Math.abs(totalDebits - totalCredits) < 0.01;
  },
  {
    message: 'Total debits must equal total credits',
    path: ['lines'],
  }
);

type JournalEntryFormData = z.infer<typeof journalEntryFormSchema>;

interface JournalEntryFormProps {
  entry?: JournalEntry | null;
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
  entry,
  onSuccess,
  onCancel,
  className = '',
}) => {
  const { state, createJournalEntry, updateJournalEntry, loadAccounts } = useAccounting();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accountSearch, setAccountSearch] = useState('');

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntryFormSchema),
    defaultValues: {
      entryDate: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
      entryType: 'STANDARD',
      lines: [
        { accountId: '', debitAmount: 0, creditAmount: 0, description: '', reference: '' },
        { accountId: '', debitAmount: 0, creditAmount: 0, description: '', reference: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const watchedLines = watch('lines');

  // Load accounts on mount
  useEffect(() => {
    if (state.accounts.length === 0) {
      loadAccounts({ limit: 1000 });
    }
  }, [loadAccounts, state.accounts.length]);

  // Set form values when editing an entry
  useEffect(() => {
    if (entry) {
      reset({
        entryDate: entry.entryDate.split('T')[0],
        description: entry.description,
        reference: entry.reference || '',
        entryType: entry.entryType,
        lines: entry.lines.map(line => ({
          accountId: line.debitAccount?.accountCode || line.creditAccount?.accountCode || '',
          debitAmount: line.debitAmount || 0,
          creditAmount: line.creditAmount || 0,
          description: line.description || '',
          reference: line.reference || '',
        })),
      });
    }
  }, [entry, reset]);

  // Calculate totals
  const totalDebits = watchedLines.reduce((sum, line) => sum + (Number(line.debitAmount) || 0), 0);
  const totalCredits = watchedLines.reduce((sum, line) => sum + (Number(line.creditAmount) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  // Filter accounts based on search
  const filteredAccounts = state.accounts.filter(account =>
    account.isActive && (
      account.accountCode.toLowerCase().includes(accountSearch.toLowerCase()) ||
      account.accountName.toLowerCase().includes(accountSearch.toLowerCase())
    )
  );

  const onSubmit = async (data: JournalEntryFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Transform data for API
      const apiData = {
        entryDate: data.entryDate,
        description: data.description,
        reference: data.reference,
        entryType: data.entryType,
        lines: data.lines.map(line => {
          const account = state.accounts.find(acc => acc.id === line.accountId);
          return {
            accountCode: account?.accountCode,
            accountId: line.accountId,
            debitAmount: line.debitAmount || undefined,
            creditAmount: line.creditAmount || undefined,
            description: line.description,
            reference: line.reference,
          };
        }),
      };

      if (entry) {
        await updateJournalEntry(entry.id, apiData);
      } else {
        await createJournalEntry(apiData);
      }

      onSuccess();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save journal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLine = () => {
    append({ accountId: '', debitAmount: 0, creditAmount: 0, description: '', reference: '' });
  };

  const removeLine = (index: number) => {
    if (fields.length > 2) {
      remove(index);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className={`journal-entry-form ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="form-content">
        {submitError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Header Information */}
        <div className="form-header">
          <h2 className="form-title">
            {entry ? 'Edit Journal Entry' : 'Create Journal Entry'}
          </h2>
          
          <div className="header-fields">
            <div className="form-field">
              <Label htmlFor="entryDate">Entry Date *</Label>
              <Input
                id="entryDate"
                type="date"
                {...register('entryDate')}
                error={errors.entryDate?.message}
              />
            </div>
            
            <div className="form-field">
              <Label htmlFor="entryType">Entry Type *</Label>
              <Select
                {...register('entryType')}
                error={errors.entryType?.message}
              >
                <option value="STANDARD">Standard</option>
                <option value="ADJUSTING">Adjusting</option>
                <option value="CLOSING">Closing</option>
                <option value="REVERSING">Reversing</option>
                <option value="OPENING">Opening</option>
                <option value="CORRECTION">Correction</option>
              </Select>
            </div>
          </div>

          <div className="form-field">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe the journal entry..."
              rows={2}
              error={errors.description?.message}
            />
          </div>

          <div className="form-field">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              {...register('reference')}
              placeholder="Optional reference number or document"
            />
          </div>
        </div>

        {/* Journal Entry Lines */}
        <div className="lines-section">
          <div className="lines-header">
            <h3>Journal Entry Lines</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Line
            </Button>
          </div>

          {/* Account Search */}
          <div className="account-search">
            <Search className="search-icon" />
            <Input
              placeholder="Search accounts by code or name..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Lines Table */}
          <div className="lines-table">
            <div className="table-header">
              <div className="col-account">Account</div>
              <div className="col-description">Description</div>
              <div className="col-debit">Debit</div>
              <div className="col-credit">Credit</div>
              <div className="col-actions">Actions</div>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="table-row">
                <div className="col-account">
                  <Select
                    {...register(`lines.${index}.accountId`)}
                    error={errors.lines?.[index]?.accountId?.message}
                  >
                    <option value="">Select account...</option>
                    {filteredAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountCode} - {account.accountName}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-description">
                  <Input
                    {...register(`lines.${index}.description`)}
                    placeholder="Line description..."
                  />
                </div>

                <div className="col-debit">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`lines.${index}.debitAmount`, { valueAsNumber: true })}
                    placeholder="0.00"
                    onFocus={(e) => {
                      setValue(`lines.${index}.creditAmount`, 0);
                    }}
                  />
                </div>

                <div className="col-credit">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`lines.${index}.creditAmount`, { valueAsNumber: true })}
                    placeholder="0.00"
                    onFocus={(e) => {
                      setValue(`lines.${index}.debitAmount`, 0);
                    }}
                  />
                </div>

                <div className="col-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(index)}
                    disabled={fields.length <= 2}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="totals-section">
            <div className="totals-row">
              <span className="totals-label">Total Debits:</span>
              <span className="totals-value">{formatCurrency(totalDebits)}</span>
            </div>
            <div className="totals-row">
              <span className="totals-label">Total Credits:</span>
              <span className="totals-value">{formatCurrency(totalCredits)}</span>
            </div>
            <div className="totals-row">
              <span className="totals-label">Difference:</span>
              <span className={`totals-value ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                {formatCurrency(Math.abs(totalDebits - totalCredits))}
              </span>
            </div>
            <div className="balance-status">
              <Badge variant={isBalanced ? 'default' : 'destructive'}>
                <Calculator className="w-3 h-3 mr-1" />
                {isBalanced ? 'Balanced' : 'Unbalanced'}
              </Badge>
            </div>
          </div>

          {errors.lines && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {typeof errors.lines.message === 'string' 
                  ? errors.lines.message 
                  : 'Please check the journal entry lines for errors'
                }
              </AlertDescription>
            </Alert>
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
            disabled={isSubmitting || !isBalanced}
          >
            {isSubmitting ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {entry ? 'Update Entry' : 'Create Entry'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
