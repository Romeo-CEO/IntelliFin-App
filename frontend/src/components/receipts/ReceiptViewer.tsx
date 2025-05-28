'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Eye,
  Download,
  Trash2,
  RefreshCw,
  FileText,
  FileImage,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Lightbulb,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useReceipt } from '@/hooks/useReceipts';
import { receiptService } from '@/services/receipt.service';
import { formatFileSize, formatCurrency } from '@/lib/utils';
import { OcrStatus } from '@/types/receipt';

interface ReceiptViewerProps {
  receiptId: string;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export function ReceiptViewer({ receiptId, onDelete, onUpdate }: ReceiptViewerProps) {
  const { receipt, isLoading, error, refetch } = useReceipt(receiptId);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);

  // Load receipt image URL
  useEffect(() => {
    if (receipt && receipt.fileType.startsWith('image/')) {
      receiptService.getReceiptUrl(receiptId).then(({ url }) => {
        setImageUrl(url);
      });
    }
  }, [receipt, receiptId]);

  // Load suggestions if OCR is completed
  useEffect(() => {
    if (receipt && receipt.ocrStatus === OcrStatus.COMPLETED) {
      loadSuggestions();
    }
  }, [receipt]);

  const loadSuggestions = async () => {
    try {
      setIsLoadingSuggestions(true);
      const suggestionsData = await receiptService.getExpenseUpdateSuggestions(receiptId);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleDownload = async () => {
    try {
      await receiptService.downloadReceipt(receiptId);
    } catch (error: any) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      try {
        await receiptService.deleteReceipt(receiptId);
        onDelete?.();
      } catch (error: any) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleReprocessOcr = async () => {
    try {
      setIsProcessingOcr(true);
      await receiptService.reprocessOcr(receiptId);
      await refetch();
      await loadSuggestions();
    } catch (error: any) {
      console.error('OCR reprocessing failed:', error);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const getStatusIcon = (status: OcrStatus) => {
    switch (status) {
      case OcrStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case OcrStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case OcrStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: OcrStatus) => {
    switch (status) {
      case OcrStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case OcrStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case OcrStatus.FAILED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading receipt...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !receipt) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load receipt. Please try again.</p>
            <Button onClick={() => refetch()} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getFileIcon(receipt.fileType)}
              Receipt Details
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(receipt.ocrStatus)}>
                {getStatusIcon(receipt.ocrStatus)}
                {receipt.ocrStatus}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">File Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">File Name:</span>
                  <span className="font-medium">{receipt.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">File Type:</span>
                  <span className="font-medium">{receipt.fileType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">File Size:</span>
                  <span className="font-medium">{formatFileSize(receipt.fileSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Uploaded:</span>
                  <span className="font-medium">
                    {format(new Date(receipt.createdAt), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">OCR Processing</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <Badge className={getStatusColor(receipt.ocrStatus)}>
                    {receipt.ocrStatus}
                  </Badge>
                </div>
                {receipt.ocrProcessedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Processed:</span>
                    <span className="font-medium">
                      {format(new Date(receipt.ocrProcessedAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {receipt.fileType.startsWith('image/') && imageUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImageViewerOpen(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Image
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReprocessOcr}
              disabled={isProcessingOcr}
            >
              {isProcessingOcr ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reprocess OCR
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          <Separator />

          {/* OCR Results */}
          <Tabs defaultValue="extracted" className="w-full">
            <TabsList>
              <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
              <TabsTrigger value="raw">Raw Text</TabsTrigger>
              {suggestions && <TabsTrigger value="suggestions">Suggestions</TabsTrigger>}
            </TabsList>

            <TabsContent value="extracted" className="space-y-4">
              {receipt.ocrStatus === OcrStatus.COMPLETED && receipt.ocrData ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Extracted Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {receipt.ocrData.vendor && (
                      <div>
                        <span className="text-sm text-gray-500">Vendor:</span>
                        <p className="font-medium">{receipt.ocrData.vendor}</p>
                      </div>
                    )}
                    {receipt.ocrData.date && (
                      <div>
                        <span className="text-sm text-gray-500">Date:</span>
                        <p className="font-medium">{receipt.ocrData.date}</p>
                      </div>
                    )}
                    {receipt.ocrData.total && (
                      <div>
                        <span className="text-sm text-gray-500">Total Amount:</span>
                        <p className="font-medium">
                          {formatCurrency(receipt.ocrData.total, receipt.ocrData.currency || 'ZMW')}
                        </p>
                      </div>
                    )}
                    {receipt.ocrData.vatAmount && (
                      <div>
                        <span className="text-sm text-gray-500">VAT Amount:</span>
                        <p className="font-medium">
                          {formatCurrency(receipt.ocrData.vatAmount, receipt.ocrData.currency || 'ZMW')}
                        </p>
                      </div>
                    )}
                    {receipt.ocrData.receiptNumber && (
                      <div>
                        <span className="text-sm text-gray-500">Receipt Number:</span>
                        <p className="font-medium">{receipt.ocrData.receiptNumber}</p>
                      </div>
                    )}
                  </div>

                  {receipt.ocrData.items && receipt.ocrData.items.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Line Items</h5>
                      <div className="space-y-2">
                        {receipt.ocrData.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm">{item.description}</span>
                            <span className="text-sm font-medium">
                              {formatCurrency(item.amount, receipt.ocrData.currency || 'ZMW')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : receipt.ocrStatus === OcrStatus.PENDING ? (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    OCR processing is in progress. Please wait for the results.
                  </AlertDescription>
                </Alert>
              ) : receipt.ocrStatus === OcrStatus.FAILED ? (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    OCR processing failed. You can try reprocessing the receipt.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription>
                    No OCR data available for this receipt.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="raw">
              {receipt.ocrText ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{receipt.ocrText}</pre>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No raw OCR text available for this receipt.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {suggestions && (
              <TabsContent value="suggestions">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    <h4 className="font-medium text-gray-900">Expense Update Suggestions</h4>
                    <Badge variant="outline">
                      {Math.round(suggestions.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  
                  {Object.keys(suggestions.suggestions).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.suggestions.vendor && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <span className="text-sm text-blue-600 font-medium">Suggested Vendor:</span>
                          <p className="text-blue-900">{suggestions.suggestions.vendor}</p>
                        </div>
                      )}
                      {suggestions.suggestions.amount && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <span className="text-sm text-green-600 font-medium">Suggested Amount:</span>
                          <p className="text-green-900">
                            {formatCurrency(suggestions.suggestions.amount, 'ZMW')}
                          </p>
                        </div>
                      )}
                      {suggestions.suggestions.date && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <span className="text-sm text-purple-600 font-medium">Suggested Date:</span>
                          <p className="text-purple-900">{suggestions.suggestions.date}</p>
                        </div>
                      )}
                      {suggestions.suggestions.description && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <span className="text-sm text-orange-600 font-medium">Suggested Description:</span>
                          <p className="text-orange-900">{suggestions.suggestions.description}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        No suggestions available based on the OCR data.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Image Viewer Dialog */}
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Receipt Image</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Receipt"
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
