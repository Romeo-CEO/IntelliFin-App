```markdown
## Feature 2: Airtel Mobile Money Integration

### Goal
Implement a secure and reliable integration with Airtel Mobile Money that automatically imports transaction history, enables real-time balance monitoring, and provides transaction categorization tools, creating the foundation for financial reconciliation within the IntelliFin platform.

### API Relationships
- Communicates with Airtel Mobile Money API for authentication and data retrieval
- Interacts with Transaction Service for storing and categorizing transactions
- Utilizes Bull/BullMQ for background processing and scheduled syncing
- Leverages Redis for caching transaction data and API responses
- Connects to Notification Service for real-time transaction alerts

### Detailed Requirements

#### Connection Requirements
1. **Secure Authentication**
   - OAuth 2.0 flow for user authorization
   - Secure storage of access and refresh tokens
   - Token refresh mechanism for maintaining continuous access
   - Revocation handling for when users disconnect accounts
   - Clear user consent flow for data access permissions

2. **Account Management**
   - Support for connecting multiple Airtel Money accounts per business
   - Account metadata storage (account number, name, type)
   - Account status monitoring (active, disconnected, error)
   - Ability to manually disconnect accounts
   - Periodic verification of connection status

#### Transaction Import Requirements
1. **Historical Data Import**
   - Configurable date range for initial import (up to 12 months)
   - Batch processing for large transaction volumes
   - Duplicate detection and prevention
   - Progress tracking and reporting
   - Error handling with retry mechanisms

2. **Ongoing Synchronization**
   - Scheduled background jobs for regular updates (configurable frequency)
   - Real-time webhook support for immediate transaction notifications (if available)
   - Delta synchronization to minimize API calls
   - Conflict resolution for overlapping imports
   - Failure recovery mechanisms

3. **Transaction Data Requirements**
   - Transaction ID and reference numbers
   - Transaction date and time
   - Amount and currency
   - Transaction type (deposit, withdrawal, payment, transfer)
   - Counterparty information (name, phone number)
   - Description/narrative
   - Balance after transaction
   - Status (completed, pending, failed)
   - Fees and charges

#### Transaction Management Requirements
1. **Categorization**
   - Predefined categories aligned with Zambian Chart of Accounts
   - Custom category creation
   - Automatic categorization based on patterns
   - Batch categorization for similar transactions
   - Category hierarchy (main category, subcategory)

2. **Reconciliation**
   - Linking transactions to invoices
   - Linking transactions to expenses
   - Matching status indicators
   - Bulk matching operations
   - Unreconciled transaction highlighting

3. **Search and Filtering**
   - Full-text search across transaction data
   - Advanced filtering by date, amount, type, category, reconciliation status
   - Saved filters for common queries
   - Export functionality for filtered results

#### Notification Requirements
1. **Transaction Alerts**
   - Real-time notifications for new transactions
   - Configurable notification thresholds
   - Delivery channels (in-app, email, SMS optional)
   - Customizable notification content
   - Grouping of notifications to prevent overload

2. **Balance Alerts**
   - Low balance warnings
   - Unusual activity detection
   - Large transaction notifications
   - Scheduled balance summaries
   - Failed synchronization alerts

### Implementation Guide

#### Database Schema

**Mobile Money Accounts Table**
```
Table mobile_money_accounts {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  provider VARCHAR(50) [not null] // 'Airtel', 'MTN', etc.
  account_number VARCHAR(50) [not null]
  account_name VARCHAR(100)
  account_type VARCHAR(50)
  phone_number VARCHAR(20) [not null]
  is_primary BOOLEAN [default: false]
  status VARCHAR(20) [not null] // 'active', 'disconnected', 'error'
  last_sync_at TIMESTAMP
  balance DECIMAL(15,2)
  currency VARCHAR(3) [default: 'ZMW']
  access_token TEXT
  refresh_token TEXT
  token_expires_at TIMESTAMP
  error_message TEXT
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    (organization_id, provider, account_number) [unique]
    phone_number
  }
}
```

**Transactions Table**
```
Table transactions {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  account_id UUID [ref: > mobile_money_accounts.id, not null]
  external_id VARCHAR(100) [not null] // ID from Airtel
  reference VARCHAR(100)
  transaction_date TIMESTAMP [not null]
  amount DECIMAL(15,2) [not null]
  currency VARCHAR(3) [default: 'ZMW']
  type VARCHAR(50) [not null] // 'deposit', 'withdrawal', 'payment', 'transfer'
  counterparty_name VARCHAR(255)
  counterparty_number VARCHAR(50)
  description TEXT
  balance_after DECIMAL(15,2)
  status VARCHAR(20) [not null] // 'completed', 'pending', 'failed'
  fees DECIMAL(15,2) [default: 0]
  category_id UUID [ref: > categories.id]
  is_reconciled BOOLEAN [default: false]
  invoice_id UUID [ref: > invoices.id]
  expense_id UUID [ref: > expenses.id]
  metadata JSONB
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    account_id
    external_id
    transaction_date
    (organization_id, external_id) [unique]
    category_id
    invoice_id
    expense_id
  }
}
```

**Categories Table**
```
Table categories {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  name VARCHAR(100) [not null]
  type VARCHAR(20) [not null] // 'income', 'expense'
  parent_id UUID [ref: > categories.id]
  chart_of_accounts_code VARCHAR(20)
  is_system BOOLEAN [default: false]
  color VARCHAR(7)
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    (organization_id, name, parent_id) [unique]
    parent_id
  }
}
```

**Sync Jobs Table**
```
Table sync_jobs {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  account_id UUID [ref: > mobile_money_accounts.id, not null]
  status VARCHAR(20) [not null] // 'pending', 'in_progress', 'completed', 'failed'
  start_date TIMESTAMP [not null]
  end_date TIMESTAMP [not null]
  transactions_count INTEGER [default: 0]
  error_message TEXT
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    account_id
    status
    created_at
  }
}
```

**Notification Settings Table**
```
Table notification_settings {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  user_id UUID [ref: > users.id, not null]
  transaction_alerts BOOLEAN [default: true]
  minimum_amount DECIMAL(15,2) [default: 0]
  balance_alerts BOOLEAN [default: true]
  low_balance_threshold DECIMAL(15,2)
  delivery_channels JSONB // {'in_app': true, 'email': true, 'sms': false}
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    user_id
    (organization_id, user_id) [unique]
  }
}
```

#### Airtel Money Integration Flow

**Account Connection Process**
```
function connectAirtelMoneyAccount(organizationId, userId, phoneNumber):
  // Validate input
  if (!isValidPhoneNumber(phoneNumber)) throw new ValidationError("Invalid phone number format")
  
  // Check if account already connected
  existingAccount = await mobileMoneyAccountsRepository.findByOrganizationAndPhone(
    organizationId, 
    phoneNumber,
    'Airtel'
  )
  
  if (existingAccount && existingAccount.status === 'active') 
    throw new ConflictError("This Airtel Money account is already connected")
  
  // Generate OAuth state parameter for security
  state = generateSecureToken()
  
  // Store state in session or Redis for validation during callback
  await oauthStateStore.set(state, {
    organizationId,
    userId,
    phoneNumber,
    provider: 'Airtel',
    timestamp: Date.now()
  }, 3600) // 1 hour expiry
  
  // Generate OAuth authorization URL
  authUrl = `${AIRTEL_OAUTH_URL}?client_id=${AIRTEL_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&state=${state}&scope=transactions balance&phone=${phoneNumber}`
  
  return {
    authUrl,
    state
  }
```

**OAuth Callback Handling**
```
function handleAirtelOAuthCallback(code, state):
  // Validate state parameter to prevent CSRF
  storedState = await oauthStateStore.get(state)
  if (!storedState) throw new UnauthorizedError("Invalid OAuth state parameter")
  
  // Check for expiry
  if (Date.now() - storedState.timestamp > 3600 * 1000) 
    throw new UnauthorizedError("OAuth flow expired, please try again")
  
  // Exchange authorization code for tokens
  tokenResponse = await axios.post(AIRTEL_TOKEN_URL, {
    grant_type: 'authorization_code',
    code,
    client_id: AIRTEL_CLIENT_ID,
    client_secret: AIRTEL_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI
  })
  
  // Extract tokens
  accessToken = tokenResponse.data.access_token
  refreshToken = tokenResponse.data.refresh_token
  expiresIn = tokenResponse.data.expires_in
  
  // Get account details from Airtel API
  accountResponse = await axios.get(AIRTEL_ACCOUNT_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  accountDetails = accountResponse.data
  
  // Create or update account in database
  account = await mobileMoneyAccountsRepository.findByOrganizationAndPhone(
    storedState.organizationId,
    storedState.phoneNumber,
    'Airtel'
  )
  
  if (account) {
    // Update existing account
    await mobileMoneyAccountsRepository.update(account.id, {
      status: 'active',
      account_name: accountDetails.accountName,
      account_type: accountDetails.accountType,
      balance: accountDetails.balance,
      access_token: encryptToken(accessToken),
      refresh_token: encryptToken(refreshToken),
      token_expires_at: new Date(Date.now() + expiresIn * 1000),
      error_message: null
    })
  } else {
    // Create new account
    account = await mobileMoneyAccountsRepository.create({
      organization_id: storedState.organizationId,
      provider: 'Airtel',
      account_number: accountDetails.accountNumber,
      account_name: accountDetails.accountName,
      account_type: accountDetails.accountType,
      phone_number: storedState.phoneNumber,
      is_primary: !(await mobileMoneyAccountsRepository.existsByOrganization(storedState.organizationId)),
      status: 'active',
      balance: accountDetails.balance,
      currency: 'ZMW',
      access_token: encryptToken(accessToken),
      refresh_token: encryptToken(refreshToken),
      token_expires_at: new Date(Date.now() + expiresIn * 1000)
    })
  }
  
  // Clean up state
  await oauthStateStore.delete(state)
  
  // Queue initial transaction import
  await transactionSyncQueue.add('initialSync', {
    accountId: account.id,
    organizationId: storedState.organizationId,
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
    endDate: new Date()
  })
  
  return {
    success: true,
    accountId: account.id,
    accountName: account.account_name,
    phoneNumber: account.phone_number,
    balance: account.balance
  }
```

**Token Refresh Process**
```
function refreshAirtelToken(accountId):
  // Get account with refresh token
  account = await mobileMoneyAccountsRepository.findById(accountId)
  if (!account) throw new NotFoundError("Account not found")
  
  // Check if refresh needed
  if (account.token_expires_at > new Date(Date.now() + 5 * 60 * 1000)) {
    // Token still valid for more than 5 minutes
    return {
      accessToken: decryptToken(account.access_token),
      expiresAt: account.token_expires_at
    }
  }
  
  try {
    // Exchange refresh token for new access token
    tokenResponse = await axios.post(AIRTEL_TOKEN_URL, {
      grant_type: 'refresh_token',
      refresh_token: decryptToken(account.refresh_token),
      client_id: AIRTEL_CLIENT_ID,
      client_secret: AIRTEL_CLIENT_SECRET
    })
    
    // Extract new tokens
    accessToken = tokenResponse.data.access_token
    refreshToken = tokenResponse.data.refresh_token || decryptToken(account.refresh_token)
    expiresIn = tokenResponse.data.expires_in
    
    // Update account in database
    await mobileMoneyAccountsRepository.update(account.id, {
      access_token: encryptToken(accessToken),
      refresh_token: encryptToken(refreshToken),
      token_expires_at: new Date(Date.now() + expiresIn * 1000),
      status: 'active',
      error_message: null
    })
    
    return {
      accessToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    }
  } catch (error) {
    // Handle token refresh failure
    await mobileMoneyAccountsRepository.update(account.id, {
      status: 'error',
      error_message: `Token refresh failed: ${error.message}`
    })
    
    throw new UnauthorizedError("Failed to refresh access token, reconnection required")
  }
```

**Transaction Synchronization Process**
```
async function syncTransactions(accountId, startDate, endDate, isInitialSync = false):
  // Get account details
  account = await mobileMoneyAccountsRepository.findById(accountId)
  if (!account) throw new NotFoundError("Account not found")
  
  // Create sync job record
  syncJob = await syncJobsRepository.create({
    organization_id: account.organization_id,
    account_id: accountId,
    status: 'in_progress',
    start_date: startDate,
    end_date: endDate
  })
  
  try {
    // Get fresh access token
    tokenData = await refreshAirtelToken(accountId)
    accessToken = tokenData.accessToken
    
    // Initialize pagination variables
    let page = 1
    let hasMorePages = true
    let totalTransactions = 0
    
    // Process transactions in pages
    while (hasMorePages) {
      // Fetch transactions from Airtel API
      transactionsResponse = await axios.get(AIRTEL_TRANSACTIONS_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          page,
          limit: 100
        }
      })
      
      transactions = transactionsResponse.data.transactions
      hasMorePages = transactionsResponse.data.hasMore
      
      // Process each transaction
      for (const transaction of transactions) {
        // Check for duplicates
        existingTransaction = await transactionsRepository.findByExternalId(
          account.organization_id,
          transaction.id
        )
        
        if (!existingTransaction) {
          // Create new transaction record
          await transactionsRepository.create({
            organization_id: account.organization_id,
            account_id: accountId,
            external_id: transaction.id,
            reference: transaction.reference,
            transaction_date: new Date(transaction.timestamp),
            amount: transaction.amount,
            currency: transaction.currency || 'ZMW',
            type: mapTransactionType(transaction.type),
            counterparty_name: transaction.counterparty?.name,
            counterparty_number: transaction.counterparty?.phoneNumber,
            description: transaction.description,
            balance_after: transaction.balanceAfter,
            status: mapTransactionStatus(transaction.status),
            fees: transaction.fees || 0,
            metadata: {
              raw: transaction
            }
          })
          
          totalTransactions++
          
          // Auto-categorize transaction if possible
          await autoCategorizeTransaction(
            account.organization_id,
            transaction.id,
            transaction.description,
            transaction.counterparty?.name,
            mapTransactionType(transaction.type)
          )
        }
      }
      
      page++
    }
    
    // Update account balance
    balanceResponse = await axios.get(AIRTEL_BALANCE_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    await mobileMoneyAccountsRepository.update(accountId, {
      balance: balanceResponse.data.balance,
      last_sync_at: new Date()
    })
    
    // Update sync job status
    await syncJobsRepository.update(syncJob.id, {
      status: 'completed',
      transactions_count: totalTransactions
    })
    
    // Send notification if not initial sync and new transactions found
    if (!isInitialSync && totalTransactions > 0) {
      await notificationService.sendTransactionSyncNotification(
        account.organization_id,
        accountId,
        totalTransactions
      )
    }
    
    return {
      success: true,
      transactionsCount: totalTransactions,
      syncJobId: syncJob.id
    }
  } catch (error) {
    // Update sync job with error
    await syncJobsRepository.update(syncJob.id, {
      status: 'failed',
      error_message: error.message
    })
    
    // Update account status if API error
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      await mobileMoneyAccountsRepository.update(accountId, {
        status: 'error',
        error_message: `API authentication failed: ${error.message}`
      })
    }
    
    throw error
  }
```

**Auto-Categorization Process**
```
async function autoCategorizeTransaction(organizationId, transactionId, description, counterpartyName, type):
  // Get transaction
  transaction = await transactionsRepository.findById(transactionId)
  if (!transaction) return false
  
  // Skip if already categorized
  if (transaction.category_id) return false
  
  // Get organization's categorization rules and history
  rules = await categorizationRulesRepository.findByOrganization(organizationId)
  
  // Check for exact matches in rules
  for (const rule of rules) {
    if (
      (rule.pattern_type === 'description' && description.includes(rule.pattern)) ||
      (rule.pattern_type === 'counterparty' && counterpartyName && counterpartyName.includes(rule.pattern))
    ) {
      await transactionsRepository.update(transactionId, {
        category_id: rule.category_id
      })
      return true
    }
  }
  
  // Check transaction history for similar transactions
  similarTransactions = await transactionsRepository.findSimilar(
    organizationId,
    description,
    counterpartyName,
    type
  )
  
  if (similarTransactions.length > 0 && similarTransactions[0].category_id) {
    // Use most common category from similar transactions
    await transactionsRepository.update(transactionId, {
      category_id: similarTransactions[0].category_id
    })
    return true
  }
  
  // Use default category based on transaction type
  defaultCategory = await categoriesRepository.findDefaultByType(
    organizationId,
    type === 'deposit' || type === 'transfer_in' ? 'income' : 'expense'
  )
  
  if (defaultCategory) {
    await transactionsRepository.update(transactionId, {
      category_id: defaultCategory.id
    })
    return true
  }
  
  return false
```

#### API Endpoints

**Mobile Money Account Endpoints**

1. **Connect Airtel Money Account**
   - `POST /api/mobile-money/connect/airtel`
   - Auth: Required
   - Request:
     ```json
     {
       "phoneNumber": "+260971234567"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "authUrl": "https://airtel.auth.com/oauth?client_id=...&state=...",
       "state": "random-secure-state-token"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid phone number
     - 409 Conflict: Account already connected

2. **OAuth Callback**
   - `GET /api/mobile-money/callback?code={code}&state={state}`
   - Response (200 OK):
     ```json
     {
       "success": true,
       "accountId": "550e8400-e29b-41d4-a716-446655440000",
       "accountName": "John Doe",
       "phoneNumber": "+260971234567",
       "balance": 1500.75
     }
     ```
   - Error Responses:
     - 401 Unauthorized: Invalid state parameter or expired flow
     - 500 Internal Server Error: Failed to connect account

3. **Get Connected Accounts**
   - `GET /api/mobile-money/accounts`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "accounts": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440000",
           "provider": "Airtel",
           "accountNumber": "0971234567",
           "accountName": "John Doe",
           "phoneNumber": "+260971234567",
           "isPrimary": true,
           "status": "active",
           "balance": 1500.75,
           "currency": "ZMW",
           "lastSyncAt": "2023-01-01T12:00:00Z"
         }
       ]
     }
     ```

4. **Disconnect Account**
   - `POST /api/mobile-money/accounts/{id}/disconnect`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "success": true,
       "message": "Account disconnected successfully"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Account not found

5. **Set Primary Account**
   - `POST /api/mobile-money/accounts/{id}/set-primary`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "success": true,
       "message": "Primary account updated successfully"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Account not found

**Transaction Endpoints**

1. **Get Transactions**
   - `GET /api/transactions?accountId={accountId}&startDate={startDate}&endDate={endDate}&type={type}&category={categoryId}&reconciled={boolean}&page={page}&limit={limit}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "transactions": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440001",
           "accountId": "550e8400-e29b-41d4-a716-446655440000",
           "transactionDate": "2023-01-01T12:00:00Z",
           "amount": 500.00,
           "currency": "ZMW",
           "type": "payment",
           "counterpartyName": "ABC Store",
           "counterpartyNumber": "+260977654321",
           "description": "Payment for supplies",
           "status": "completed",
           "category": {
             "id": "550e8400-e29b-41d4-a716-446655440002",
             "name": "Office Supplies",
             "type": "expense",
             "color": "#FF5733"
           },
           "isReconciled": false
         }
       ],
       "pagination": {
         "total": 120,
         "page": 1,
         "limit": 20,
         "pages": 6
       }
     }
     ```

2. **Get Transaction Details**
   - `GET /api/transactions/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440001",
       "accountId": "550e8400-e29b-41d4-a716-446655440000",
       "account": {
         "provider": "Airtel",
         "accountName": "John Doe",
         "phoneNumber": "+260971234567"
       },
       "externalId": "airtel-tx-123456",
       "reference": "REF123456",
       "transactionDate": "2023-01-01T12:00:00Z",
       "amount": 500.00,
       "currency": "ZMW",
       "type": "payment",
       "counterpartyName": "ABC Store",
       "counterpartyNumber": "+260977654321",
       "description": "Payment for supplies",
       "balanceAfter": 1000.75,
       "status": "completed",
       "fees": 10.00,
       "category": {
         "id": "550e8400-e29b-41d4-a716-446655440002",
         "name": "Office Supplies",
         "type": "expense",
         "parentId": "550e8400-e29b-41d4-a716-446655440003",
         "parentName": "Operating Expenses"
       },
       "isReconciled": false,
       "invoice": null,
       "expense": null,
       "createdAt": "2023-01-01T12:05:00Z",
       "updatedAt": "2023-01-01T12:05:00Z"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Transaction not found

3. **Update Transaction Category**
   - `PATCH /api/transactions/{id}/category`
   - Auth: Required
   - Request:
     ```json
     {
       "categoryId": "550e8400-e29b-41d4-a716-446655440002"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "transaction": {
         "id": "550e8400-e29b-41d4-a716-446655440001",
         "category": {
           "id": "550e8400-e29b-41d4-a716-446655440002",
           "name": "Office Supplies",
           "type": "expense"
         }
       }
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid category ID
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Transaction or category not found

4. **Link Transaction to Invoice/Expense**
   - `PATCH /api/transactions/{id}/link`
   - Auth: Required
   - Request:
     ```json
     {
       "type": "invoice", // or "expense"
       "id": "550e8400-e29b-41d4-a716-446655440004"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "transaction": {
         "id": "550e8400-e29b-41d4-a716-446655440001",
         "isReconciled": true,
         "invoice": {
           "id": "550e8400-e29b-41d4-a716-446655440004",
           "number": "INV-2023-001",
           "amount": 500.00
         }
       }
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid link type or ID
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Transaction, invoice, or expense not found
     - 409 Conflict: Amount mismatch or already linked

5. **Batch Update Transactions**
   - `POST /api/transactions/batch-update`
   - Auth: Required
   - Request:
     ```json
     {
       "transactionIds": [
         "550e8400-e29b-41d4-a716-446655440001",
         "550e8400-e29b-41d4-a716-446655440005"
       ],
       "update": {
         "categoryId": "550e8400-e29b-41d4-a716-446655440002"
       }
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "updatedCount": 2
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid update data
     - 403 Forbidden: Insufficient permissions

**Synchronization Endpoints**

1. **Trigger Manual Sync**
   - `POST /api/mobile-money/accounts/{id}/sync`
   - Auth: Required
   - Request:
     ```json
     {
       "startDate": "2023-01-01T00:00:00Z",
       "endDate": "2023-01-31T23:59:59Z"
     }
     ```
   - Response (202 Accepted):
     ```json
     {
       "success": true,
       "syncJobId": "550e8400-e29b-41d4-a716-446655440006",
       "message": "Synchronization job started"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid date range
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Account not found
     - 429 Too Many Requests: Sync already in progress

2. **Get Sync Status**
   - `GET /api/mobile-money/sync-jobs/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440006",
       "accountId": "550e8400-e29b-41d4-a716-446655440000",
       "status": "completed", // or "pending", "in_progress", "failed"
       "startDate": "2023-01-01T00:00:00Z",
       "endDate": "2023-01-31T23:59:59Z",
       "transactionsCount": 45,
       "createdAt": "2023-02-01T10:00:00Z",
       "updatedAt": "2023-02-01T10:02:30Z",
       "errorMessage": null
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Sync job not found

3. **Get Recent Sync Jobs**
   - `GET /api/mobile-money/accounts/{id}/sync-jobs?page={page}&limit={limit}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "syncJobs": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440006",
           "status": "completed",
           "startDate": "2023-01-01T00:00:00Z",
           "endDate": "2023-01-31T23:59:59Z",
           "transactionsCount": 45,
           "createdAt": "2023-02-01T10:00:00Z",
           "errorMessage": null
         }
       ],
       "pagination": {
         "total": 5,
         "page": 1,
         "limit": 10,
         "pages": 1
       }
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Account not found

**Category Endpoints**

1. **Get Categories**
   - `GET /api/categories?type={type}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "categories": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440003",
           "name": "Operating Expenses",
           "type": "expense",
           "chartOfAccountsCode": "5000",
           "color": "#FF5733",
           "subcategories": [
             {
               "id": "550e8400-e29b-41d4-a716-446655440002",
               "name": "Office Supplies",
               "type": "expense",
               "chartOfAccountsCode": "5100",
               "color": "#FFC300"
             }
           ]
         }
       ]
     }
     ```

2. **Create Category**
   - `POST /api/categories`
   - Auth: Required
   - Request:
     ```json
     {
       "name": "Marketing",
       "type": "expense",
       "parentId": "550e8400-e29b-41d4-a716-446655440003",
       "chartOfAccountsCode": "5200",
       "color": "#C70039"
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440007",
       "name": "Marketing",
       "type": "expense",
       "parentId": "550e8400-e29b-41d4-a716-446655440003",
       "chartOfAccountsCode": "5200",
       "color": "#C70039"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 403 Forbidden: Insufficient permissions
     - 409 Conflict: Category name already exists

**Notification Settings Endpoints**

1. **Get Notification Settings**
   - `GET /api/notification-settings`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440008",
       "transactionAlerts": true,
       "minimumAmount": 100.00,
       "balanceAlerts": true,
       "lowBalanceThreshold": 500.00,
       "deliveryChannels": {
         "inApp": true,
         "email": true,
         "sms": false
       }
     }
     ```

2. **Update Notification Settings**
   - `PUT /api/notification-settings`
   - Auth: Required
   - Request:
     ```json
     {
       "transactionAlerts": true,
       "minimumAmount": 200.00,
       "balanceAlerts": true,
       "lowBalanceThreshold": 1000.00,
       "deliveryChannels": {
         "inApp": true,
         "email": true,
         "sms": false
       }
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "settings": {
         "id": "550e8400-e29b-41d4-a716-446655440008",
         "transactionAlerts": true,
         "minimumAmount": 200.00,
         "balanceAlerts": true,
         "lowBalanceThreshold": 1000.00,
         "deliveryChannels": {
           "inApp": true,
           "email": true,
           "sms": false
         }
       }
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 403 Forbidden: Insufficient permissions

#### Frontend Components

**Account Connection Components**

1. **ConnectAccountButton**
   - Button to initiate Airtel Money connection
   - Loading state during API call
   - Error handling with user-friendly messages
   - Opens modal with phone number input

2. **PhoneNumberInputModal**
   - Form for entering Airtel Money phone number
   - Phone number validation with Zambian format
   - Clear explanation of connection process
   - Terms and privacy policy acceptance checkbox
   - Connect button with loading state

3. **OAuthRedirectPage**
   - Handles OAuth callback parameters
   - Loading state during token exchange
   - Success/error message display
   - Automatic redirect to accounts page on success

4. **AccountsListView**
   - List of connected mobile money accounts
   - Account status indicators with appropriate colors
   - Balance display with currency
   - Last sync timestamp
   - Action buttons (sync, disconnect, set primary)
   - Empty state with connect button

**Transaction Management Components**

1. **TransactionsTable**
   - Sortable columns for date, amount, description
   - Filterable by date range, type, category, reconciliation status
   - Pagination controls
   - Bulk selection for batch operations
   - Row-level actions (categorize, link, view details)
   - Mobile-responsive design with appropriate data density

2. **TransactionDetailsSidebar**
   - Comprehensive transaction details
   - Category selector with search
   - Link to invoice/expense selector
   - Counterparty information
   - Transaction status badge
   - Metadata and history

3. **CategorySelector**
   - Hierarchical display of categories
   - Search functionality
   - Create new category option
   - Recently used categories section
   - Color indicators for each category

4. **ReconciliationTools**
   - Link transaction to invoice/expense
   - Search for matching documents by amount, date, counterparty
   - Mark as reconciled toggle
   - Split transaction functionality (optional for MVP)
   - Batch reconciliation for multiple transactions

5. **SyncControlPanel**
   - Manual sync trigger with date range selector
   - Sync status indicator
   - Sync history with success/failure indicators
   - Retry options for failed syncs
   - Scheduled sync configuration

**Notification Components**

1. **NotificationSettingsForm**
   - Toggle switches for different notification types
   - Threshold inputs for amount-based alerts
   - Delivery channel selection
   - Save button with success confirmation
   - Test notification button

2. **TransactionAlertBanner**
   - Real-time notification of new transactions
   - Collapsible details
   - Quick action buttons (view, categorize)
   - Dismissible with "don't show again" option

#### Background Jobs

1. **Scheduled Transaction Sync**
   - Bull/BullMQ job for regular synchronization
   - Configurable frequency (default: every 6 hours)
   - Smart date range calculation to avoid duplicate imports
   - Failure handling with exponential backoff
   - Monitoring and alerting for persistent failures

2. **Token Refresh Job**
   - Proactive refresh of OAuth tokens before expiration
   - Runs daily to check all connected accounts
   - Updates account status based on refresh success/failure
   - Notification for accounts requiring reconnection

3. **Balance Update Job**
   - Periodic balance checks for all active accounts
   - Configurable frequency (default: hourly)
   - Low balance detection and alerting
   - Balance history tracking for reporting

#### Security Considerations

1. **OAuth Security**
   - State parameter validation to prevent CSRF attacks
   - Short-lived authorization codes
   - Secure token storage with encryption
   - HTTPS for all API communications
   - Token refresh mechanism with proper error handling

2. **Credential Protection**
   - Encryption of access and refresh tokens in database
   - Azure Key Vault for encryption keys
   - No plain-text credentials in logs or error messages
   - Automatic token invalidation on suspicious activity

3. **Data Access Controls**
   - Organization-level isolation of transaction data
   - Role-based permissions for transaction management
   - Audit logging of all transaction modifications
   - API rate limiting to prevent abuse

4. **Mobile Money Provider Security**
   - Compliance with Airtel Money security requirements
   - Proper error handling for API failures
   - Secure webhook handling (if available)
   - Regular validation of API integration

#### Testing Strategy

1. **Unit Tests**
   - Token management functions
   - Transaction processing logic
   - Categorization algorithms
   - Data transformation utilities

2. **Integration Tests**
   - OAuth flow with mock Airtel API
   - Transaction synchronization process
   - Database operations for transaction storage
   - Background job execution

3. **End-to-End Tests**
   - Account connection flow
   - Transaction import and display
   - Categorization and reconciliation
   - Notification delivery

4. **Mock API Tests**
   - Simulated Airtel API responses
   - Error condition handling
   - Rate limit handling
   - Token expiration and refresh

#### Error Handling

1. **API Integration Errors**
   - Graceful handling of Airtel API downtime
   - Clear user messaging for authentication failures
   - Automatic retry for transient errors
   - Fallback to cached data when appropriate
   - Detailed logging for troubleshooting

2. **Synchronization Errors**
   - Partial success handling for large imports
   - Transaction-level error tracking
   - Resumable sync after failures
   - Conflict resolution for duplicate transactions
   - User notifications for critical failures

3. **User Action Errors**
   - Validation feedback for invalid inputs
   - Concurrency handling for simultaneous updates
   - Undo functionality for categorization mistakes
   - Clear error messages with recovery suggestions

#### Logging and Monitoring

1. **Integration Health Monitoring**
   - API response times and success rates
   - Token refresh success/failure rates
   - Sync job completion rates
   - Error frequency by type

2. **Transaction Monitoring**
   - Volume of transactions processed
   - Categorization success rates
   - Reconciliation rates
   - Unusual transaction patterns

3. **User Activity Logging**
   - Account connection/disconnection events
   - Manual sync triggers
   - Categorization changes
   - Reconciliation actions

### Key Edge Cases

1. **Account Connection**
   - User abandons OAuth flow midway
   - Airtel API returns unexpected errors during connection
   - User attempts to connect same account multiple times
   - Connection expires or is revoked by Airtel

2. **Transaction Synchronization**
   - Very large transaction history (thousands of transactions)
   - Duplicate transaction IDs from provider
   - Transactions with missing or inconsistent data
   - Airtel API rate limits or throttling
   - Sync interrupted by system restart or crash

3. **Transaction Management**
   - Transactions in foreign currencies
   - Negative amount transactions (reversals)
   - Transactions with special characters in descriptions
   - Very old transactions beyond normal import range
   - Transactions modified on Airtel side after import

4. **Categorization**
   - Ambiguous transactions that could fit multiple categories
   - New transaction patterns not seen before
   - Category restructuring affecting existing transactions
   - Batch categorization conflicts
   - System vs. user categorization conflicts

5. **Multi-Account Management**
   - User with multiple Airtel accounts
   - Mixed provider accounts (future feature)
   - Primary account disconnection
   - Transfers between connected accounts
```
