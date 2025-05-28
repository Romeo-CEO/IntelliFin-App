import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Upload,
  Download,
  Calculator,
  Save,
  Sync,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OfflineTaxData {
  taxRates: Array<{
    taxType: string;
    rate: number;
    effectiveDate: string;
  }>;
  serviceTypes: Array<{
    value: string;
    label: string;
    rate: number;
  }>;
  lastSyncAt: string;
}

interface TaxCalculationEntry {
  id: string;
  taxType: string;
  amount: number;
  serviceType?: string;
  calculatedTax: number;
  netAmount: number;
  isOffline: boolean;
  timestamp: string;
  synced: boolean;
}

export function MobileTaxEntry() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineTaxData | null>(null);
  const [pendingEntries, setPendingEntries] = useState<TaxCalculationEntry[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    taxType: '',
    amount: '',
    serviceType: '',
  });

  // Calculation result
  const [calculationResult, setCalculationResult] = useState<{
    taxAmount: number;
    netAmount: number;
    effectiveRate: number;
    isOfflineCalculation: boolean;
  } | null>(null);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Connection Restored',
        description: 'You are back online. Syncing pending data...',
      });
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Offline Mode',
        description: 'Working offline. Data will sync when connection is restored.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline data and pending entries
    loadOfflineData();
    loadPendingEntries();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = async () => {
    try {
      // Try to load from localStorage first
      const cached = localStorage.getItem('intellifin_offline_tax_data');
      if (cached) {
        setOfflineData(JSON.parse(cached));
      }

      // If online, fetch fresh data
      if (isOnline) {
        // TODO: Replace with actual API call
        // const response = await taxApi.getOfflineTaxDataPackage();
        // setOfflineData(response.data);
        // localStorage.setItem('intellifin_offline_tax_data', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const loadPendingEntries = () => {
    try {
      const cached = localStorage.getItem('intellifin_pending_tax_entries');
      if (cached) {
        setPendingEntries(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Failed to load pending entries:', error);
    }
  };

  const savePendingEntry = (entry: TaxCalculationEntry) => {
    const updated = [...pendingEntries, entry];
    setPendingEntries(updated);
    localStorage.setItem('intellifin_pending_tax_entries', JSON.stringify(updated));
  };

  const calculateTax = async () => {
    try {
      if (!formData.taxType || !formData.amount) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      let result;

      if (isOnline) {
        // Online calculation
        // TODO: Replace with actual API call
        // result = await taxApi.calculateTax({
        //   taxType: formData.taxType,
        //   amount: parseFloat(formData.amount),
        //   serviceType: formData.serviceType,
        // });
        
        // Mock online calculation
        result = {
          taxAmount: parseFloat(formData.amount) * 0.16,
          netAmount: parseFloat(formData.amount) * 0.84,
          effectiveRate: 16,
          isOfflineCalculation: false,
        };
      } else {
        // Offline calculation
        result = calculateTaxOffline();
      }

      setCalculationResult(result);

      // Save entry for syncing later
      const entry: TaxCalculationEntry = {
        id: Date.now().toString(),
        taxType: formData.taxType,
        amount: parseFloat(formData.amount),
        serviceType: formData.serviceType,
        calculatedTax: result.taxAmount,
        netAmount: result.netAmount,
        isOffline: !isOnline,
        timestamp: new Date().toISOString(),
        synced: isOnline,
      };

      if (!isOnline) {
        savePendingEntry(entry);
      }

      toast({
        title: 'Tax Calculated',
        description: `Tax amount: K${result.taxAmount.toFixed(2)} ${result.isOfflineCalculation ? '(Offline)' : ''}`,
      });
    } catch (error) {
      console.error('Failed to calculate tax:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate tax',
        variant: 'destructive',
      });
    }
  };

  const calculateTaxOffline = () => {
    if (!offlineData) {
      throw new Error('No offline data available');
    }

    let rate = 0;

    if (formData.taxType === 'WITHHOLDING_TAX' && formData.serviceType) {
      const serviceType = offlineData.serviceTypes.find(st => st.value === formData.serviceType);
      rate = serviceType ? serviceType.rate : 15;
    } else {
      const taxRate = offlineData.taxRates.find(tr => tr.taxType === formData.taxType);
      rate = taxRate ? taxRate.rate : 0;
    }

    const amount = parseFloat(formData.amount);
    const taxAmount = amount * (rate / 100);
    const netAmount = amount - taxAmount;

    return {
      taxAmount,
      netAmount,
      effectiveRate: rate,
      isOfflineCalculation: true,
    };
  };

  const syncPendingData = async () => {
    if (!isOnline || pendingEntries.length === 0) return;

    try {
      setIsSyncing(true);
      setSyncProgress(0);

      for (let i = 0; i < pendingEntries.length; i++) {
        const entry = pendingEntries[i];
        
        // TODO: Sync entry with server
        // await taxApi.syncTaxEntry(entry);
        
        // Simulate sync progress
        await new Promise(resolve => setTimeout(resolve, 500));
        setSyncProgress(((i + 1) / pendingEntries.length) * 100);
      }

      // Clear pending entries after successful sync
      setPendingEntries([]);
      localStorage.removeItem('intellifin_pending_tax_entries');

      toast({
        title: 'Sync Complete',
        description: `${pendingEntries.length} entries synced successfully`,
      });
    } catch (error) {
      console.error('Failed to sync pending data:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync pending data. Will retry later.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const downloadOfflineData = async () => {
    try {
      // TODO: Download fresh offline data package
      toast({
        title: 'Download Complete',
        description: 'Offline data package updated',
      });
    } catch (error) {
      console.error('Failed to download offline data:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download offline data',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto p-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle className="text-lg">Mobile Tax Entry</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge className="bg-green-50 text-green-700 border-green-200">
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge className="bg-orange-50 text-orange-700 border-orange-200">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            {isOnline 
              ? 'Connected - Real-time calculations available'
              : 'Offline mode - Using cached data for calculations'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Sync Status */}
          {pendingEntries.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-yellow-800">
                  {pendingEntries.length} entries pending sync
                </span>
                {isOnline && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={syncPendingData}
                    disabled={isSyncing}
                  >
                    <Sync className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>
                )}
              </div>
              {isSyncing && (
                <Progress value={syncProgress} className="h-2" />
              )}
            </div>
          )}

          {/* Offline Data Status */}
          {offlineData && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-800">Offline Data</div>
                  <div className="text-xs text-blue-600">
                    Last updated: {new Date(offlineData.lastSyncAt).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadOfflineData}
                  disabled={!isOnline}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Update
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Calculation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculate Tax
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taxType">Tax Type</Label>
            <Select
              value={formData.taxType}
              onValueChange={(value) => setFormData({ ...formData, taxType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tax type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VAT">VAT (16%)</SelectItem>
                <SelectItem value="WITHHOLDING_TAX">Withholding Tax</SelectItem>
                <SelectItem value="INCOME_TAX">Income Tax</SelectItem>
                <SelectItem value="PAYE">PAYE</SelectItem>
                <SelectItem value="TURNOVER_TAX">Turnover Tax (4%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.taxType === 'WITHHOLDING_TAX' && (
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFESSIONAL_SERVICES">Professional Services (15%)</SelectItem>
                  <SelectItem value="RENT">Rent (10%)</SelectItem>
                  <SelectItem value="CONSULTANCY">Consultancy (15%)</SelectItem>
                  <SelectItem value="OTHER">Other Services (15%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (K)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
            />
          </div>

          <Button 
            onClick={calculateTax} 
            className="w-full"
            disabled={!formData.taxType || !formData.amount}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Tax
          </Button>

          {/* Calculation Result */}
          {calculationResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Calculation Result</span>
                {calculationResult.isOfflineCalculation && (
                  <Badge variant="outline" className="text-xs">
                    Offline
                  </Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gross Amount:</span>
                  <span>K{parseFloat(formData.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({calculationResult.effectiveRate}%):</span>
                  <span>K{calculationResult.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Net Amount:</span>
                  <span>K{calculationResult.netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="sm" disabled={!isOnline}>
          <Save className="h-4 w-4 mr-2" />
          Save Entry
        </Button>
        <Button variant="outline" size="sm" disabled={!isOnline}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Data
        </Button>
      </div>

      {/* Offline Notice */}
      {!isOnline && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-800 mb-1">Working Offline</p>
                <p className="text-orange-700">
                  Calculations are performed using cached data. Results will be synced when you're back online.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
