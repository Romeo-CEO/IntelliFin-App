'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import {
  Upload,
  FileImage,
  FileText,
  X,
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { receiptService } from '@/services/receipt.service';
import { formatFileSize } from '@/lib/utils';

interface ReceiptUploadProps {
  expenseId: string;
  onUploadSuccess?: (receipt: any) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  multiple?: boolean;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  receipt?: any;
}

export function ReceiptUpload({
  expenseId,
  onUploadSuccess,
  onUploadError,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  multiple = true,
}: ReceiptUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      rejectedFiles.forEach((rejection) => {
        const { file, errors } = rejection;
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            toast.error(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxFileSize)}`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`File "${file.name}" has an invalid type. Allowed types: images and PDFs`);
          } else {
            toast.error(`File "${file.name}": ${error.message}`);
          }
        });
      });

      // Handle accepted files
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        id: `${Date.now()}-${Math.random()}`,
        progress: 0,
        status: 'pending',
      }));

      setUploadFiles((prev) => [...prev, ...newFiles]);

      // Start uploading immediately
      if (newFiles.length > 0) {
        uploadFiles(newFiles);
      }
    },
    [maxFileSize],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: maxFileSize,
    multiple,
    disabled: isUploading,
  });

  const uploadFiles = async (filesToUpload: UploadFile[]) => {
    setIsUploading(true);

    for (const uploadFile of filesToUpload) {
      try {
        // Update status to uploading
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f,
          ),
        );

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f,
            ),
          );
        }, 200);

        // Upload file
        const receipt = await receiptService.uploadReceipt(expenseId, uploadFile.file);

        clearInterval(progressInterval);

        // Update status to success
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'success', progress: 100, receipt }
              : f,
          ),
        );

        toast.success(`Receipt "${uploadFile.file.name}" uploaded successfully`);
        onUploadSuccess?.(receipt);
      } catch (error: any) {
        // Update status to error
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: error.message }
              : f,
          ),
        );

        toast.error(`Failed to upload "${uploadFile.file.name}": ${error.message}`);
        onUploadError?.(error.message);
      }
    }

    setIsUploading(false);
  };

  const removeFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const retryUpload = (fileId: string) => {
    const fileToRetry = uploadFiles.find((f) => f.id === fileId);
    if (fileToRetry) {
      uploadFiles([fileToRetry]);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-8 w-8 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Camera capture for mobile devices
  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        onDrop(Array.from(files), []);
      }
    };
    input.click();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Receipts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <Upload className="h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop files here' : 'Drag & drop receipts here'}
              </p>
              <p className="text-sm text-gray-500">
                or click to browse files
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  // Trigger file input
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCameraCapture();
                }}
                className="md:hidden" // Show only on mobile
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            </div>
          </div>
        </div>

        {/* File Type Info */}
        <Alert>
          <AlertDescription>
            Supported formats: JPEG, PNG, GIF, WebP, PDF. Maximum file size: {formatFileSize(maxFileSize)}
          </AlertDescription>
        </Alert>

        {/* Upload Progress */}
        {uploadFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Upload Progress</h4>
            {uploadFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                {getFileIcon(uploadFile.file.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadFile.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(uploadFile.status)}>
                        {uploadFile.status}
                      </Badge>
                      {getStatusIcon(uploadFile.status)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadFile.file.size)}
                  </p>
                  {uploadFile.status === 'uploading' && (
                    <Progress value={uploadFile.progress} className="mt-2" />
                  )}
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {uploadFile.status === 'error' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryUpload(uploadFile.id)}
                    >
                      Retry
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(uploadFile.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
