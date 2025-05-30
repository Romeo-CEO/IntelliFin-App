import { Calculator, Info, Copy, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { taxManagementApi, TaxCalculationResult, TaxType } from '@/lib/api/tax-management';

import { useToast } from '@/hooks/use-toast';


export function TaxCalculator() {
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [selectedTaxType, setSelectedTaxType] = useState('');
  const [amount, setAmount] = useState('');
  const [isInclusive, setIsInclusive] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTaxTypes();
    // Set default effective date to today
    setEffectiveDate(new Date().toISOString().split('T')[0]);
  }, []);

  const loadTaxTypes = async () => {
    try {
      const response = await taxManagementApi.getTaxTypes();
      if (response.success) {
        setTaxTypes(response.data);
      }
    } catch (error) {
      console.error('Failed to load tax types:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tax types',
        variant: 'destructive',
      });
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTaxType || !amount) {
      toast({
        title: 'Error',
        description: 'Please select a tax type and enter an amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCalculating(true);
      
      const calculationRequest = {
        taxType: selectedTaxType,
        amount: parseFloat(amount),
        isInclusive,
        effectiveDate,
      };

      const response = await taxManagementApi.calculateTax(calculationRequest);
      
      if (response.success) {
        setResult(response.data);
        toast({
          title: 'Success',
          description: 'Tax calculation completed successfully',
        });
      } else {
        throw new Error(response.error || 'Calculation failed');
      }
    } catch (error) {
      console.error('Failed to calculate tax:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate tax',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;

    const resultText = `
Tax Calculation Result:
Tax Type: ${result.taxType}
Gross Amount: K${result.grossAmount.toFixed(2)}
Tax Amount: K${result.taxAmount.toFixed(2)}
Net Amount: K${result.netAmount.toFixed(2)}
Tax Rate: ${(result.taxRate * 100).toFixed(2)}%
Calculation Type: ${result.isInclusive ? 'Tax Inclusive' : 'Tax Exclusive'}
    `.trim();

    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied',
        description: 'Tax calculation result copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const resetCalculator = () => {
    setSelectedTaxType('');
    setAmount('');
    setIsInclusive(false);
    setResult(null);
  };

  const getTaxTypeDescription = (taxType: string) => {
    const type = taxTypes.find(t => t.value === taxType);
    return type?.description || '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calculator Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Calculator
          </CardTitle>
          <CardDescription>
            Calculate taxes for various Zambian tax types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCalculate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxType">Tax Type</Label>
              <Select
                value={selectedTaxType}
                onValueChange={setSelectedTaxType}
                required
              >
                <SelectTrigger data-testid="tax-type-select">
                  <SelectValue placeholder="Select tax type" />
                </SelectTrigger>
                <SelectContent>
                  {taxTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTaxType && (
                <p className="text-sm text-muted-foreground">
                  {getTaxTypeDescription(selectedTaxType)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (K)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                data-testid="amount-input"
                required
              />
            </div>

            {(selectedTaxType === 'VAT' || selectedTaxType === 'TURNOVER_TAX') && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="isInclusive"
                  checked={isInclusive}
                  onCheckedChange={setIsInclusive}
                  data-testid="inclusive-switch"
                />
                <Label htmlFor="isInclusive">Tax Inclusive</Label>
                <div className="ml-2">
                  <Badge variant="outline" className="text-xs">
                    {isInclusive ? 'Amount includes tax' : 'Amount excludes tax'}
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective Date</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                data-testid="effective-date-input"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isCalculating}
                className="flex-1"
                data-testid="calculate-button"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Tax'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetCalculator}
                data-testid="reset-button"
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Calculation Result */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Calculation Result
              </CardTitle>
              <CardDescription>
                Detailed breakdown of tax calculation
              </CardDescription>
            </div>
            {result && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyResult}
                data-testid="copy-result-button"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="text-center py-8">
              <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Enter details and click calculate to see results
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Tax Type</p>
                  <p className="text-lg font-semibold">{result.taxType}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Tax Rate</p>
                  <p className="text-lg font-semibold">{(result.taxRate * 100).toFixed(2)}%</p>
                </div>
              </div>

              {/* Amounts */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    {result.isInclusive ? 'Gross Amount (Tax Inclusive)' : 'Net Amount (Tax Exclusive)'}
                  </span>
                  <span className="font-medium">
                    K{result.isInclusive ? result.grossAmount.toFixed(2) : result.netAmount.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Tax Amount</span>
                  <span className="font-medium text-red-600">
                    K{result.taxAmount.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    {result.isInclusive ? 'Net Amount (Tax Exclusive)' : 'Gross Amount (Tax Inclusive)'}
                  </span>
                  <span className="font-medium">
                    K{result.isInclusive ? result.netAmount.toFixed(2) : result.grossAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Calculation Details */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3">Calculation Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span>K{result.calculation.baseAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Applicable Rate:</span>
                    <span>{(result.calculation.applicableRate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Final Tax Amount:</span>
                    <span className="font-medium">K{result.calculation.finalTaxAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="text-xs text-muted-foreground">
                <p>Calculation performed on: {new Date(result.effectiveDate).toLocaleDateString()}</p>
                <p>Rates based on current Zambian tax regulations</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
