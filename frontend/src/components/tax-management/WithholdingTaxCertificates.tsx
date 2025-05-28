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
import { 
  Plus, 
  Send, 
  Download, 
  Filter, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WithholdingCertificate {
  id: string;
  certificateNumber: string;
  supplierName: string;
  supplierTin?: string;
  serviceType: string;
  grossAmount: number;
  taxWithheld: number;
  netAmount: number;
  issueDate: string;
  paymentDate: string;
  status: 'ISSUED' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'REJECTED' | 'CANCELLED';
  submittedToZra: boolean;
}

interface ServiceType {
  value: string;
  label: string;
  rate: number;
}

export function WithholdingTaxCertificates() {
  const [certificates, setCertificates] = useState<WithholdingCertificate[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([]);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    taxPeriodId: '',
    supplierName: '',
    supplierTin: '',
    serviceType: '',
    serviceDescription: '',
    grossAmount: '',
    paymentDate: '',
  });

  // Filter state
  const [filters, setFilters] = useState({
    serviceType: '',
    status: '',
    year: new Date().getFullYear().toString(),
    month: '',
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API calls
      // const [certificatesResponse, serviceTypesResponse] = await Promise.all([
      //   withholdingTaxApi.getCertificates(filters),
      //   withholdingTaxApi.getServiceTypes(),
      // ]);

      // Mock data for demonstration
      const mockCertificates: WithholdingCertificate[] = [
        {
          id: '1',
          certificateNumber: 'WHT-2024-01-0001',
          supplierName: 'ABC Consulting Ltd',
          supplierTin: '1234567890',
          serviceType: 'PROFESSIONAL_SERVICES',
          grossAmount: 10000,
          taxWithheld: 1500,
          netAmount: 8500,
          issueDate: '2024-01-15',
          paymentDate: '2024-01-15',
          status: 'ISSUED',
          submittedToZra: false,
        },
        {
          id: '2',
          certificateNumber: 'WHT-2024-01-0002',
          supplierName: 'XYZ Property Management',
          supplierTin: '0987654321',
          serviceType: 'RENT',
          grossAmount: 5000,
          taxWithheld: 500,
          netAmount: 4500,
          issueDate: '2024-01-20',
          paymentDate: '2024-01-20',
          status: 'SUBMITTED',
          submittedToZra: true,
        },
      ];

      const mockServiceTypes: ServiceType[] = [
        { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services', rate: 15 },
        { value: 'RENT', label: 'Rent', rate: 10 },
        { value: 'INTEREST', label: 'Interest', rate: 15 },
        { value: 'DIVIDENDS', label: 'Dividends', rate: 15 },
        { value: 'CONSULTANCY', label: 'Consultancy', rate: 15 },
      ];

      setCertificates(mockCertificates);
      setServiceTypes(mockServiceTypes);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load withholding tax certificates',
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
      // await withholdingTaxApi.createCertificate(formData);

      toast({
        title: 'Success',
        description: 'Withholding tax certificate created successfully',
      });

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to create certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to create withholding tax certificate',
        variant: 'destructive',
      });
    }
  };

  const handleBulkSubmit = async () => {
    if (selectedCertificates.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select certificates to submit',
        variant: 'destructive',
      });
      return;
    }

    try {
      // TODO: Implement API call
      // await withholdingTaxApi.bulkSubmitToZRA(selectedCertificates);

      toast({
        title: 'Success',
        description: `${selectedCertificates.length} certificates submitted to ZRA`,
      });

      setSelectedCertificates([]);
      loadData();
    } catch (error) {
      console.error('Failed to submit certificates:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit certificates to ZRA',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      taxPeriodId: '',
      supplierName: '',
      supplierTin: '',
      serviceType: '',
      serviceDescription: '',
      grossAmount: '',
      paymentDate: '',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ISSUED': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'SUBMITTED': return <Send className="h-4 w-4 text-blue-500" />;
      case 'ACKNOWLEDGED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'REJECTED': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ISSUED': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ACKNOWLEDGED': return 'bg-green-50 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
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
                Withholding Tax Certificates
              </CardTitle>
              <CardDescription>
                Manage withholding tax certificates and ZRA submissions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedCertificates.length > 0 && (
                <Button onClick={handleBulkSubmit} variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Submit to ZRA ({selectedCertificates.length})
                </Button>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="create-certificate-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Certificate
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Create Withholding Tax Certificate</DialogTitle>
                      <DialogDescription>
                        Generate a new withholding tax certificate for supplier payment
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="supplierName">Supplier Name</Label>
                        <Input
                          id="supplierName"
                          value={formData.supplierName}
                          onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                          placeholder="Enter supplier name"
                          data-testid="supplier-name-input"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="supplierTin">Supplier TIN (Optional)</Label>
                        <Input
                          id="supplierTin"
                          value={formData.supplierTin}
                          onChange={(e) => setFormData({ ...formData, supplierTin: e.target.value })}
                          placeholder="Enter supplier TIN"
                          data-testid="supplier-tin-input"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="serviceType">Service Type</Label>
                        <Select
                          value={formData.serviceType}
                          onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                          required
                        >
                          <SelectTrigger data-testid="service-type-select">
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label} ({type.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="grossAmount">Gross Amount (K)</Label>
                        <Input
                          id="grossAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.grossAmount}
                          onChange={(e) => setFormData({ ...formData, grossAmount: e.target.value })}
                          placeholder="Enter gross amount"
                          data-testid="gross-amount-input"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="paymentDate">Payment Date</Label>
                        <Input
                          id="paymentDate"
                          type="date"
                          value={formData.paymentDate}
                          onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                          data-testid="payment-date-input"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="serviceDescription">Service Description (Optional)</Label>
                        <Textarea
                          id="serviceDescription"
                          value={formData.serviceDescription}
                          onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                          placeholder="Describe the service provided"
                          data-testid="service-description-input"
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
                      <Button type="submit" data-testid="create-certificate-submit">
                        Create Certificate
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <Select
              value={filters.serviceType}
              onValueChange={(value) => setFilters({ ...filters, serviceType: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Service Types</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="ISSUED">Issued</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Certificates Table */}
          {certificates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No withholding tax certificates found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first certificate to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedCertificates.length === certificates.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCertificates(certificates.map(c => c.id));
                        } else {
                          setSelectedCertificates([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Certificate #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Gross Amount</TableHead>
                  <TableHead>Tax Withheld</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((certificate) => (
                  <TableRow key={certificate.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedCertificates.includes(certificate.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCertificates([...selectedCertificates, certificate.id]);
                          } else {
                            setSelectedCertificates(selectedCertificates.filter(id => id !== certificate.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {certificate.certificateNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{certificate.supplierName}</div>
                        {certificate.supplierTin && (
                          <div className="text-sm text-muted-foreground">
                            TIN: {certificate.supplierTin}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {serviceTypes.find(t => t.value === certificate.serviceType)?.label || certificate.serviceType}
                    </TableCell>
                    <TableCell>K{certificate.grossAmount.toLocaleString()}</TableCell>
                    <TableCell>K{certificate.taxWithheld.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(certificate.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(certificate.status)}
                          {certificate.status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        {certificate.status === 'ISSUED' && (
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
    </div>
  );
}
