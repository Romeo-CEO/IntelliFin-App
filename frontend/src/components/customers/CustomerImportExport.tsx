'use client';

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  X,
  Users,
  FileSpreadsheet
} from 'lucide-react';
import { customerService, ImportResult } from '../../services/customer.service';

interface CustomerImportExportProps {
  onImportComplete?: (result: ImportResult) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function CustomerImportExport({ 
  onImportComplete, 
  onClose, 
  isOpen 
}: CustomerImportExportProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    updateExisting: false,
  });
  const [exportOptions, setExportOptions] = useState({
    includeInactive: false,
    format: 'csv' as 'csv' | 'json',
  });
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setImportFile(file);
        setError(null);
      } else {
        setError('Please select a CSV file');
        setImportFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setError('Please select a file to import');
      return;
    }

    setLoading(true);
    setError(null);
    setImportResult(null);

    try {
      const result = await customerService.importCustomersFromCsv(importFile, importOptions);
      setImportResult(result);
      onImportComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      if (exportOptions.format === 'csv') {
        const blob = await customerService.exportCustomersToCsv(exportOptions.includeInactive);
        const filename = `customers_${new Date().toISOString().split('T')[0]}.csv`;
        customerService.downloadFile(blob, filename);
      } else {
        const data = await customerService.exportCustomersToJson(exportOptions.includeInactive);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const filename = `customers_${new Date().toISOString().split('T')[0]}.json`;
        customerService.downloadFile(blob, filename);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await customerService.downloadImportTemplate();
      customerService.downloadFile(blob, 'customer_import_template.csv');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download template');
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Customer Import & Export
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('import')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                Import
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'export'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Download className="h-4 w-4 inline mr-2" />
                Export
              </button>
            </nav>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="mt-6 space-y-6">
            {!importResult ? (
              <>
                {/* Template Download */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <FileText className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Download Template
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Download a CSV template with sample data to get started.
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={handleDownloadTemplate}
                          className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Template
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload a file</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">CSV files only</p>
                    </div>
                  </div>
                  {importFile && (
                    <div className="mt-2 text-sm text-gray-600">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                {/* Import Options */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Import Options</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        id="skipDuplicates"
                        type="checkbox"
                        checked={importOptions.skipDuplicates}
                        onChange={(e) => setImportOptions(prev => ({
                          ...prev,
                          skipDuplicates: e.target.checked
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="skipDuplicates" className="ml-2 block text-sm text-gray-900">
                        Skip duplicate customers
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="updateExisting"
                        type="checkbox"
                        checked={importOptions.updateExisting}
                        onChange={(e) => setImportOptions(prev => ({
                          ...prev,
                          updateExisting: e.target.checked
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="updateExisting" className="ml-2 block text-sm text-gray-900">
                        Update existing customers
                      </label>
                    </div>
                  </div>
                </div>

                {/* Import Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={!importFile || loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Customers
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Import Results */
              <div className="space-y-4">
                <div className={`border rounded-md p-4 ${
                  importResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex">
                    {importResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    )}
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        importResult.success ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        Import {importResult.success ? 'Completed' : 'Completed with Warnings'}
                      </h3>
                      <div className={`text-sm mt-1 ${
                        importResult.success ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        <p>Successfully imported: {importResult.imported} customers</p>
                        {importResult.failed > 0 && (
                          <p>Failed to import: {importResult.failed} customers</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li>... and {importResult.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={resetImport}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Import Another File
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="mt-6 space-y-6">
            {/* Export Options */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Export Options</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="csv"
                        type="radio"
                        value="csv"
                        checked={exportOptions.format === 'csv'}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          format: e.target.value as 'csv' | 'json'
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="csv" className="ml-2 block text-sm text-gray-900">
                        CSV (Comma Separated Values)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="json"
                        type="radio"
                        value="json"
                        checked={exportOptions.format === 'json'}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          format: e.target.value as 'csv' | 'json'
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="json" className="ml-2 block text-sm text-gray-900">
                        JSON (JavaScript Object Notation)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="includeInactive"
                    type="checkbox"
                    checked={exportOptions.includeInactive}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeInactive: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeInactive" className="ml-2 block text-sm text-gray-900">
                    Include inactive customers
                  </label>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExport}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Customers
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
