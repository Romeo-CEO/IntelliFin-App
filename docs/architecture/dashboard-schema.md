# Dashboard Schema Architecture

## Overview
The dashboard system provides a flexible, customizable interface for displaying financial metrics and analytics for Zambian SMEs. The architecture supports multi-tenant isolation, role-based permissions, and responsive layouts optimized for both desktop and mobile devices.

## Core Models

### Dashboard
The main dashboard entity that represents a collection of widgets arranged in a specific layout.

**Key Features:**
- Multi-tenant isolation through `organizationId`
- Default dashboard support for new users
- Public dashboards for sharing across organization
- JSON-based layout configuration for flexibility
- Audit trail with creator tracking

**Layout Configuration:**
```json
{
  "gridColumns": 12,
  "gridRows": "auto",
  "breakpoints": {
    "mobile": 600,
    "tablet": 1024,
    "desktop": 1440
  },
  "spacing": 16,
  "autoResize": true
}
```

### DashboardWidget
Individual widgets that display specific data or functionality within a dashboard.

**Widget Types:**
- `METRIC_CARD`: Key performance indicators and metrics
- `CHART_LINE`: Time-series data visualization
- `CHART_BAR`: Categorical data comparison
- `CHART_PIE`: Proportional data display
- `CHART_DOUGHNUT`: Proportional data with center content
- `TABLE`: Tabular data display
- `LIST`: Simple list of items
- `CALENDAR`: Date-based events and schedules
- `PROGRESS`: Progress indicators and goals
- `GAUGE`: Meter-style displays
- `MAP`: Geographic data visualization
- `TEXT`: Rich text content
- `IMAGE`: Image display
- `IFRAME`: Embedded external content
- `CUSTOM`: Custom widget implementations

**Position Configuration:**
```json
{
  "x": 0,
  "y": 0,
  "width": 4,
  "height": 3,
  "minWidth": 2,
  "minHeight": 2,
  "maxWidth": 12,
  "maxHeight": 6,
  "responsive": {
    "mobile": { "width": 12, "height": 4 },
    "tablet": { "width": 6, "height": 3 }
  }
}
```

**Data Source Configuration:**
```json
{
  "type": "api",
  "endpoint": "/api/analytics/revenue",
  "method": "GET",
  "parameters": {
    "period": "30d",
    "currency": "ZMW"
  },
  "refreshInterval": 300,
  "cache": true
}
```

### DashboardPermission
Manages access control for dashboard sharing and collaboration.

**Permission Types:**
- `VIEW`: Read-only access to dashboard
- `EDIT`: Can modify widgets and layout
- `ADMIN`: Full control including permissions management

## Data Flow

### Dashboard Loading
1. User requests dashboard
2. System validates permissions
3. Dashboard configuration loaded
4. Widget configurations retrieved
5. Layout engine positions widgets
6. Data sources initialized
7. Widgets rendered with data

### Widget Data Refresh
1. Widget checks refresh interval
2. Data source endpoint called
3. Response cached if configured
4. Widget updates with new data
5. Loading states managed

### Layout Persistence
1. User modifies widget positions
2. Layout changes captured
3. Position data validated
4. Dashboard configuration updated
5. Changes synchronized across sessions

## Security Considerations

### Multi-Tenant Isolation
- All dashboard queries filtered by `organizationId`
- Widget data sources respect tenant boundaries
- Shared dashboards maintain tenant context

### Permission Validation
- Dashboard access checked on every request
- Widget-level permissions for sensitive data
- API endpoints validate dashboard permissions

### Data Source Security
- Widget data sources validated against allowed endpoints
- External iframe sources restricted to whitelist
- API calls include proper authentication headers

## Performance Optimization

### Caching Strategy
- Dashboard configurations cached in Redis
- Widget data cached based on refresh intervals
- Layout calculations cached for responsive breakpoints

### Lazy Loading
- Widgets loaded on-demand as they enter viewport
- Large datasets paginated automatically
- Images and external content lazy-loaded

### Bandwidth Optimization
- Compressed JSON responses
- Incremental data updates for time-series
- Optimized image formats for mobile

## Responsive Design

### Breakpoint Management
- Mobile-first responsive design
- Automatic widget resizing
- Touch-optimized interactions
- Simplified layouts for small screens

### Grid System
- 12-column grid for desktop
- Flexible column count for mobile
- Automatic row height adjustment
- Consistent spacing across devices

## Integration Points

### Expense Management
- Expense analytics widgets
- Approval workflow dashboards
- Receipt processing metrics
- Category-based spending analysis

### Financial Metrics
- Revenue and expense tracking
- Cash flow monitoring
- Profit margin analysis
- Tax liability calculations

### Mobile Money Integration
- Transaction volume widgets
- Balance monitoring
- Payment method analytics
- Reconciliation status

## Zambian SME Considerations

### Local Context
- ZMW currency formatting
- Zambian fiscal year support
- Local business hour awareness
- Regional data visualization

### Low-Bandwidth Optimization
- Minimal data transfer
- Progressive enhancement
- Offline capability planning
- Compressed asset delivery

### User Experience
- Simplified configuration interface
- Pre-built dashboard templates
- Contextual help and guidance
- Mobile-optimized interactions

## Future Extensibility

### Widget Framework
- Plugin architecture for custom widgets
- Third-party widget marketplace
- Widget development SDK
- Template sharing system

### Analytics Integration
- Machine learning insights
- Predictive analytics widgets
- Automated report generation
- Business intelligence integration

### API Expansion
- External data source connectors
- Webhook-based real-time updates
- GraphQL query optimization
- Batch data processing
