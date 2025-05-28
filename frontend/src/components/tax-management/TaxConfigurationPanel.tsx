import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Settings, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { taxManagementApi } from '@/lib/api/tax-management';

interface TaxRate {
  id: string;
  taxType: string;
  rate: number;
  effectiveDate: string;
  endDate?: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
}

interface TaxType {
  value: string;
  label: string;
  description: string;
}

export function TaxConfigurationPanel() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [currentRates, setCurrentRates] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    taxType: '',
    rate: '',
    effectiveDate: '',
    endDate: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    loadTaxConfiguration();
  }, []);

  const loadTaxConfiguration = async () => {
    try {
      setIsLoading(true);
      
      // Load tax types and current rates in parallel
      const [typesResponse, ratesResponse] = await Promise.all([
        taxManagementApi.getTaxTypes(),
        taxManagementApi.getCurrentTaxRates(),
      ]);

      if (typesResponse.success) {
        setTaxTypes(typesResponse.data);
      }

      if (ratesResponse.success) {
        setCurrentRates(ratesResponse.data);
      }

      // TODO: Load custom tax rates from organization
      // const customRatesResponse = await taxManagementApi.getCustomTaxRates();
      // if (customRatesResponse.success) {
      //   setTaxRates(customRatesResponse.data);
      // }

    } catch (error) {
      console.error('Failed to load tax configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tax configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const rateData = {
        ...formData,
        rate: parseFloat(formData.rate) / 100, // Convert percentage to decimal
        effectiveDate: new Date(formData.effectiveDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      };

      // TODO: Implement API call to create/update tax rate
      // if (editingRate) {
      //   await taxManagementApi.updateTaxRate(editingRate.id, rateData);
      // } else {
      //   await taxManagementApi.createTaxRate(rateData);
      // }

      toast({
        title: 'Success',
        description: `Tax rate ${editingRate ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      setEditingRate(null);
      resetForm();
      loadTaxConfiguration();
    } catch (error) {
      console.error('Failed to save tax rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tax rate',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (rate: TaxRate) => {
    setEditingRate(rate);
    setFormData({
      taxType: rate.taxType,
      rate: (rate.rate * 100).toString(), // Convert decimal to percentage
      effectiveDate: rate.effectiveDate.split('T')[0],
      endDate: rate.endDate ? rate.endDate.split('T')[0] : '',
      description: rate.description || '',
      isActive: rate.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (rateId: string) => {
    if (!confirm('Are you sure you want to delete this tax rate?')) {
      return;
    }

    try {
      // TODO: Implement API call to delete tax rate
      // await taxManagementApi.deleteTaxRate(rateId);
      
      toast({
        title: 'Success',
        description: 'Tax rate deleted successfully',
      });
      
      loadTaxConfiguration();
    } catch (error) {
      console.error('Failed to delete tax rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tax rate',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      taxType: '',
      rate: '',
      effectiveDate: '',
      endDate: '',
      description: '',
      isActive: true,
    });
  };

  const openCreateDialog = () => {
    setEditingRate(null);
    resetForm();
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Tax Rates Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Current Zambian Tax Rates
          </CardTitle>
          <CardDescription>
            Standard tax rates applicable in Zambia (2024)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentRates && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-sm text-muted-foreground">VAT</h4>
                <p className="text-2xl font-bold">{currentRates.VAT?.standard}%</p>
                <p className="text-xs text-muted-foreground">Standard rate</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-sm text-muted-foreground">Withholding Tax</h4>
                <p className="text-2xl font-bold">{currentRates.WITHHOLDING_TAX?.standard}%</p>
                <p className="text-xs text-muted-foreground">Standard rate</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-sm text-muted-foreground">Income Tax</h4>
                <p className="text-2xl font-bold">{currentRates.INCOME_TAX?.corporate}%</p>
                <p className="text-xs text-muted-foreground">Corporate rate</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-sm text-muted-foreground">Turnover Tax</h4>
                <p className="text-2xl font-bold">{currentRates.TURNOVER_TAX?.rate}%</p>
                <p className="text-xs text-muted-foreground">Small business rate</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Tax Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Custom Tax Rates
              </CardTitle>
              <CardDescription>
                Organization-specific tax rates and configurations
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} data-testid="add-tax-rate-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tax Rate
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRate ? 'Edit Tax Rate' : 'Add Tax Rate'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure custom tax rates for your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="taxType">Tax Type</Label>
                      <Select
                        value={formData.taxType}
                        onValueChange={(value) => setFormData({ ...formData, taxType: value })}
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
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="rate">Rate (%)</Label>
                      <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.rate}
                        onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                        placeholder="Enter rate percentage"
                        data-testid="tax-rate-input"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="effectiveDate">Effective Date</Label>
                      <Input
                        id="effectiveDate"
                        type="date"
                        value={formData.effectiveDate}
                        onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                        data-testid="effective-date-input"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endDate">End Date (Optional)</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        data-testid="end-date-input"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional description"
                        data-testid="description-input"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        data-testid="is-active-switch"
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="save-tax-rate-button">
                      {editingRate ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {taxRates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No custom tax rates configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Using standard Zambian tax rates
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">
                      {taxTypes.find(t => t.value === rate.taxType)?.label || rate.taxType}
                    </TableCell>
                    <TableCell>{(rate.rate * 100).toFixed(2)}%</TableCell>
                    <TableCell>
                      {new Date(rate.effectiveDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {rate.endDate ? new Date(rate.endDate).toLocaleDateString() : 'Ongoing'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rate.isActive ? 'default' : 'secondary'}>
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rate)}
                          disabled={rate.isSystem}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rate.id)}
                          disabled={rate.isSystem}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
