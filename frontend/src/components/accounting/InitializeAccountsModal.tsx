'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Download,
  FileText
} from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Card } from '../ui/card';

interface InitializeAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  className?: string;
}

export const InitializeAccountsModal: React.FC<InitializeAccountsModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  className = '',
}) => {
  const [includeDefaultAccounts, setIncludeDefaultAccounts] = useState(true);
  const [understood, setUnderstood] = useState(false);

  const handleConfirm = () => {
    if (understood) {
      onConfirm();
    }
  };

  const defaultAccountCategories = [
    {
      type: 'ASSET',
      name: 'Assets',
      description: 'Cash, bank accounts, receivables, inventory, and fixed assets',
      accounts: [
        'Cash on Hand',
        'Bank Accounts (Zanaco, FNB, Stanbic)',
        'Mobile Money (Airtel Money, MTN)',
        'Accounts Receivable',
        'Inventory',
        'Equipment & Machinery',
        'Buildings & Property',
      ],
    },
    {
      type: 'LIABILITY',
      name: 'Liabilities',
      description: 'Accounts payable, loans, and other obligations',
      accounts: [
        'Accounts Payable',
        'VAT Payable',
        'PAYE Payable',
        'Withholding Tax Payable',
        'Bank Loans',
        'Accrued Expenses',
      ],
    },
    {
      type: 'EQUITY',
      name: 'Equity',
      description: 'Owner equity and retained earnings',
      accounts: [
        'Owner Equity',
        'Retained Earnings',
        'Current Year Earnings',
      ],
    },
    {
      type: 'REVENUE',
      name: 'Revenue',
      description: 'Sales and other income sources',
      accounts: [
        'Sales Revenue',
        'Service Revenue',
        'Interest Income',
        'Other Income',
      ],
    },
    {
      type: 'EXPENSE',
      name: 'Expenses',
      description: 'Operating expenses and cost of goods sold',
      accounts: [
        'Cost of Goods Sold',
        'Salaries & Wages',
        'Rent Expense',
        'Utilities',
        'Marketing & Advertising',
        'Professional Fees',
        'Bank Charges',
        'Depreciation',
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`initialize-modal ${className}`}>
        <DialogHeader>
          <DialogTitle className="modal-title">
            <Settings className="w-6 h-6 mr-3" />
            Initialize Chart of Accounts
          </DialogTitle>
        </DialogHeader>

        <div className="modal-content">
          {/* Warning Alert */}
          <Alert variant="warning" className="warning-alert">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will create a comprehensive chart of accounts for your organization. 
              This action should only be performed once when setting up your accounting system.
            </AlertDescription>
          </Alert>

          {/* Options */}
          <div className="options-section">
            <div className="option-item">
              <Checkbox
                id="includeDefaults"
                checked={includeDefaultAccounts}
                onCheckedChange={setIncludeDefaultAccounts}
              />
              <Label htmlFor="includeDefaults" className="option-label">
                Include default Zambian SME chart of accounts
              </Label>
            </div>
            
            <div className="option-description">
              <Info className="w-4 h-4 text-blue-600" />
              <span>
                This will create a comprehensive set of accounts specifically designed for 
                Zambian small and medium enterprises, including ZRA-compliant tax accounts 
                and mobile money integration.
              </span>
            </div>
          </div>

          {/* Preview of Default Accounts */}
          {includeDefaultAccounts && (
            <div className="preview-section">
              <h3 className="preview-title">
                <FileText className="w-5 h-5 mr-2" />
                Default Accounts Preview
              </h3>
              
              <div className="account-categories">
                {defaultAccountCategories.map((category) => (
                  <Card key={category.type} className="category-card">
                    <div className="category-header">
                      <h4 className="category-name">{category.name}</h4>
                      <span className="account-count">
                        {category.accounts.length} accounts
                      </span>
                    </div>
                    
                    <p className="category-description">
                      {category.description}
                    </p>
                    
                    <div className="account-list">
                      {category.accounts.slice(0, 4).map((account, index) => (
                        <span key={index} className="account-item">
                          {account}
                        </span>
                      ))}
                      {category.accounts.length > 4 && (
                        <span className="more-accounts">
                          +{category.accounts.length - 4} more
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation */}
          <div className="confirmation-section">
            <div className="confirmation-item">
              <Checkbox
                id="understood"
                checked={understood}
                onCheckedChange={setUnderstood}
              />
              <Label htmlFor="understood" className="confirmation-label">
                I understand that this will create system accounts that should not be deleted
              </Label>
            </div>
          </div>

          {/* Benefits */}
          <div className="benefits-section">
            <h4 className="benefits-title">Benefits of Default Chart of Accounts:</h4>
            <ul className="benefits-list">
              <li>
                <CheckCircle className="w-4 h-4 text-green-600" />
                ZRA-compliant tax account structure
              </li>
              <li>
                <CheckCircle className="w-4 h-4 text-green-600" />
                Mobile money integration (Airtel Money, MTN)
              </li>
              <li>
                <CheckCircle className="w-4 h-4 text-green-600" />
                Standard business expense categories
              </li>
              <li>
                <CheckCircle className="w-4 h-4 text-green-600" />
                Proper asset and liability classification
              </li>
              <li>
                <CheckCircle className="w-4 h-4 text-green-600" />
                Ready for financial reporting
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="modal-footer">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={!understood}
          >
            <Download className="w-4 h-4 mr-2" />
            Initialize Accounts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.initialize-modal {
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-title {
  display: flex;
  align-items: center;
  font-size: 1.5rem;
  font-weight: 600;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px 0;
}

.warning-alert {
  border-color: var(--color-semantic-warning);
  background-color: var(--color-semantic-warning-light);
}

.options-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-label {
  font-weight: 500;
  cursor: pointer;
}

.option-description {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background-color: var(--color-neutral-100);
  border-radius: 6px;
  font-size: 0.875rem;
  line-height: 1.4;
}

.preview-section {
  border: 1px solid var(--color-neutral-300);
  border-radius: 8px;
  padding: 20px;
}

.preview-title {
  display: flex;
  align-items: center;
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.account-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.category-card {
  padding: 16px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.category-name {
  font-weight: 600;
  color: var(--color-neutral-900);
}

.account-count {
  font-size: 0.75rem;
  color: var(--color-neutral-600);
  background-color: var(--color-neutral-200);
  padding: 2px 6px;
  border-radius: 4px;
}

.category-description {
  font-size: 0.875rem;
  color: var(--color-neutral-700);
  margin-bottom: 12px;
  line-height: 1.4;
}

.account-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.account-item {
  font-size: 0.75rem;
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-800);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-neutral-300);
}

.more-accounts {
  font-size: 0.75rem;
  color: var(--color-neutral-600);
  font-style: italic;
  padding: 4px 8px;
}

.confirmation-section {
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  padding: 16px;
  background-color: var(--color-primary-light);
}

.confirmation-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.confirmation-label {
  font-weight: 500;
  cursor: pointer;
}

.benefits-section {
  background-color: var(--color-semantic-success-light);
  border: 1px solid var(--color-semantic-success);
  border-radius: 6px;
  padding: 16px;
}

.benefits-title {
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-semantic-success-dark);
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.benefits-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--color-neutral-300);
}

@media (max-width: 768px) {
  .initialize-modal {
    max-width: 95vw;
    margin: 20px;
  }
  
  .account-categories {
    grid-template-columns: 1fr;
  }
  
  .modal-footer {
    flex-direction: column-reverse;
  }
}
`;
