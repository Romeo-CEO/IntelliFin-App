'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { AccountingProvider, useAccounting } from '../../../../contexts/AccountingContext';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { JournalEntryForm } from '../../../../components/accounting/JournalEntryForm';
import { JournalEntry } from '../../../../services/accounting.service';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../../../components/common/ErrorMessage';

const JournalEntriesContent: React.FC = () => {
  const {
    state,
    loadJournalEntries,
    postJournalEntry,
    deleteJournalEntry,
    selectJournalEntry,
    clearError,
    refreshData,
  } = useAccounting();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Load data on mount
  useEffect(() => {
    loadJournalEntries({ limit: 100 });
  }, [loadJournalEntries]);

  // Filter journal entries
  const filteredEntries = state.journalEntries.filter(entry => {
    const matchesSearch = searchTerm === '' ||
      entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || entry.entryType === filterType;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'posted' && entry.isPosted) ||
      (filterStatus === 'draft' && !entry.isPosted);

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateEntry = () => {
    setEditingEntry(null);
    setShowEntryForm(true);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setShowEntryForm(true);
  };

  const handleEntryFormClose = () => {
    setShowEntryForm(false);
    setEditingEntry(null);
  };

  const handleEntryFormSuccess = () => {
    setShowEntryForm(false);
    setEditingEntry(null);
    refreshData();
  };

  const handlePostEntry = async (entryId: string) => {
    try {
      await postJournalEntry(entryId);
      refreshData();
    } catch (error) {
      console.error('Failed to post journal entry:', error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this journal entry?')) {
      try {
        await deleteJournalEntry(entryId);
        refreshData();
      } catch (error) {
        console.error('Failed to delete journal entry:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (entry: JournalEntry) => {
    if (entry.isPosted) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <Clock className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusBadge = (entry: JournalEntry) => {
    if (entry.isPosted) {
      return <Badge variant="default">Posted</Badge>;
    }
    return <Badge variant="secondary">Draft</Badge>;
  };

  // Summary statistics
  const totalEntries = state.journalEntries.length;
  const postedEntries = state.journalEntries.filter(e => e.isPosted).length;
  const draftEntries = totalEntries - postedEntries;
  const totalAmount = state.journalEntries.reduce((sum, entry) => sum + entry.totalDebit, 0);

  return (
    <div className="journal-entries-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="page-title">Journal Entries</h1>
            <p className="page-description">
              Manage journal entries and double-entry bookkeeping transactions
            </p>
          </div>

          <div className="header-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshData()}
              disabled={state.journalEntriesLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <Button
              onClick={handleCreateEntry}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{totalEntries}</div>
              <div className="summary-label">Total Entries</div>
            </div>
          </Card>

          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{postedEntries}</div>
              <div className="summary-label">Posted</div>
            </div>
          </Card>

          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{draftEntries}</div>
              <div className="summary-label">Drafts</div>
            </div>
          </Card>

          <Card className="summary-card">
            <div className="summary-content">
              <div className="summary-value">{formatCurrency(totalAmount)}</div>
              <div className="summary-label">Total Amount</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <ErrorMessage
          message={state.error}
          onDismiss={clearError}
          className="mb-6"
        />
      )}

      {/* Controls */}
      <div className="controls-section">
        <div className="search-filter-controls">
          <div className="search-control">
            <Search className="search-icon" />
            <Input
              placeholder="Search entries by number or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <Select
            value={filterType}
            onValueChange={setFilterType}
          >
            <option value="all">All Types</option>
            <option value="STANDARD">Standard</option>
            <option value="ADJUSTING">Adjusting</option>
            <option value="CLOSING">Closing</option>
            <option value="REVERSING">Reversing</option>
            <option value="OPENING">Opening</option>
            <option value="CORRECTION">Correction</option>
          </Select>

          <Select
            value={filterStatus}
            onValueChange={setFilterStatus}
          >
            <option value="all">All Status</option>
            <option value="posted">Posted</option>
            <option value="draft">Draft</option>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {state.journalEntriesLoading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Loading journal entries...</p>
          </div>
        ) : (
          <Card className="entries-table-card">
            <div className="table-header">
              <h3>Journal Entries ({filteredEntries.length})</h3>
            </div>

            <div className="table-container">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th>Entry Number</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`entry-row ${state.selectedJournalEntry?.id === entry.id ? 'selected' : ''}`}
                      onClick={() => selectJournalEntry(entry)}
                    >
                      <td>
                        <div className="entry-number">
                          <FileText className="w-4 h-4 mr-2" />
                          {entry.entryNumber}
                        </div>
                      </td>

                      <td>
                        <div className="entry-date">
                          {formatDate(entry.entryDate)}
                        </div>
                      </td>

                      <td>
                        <div className="entry-description">
                          <span className="description-text">{entry.description}</span>
                          {entry.reference && (
                            <span className="reference-text">Ref: {entry.reference}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <Badge variant="outline" className="type-badge">
                          {entry.entryType}
                        </Badge>
                      </td>

                      <td>
                        <div className="entry-amount">
                          {formatCurrency(entry.totalDebit)}
                        </div>
                      </td>

                      <td>
                        <div className="entry-status">
                          {getStatusIcon(entry)}
                          {getStatusBadge(entry)}
                        </div>
                      </td>

                      <td>
                        <div className="entry-actions">
                          {!entry.isPosted && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditEntry(entry);
                                }}
                              >
                                Edit
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePostEntry(entry.id);
                                }}
                              >
                                Post
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEntry(entry.id);
                                }}
                              >
                                Delete
                              </Button>
                            </>
                          )}

                          {entry.isPosted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle view details
                              }}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredEntries.length === 0 && (
                <div className="empty-state">
                  <FileText className="empty-icon" />
                  <h3>No journal entries found</h3>
                  <p>
                    {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Create your first journal entry to get started.'
                    }
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Journal Entry Form Modal */}
      <Dialog open={showEntryForm} onOpenChange={setShowEntryForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Journal Entry' : 'Create New Journal Entry'}
            </DialogTitle>
          </DialogHeader>
          <JournalEntryForm
            entry={editingEntry}
            onSuccess={handleEntryFormSuccess}
            onCancel={handleEntryFormClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function JournalEntriesPage() {
  return (
    <DashboardLayout>
      <AccountingProvider>
        <JournalEntriesContent />
      </AccountingProvider>
    </DashboardLayout>
  );
}
