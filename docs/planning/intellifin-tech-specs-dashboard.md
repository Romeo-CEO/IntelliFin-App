```markdown
## Feature 5: Financial Dashboard & Reporting

### Goal
Implement a comprehensive financial reporting system that provides real-time insights into business performance through customizable dashboards, generates standard financial statements compliant with Zambian accounting standards, and enables data-driven decision making for SME owners.

### API Relationships
- Aggregates data from Transaction Service for financial metrics
- Pulls data from Invoice Service for revenue analytics
- Retrieves data from Expense Service for cost analysis
- Utilizes Chart Service for data visualization
- Leverages Caching Service for performance optimization
- Integrates with Export Service for report generation

### Detailed Requirements

#### Dashboard Requirements
1. **Executive Dashboard**
   - Real-time cash flow monitoring
   - Revenue vs. expenses visualization
   - Outstanding invoices and receivables tracking
   - Key performance indicators with trend analysis
   - Customizable widgets and layouts
   - Mobile-responsive design for on-the-go access

2. **Financial Metrics**
   - Profit and loss summary
   - Cash flow analysis
   - Balance sheet overview
   - Revenue breakdown by category/customer
   - Expense breakdown by category/vendor
   - Tax liability tracking
   - Debt-to-income ratio

3. **Visualization Components**
   - Interactive charts and graphs
   - Trend lines with forecasting
   - Comparative period analysis (month-over-month, year-over-year)
   - Drill-down capabilities for detailed exploration
   - Threshold indicators and alerts
   - Customizable color schemes and display options

#### Financial Statement Requirements
1. **Standard Financial Reports**
   - Income Statement (Profit & Loss)
   - Balance Sheet
   - Cash Flow Statement
   - Statement of Changes in Equity
   - Trial Balance
   - General Ledger

2. **Compliance Features**
   - Zambian GAAP compliance
   - ZRA tax reporting alignment
   - Audit trail for report generation
   - Historical report versioning
   - Footnotes and disclosure support
   - Digital signature for finalized reports

3. **Export and Sharing**
   - PDF generation with professional formatting
   - Excel export for further analysis
   - Scheduled report delivery via email
   - Secure sharing with accountants/advisors
   - Batch export capabilities
   - Print-optimized layouts

#### Analytics Requirements
1. **Business Intelligence**
   - Revenue forecasting
   - Expense trend analysis
   - Seasonality detection
   - Customer profitability analysis
   - Product/service profitability analysis
   - Break-even analysis
   - Working capital optimization

2. **Tax Analytics**
   - VAT collection and payment tracking
   - Tax deduction optimization
   - Estimated tax liability calculation
   - Tax calendar with due date alerts
   - Historical tax payment tracking
   - Tax rate impact analysis

3. **Performance Metrics**
   - Accounts receivable aging
   - Accounts payable aging
   - Inventory turnover (if applicable)
   - Gross profit margin
   - Net profit margin
   - Quick ratio and current ratio
   - Return on investment

### Implementation Guide

#### Database Schema

**Dashboard Configurations Table**
```
Table dashboard_configurations {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  user_id UUID [ref: > users.id, not null]
  name VARCHAR(100) [not null]
  layout JSONB [not null]
  is_default BOOLEAN [default: false]
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    user_id
    (organization_id, user_id, name) [unique]
  }
}
```

**Dashboard Widgets Table**
```
Table dashboard_widgets {
  id UUID [pk]
  dashboard_id UUID [ref: > dashboard_configurations.id, not null]
  widget_type VARCHAR(50) [not null] // 'cash_flow', 'revenue', 'expenses', 'invoices', 'custom'
  title VARCHAR(100) [not null]
  config JSONB [not null]
  position JSONB [not null] // {x, y, width, height}
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    dashboard_id
  }
}
```

**Report Templates Table**
```
Table report_templates {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  name VARCHAR(100) [not null]
  type VARCHAR(50) [not null] // 'income_statement', 'balance_sheet', 'cash_flow', 'custom'
  config JSONB [not null]
  is_system BOOLEAN [default: false]
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    type
    (organization_id, name) [unique]
  }
}
```

**Generated Reports Table**
```
Table generated_reports {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  template_id UUID [ref: > report_templates.id, not null]
  user_id UUID [ref: > users.id, not null]
  name VARCHAR(255) [not null]
  type VARCHAR(50) [not null]
  parameters JSONB [not null]
  start_date DATE
  end_date DATE
  status VARCHAR(20) [not null] // 'generating', 'completed', 'failed'
  file_path VARCHAR(255)
  file_size INTEGER
  error_message TEXT
  created_at TIMESTAMP [default: `now()`]
  completed_at TIMESTAMP
  
  indexes {
    organization_id
    template_id
    user_id
    type
    created_at
  }
}
```

**Financial Metrics Table**
```
Table financial_metrics {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  date DATE [not null]
  metric_type VARCHAR(50) [not null] // 'revenue', 'expenses', 'profit', 'cash_balance', etc.
  amount DECIMAL(15,2) [not null]
  currency VARCHAR(3) [default: 'ZMW']
  metadata JSONB
  created_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    date
    metric_type
    (organization_id, date, metric_type) [unique]
  }
}
```

**Chart of Accounts Table**
```
Table chart_of_accounts {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  account_number VARCHAR(20) [not null]
  name VARCHAR(100) [not null]
  type VARCHAR(50) [not null] // 'asset', 'liability', 'equity', 'revenue', 'expense'
  subtype VARCHAR(50)
  parent_id UUID [ref: > chart_of_accounts.id]
  description TEXT
  is_active BOOLEAN [default: true]
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    account_number
    type
    parent_id
    (organization_id, account_number) [unique]
  }
}
```

**General Ledger Table**
```
Table general_ledger {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  account_id UUID [ref: > chart_of_accounts.id, not null]
  transaction_date DATE [not null]
  description TEXT [not null]
  debit_amount DECIMAL(15,2) [default: 0]
  credit_amount DECIMAL(15,2) [default: 0]
  balance DECIMAL(15,2) [not null]
  reference_type VARCHAR(50) // 'invoice', 'expense', 'manual', 'adjustment'
  reference_id UUID
  created_by UUID [ref: > users.id, not null]
  created_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    account_id
    transaction_date
    reference_type
    reference_id
  }
}
```

**Scheduled Reports Table**
```
Table scheduled_reports {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  template_id UUID [ref: > report_templates.id, not null]
  name VARCHAR(100) [not null]
  schedule_type VARCHAR(20) [not null] // 'daily', 'weekly', 'monthly', 'quarterly'
  parameters JSONB [not null]
  recipients JSONB [not null] // Array of email addresses
  is_active BOOLEAN [default: true]
  last_run_at TIMESTAMP
  next_run_at TIMESTAMP
  created_by UUID [ref: > users.id, not null]
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    template_id
    schedule_type
    next_run_at
  }
}
```

**Alert Configurations Table**
```
Table alert_configurations {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  user_id UUID [ref: > users.id, not null]
  name VARCHAR(100) [not null]
  metric_type VARCHAR(50) [not null]
  condition VARCHAR(20) [not null] // 'greater_than', 'less_than', 'equal_to', 'percentage_change'
  threshold DECIMAL(15,2) [not null]
  comparison_period VARCHAR(20) // 'previous_day', 'previous_week', 'previous_month', 'previous_year'
  is_active BOOLEAN [default: true]
  notification_channels JSONB // {'email': true, 'in_app': true, 'sms': false}
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    user_id
    metric_type
  }
}
```

#### Dashboard Configuration Flow

**Dashboard Creation Process**
```
function createDashboard(organizationId, userId, dashboardData):
  // Validate input
  if (!dashboardData.name) throw new ValidationError("Dashboard name is required")
  if (!dashboardData.layout) throw new ValidationError("Dashboard layout is required")
  
  // Check for duplicate name
  existingDashboard = await dashboardConfigurationsRepository.findByNameAndUser(
    organizationId,
    userId,
    dashboardData.name
  )
  
  if (existingDashboard) throw new ConflictError("Dashboard with this name already exists")
  
  // Start transaction
  return await db.transaction(async (tx) => {
    // Create dashboard configuration
    dashboard = await dashboardConfigurationsRepository.create({
      organization_id: organizationId,
      user_id: userId,
      name: dashboardData.name,
      layout: dashboardData.layout,
      is_default: dashboardData.isDefault || false
    }, tx)
    
    // If set as default, update other dashboards
    if (dashboard.is_default) {
      await dashboardConfigurationsRepository.updateMany(
        { organization_id: organizationId, user_id: userId, id: { $ne: dashboard.id } },
        { is_default: false },
        tx
      )
    }
    
    // Create widgets
    if (dashboardData.widgets && dashboardData.widgets.length > 0) {
      for (const widgetData of dashboardData.widgets) {
        await dashboardWidgetsRepository.create({
          dashboard_id: dashboard.id,
          widget_type: widgetData.type,
          title: widgetData.title,
          config: widgetData.config,
          position: widgetData.position
        }, tx)
      }
    }
    
    // Create audit log
    await auditLogService.logActivity(
      organizationId,
      userId,
      'create',
      'dashboard',
      dashboard.id,
      null,
      {
        name: dashboardData.name,
        widget_count: dashboardData.widgets ? dashboardData.widgets.length : 0
      }
    )
    
    return {
      id: dashboard.id,
      name: dashboard.name,
      isDefault: dashboard.is_default,
      widgetCount: dashboardData.widgets ? dashboardData.widgets.length : 0
    }
  })
```

**Widget Data Retrieval Process**
```
async function getWidgetData(organizationId, widgetId):
  // Get widget configuration
  widget = await dashboardWidgetsRepository.findById(widgetId)
  if (!widget) throw new NotFoundError("Widget not found")
  
  // Get dashboard to verify organization access
  dashboard = await dashboardConfigurationsRepository.findById(widget.dashboard_id)
  if (dashboard.organization_id !== organizationId) 
    throw new ForbiddenError("Access denied to this widget")
  
  // Process based on widget type
  switch (widget.widget_type) {
    case 'cash_flow':
      return await getCashFlowData(organizationId, widget.config)
    
    case 'revenue':
      return await getRevenueData(organizationId, widget.config)
    
    case 'expenses':
      return await getExpenseData(organizationId, widget.config)
    
    case 'invoices':
      return await getInvoiceData(organizationId, widget.config)
    
    case 'custom':
      return await getCustomMetricData(organizationId, widget.config)
    
    default:
      throw new ValidationError(`Unsupported widget type: ${widget.widget_type}`)
  }
```

**Cash Flow Data Retrieval**
```
async function getCashFlowData(organizationId, config):
  // Extract parameters
  const period = config.period || 'last_30_days'
  const groupBy = config.groupBy || 'day'
  const includeProjection = config.includeProjection || false
  
  // Calculate date range
  const { startDate, endDate } = calculateDateRange(period)
  
  // Get transactions data
  const transactions = await transactionsRepository.findByDateRange(
    organizationId,
    startDate,
    endDate
  )
  
  // Get invoice payment data
  const invoicePayments = await paymentsRepository.findByDateRange(
    organizationId,
    startDate,
    endDate
  )
  
  // Get expense data
  const expenses = await expensesRepository.findByDateRange(
    organizationId,
    startDate,
    endDate
  )
  
  // Group data by specified interval
  const groupedData = groupFinancialDataByInterval(
    transactions,
    invoicePayments,
    expenses,
    groupBy
  )
  
  // Calculate running balance
  const startingBalance = await getBalanceAtDate(organizationId, startDate)
  const cashFlowData = calculateRunningBalance(groupedData, startingBalance)
  
  // Generate projection if requested
  let projection = null
  if (includeProjection) {
    projection = generateCashFlowProjection(cashFlowData, config.projectionDays || 30)
  }
  
  // Cache results for performance
  await cacheService.set(
    `cash_flow_${organizationId}_${period}_${groupBy}`,
    { cashFlowData, projection },
    3600 // 1 hour cache
  )
  
  return {
    startDate,
    endDate,
    interval: groupBy,
    startingBalance,
    data: cashFlowData,
    projection
  }
```

**Financial Report Generation Process**
```
async function generateFinancialReport(organizationId, userId, reportData):
  // Validate input
  if (!reportData.type) throw new ValidationError("Report type is required")
  if (!reportData.startDate) throw new ValidationError("Start date is required")
  if (!reportData.endDate) throw new ValidationError("End date is required")
  
  // Get report template
  let template
  if (reportData.templateId) {
    template = await reportTemplatesRepository.findById(reportData.templateId)
    if (!template) throw new NotFoundError("Report template not found")
    if (template.organization_id !== organizationId && !template.is_system)
      throw new ForbiddenError("Access denied to this template")
  } else {
    // Use default template for report type
    template = await reportTemplatesRepository.findDefaultByType(
      reportData.type,
      organizationId
    )
    if (!template) throw new NotFoundError(`No default template found for ${reportData.type}`)
  }
  
  // Create report record
  const report = await generatedReportsRepository.create({
    organization_id: organizationId,
    template_id: template.id,
    user_id: userId,
    name: reportData.name || `${template.name} - ${formatDate(reportData.startDate)} to ${formatDate(reportData.endDate)}`,
    type: reportData.type,
    parameters: {
      startDate: reportData.startDate,
      endDate: reportData.endDate,
      compareWithPeriod: reportData.compareWithPeriod,
      includeDrafts: reportData.includeDrafts || false,
      includeNotes: reportData.includeNotes || true,
      groupBy: reportData.groupBy || 'month',
      ...reportData.additionalParameters
    },
    start_date: reportData.startDate,
    end_date: reportData.endDate,
    status: 'generating'
  })
  
  // Queue report generation
  await reportGenerationQueue.add('generateReport', {
    reportId: report.id,
    organizationId,
    userId
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000
    }
  })
  
  return {
    id: report.id,
    name: report.name,
    type: report.type,
    status: report.status,
    startDate: report.start_date,
    endDate: report.end_date
  }
```

**Report Generation Job**
```
async function processReportGeneration(reportId, organizationId, userId):
  // Get report details
  const report = await generatedReportsRepository.findById(reportId)
  if (!report) throw new NotFoundError("Report not found")
  
  try {
    // Get template
    const template = await reportTemplatesRepository.findById(report.template_id)
    
    // Get organization details
    const organization = await organizationsRepository.findById(organizationId)
    
    // Get data based on report type
    let reportData
    switch (report.type) {
      case 'income_statement':
        reportData = await generateIncomeStatementData(
          organizationId,
          report.parameters.startDate,
          report.parameters.endDate,
          report.parameters
        )
        break
      
      case 'balance_sheet':
        reportData = await generateBalanceSheetData(
          organizationId,
          report.parameters.endDate,
          report.parameters
        )
        break
      
      case 'cash_flow':
        reportData = await generateCashFlowStatementData(
          organizationId,
          report.parameters.startDate,
          report.parameters.endDate,
          report.parameters
        )
        break
      
      case 'general_ledger':
        reportData = await generateGeneralLedgerData(
          organizationId,
          report.parameters.startDate,
          report.parameters.endDate,
          report.parameters.accountIds,
          report.parameters
        )
        break
      
      case 'trial_balance':
        reportData = await generateTrialBalanceData(
          organizationId,
          report.parameters.endDate,
          report.parameters
        )
        break
      
      case 'custom':
        reportData = await generateCustomReportData(
          organizationId,
          template.config,
          report.parameters
        )
        break
      
      default:
        throw new ValidationError(`Unsupported report type: ${report.type}`)
    }
    
    // Generate PDF
    const pdfBuffer = await reportRenderingService.renderReport(
      template.config,
      reportData,
      {
        organization: {
          name: organization.name,
          logo: organization.logo_url,
          address: organization.address,
          taxId: organization.zra_tin
        },
        reportName: report.name,
        startDate: report.parameters.startDate,
        endDate: report.parameters.endDate,
        generatedBy: userId,
        generatedAt: new Date()
      }
    )
    
    // Save PDF to storage
    const fileName = `${report.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    const filePath = `organizations/${organizationId}/reports/${report.id}/${fileName}`
    await storageService.uploadFile(filePath, pdfBuffer, 'application/pdf')
    
    // Update report record
    await generatedReportsRepository.update(reportId, {
      status: 'completed',
      file_path: filePath,
      file_size: pdfBuffer.length,
      completed_at: new Date()
    })
    
    // Create audit log
    await auditLogService.logActivity(
      organizationId,
      userId,
      'generate',
      'report',
      reportId,
      null,
      {
        name: report.name,
        type: report.type,
        file_size: pdfBuffer.length
      }
    )
    
    return {
      success: true,
      reportId,
      filePath,
      fileSize: pdfBuffer.length
    }
  } catch (error) {
    // Update report with error
    await generatedReportsRepository.update(reportId, {
      status: 'failed',
      error_message: error.message
    })
    
    throw error
  }
```

**Income Statement Data Generation**
```
async function generateIncomeStatementData(organizationId, startDate, endDate, parameters):
  // Get revenue accounts
  const revenueAccounts = await chartOfAccountsRepository.findByType(
    organizationId,
    'revenue'
  )
  
  // Get expense accounts
  const expenseAccounts = await chartOfAccountsRepository.findByType(
    organizationId,
    'expense'
  )
  
  // Get ledger entries for revenue accounts
  const revenueEntries = await generalLedgerRepository.findByAccountIdsAndDateRange(
    organizationId,
    revenueAccounts.map(a => a.id),
    startDate,
    endDate
  )
  
  // Get ledger entries for expense accounts
  const expenseEntries = await generalLedgerRepository.findByAccountIdsAndDateRange(
    organizationId,
    expenseAccounts.map(a => a.id),
    startDate,
    endDate
  )
  
  // Calculate totals by account
  const revenueByAccount = calculateTotalsByAccount(revenueEntries)
  const expensesByAccount = calculateTotalsByAccount(expenseEntries)
  
  // Calculate comparative data if requested
  let comparativeData = null
  if (parameters.compareWithPeriod) {
    const { compareStartDate, compareEndDate } = calculateComparativeDateRange(
      startDate,
      endDate,
      parameters.compareWithPeriod
    )
    
    comparativeData = await generateIncomeStatementData(
      organizationId,
      compareStartDate,
      compareEndDate,
      { ...parameters, compareWithPeriod: null } // Prevent infinite recursion
    )
  }
  
  // Calculate summary totals
  const totalRevenue = Object.values(revenueByAccount).reduce((sum, account) => sum + account.total, 0)
  const totalExpenses = Object.values(expensesByAccount).reduce((sum, account) => sum + account.total, 0)
  const netIncome = totalRevenue - totalExpenses
  
  // Format data for report
  return {
    startDate,
    endDate,
    revenue: {
      accounts: revenueAccounts.map(account => ({
        id: account.id,
        accountNumber: account.account_number,
        name: account.name,
        total: revenueByAccount[account.id]?.total || 0
      })),
      total: totalRevenue
    },
    expenses: {
      accounts: expenseAccounts.map(account => ({
        id: account.id,
        accountNumber: account.account_number,
        name: account.name,
        total: expensesByAccount[account.id]?.total || 0
      })),
      total: totalExpenses
    },
    netIncome,
    comparative: comparativeData
  }
```

**Balance Sheet Data Generation**
```
async function generateBalanceSheetData(organizationId, asOfDate, parameters):
  // Get asset accounts
  const assetAccounts = await chartOfAccountsRepository.findByType(
    organizationId,
    'asset'
  )
  
  // Get liability accounts
  const liabilityAccounts = await chartOfAccountsRepository.findByType(
    organizationId,
    'liability'
  )
  
  // Get equity accounts
  const equityAccounts = await chartOfAccountsRepository.findByType(
    organizationId,
    'equity'
  )
  
  // Get balances for all accounts as of date
  const assetBalances = await getAccountBalancesAsOf(
    organizationId,
    assetAccounts.map(a => a.id),
    asOfDate
  )
  
  const liabilityBalances = await getAccountBalancesAsOf(
    organizationId,
    liabilityAccounts.map(a => a.id),
    asOfDate
  )
  
  const equityBalances = await getAccountBalancesAsOf(
    organizationId,
    equityAccounts.map(a => a.id),
    asOfDate
  )
  
  // Calculate retained earnings
  const retainedEarnings = await calculateRetainedEarnings(
    organizationId,
    asOfDate
  )
  
  // Calculate comparative data if requested
  let comparativeData = null
  if (parameters.compareWithPeriod) {
    const compareAsOfDate = calculateComparativeDate(
      asOfDate,
      parameters.compareWithPeriod
    )
    
    comparativeData = await generateBalanceSheetData(
      organizationId,
      compareAsOfDate,
      { ...parameters, compareWithPeriod: null } // Prevent infinite recursion
    )
  }
  
  // Calculate summary totals
  const totalAssets = Object.values(assetBalances).reduce((sum, balance) => sum + balance, 0)
  const totalLiabilities = Object.values(liabilityBalances).reduce((sum, balance) => sum + balance, 0)
  const totalEquity = Object.values(equityBalances).reduce((sum, balance) => sum + balance, 0) + retainedEarnings
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity
  
  // Format data for report
  return {
    asOfDate,
    assets: {
      accounts: assetAccounts.map(account => ({
        id: account.id,
        accountNumber: account.account_number,
        name: account.name,
        balance: assetBalances[account.id] || 0
      })),
      total: totalAssets
    },
    liabilities: {
      accounts: liabilityAccounts.map(account => ({
        id: account.id,
        accountNumber: account.account_number,
        name: account.name,
        balance: liabilityBalances[account.id] || 0
      })),
      total: totalLiabilities
    },
    equity: {
      accounts: equityAccounts.map(account => ({
        id: account.id,
        accountNumber: account.account_number,
        name: account.name,
        balance: equityBalances[account.id] || 0
      })),
      retainedEarnings,
      total: totalEquity
    },
    totalLiabilitiesAndEquity,
    balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
    comparative: comparativeData
  }
```

#### API Endpoints

**Dashboard Endpoints**

1. **Create Dashboard**
   - `POST /api/dashboards`
   - Auth: Required
   - Request:
     ```json
     {
       "name": "Executive Overview",
       "layout": {
         "columns": 12,
         "rowHeight": 50
       },
       "isDefault": true,
       "widgets": [
         {
           "type": "cash_flow",
           "title": "Cash Flow",
           "config": {
             "period": "last_30_days",
             "groupBy": "day",
             "includeProjection": true
           },
           "position": {
             "x": 0,
             "y": 0,
             "width": 6,
             "height": 4
           }
         },
         {
           "type": "revenue",
           "title": "Revenue by Category",
           "config": {
             "period": "this_month",
             "groupBy": "category",
             "chartType": "pie"
           },
           "position": {
             "x": 6,
             "y": 0,
             "width": 6,
             "height": 4
           }
         }
       ]
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440000",
       "name": "Executive Overview",
       "isDefault": true,
       "widgetCount": 2
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 409 Conflict: Dashboard with this name already exists

2. **Get Dashboards**
   - `GET /api/dashboards`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "dashboards": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440000",
           "name": "Executive Overview",
           "isDefault": true,
           "widgetCount": 2,
           "createdAt": "2023-01-01T00:00:00Z"
         }
       ]
     }
     ```

3. **Get Dashboard Details**
   - `GET /api/dashboards/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440000",
       "name": "Executive Overview",
       "layout": {
         "columns": 12,
         "rowHeight": 50
       },
       "isDefault": true,
       "widgets": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440001",
           "type": "cash_flow",
           "title": "Cash Flow",
           "config": {
             "period": "last_30_days",
             "groupBy": "day",
             "includeProjection": true
           },
           "position": {
             "x": 0,
             "y": 0,
             "width": 6,
             "height": 4
           }
         },
         {
           "id": "550e8400-e29b-41d4-a716-446655440002",
           "type": "revenue",
           "title": "Revenue by Category",
           "config": {
             "period": "this_month",
             "groupBy": "category",
             "chartType": "pie"
           },
           "position": {
             "x": 6,
             "y": 0,
             "width": 6,
             "height": 4
           }
         }
       ],
       "createdAt": "2023-01-01T00:00:00Z",
       "updatedAt": "2023-01-01T00:00:00Z"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Dashboard not found

4. **Update Dashboard**
   - `PUT /api/dashboards/{id}`
   - Auth: Required
   - Request:
     ```json
     {
       "name": "Updated Dashboard",
       "layout": {
         "columns": 12,
         "rowHeight": 60
       },
       "isDefault": true
     }
     ```
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440000",
       "name": "Updated Dashboard",
       "isDefault": true,
       "updatedAt": "2023-01-02T00:00:00Z"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 404 Not Found: Dashboard not found

5. **Delete Dashboard**
   - `DELETE /api/dashboards/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "success": true,
       "message": "Dashboard deleted successfully"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Cannot delete default dashboard
     - 404 Not Found: Dashboard not found

**Widget Endpoints**

1. **Add Widget to Dashboard**
   - `POST /api/dashboards/{dashboardId}/widgets`
   - Auth: Required
   - Request:
     ```json
     {
       "type": "expenses",
       "title": "Expenses by Category",
       "config": {
         "period": "this_month",
         "groupBy": "category",
         "chartType": "bar"
       },
       "position": {
         "x": 0,
         "y": 4,
         "width": 6,
         "height": 4
       }
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440003",
       "type": "expenses",
       "title": "Expenses by Category",
       "dashboardId": "550e8400-e29b-41d4-a716-446655440000"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 404 Not Found: Dashboard not found

2. **Get Widget Data**
   - `GET /api/widgets/{id}/data`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440003",
       "title": "Expenses by Category",
       "type": "expenses",
       "data": {
         "startDate": "2023-01-01",
         "endDate": "2023-01-31",
         "total": 5000.00,
         "categories": [
           {
             "name": "Office Supplies",
             "amount": 1500.00,
             "percentage": 30
           },
           {
             "name": "Utilities",
             "amount": 2000.00,
             "percentage": 40
           },
           {
             "name": "Rent",
             "amount": 1500.00,
             "percentage": 30
           }
         ]
       },
       "lastUpdated": "2023-01-31T12:00:00Z"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Widget not found

3. **Update Widget**
   - `PUT /api/widgets/{id}`
   - Auth: Required
   - Request:
     ```json
     {
       "title": "Updated Widget Title",
       "config": {
         "period": "last_90_days",
         "groupBy": "month",
         "chartType": "line"
       },
       "position": {
         "x": 0,
         "y": 4,
         "width": 12,
         "height": 4
       }
     }
     ```
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440003",
       "title": "Updated Widget Title",
       "updatedAt": "2023-01-02T00:00:00Z"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 404 Not Found: Widget not found

4. **Delete Widget**
   - `DELETE /api/widgets/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "success": true,
       "message": "Widget deleted successfully"
     }
     ```
   - Error Responses:
     - 404 Not Found: Widget not found

**Report Endpoints**

1. **Generate Report**
   - `POST /api/reports`
   - Auth: Required
   - Request:
     ```json
     {
       "type": "income_statement",
       "name": "Income Statement Q1 2023",
       "templateId": "550e8400-e29b-41d4-a716-446655440004",
       "startDate": "2023-01-01",
       "endDate": "2023-03-31",
       "compareWithPeriod": "previous_quarter",
       "includeDrafts": false,
       "includeNotes": true,
       "groupBy": "month"
     }
     ```
   - Response (202 Accepted):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440005",
       "name": "Income Statement Q1 2023",
       "type": "income_statement",
       "status": "generating",
       "startDate": "2023-01-01",
       "endDate": "2023-03-31"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 404 Not Found: Template not found

2. **Get Reports**
   - `GET /api/reports?type={type}&status={status}&page={page}&limit={limit}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "reports": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440005",
           "name": "Income Statement Q1 2023",
           "type": "income_statement",
           "status": "completed",
           "startDate": "2023-01-01",
           "endDate": "2023-03-31",
           "createdAt": "2023-04-01T00:00:00Z",
           "completedAt": "2023-04-01T00:05:00Z"
         }
       ],
       "pagination": {
         "total": 10,
         "page": 1,
         "limit": 20,
         "pages": 1
       }
     }
     ```

3. **Get Report Details**
   - `GET /api/reports/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440005",
       "name": "Income Statement Q1 2023",
       "type": "income_statement",
       "template": {
         "id": "550e8400-e29b-41d4-a716-446655440004",
         "name": "Standard Income Statement"
       },
       "parameters": {
         "startDate": "2023-01-01",
         "endDate": "2023-03-31",
         "compareWithPeriod": "previous_quarter",
         "includeDrafts": false,
         "includeNotes": true,
         "groupBy": "month"
       },
       "status": "completed",
       "fileSize": 256000,
       "downloadUrl": "https://storage.azure.com/...",
       "createdAt": "2023-04-01T00:00:00Z",
       "completedAt": "2023-04-01T00:05:00Z"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Report not found

4. **Download Report**
   - `GET /api/reports/{id}/download`
   - Auth: Required
   - Response: PDF file download
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Report not found or file not available

**Report Template Endpoints**

1. **Create Report Template**
   - `POST /api/report-templates`
   - Auth: Required
   - Request:
     ```json
     {
       "name": "Custom Income Statement",
       "type": "income_statement",
       "config": {
         "sections": [
           {
             "title": "Revenue",
             "accounts": ["4000", "4100", "4200"],
             "subtotal": true
           },
           {
             "title": "Cost of Goods Sold",
             "accounts": ["5000", "5100"],
             "subtotal": true
           },
           {
             "title": "Gross Profit",
             "formula": "Revenue - Cost of Goods Sold",
             "bold": true
           },
           {
             "title": "Operating Expenses",
             "accounts": ["6000", "6100", "6200", "6300"],
             "subtotal": true
           },
           {
             "title": "Net Income",
             "formula": "Gross Profit - Operating Expenses",
             "bold": true
           }
         ],
         "styling": {
           "headerColor": "#336699",
           "textColor": "#333333",
           "subtotalStyle": "italic",
           "totalStyle": "bold"
         }
       }
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440006",
       "name": "Custom Income Statement",
       "type": "income_statement"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 409 Conflict: Template with this name already exists

2. **Get Report Templates**
   - `GET /api/report-templates?type={type}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "templates": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440004",
           "name": "Standard Income Statement",
           "type": "income_statement",
           "isSystem": true
         },
         {
           "id": "550e8400-e29b-41d4-a716-446655440006",
           "name": "Custom Income Statement",
           "type": "income_statement",
           "isSystem": false
         }
       ]
     }
     ```

**Chart of Accounts Endpoints**

1. **Create Account**
   - `POST /api/chart-of-accounts`
   - Auth: Required
   - Request:
     ```json
     {
       "accountNumber": "6400",
       "name": "Office Supplies",
       "type": "expense",
       "subtype": "operating_expense",
       "parentId": "550e8400-e29b-41d4-a716-446655440007",
       "description": "Office supplies and stationery"
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440008",
       "accountNumber": "6400",
       "name": "Office Supplies",
       "type": "expense",
       "subtype": "operating_expense"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 409 Conflict: Account number already exists

2. **Get Chart of Accounts**
   - `GET /api/chart-of-accounts?type={type}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "accounts": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440007",
           "accountNumber": "6000",
           "name": "Operating Expenses",
           "type": "expense",
           "subtype": null,
           "children": [
             {
               "id": "550e8400-e29b-41d4-a716-446655440008",
               "accountNumber": "6400",
               "name": "Office Supplies",
               "type": "expense",
               "subtype": "operating_expense"
             }
           ]
         }
       ]
     }
     ```

**Financial Metrics Endpoints**

1. **Get Key Metrics**
   - `GET /api/metrics/key?period={period}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "period": "this_month",
       "startDate": "2023-01-01",
       "endDate": "2023-01-31",
       "metrics": {
         "revenue": {
           "value": 25000.00,
           "change": 10.5,
           "trend": "up"
         },
         "expenses": {
           "value": 15000.00,
           "change": -5.2,
           "trend": "down"
         },
         "profit": {
           "value": 10000.00,
           "change": 45.8,
           "trend": "up"
         },
         "cashBalance": {
           "value": 50000.00,
           "change": 15.3,
           "trend": "up"
         },
         "accountsReceivable": {
           "value": 15000.00,
           "change": -10.2,
           "trend": "down"
         },
         "accountsPayable": {
           "value": 8000.00,
           "change": 5.5,
           "trend": "up"
         }
       }
     }
     ```

2. **Get Metric History**
   - `GET /api/metrics/history?metric={metric}&startDate={startDate}&endDate={endDate}&interval={interval}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "metric": "revenue",
       "startDate": "2023-01-01",
       "endDate": "2023-03-31",
       "interval": "month",
       "data": [
         {
           "date": "2023-01-31",
           "value": 25000.00
         },
         {
           "date": "2023-02-28",
           "value": 28000.00
         },
         {
           "date": "2023-03-31",
           "value": 30000.00
         }
       ],
       "total": 83000.00,
       "average": 27666.67,
       "trend": "up"
     }
     ```

**Alert Endpoints**

1. **Create Alert**
   - `POST /api/alerts`
   - Auth: Required
   - Request:
     ```json
     {
       "name": "Low Cash Balance Alert",
       "metricType": "cash_balance",
       "condition": "less_than",
       "threshold": 10000.00,
       "notificationChannels": {
         "email": true,
         "inApp": true,
         "sms": false
       }
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440009",
       "name": "Low Cash Balance Alert",
       "metricType": "cash_balance",
       "condition": "less_than",
       "threshold": 10000.00
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input

2. **Get Alerts**
   - `GET /api/alerts`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "alerts": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440009",
           "name": "Low Cash Balance Alert",
           "metricType": "cash_balance",
           "condition": "less_than",
           "threshold": 10000.00,
           "isActive": true
         }
       ]
     }
     ```

#### Frontend Components

**Dashboard Components**

1. **DashboardLayout**
   - Grid-based layout with responsive design
   - Drag-and-drop widget positioning
   - Widget resizing capabilities
   - Layout persistence
   - Mobile-responsive adaptation
   - Dashboard switching controls

2. **DashboardControls**
   - Dashboard selection dropdown
   - Date range selector
   - Add widget button
   - Edit layout toggle
   - Save/discard changes buttons
   - Dashboard settings menu

3. **WidgetContainer**
   - Standard widget frame with title bar
   - Loading state indicator
   - Error state handling
   - Refresh button
   - Widget settings menu
   - Maximize/restore controls
   - Remove widget option

4. **WidgetLibrary**
   - Categorized widget selection
   - Widget preview thumbnails
   - Search functionality
   - Drag-to-add capability
   - Recently used widgets section
   - Custom widget creation option

**Chart Components**

1. **LineChartWidget**
   - Time series data visualization
   - Multiple series support
   - Interactive tooltips
   - Zoom and pan controls
   - Trend line overlay
   - Threshold markers
   - Projection capability

2. **BarChartWidget**
   - Categorical data comparison
   - Horizontal or vertical orientation
   - Stacked or grouped options
   - Value labels
   - Sorting controls
   - Color customization
   - Drill-down capability

3. **PieChartWidget**
   - Proportional data visualization
   - Interactive segment selection
   - Percentage and value labels
   - Donut chart option
   - Legend with toggle controls
   - Color customization
   - Exploded segments for emphasis

4. **KPICardWidget**
   - Large metric display
   - Trend indicator
   - Comparison with previous period
   - Color-coded status
   - Sparkline mini-chart
   - Secondary metrics
   - Alert indicators

**Financial Report Components**

1. **ReportGenerator**
   - Report type selection
   - Template selection
   - Date range picker
   - Comparison period selector
   - Advanced options panel
   - Preview capability
   - Generation progress indicator

2. **ReportViewer**
   - PDF rendering
   - Zoom and page navigation
   - Search functionality
   - Download option
   - Print controls
   - Sharing options
   - Annotation tools (optional)

3. **ReportList**
   - Sortable list of generated reports
   - Status indicators
   - Quick action buttons (view, download, delete)
   - Filtering by type and date
   - Search functionality
   - Batch operations

4. **TemplateEditor**
   - Visual template designer
   - Section management
   - Account selection tools
   - Formula builder
   - Styling controls
   - Preview capability
   - Template versioning

**Financial Analysis Components**

1. **CashFlowAnalyzer**
   - Cash flow trend visualization
   - Income vs. expense breakdown
   - Projection modeling
   - Scenario comparison
   - Seasonality detection
   - Critical date highlighting
   - Export capabilities

2. **ProfitabilityAnalyzer**
   - Gross and net profit trends
   - Margin analysis by product/service
   - Customer profitability ranking
   - Break-even analysis
   - Contribution margin calculation
   - What-if scenario modeling
   - Benchmark comparison

3. **TaxCalculator**
   - VAT liability estimation
   - Income tax projection
   - Deduction optimizer
   - Payment schedule
   - Historical tax analysis
   - Compliance status indicators
   - Filing deadline reminders

#### Background Jobs

1. **Metric Calculation Job**
   - Calculates and stores key financial metrics
   - Runs daily for previous day's data
   - Updates trend information
   - Triggers alerts based on thresholds
   - Handles currency conversions
   - Maintains historical metric data

2. **Report Generation Job**
   - Processes report generation requests
   - Handles large datasets efficiently
   - Creates PDF/Excel outputs
   - Stores generated reports securely
   - Sends completion notifications
   - Manages report versioning

3. **Dashboard Cache Refresh Job**
   - Pre-calculates common dashboard metrics
   - Updates cache for frequently used widgets
   - Runs during off-peak hours
   - Prioritizes based on user activity
   - Handles incremental updates
   - Manages cache expiration

4. **Alert Evaluation Job**
   - Evaluates alert conditions against current metrics
   - Triggers notifications for threshold violations
   - Tracks alert history
   - Prevents notification storms
   - Handles alert acknowledgment
   - Escalates persistent alerts

#### Security Considerations

1. **Financial Data Protection**
   - Encryption of sensitive financial information
   - Role-based access to financial reports
   - Audit logging of all report access
   - Secure storage of generated reports
   - Data masking for sensitive figures
   - Secure deletion of temporary data

2. **Dashboard Security**
   - User-specific dashboard configurations
   - Widget-level permission controls
   - Data filtering based on user roles
   - Secure caching mechanisms
   - Protection against cross-site scripting
   - Input validation for all parameters

3. **API Security**
   - Rate limiting for report generation
   - Request validation and sanitization
   - Prevention of parameter tampering
   - Secure handling of date ranges
   - Protection against injection attacks
   - Proper error handling without data leakage

#### Testing Strategy

1. **Unit Tests**
   - Financial calculation functions
   - Report generation logic
   - Dashboard widget data retrieval
   - Alert condition evaluation
   - Date range handling
   - Currency conversion

2. **Integration Tests**
   - Dashboard configuration persistence
   - Report generation workflow
   - Metric calculation pipeline
   - Alert notification delivery
   - Cache refresh mechanisms
   - Data aggregation across services

3. **End-to-End Tests**
   - Complete dashboard creation and usage
   - Financial report generation and viewing
   - Alert creation and triggering
   - Chart of accounts management
   - Historical data browsing
   - Export and sharing workflows

4. **Performance Tests**
   - Dashboard loading with multiple widgets
   - Report generation with large datasets
   - Chart rendering performance
   - API response times under load
   - Concurrent report generation
   - Cache effectiveness

#### Error Handling

1. **Report Generation Errors**
   - Data inconsistency detection
   - Graceful handling of missing accounts
   - Timeout management for large reports
   - Partial success handling
   - Clear error messaging
   - Recovery options for failed reports

2. **Dashboard Widget Errors**
   - Individual widget error containment
   - Fallback to cached data
   - Retry mechanisms with backoff
   - User-friendly error displays
   - Detailed logging for troubleshooting
   - Auto-recovery when possible

3. **Calculation Errors**
   - Division by zero protection
   - Handling of null or missing values
   - Currency conversion failures
   - Date range edge cases
   - Overflow/underflow prevention
   - Validation of calculation results

#### Logging and Monitoring

1. **Performance Monitoring**
   - Dashboard loading times
   - Widget rendering times
   - Report generation duration
   - API response times
   - Cache hit/miss rates
   - Background job execution times

2. **Usage Analytics**
   - Most viewed reports
   - Popular dashboard widgets
   - Common date ranges
   - Feature adoption rates
   - Export frequency
   - User engagement metrics

3. **Error Tracking**
   - Report generation failure rates
   - Widget loading errors
   - API error rates
   - Background job failures
   - Data inconsistency detections
   - User-reported issues

### Key Edge Cases

1. **Financial Calculations**
   - Businesses with no transaction history
   - Negative account balances
   - Zero-value denominators in ratios
   - Currency conversion with volatile rates
   - Very large numbers exceeding precision
   - Fiscal years not matching calendar years

2. **Reporting**
   - Reports spanning multiple fiscal years
   - Businesses with complex account structures
   - Very large reports exceeding memory limits
   - Custom reports with circular references
   - Reports with all zero values
   - Comparative periods with no data

3. **Dashboard Performance**
   - Dashboards with many widgets
   - Widgets with very large datasets
   - Multiple users accessing same dashboard
   - Real-time data with high update frequency
   - Mobile access with limited bandwidth
   - Widgets with complex calculations

4. **Data Visualization**
   - Charts with outliers skewing scale
   - Time series with missing data points
   - Pie charts with many small segments
   - Bar charts with long category names
   - Line charts with steep value changes
   - Color schemes for colorblind accessibility
```
