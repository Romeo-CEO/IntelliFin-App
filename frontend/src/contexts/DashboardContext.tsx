'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { Dashboard, DashboardWidget, WidgetType } from '../types/dashboard.types';
import { dashboardService } from '../services/dashboard.service';
import { useAuth } from './AuthContext';

// Dashboard state interface
interface DashboardState {
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  widgets: DashboardWidget[];
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  selectedWidget: DashboardWidget | null;
}

// Dashboard actions
type DashboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DASHBOARDS'; payload: Dashboard[] }
  | { type: 'SET_CURRENT_DASHBOARD'; payload: Dashboard | null }
  | { type: 'SET_WIDGETS'; payload: DashboardWidget[] }
  | { type: 'ADD_DASHBOARD'; payload: Dashboard }
  | { type: 'UPDATE_DASHBOARD'; payload: Dashboard }
  | { type: 'DELETE_DASHBOARD'; payload: string }
  | { type: 'ADD_WIDGET'; payload: DashboardWidget }
  | { type: 'UPDATE_WIDGET'; payload: DashboardWidget }
  | { type: 'DELETE_WIDGET'; payload: string }
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'SET_SELECTED_WIDGET'; payload: DashboardWidget | null }
  | { type: 'UPDATE_WIDGET_POSITIONS'; payload: Array<{ id: string; position: any }> };

// Initial state
const initialState: DashboardState = {
  dashboards: [],
  currentDashboard: null,
  widgets: [],
  isLoading: false,
  error: null,
  isEditing: false,
  selectedWidget: null,
};

// Dashboard reducer
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_DASHBOARDS':
      return { ...state, dashboards: action.payload, isLoading: false };

    case 'SET_CURRENT_DASHBOARD':
      return {
        ...state,
        currentDashboard: action.payload,
        widgets: action.payload?.widgets || [],
        isLoading: false
      };

    case 'SET_WIDGETS':
      return { ...state, widgets: action.payload };

    case 'ADD_DASHBOARD':
      return {
        ...state,
        dashboards: [...state.dashboards, action.payload],
        isLoading: false
      };

    case 'UPDATE_DASHBOARD':
      return {
        ...state,
        dashboards: state.dashboards.map(d =>
          d.id === action.payload.id ? action.payload : d
        ),
        currentDashboard: state.currentDashboard?.id === action.payload.id
          ? action.payload
          : state.currentDashboard,
        isLoading: false
      };

    case 'DELETE_DASHBOARD':
      return {
        ...state,
        dashboards: state.dashboards.filter(d => d.id !== action.payload),
        currentDashboard: state.currentDashboard?.id === action.payload
          ? null
          : state.currentDashboard,
        isLoading: false
      };

    case 'ADD_WIDGET':
      return {
        ...state,
        widgets: [...state.widgets, action.payload],
        isLoading: false
      };

    case 'UPDATE_WIDGET':
      return {
        ...state,
        widgets: state.widgets.map(w =>
          w.id === action.payload.id ? action.payload : w
        ),
        selectedWidget: state.selectedWidget?.id === action.payload.id
          ? action.payload
          : state.selectedWidget,
        isLoading: false
      };

    case 'DELETE_WIDGET':
      return {
        ...state,
        widgets: state.widgets.filter(w => w.id !== action.payload),
        selectedWidget: state.selectedWidget?.id === action.payload
          ? null
          : state.selectedWidget,
        isLoading: false
      };

    case 'SET_EDITING':
      return { ...state, isEditing: action.payload };

    case 'SET_SELECTED_WIDGET':
      return { ...state, selectedWidget: action.payload };

    case 'UPDATE_WIDGET_POSITIONS':
      return {
        ...state,
        widgets: state.widgets.map(widget => {
          const update = action.payload.find(u => u.id === widget.id);
          return update ? { ...widget, position: update.position } : widget;
        })
      };

    default:
      return state;
  }
}

// Dashboard context interface
interface DashboardContextType {
  state: DashboardState;

  // Dashboard operations
  loadDashboards: () => Promise<void>;
  loadDashboard: (id: string) => Promise<void>;
  loadDefaultDashboard: () => Promise<void>;
  createDashboard: (data: any) => Promise<Dashboard>;
  updateDashboard: (id: string, data: any) => Promise<Dashboard>;
  deleteDashboard: (id: string) => Promise<void>;
  duplicateDashboard: (id: string, name?: string) => Promise<Dashboard>;
  setAsDefault: (id: string) => Promise<Dashboard>;

  // Widget operations
  createWidget: (dashboardId: string, data: any) => Promise<DashboardWidget>;
  updateWidget: (id: string, data: any) => Promise<DashboardWidget>;
  deleteWidget: (id: string) => Promise<void>;
  updateWidgetPosition: (id: string, position: any) => Promise<DashboardWidget>;
  bulkUpdatePositions: (dashboardId: string, updates: Array<{ id: string; position: any }>) => Promise<void>;

  // UI state operations
  setEditing: (editing: boolean) => void;
  setSelectedWidget: (widget: DashboardWidget | null) => void;
  clearError: () => void;
}

// Create context
const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Dashboard provider component
export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const { user } = useAuth();

  // Dashboard operations
  const loadDashboards = useCallback(async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const dashboards = await dashboardService.getDashboards();
      dispatch({ type: 'SET_DASHBOARDS', payload: dashboards });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load dashboards' });
    }
  }, [user]);

  const loadDashboard = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const dashboard = await dashboardService.getDashboard(id);
      dispatch({ type: 'SET_CURRENT_DASHBOARD', payload: dashboard });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load dashboard' });
    }
  }, []);

  const loadDefaultDashboard = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const dashboard = await dashboardService.getDefaultDashboard();
      dispatch({ type: 'SET_CURRENT_DASHBOARD', payload: dashboard });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load default dashboard' });
    }
  }, []);

  const createDashboard = useCallback(async (data: any): Promise<Dashboard> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const dashboard = await dashboardService.createDashboard(data);
      dispatch({ type: 'ADD_DASHBOARD', payload: dashboard });
      return dashboard;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create dashboard' });
      throw error;
    }
  }, []);

  const updateDashboard = useCallback(async (id: string, data: any): Promise<Dashboard> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const dashboard = await dashboardService.updateDashboard(id, data);
      dispatch({ type: 'UPDATE_DASHBOARD', payload: dashboard });
      return dashboard;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update dashboard' });
      throw error;
    }
  }, []);

  const deleteDashboard = useCallback(async (id: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await dashboardService.deleteDashboard(id);
      dispatch({ type: 'DELETE_DASHBOARD', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete dashboard' });
      throw error;
    }
  }, []);

  const duplicateDashboard = useCallback(async (id: string, name?: string): Promise<Dashboard> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const dashboard = await dashboardService.duplicateDashboard(id, name);
      dispatch({ type: 'ADD_DASHBOARD', payload: dashboard });
      return dashboard;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to duplicate dashboard' });
      throw error;
    }
  }, []);

  const setAsDefault = useCallback(async (id: string): Promise<Dashboard> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const dashboard = await dashboardService.setAsDefault(id);
      dispatch({ type: 'UPDATE_DASHBOARD', payload: dashboard });
      return dashboard;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to set as default' });
      throw error;
    }
  }, []);

  // Widget operations
  const createWidget = useCallback(async (dashboardId: string, data: any): Promise<DashboardWidget> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const widget = await dashboardService.createWidget(dashboardId, data);
      dispatch({ type: 'ADD_WIDGET', payload: widget });
      return widget;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create widget' });
      throw error;
    }
  }, []);

  const updateWidget = useCallback(async (id: string, data: any): Promise<DashboardWidget> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const widget = await dashboardService.updateWidget(id, data);
      dispatch({ type: 'UPDATE_WIDGET', payload: widget });
      return widget;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update widget' });
      throw error;
    }
  }, []);

  const deleteWidget = useCallback(async (id: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await dashboardService.deleteWidget(id);
      dispatch({ type: 'DELETE_WIDGET', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete widget' });
      throw error;
    }
  }, []);

  const updateWidgetPosition = useCallback(async (id: string, position: any): Promise<DashboardWidget> => {
    try {
      const widget = await dashboardService.updateWidgetPosition(id, position);
      dispatch({ type: 'UPDATE_WIDGET', payload: widget });
      return widget;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update widget position' });
      throw error;
    }
  }, []);

  const bulkUpdatePositions = useCallback(async (dashboardId: string, updates: Array<{ id: string; position: any }>): Promise<void> => {
    try {
      await dashboardService.bulkUpdatePositions(dashboardId, updates);
      dispatch({ type: 'UPDATE_WIDGET_POSITIONS', payload: updates });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update widget positions' });
      throw error;
    }
  }, []);

  // UI state operations
  const setEditing = useCallback((editing: boolean) => {
    dispatch({ type: 'SET_EDITING', payload: editing });
  }, []);

  const setSelectedWidget = useCallback((widget: DashboardWidget | null) => {
    dispatch({ type: 'SET_SELECTED_WIDGET', payload: widget });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Load dashboards on mount
  useEffect(() => {
    if (user) {
      loadDashboards();
    }
  }, [user, loadDashboards]);

  const contextValue: DashboardContextType = {
    state,
    loadDashboards,
    loadDashboard,
    loadDefaultDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    setAsDefault,
    createWidget,
    updateWidget,
    deleteWidget,
    updateWidgetPosition,
    bulkUpdatePositions,
    setEditing,
    setSelectedWidget,
    clearError,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook to use dashboard context
export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
