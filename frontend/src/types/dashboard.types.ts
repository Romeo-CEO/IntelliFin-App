// Dashboard and widget type definitions for IntelliFin

export enum WidgetType {
  METRIC_CARD = 'METRIC_CARD',
  CHART_LINE = 'CHART_LINE',
  CHART_BAR = 'CHART_BAR',
  CHART_PIE = 'CHART_PIE',
  CHART_DOUGHNUT = 'CHART_DOUGHNUT',
  TABLE = 'TABLE',
  LIST = 'LIST',
  CALENDAR = 'CALENDAR',
  PROGRESS = 'PROGRESS',
  GAUGE = 'GAUGE',
  MAP = 'MAP',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  IFRAME = 'IFRAME',
  CUSTOM = 'CUSTOM',
  // Step 18: Executive Dashboard Widget Types
  CASH_FLOW = 'CASH_FLOW',
  REVENUE_EXPENSES = 'REVENUE_EXPENSES',
  KPI_SUMMARY = 'KPI_SUMMARY',
  RECEIVABLES_AGING = 'RECEIVABLES_AGING',
  // Step 19: Advanced Analytics Widget Types
  REVENUE_FORECAST = 'REVENUE_FORECAST',
  EXPENSE_TRENDS = 'EXPENSE_TRENDS',
  PROFITABILITY_ANALYSIS = 'PROFITABILITY_ANALYSIS',
  TAX_ANALYTICS = 'TAX_ANALYTICS',
  FINANCIAL_HEALTH = 'FINANCIAL_HEALTH',
}

export enum DashboardPermissionType {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  ADMIN = 'ADMIN',
}

// User summary interface
export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Dashboard permission interface
export interface DashboardPermission {
  id: string;
  permission: DashboardPermissionType;
  user: UserSummary;
  grantor: UserSummary;
  grantedAt: string;
}

// Widget position interface
export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  responsive?: {
    mobile?: { width: number; height: number };
    tablet?: { width: number; height: number };
  };
}

// Widget configuration interfaces
export interface MetricCardConfig {
  showTrend?: boolean;
  showComparison?: boolean;
  format?: 'currency' | 'number' | 'percentage';
  precision?: number;
  trendPeriod?: string;
  comparisonPeriod?: string;
}

export interface ChartConfig {
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animation?: boolean;
  colors?: string[];
  orientation?: 'vertical' | 'horizontal';
  stacked?: boolean;
}

export interface TableConfig {
  showHeader?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  sortable?: boolean;
  filterable?: boolean;
  columns?: Array<{
    key: string;
    title: string;
    width?: number;
    sortable?: boolean;
    filterable?: boolean;
  }>;
}

export interface ListConfig {
  showIcons?: boolean;
  maxItems?: number;
  showMore?: boolean;
  itemTemplate?: string;
}

// Data source interface
export interface DataSource {
  type: 'api' | 'static' | 'computed';
  endpoint?: string;
  method?: 'GET' | 'POST';
  parameters?: Record<string, any>;
  refreshInterval?: number;
  cache?: boolean;
  data?: any;
  computation?: string;
}

// Dashboard widget interface
export interface DashboardWidget {
  id: string;
  dashboardId: string;
  widgetType: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  configuration: MetricCardConfig | ChartConfig | TableConfig | ListConfig | Record<string, any>;
  dataSource?: DataSource;
  refreshInterval?: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

// Dashboard layout interface
export interface DashboardLayout {
  gridColumns: number;
  gridRows: string | number;
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  spacing: number;
  autoResize: boolean;
  minRowHeight?: number;
  maxRowHeight?: number;
}

// Dashboard settings interface
export interface DashboardSettings {
  theme?: 'light' | 'dark' | 'auto';
  refreshInterval?: number;
  autoRefresh?: boolean;
  showGrid?: boolean;
  snapToGrid?: boolean;
  allowResize?: boolean;
  allowMove?: boolean;
  compactMode?: boolean;
  animations?: boolean;
}

// Main dashboard interface
export interface Dashboard {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  layout: DashboardLayout;
  settings?: DashboardSettings;
  creator: UserSummary;
  widgets: DashboardWidget[];
  permissions?: DashboardPermission[];
  createdAt: string;
  updatedAt: string;
}

// Create dashboard data interface
export interface CreateDashboardData {
  name: string;
  description?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  layout?: Partial<DashboardLayout>;
  settings?: Partial<DashboardSettings>;
}

// Update dashboard data interface
export interface UpdateDashboardData {
  name?: string;
  description?: string;
  isPublic?: boolean;
  layout?: Partial<DashboardLayout>;
  settings?: Partial<DashboardSettings>;
}

// Create widget data interface
export interface CreateWidgetData {
  widgetType: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  configuration?: Record<string, any>;
  dataSource?: DataSource;
  refreshInterval?: number;
}

// Update widget data interface
export interface UpdateWidgetData {
  title?: string;
  description?: string;
  configuration?: Record<string, any>;
  dataSource?: DataSource;
  refreshInterval?: number;
}

// Widget template interface
export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  widgetType: WidgetType;
  category: string;
  thumbnail?: string;
  configuration: Record<string, any>;
  dataSource?: DataSource;
  tags: string[];
  isPublic: boolean;
  createdBy: UserSummary;
  createdAt: string;
}

// Dashboard theme interface
export interface DashboardTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  typography: {
    fontFamily: string;
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
  isDefault: boolean;
}

// Dashboard analytics interface
export interface DashboardAnalytics {
  views: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
  topWidgets: Array<{
    widgetId: string;
    title: string;
    views: number;
    interactions: number;
  }>;
  performanceMetrics: {
    loadTime: number;
    renderTime: number;
    dataFetchTime: number;
  };
  period: string;
}

// Widget data interface
export interface WidgetData {
  data: any;
  metadata?: {
    lastUpdated: string;
    source: string;
    refreshInterval: number;
    nextRefresh: string;
  };
  error?: string;
  loading?: boolean;
}

// Dashboard sharing interface
export interface DashboardSharing {
  isPublic: boolean;
  allowedUsers: string[];
  shareLinks: Array<{
    id: string;
    url: string;
    expiresAt?: string;
    permissions: DashboardPermissionType[];
    createdAt: string;
  }>;
  embedSettings: {
    allowEmbed: boolean;
    allowedDomains: string[];
    showHeader: boolean;
    showControls: boolean;
  };
}

// Grid layout item interface (for react-grid-layout)
export interface GridLayoutItem {
  i: string; // widget id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

// Responsive grid layouts
export interface ResponsiveGridLayouts {
  lg: GridLayoutItem[];
  md: GridLayoutItem[];
  sm: GridLayoutItem[];
  xs: GridLayoutItem[];
  xxs: GridLayoutItem[];
}

// Dashboard export/import interfaces
export interface DashboardExport {
  dashboard: Omit<Dashboard, 'id' | 'organizationId' | 'creator' | 'createdAt' | 'updatedAt'>;
  widgets: Omit<DashboardWidget, 'id' | 'dashboardId' | 'createdAt' | 'updatedAt'>[];
  version: string;
  exportedAt: string;
  exportedBy: UserSummary;
}

export interface DashboardImport {
  name?: string;
  replaceExisting?: boolean;
  preserveIds?: boolean;
}

// Error interfaces
export interface DashboardError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface WidgetError {
  widgetId: string;
  error: DashboardError;
}

// Performance monitoring interfaces
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  widgetCount: number;
  dataSourceCount: number;
  lastMeasured: string;
}

export interface PerformanceRecommendation {
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  action?: string;
}
