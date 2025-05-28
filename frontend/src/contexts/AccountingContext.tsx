'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Account, JournalEntry, accountingService } from '../services/accounting.service';

// Accounting state interface
interface AccountingState {
  // Chart of Accounts
  accounts: Account[];
  accountHierarchy: Account[];
  selectedAccount: Account | null;
  accountsLoading: boolean;
  
  // Journal Entries
  journalEntries: JournalEntry[];
  selectedJournalEntry: JournalEntry | null;
  journalEntriesLoading: boolean;
  
  // General state
  error: string | null;
  isInitialized: boolean;
}

// Action types
type AccountingAction =
  | { type: 'SET_LOADING'; payload: { section: 'accounts' | 'journalEntries'; loading: boolean } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_ACCOUNT_HIERARCHY'; payload: Account[] }
  | { type: 'SET_SELECTED_ACCOUNT'; payload: Account | null }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }
  | { type: 'REMOVE_ACCOUNT'; payload: string }
  | { type: 'SET_JOURNAL_ENTRIES'; payload: JournalEntry[] }
  | { type: 'SET_SELECTED_JOURNAL_ENTRY'; payload: JournalEntry | null }
  | { type: 'ADD_JOURNAL_ENTRY'; payload: JournalEntry }
  | { type: 'UPDATE_JOURNAL_ENTRY'; payload: JournalEntry }
  | { type: 'REMOVE_JOURNAL_ENTRY'; payload: string }
  | { type: 'SET_INITIALIZED'; payload: boolean };

// Initial state
const initialState: AccountingState = {
  accounts: [],
  accountHierarchy: [],
  selectedAccount: null,
  accountsLoading: false,
  journalEntries: [],
  selectedJournalEntry: null,
  journalEntriesLoading: false,
  error: null,
  isInitialized: false,
};

// Reducer
function accountingReducer(state: AccountingState, action: AccountingAction): AccountingState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        [`${action.payload.section}Loading`]: action.payload.loading,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        accountsLoading: false,
        journalEntriesLoading: false,
      };

    case 'SET_ACCOUNTS':
      return {
        ...state,
        accounts: action.payload,
        accountsLoading: false,
      };

    case 'SET_ACCOUNT_HIERARCHY':
      return {
        ...state,
        accountHierarchy: action.payload,
      };

    case 'SET_SELECTED_ACCOUNT':
      return {
        ...state,
        selectedAccount: action.payload,
      };

    case 'ADD_ACCOUNT':
      return {
        ...state,
        accounts: [...state.accounts, action.payload],
      };

    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map(account =>
          account.id === action.payload.id ? action.payload : account
        ),
        selectedAccount: state.selectedAccount?.id === action.payload.id ? action.payload : state.selectedAccount,
      };

    case 'REMOVE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter(account => account.id !== action.payload),
        selectedAccount: state.selectedAccount?.id === action.payload ? null : state.selectedAccount,
      };

    case 'SET_JOURNAL_ENTRIES':
      return {
        ...state,
        journalEntries: action.payload,
        journalEntriesLoading: false,
      };

    case 'SET_SELECTED_JOURNAL_ENTRY':
      return {
        ...state,
        selectedJournalEntry: action.payload,
      };

    case 'ADD_JOURNAL_ENTRY':
      return {
        ...state,
        journalEntries: [action.payload, ...state.journalEntries],
      };

    case 'UPDATE_JOURNAL_ENTRY':
      return {
        ...state,
        journalEntries: state.journalEntries.map(entry =>
          entry.id === action.payload.id ? action.payload : entry
        ),
        selectedJournalEntry: state.selectedJournalEntry?.id === action.payload.id ? action.payload : state.selectedJournalEntry,
      };

    case 'REMOVE_JOURNAL_ENTRY':
      return {
        ...state,
        journalEntries: state.journalEntries.filter(entry => entry.id !== action.payload),
        selectedJournalEntry: state.selectedJournalEntry?.id === action.payload ? null : state.selectedJournalEntry,
      };

    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: action.payload,
      };

    default:
      return state;
  }
}

// Context type
interface AccountingContextType {
  state: AccountingState;
  
  // Chart of Accounts actions
  loadAccounts: (query?: any) => Promise<void>;
  loadAccountHierarchy: (accountType?: string) => Promise<void>;
  createAccount: (data: any) => Promise<Account>;
  updateAccount: (id: string, data: any) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  selectAccount: (account: Account | null) => void;
  initializeChartOfAccounts: (includeDefaults?: boolean) => Promise<void>;
  
  // Journal Entry actions
  loadJournalEntries: (query?: any) => Promise<void>;
  createJournalEntry: (data: any) => Promise<JournalEntry>;
  updateJournalEntry: (id: string, data: any) => Promise<JournalEntry>;
  postJournalEntry: (id: string) => Promise<JournalEntry>;
  reverseJournalEntry: (id: string, data: any) => Promise<JournalEntry>;
  deleteJournalEntry: (id: string) => Promise<void>;
  selectJournalEntry: (entry: JournalEntry | null) => void;
  
  // Utility actions
  clearError: () => void;
  refreshData: () => Promise<void>;
}

// Create context
const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

// Provider component
export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(accountingReducer, initialState);

  // Chart of Accounts actions
  const loadAccounts = useCallback(async (query?: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { section: 'accounts', loading: true } });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await accountingService.getAccounts(query);
      dispatch({ type: 'SET_ACCOUNTS', payload: response.accounts });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load accounts' });
    }
  }, []);

  const loadAccountHierarchy = useCallback(async (accountType?: string) => {
    try {
      const hierarchy = await accountingService.getAccountHierarchy(accountType);
      dispatch({ type: 'SET_ACCOUNT_HIERARCHY', payload: hierarchy });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load account hierarchy' });
    }
  }, []);

  const createAccount = useCallback(async (data: any): Promise<Account> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const account = await accountingService.createAccount(data);
      dispatch({ type: 'ADD_ACCOUNT', payload: account });
      
      // Refresh hierarchy if needed
      await loadAccountHierarchy();
      
      return account;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create account' });
      throw error;
    }
  }, [loadAccountHierarchy]);

  const updateAccount = useCallback(async (id: string, data: any): Promise<Account> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const account = await accountingService.updateAccount(id, data);
      dispatch({ type: 'UPDATE_ACCOUNT', payload: account });
      
      // Refresh hierarchy if needed
      await loadAccountHierarchy();
      
      return account;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update account' });
      throw error;
    }
  }, [loadAccountHierarchy]);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await accountingService.deleteAccount(id);
      dispatch({ type: 'REMOVE_ACCOUNT', payload: id });
      
      // Refresh hierarchy
      await loadAccountHierarchy();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete account' });
      throw error;
    }
  }, [loadAccountHierarchy]);

  const selectAccount = useCallback((account: Account | null) => {
    dispatch({ type: 'SET_SELECTED_ACCOUNT', payload: account });
  }, []);

  const initializeChartOfAccounts = useCallback(async (includeDefaults: boolean = true) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { section: 'accounts', loading: true } });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await accountingService.initializeChartOfAccounts(includeDefaults);
      
      // Reload accounts and hierarchy
      await Promise.all([
        loadAccounts(),
        loadAccountHierarchy(),
      ]);
      
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to initialize chart of accounts' });
    }
  }, [loadAccounts, loadAccountHierarchy]);

  // Journal Entry actions
  const loadJournalEntries = useCallback(async (query?: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { section: 'journalEntries', loading: true } });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await accountingService.getJournalEntries(query);
      dispatch({ type: 'SET_JOURNAL_ENTRIES', payload: response.entries });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load journal entries' });
    }
  }, []);

  const createJournalEntry = useCallback(async (data: any): Promise<JournalEntry> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const entry = await accountingService.createJournalEntry(data);
      dispatch({ type: 'ADD_JOURNAL_ENTRY', payload: entry });
      
      return entry;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create journal entry' });
      throw error;
    }
  }, []);

  const updateJournalEntry = useCallback(async (id: string, data: any): Promise<JournalEntry> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const entry = await accountingService.updateJournalEntry(id, data);
      dispatch({ type: 'UPDATE_JOURNAL_ENTRY', payload: entry });
      
      return entry;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update journal entry' });
      throw error;
    }
  }, []);

  const postJournalEntry = useCallback(async (id: string): Promise<JournalEntry> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const entry = await accountingService.postJournalEntry(id);
      dispatch({ type: 'UPDATE_JOURNAL_ENTRY', payload: entry });
      
      return entry;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to post journal entry' });
      throw error;
    }
  }, []);

  const reverseJournalEntry = useCallback(async (id: string, data: any): Promise<JournalEntry> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const entry = await accountingService.reverseJournalEntry(id, data);
      dispatch({ type: 'ADD_JOURNAL_ENTRY', payload: entry });
      
      return entry;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to reverse journal entry' });
      throw error;
    }
  }, []);

  const deleteJournalEntry = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await accountingService.deleteJournalEntry(id);
      dispatch({ type: 'REMOVE_JOURNAL_ENTRY', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete journal entry' });
      throw error;
    }
  }, []);

  const selectJournalEntry = useCallback((entry: JournalEntry | null) => {
    dispatch({ type: 'SET_SELECTED_JOURNAL_ENTRY', payload: entry });
  }, []);

  // Utility actions
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([
      loadAccounts(),
      loadAccountHierarchy(),
      loadJournalEntries(),
    ]);
  }, [loadAccounts, loadAccountHierarchy, loadJournalEntries]);

  const contextValue: AccountingContextType = {
    state,
    loadAccounts,
    loadAccountHierarchy,
    createAccount,
    updateAccount,
    deleteAccount,
    selectAccount,
    initializeChartOfAccounts,
    loadJournalEntries,
    createJournalEntry,
    updateJournalEntry,
    postJournalEntry,
    reverseJournalEntry,
    deleteJournalEntry,
    selectJournalEntry,
    clearError,
    refreshData,
  };

  return (
    <AccountingContext.Provider value={contextValue}>
      {children}
    </AccountingContext.Provider>
  );
};

// Hook to use accounting context
export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (context === undefined) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};
