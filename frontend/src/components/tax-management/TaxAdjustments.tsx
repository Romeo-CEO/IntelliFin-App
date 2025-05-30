import { 
  Plus, 
  Check, 
  X, 
  Send, 
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import { useToast } from '@/hooks/use-toast';

interface TaxAdjustment {
  id: string;
  adjustmentType: string;
  originalAmount: number;
  adjustedAmount: number;
  adjustmentAmount: number;
  reason: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  taxPeriod: {
    taxType: string;
    periodStart: string;
    periodEnd: string;
    year: number;
    quarter?: number;
    month?: number;
  };
}

interface AdjustmentType {
  value: string;
  label: string;
  description: string;
}

export function TaxAdjustments() {
  const [adjustments, setAdjustments] = useState<TaxAdjustment[]>([]);
  const [adjustmentTypes, setAdjustmentTypes] = useState<AdjustmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<TaxAdjustment | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    taxPeriodId: '',
    adjustmentType: '',
    originalAmount: '',
    adjustedAmount: '',
    reason: '',
    description: '',
  });

  // Approval form state
  const [approvalData, setApprovalData] = useState({
    action: 'APPROVE' as 'APPROVE' | 'REJECT',
    comments: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API calls
      // const [adjustmentsResponse, typesResponse] = await Promise.all([
      //   taxAdjustmentApi.getAdjustments(),
      //   taxAdjustmentApi.getAdjustmentTypes(),
      // ]);

      // Mock data for demonstration
      const mockAdjustments: TaxAdjustment[] = [
        {
          id: '1',
          adjustmentType: 'CORRECTION',
          originalAmount: 15000,
          adjustedAmount: 14500,
          adjustmentAmount: -500,
          reason: 'Calculation error in VAT computation',
          description: 'Incorrect VAT rate applied to zero-rated items',
          status: 'PENDING',
          requestedAt: '2024-01-15T10:00:00Z',
          taxPeriod: {
            taxType: 'VAT',
            periodStart: '2024-01-01',
            periodEnd: '2024-03-31',
            year: 2024,
            quarter: 1,
          },
        },
        {
          id: '2',
          adjustmentType: 'REFUND_CLAIM',
          originalAmount: 8000,
          adjustedAmount: 7200,
          adjustmentAmount: -800,
          reason: 'Overpayment of withholding tax',
          status: 'APPROVED',
          requestedAt: '2024-01-10T14:30:00Z',
          approvedAt: '2024-01-12T09:15:00Z',
          taxPeriod: {
            taxType: 'WITHHOLDING_TAX',
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31',
            year: 2024,
            month: 1,
          },
        },
      ];

      const mockTypes: AdjustmentType[] = [
        { value: 'CORRECTION', label: 'Correction', description: 'Correction of calculation error' },
        { value: 'AMENDMENT', label: 'Amendment', description: 'Amendment to filed return' },
        { value: 'REFUND_CLAIM', label: 'Refund Claim', description: 'Claim for tax refund' },
        { value: 'PENALTY_WAIVER', label: 'Penalty Waiver', description: 'Request for penalty waiver' },
        { value: 'INTEREST_WAIVER', label: 'Interest Waiver', description: 'Request for interest waiver' },
        { value: 'OVERPAYMENT', label: 'Overpayment', description: 'Overpayment adjustment' },
        { value: 'UNDERPAYMENT', label: 'Underpayment', description: 'Underpayment adjustment' },
      ];

      setAdjustments(mockAdjustments);
      setAdjustmentTypes(mockTypes);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tax adjustments',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // TODO: Implement API call
      // await taxAdjustmentApi.createAdjustment(formData);

      toast({
        title: 'Success',
        description: 'Tax adjustment request created successfully',
      });

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to create adjustment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create tax adjustment request',
        variant: 'destructive',
      });
    }
  };

  const handleApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAdjustment) return;

    try {
      // TODO: Implement API call
      // if (approvalData.action === 'APPROVE') {
      //   await taxAdjustmentApi.approveAdjustment(selectedAdjustment.id, approvalData.comments);
      // } else {
      //   await taxAdjustmentApi.rejectAdjustment(selectedAdjustment.id, approvalData.comments);
      // }

      toast({
        title: 'Success',
        description: `Tax adjustment ${approvalData.action.toLowerCase()}d successfully`,
      });

      setIsApprovalDialogOpen(false);
      setSelectedAdjustment(null);
      setApprovalData({ action: 'APPROVE', comments: '' });
      loadData();
    } catch (error) {
      console.error('Failed to process adjustment:', error);
      toast({
        title: 'Error',
        description: 'Failed to process tax adjustment',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      taxPeriodId: '',
      adjustmentType: '',
      originalAmount: '',
      adjustedAmount: '',
      reason: '',
      description: '',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'REJECTED': return <X className="h-4 w-4 text-red-500" />;
      case 'PROCESSING': return <Send className="h-4 w-4 text-blue-500" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'APPROVED': return 'bg-green-50 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
      case 'PROCESSING': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COMPLETED': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatPeriod = (taxPeriod: any) => {
    if (taxPeriod.quarter) {
      return `Q${taxPeriod.quarter} ${taxPeriod.year}`;
    }
    if (taxPeriod.month) {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return `${monthNames[taxPeriod.month - 1]} ${taxPeriod.year}`;
    }
    return `${taxPeriod.year}`;
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
      {/* Header and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tax Adjustments
              </CardTitle>
              <CardDescription>
                Manage tax corrections, amendments, and adjustment requests
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-adjustment-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Request Adjustment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Request Tax Adjustment</DialogTitle>
                    <DialogDescription>
                      Submit a request for tax correction or amendment
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="adjustmentType">Adjustment Type</Label>
                      <Select
                        value={formData.adjustmentType}
                        onValueChange={(value) => setFormData({ ...formData, adjustmentType: value })}
                        required
                      >
                        <SelectTrigger data-testid="adjustment-type-select">
                          <SelectValue placeholder="Select adjustment type" />
                        </SelectTrigger>
                        <SelectContent>
                          {adjustmentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="originalAmount">Original Amount (K)</Label>
                        <Input
                          id="originalAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.originalAmount}
                          onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                          placeholder="0.00"
                          data-testid="original-amount-input"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="adjustedAmount">Adjusted Amount (K)</Label>
                        <Input
                          id="adjustedAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.adjustedAmount}
                          onChange={(e) => setFormData({ ...formData, adjustedAmount: e.target.value })}
                          placeholder="0.00"
                          data-testid="adjusted-amount-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reason">Reason for Adjustment</Label>
                      <Input
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        placeholder="Brief reason for the adjustment"
                        data-testid="reason-input"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Detailed Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Provide detailed explanation of the adjustment"
                        data-testid="description-input"
                      />
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
                    <Button type="submit" data-testid="submit-adjustment-button">
                      Submit Request
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Adjustments Table */}
          {adjustments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tax adjustments found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first adjustment request to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Tax Period</TableHead>
                  <TableHead>Original Amount</TableHead>
                  <TableHead>Adjusted Amount</TableHead>
                  <TableHead>Adjustment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment) => (
                  <TableRow key={adjustment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {adjustmentTypes.find(t => t.value === adjustment.adjustmentType)?.label || adjustment.adjustmentType}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {adjustment.reason}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{adjustment.taxPeriod.taxType}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatPeriod(adjustment.taxPeriod)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>K{adjustment.originalAmount.toLocaleString()}</TableCell>
                    <TableCell>K{adjustment.adjustedAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {adjustment.adjustmentAmount > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={adjustment.adjustmentAmount > 0 ? 'text-green-600' : 'text-red-600'}>
                          K{Math.abs(adjustment.adjustmentAmount).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(adjustment.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(adjustment.status)}
                          {adjustment.status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {adjustment.status === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAdjustment(adjustment);
                                setApprovalData({ action: 'APPROVE', comments: '' });
                                setIsApprovalDialogOpen(true);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAdjustment(adjustment);
                                setApprovalData({ action: 'REJECT', comments: '' });
                                setIsApprovalDialogOpen(true);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {adjustment.status === 'APPROVED' && (
                          <Button variant="ghost" size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleApproval}>
            <DialogHeader>
              <DialogTitle>
                {approvalData.action === 'APPROVE' ? 'Approve' : 'Reject'} Adjustment
              </DialogTitle>
              <DialogDescription>
                {approvalData.action === 'APPROVE' 
                  ? 'Approve this tax adjustment request'
                  : 'Reject this tax adjustment request with reason'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {selectedAdjustment && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm">
                    <div><strong>Type:</strong> {selectedAdjustment.adjustmentType}</div>
                    <div><strong>Amount:</strong> K{selectedAdjustment.adjustmentAmount.toLocaleString()}</div>
                    <div><strong>Reason:</strong> {selectedAdjustment.reason}</div>
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="comments">
                  {approvalData.action === 'APPROVE' ? 'Comments (Optional)' : 'Rejection Reason'}
                </Label>
                <Textarea
                  id="comments"
                  value={approvalData.comments}
                  onChange={(e) => setApprovalData({ ...approvalData, comments: e.target.value })}
                  placeholder={approvalData.action === 'APPROVE' 
                    ? 'Add any comments...' 
                    : 'Explain why this adjustment is being rejected...'
                  }
                  required={approvalData.action === 'REJECT'}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApprovalDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant={approvalData.action === 'APPROVE' ? 'default' : 'destructive'}
              >
                {approvalData.action === 'APPROVE' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
