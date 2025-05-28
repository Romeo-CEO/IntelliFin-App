```markdown
## Feature 4: Expense Management

### Goal
Implement a digital expense recording system that categorizes business expenses according to the Zambian Chart of Accounts, enables receipt attachment and storage, and provides the foundation for financial reporting and tax compliance.

### API Relationships
- Interacts with Category Service for expense categorization
- Communicates with Storage Service for receipt attachment
- Connects with Transaction Service for expense reconciliation
- Integrates with Reporting Service for financial statements
- Utilizes Image Optimization Service for receipt processing

### Detailed Requirements

#### Expense Recording Requirements
1. **Expense Entry**
   - Date, amount, and category capture
   - Vendor/payee information
   - Payment method tracking
   - Description and notes fields
   - Project or department allocation (optional)
   - Tax deductibility status
   - Recurring expense support

2. **Categorization System**
   - Alignment with Zambian Chart of Accounts
   - Hierarchical category structure
   - Custom category creation
   - Default categories for common expenses
   - Category mapping to tax reporting codes
   - Bulk categorization capabilities

3. **Receipt Management**
   - Digital receipt capture via camera or file upload
   - OCR for automatic data extraction
   - Receipt storage with secure access
   - Receipt-to-expense matching
   - Multiple receipts per expense
   - Receipt quality validation

#### Expense Workflow Requirements
1. **Approval Process (Optional for MVP)**
   - Configurable approval thresholds
   - Multi-level approval workflows
   - Approval notifications
   - Approval history tracking
   - Delegation of approval authority
   - Bulk approval capabilities

2. **Expense Policies**
   - Spending limit enforcement
   - Category-specific rules
   - Duplicate detection
   - Policy violation flagging
   - Override mechanisms with justification
   - Audit trail for policy exceptions

#### Reporting Requirements
1. **Expense Reports**
   - Filtering by date range, category, payment method
   - Grouping by category, vendor, project
   - Summarization with subtotals and totals
   - Trend analysis over time
   - Export to PDF and Excel
   - Scheduled report generation

2. **Tax Compliance**
   - VAT tracking and reporting
   - Tax-deductible expense identification
   - Supporting documentation for audits
   - Statutory report generation
   - Compliance with Zambian tax regulations
   - Historical record maintenance

### Implementation Guide

#### Database Schema

**Expenses Table**
```
Table expenses {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  category_id UUID [ref: > categories.id, not null]
  transaction_id UUID [ref: > transactions.id]
  vendor VARCHAR(255)
  date DATE [not null]
  amount DECIMAL(15,2) [not null]
  currency VARCHAR(3) [default: 'ZMW']
  description TEXT
  payment_method VARCHAR(50) [not null] // 'cash', 'mobile_money', 'bank_transfer', 'credit_card', 'check'
  reference VARCHAR(100)
  is_recurring BOOLEAN [default: false]
  recurrence_pattern VARCHAR(50) // 'daily', 'weekly', 'monthly', 'quarterly', 'annually'
  is_tax_deductible BOOLEAN [default: true]
  status VARCHAR(20) [not null] // 'draft', 'pending_approval', 'approved', 'rejected'
  created_by UUID [ref: > users.id, not null]
  approved_by UUID [ref: > users.id]
  approved_at TIMESTAMP
  notes TEXT
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    category_id
    transaction_id
    date
    status
    created_by
  }
}
```

**Receipts Table**
```
Table receipts {
  id UUID [pk]
  expense_id UUID [ref: > expenses.id, not null]
  file_name VARCHAR(255) [not null]
  file_type VARCHAR(50) [not null]
  file_size INTEGER [not null]
  storage_path VARCHAR(255) [not null]
  thumbnail_path VARCHAR(255)
  ocr_text TEXT
  ocr_data JSONB
  ocr_status VARCHAR(20) // 'pending', 'completed', 'failed'
  created_at TIMESTAMP [default: `now()`]
  
  indexes {
    expense_id
  }
}
```

**Expense Approvals Table**
```
Table expense_approvals {
  id UUID [pk]
  expense_id UUID [ref: > expenses.id, not null]
  approver_id UUID [ref: > users.id, not null]
  status VARCHAR(20) [not null] // 'pending', 'approved', 'rejected'
  comments TEXT
  action_date TIMESTAMP [default: `now()`]
  
  indexes {
    expense_id
    approver_id
    status
  }
}
```

**Expense Policies Table**
```
Table expense_policies {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  name VARCHAR(100) [not null]
  description TEXT
  category_id UUID [ref: > categories.id]
  amount_limit DECIMAL(15,2)
  requires_approval BOOLEAN [default: false]
  requires_receipt BOOLEAN [default: true]
  active BOOLEAN [default: true]
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    category_id
  }
}
```

**Expense Tags Table**
```
Table expense_tags {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  name VARCHAR(50) [not null]
  color VARCHAR(7)
  created_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    (organization_id, name) [unique]
  }
}
```

**Expense Tag Assignments Table**
```
Table expense_tag_assignments {
  id UUID [pk]
  expense_id UUID [ref: > expenses.id, not null]
  tag_id UUID [ref: > expense_tags.id, not null]
  created_at TIMESTAMP [default: `now()`]
  
  indexes {
    expense_id
    tag_id
    (expense_id, tag_id) [unique]
  }
}
```

#### Expense Creation Flow

**Expense Creation Process**
```
function createExpense(organizationId, userId, expenseData):
  // Validate input
  if (!expenseData.amount) throw new ValidationError("Amount is required")
  if (!expenseData.date) throw new ValidationError("Date is required")
  if (!expenseData.categoryId) throw new ValidationError("Category is required")
  if (!expenseData.paymentMethod) throw new ValidationError("Payment method is required")
  
  // Check category exists
  category = await categoriesRepository.findById(expenseData.categoryId)
  if (!category) throw new NotFoundError("Category not found")
  
  // Check for expense policy
  policies = await expensePoliciesRepository.findByOrganizationAndCategory(
    organizationId,
    expenseData.categoryId
  )
  
  let requiresApproval = false
  let requiresReceipt = true
  let policyViolations = []
  
  // Apply policy rules
  for (const policy of policies) {
    if (policy.amount_limit && expenseData.amount > policy.amount_limit) {
      policyViolations.push(`Amount exceeds limit of ${formatCurrency(policy.amount_limit)}`)
    }
    
    if (policy.requires_approval) {
      requiresApproval = true
    }
    
    if (policy.requires_receipt) {
      requiresReceipt = true
    }
  }
  
  // Determine initial status
  let status = 'draft'
  if (expenseData.status === 'pending_approval' || requiresApproval) {
    status = 'pending_approval'
  } else if (expenseData.status === 'approved' && !requiresApproval) {
    status = 'approved'
  }
  
  // Start transaction
  return await db.transaction(async (tx) => {
    // Create expense
    expense = await expensesRepository.create({
      organization_id: organizationId,
      category_id: expenseData.categoryId,
      transaction_id: expenseData.transactionId,
      vendor: expenseData.vendor,
      date: expenseData.date,
      amount: expenseData.amount,
      currency: expenseData.currency || 'ZMW',
      description: expenseData.description,
      payment_method: expenseData.paymentMethod,
      reference: expenseData.reference,
      is_recurring: expenseData.isRecurring || false,
      recurrence_pattern: expenseData.recurrencePattern,
      is_tax_deductible: expenseData.isTaxDeductible !== undefined ? expenseData.isTaxDeductible : true,
      status,
      created_by: userId,
      notes: expenseData.notes
    }, tx)
    
    // Create approval record if needed
    if (status === 'pending_approval') {
      // Find approvers based on organization settings
      approvers = await getExpenseApprovers(organizationId, expenseData.amount, expenseData.categoryId)
      
      for (const approverId of approvers) {
        await expenseApprovalsRepository.create({
          expense_id: expense.id,
          approver_id: approverId,
          status: 'pending'
        }, tx)
      }
      
      // Send notification to approvers
      await notificationService.notifyExpenseApproval(
        expense.id,
        approvers,
        userId,
        expenseData.amount,
        expenseData.description
      )
    }
    
    // Process receipt if provided
    if (expenseData.receipt) {
      const receiptData = await processReceipt(expense.id, expenseData.receipt)
      
      // If OCR data available, update expense with extracted data
      if (receiptData.ocrData && Object.keys(receiptData.ocrData).length > 0) {
        const updates = {}
        
        if (receiptData.ocrData.vendor && !expenseData.vendor) {
          updates.vendor = receiptData.ocrData.vendor
        }
        
        if (receiptData.ocrData.amount && !expenseData.amount) {
          updates.amount = receiptData.ocrData.amount
        }
        
        if (receiptData.ocrData.date && !expenseData.date) {
          updates.date = receiptData.ocrData.date
        }
        
        if (Object.keys(updates).length > 0) {
          await expensesRepository.update(expense.id, updates, tx)
        }
      }
    } else if (requiresReceipt) {
      // Flag expense as needing receipt
      await expensesRepository.update(expense.id, {
        notes: (expense.notes ? expense.notes + '\n' : '') + 'Receipt required by policy'
      }, tx)
    }
    
    // Add tags if provided
    if (expenseData.tags && expenseData.tags.length > 0) {
      for (const tagId of expenseData.tags) {
        await expenseTagAssignmentsRepository.create({
          expense_id: expense.id,
          tag_id: tagId
        }, tx)
      }
    }
    
    // If linked to transaction, update transaction
    if (expenseData.transactionId) {
      await transactionsRepository.update(expenseData.transactionId, {
        is_reconciled: true,
        expense_id: expense.id
      })
    }
    
    // Create audit log
    await auditLogService.logActivity(
      organizationId,
      userId,
      'create',
      'expense',
      expense.id,
      null,
      {
        category_id: expenseData.categoryId,
        amount: expenseData.amount,
        date: expenseData.date,
        status
      }
    )
    
    return {
      id: expense.id,
      categoryId: expense.category_id,
      date: expense.date,
      amount: expense.amount,
      status: expense.status,
      policyViolations,
      requiresReceipt: requiresReceipt && !expenseData.receipt
    }
  })
```

**Receipt Processing**
```
async function processReceipt(expenseId, receiptData):
  // Validate input
  if (!receiptData.content) throw new ValidationError("Receipt content is required")
  
  // Determine file type and generate filename
  const fileType = receiptData.fileType || detectFileType(receiptData.content)
  const fileName = `receipt_${Date.now()}.${getFileExtension(fileType)}`
  
  // Generate storage path
  const expense = await expensesRepository.findById(expenseId)
  const storagePath = `organizations/${expense.organization_id}/expenses/${expenseId}/receipts/${fileName}`
  
  // Process image if it's a photo
  let processedContent = receiptData.content
  let thumbnailPath = null
  
  if (isImageType(fileType)) {
    // Optimize image
    processedContent = await imageService.optimizeImage(receiptData.content, {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 85
    })
    
    // Generate thumbnail
    const thumbnail = await imageService.generateThumbnail(receiptData.content, {
      width: 200,
      height: 200
    })
    
    thumbnailPath = `organizations/${expense.organization_id}/expenses/${expenseId}/receipts/thumbnails/${fileName}`
    await storageService.uploadFile(thumbnailPath, thumbnail, fileType)
  }
  
  // Upload to storage
  await storageService.uploadFile(storagePath, processedContent, fileType)
  
  // Create receipt record
  const receipt = await receiptsRepository.create({
    expense_id: expenseId,
    file_name: fileName,
    file_type: fileType,
    file_size: processedContent.length,
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    ocr_status: 'pending'
  })
  
  // Queue OCR processing
  await ocrQueue.add('processReceipt', {
    receiptId: receipt.id,
    expenseId
  })
  
  return {
    id: receipt.id,
    fileName,
    fileType,
    fileSize: processedContent.length,
    thumbnailPath
  }
```

**OCR Processing Job**
```
async function processReceiptOCR(receiptId):
  // Get receipt
  receipt = await receiptsRepository.findById(receiptId)
  if (!receipt) throw new NotFoundError("Receipt not found")
  
  try {
    // Download file from storage
    const fileContent = await storageService.downloadFile(receipt.storage_path)
    
    // Process with OCR
    const ocrResult = await ocrService.processReceipt(fileContent, receipt.file_type)
    
    // Extract structured data
    const extractedData = {
      vendor: ocrResult.vendor,
      date: ocrResult.date,
      amount: ocrResult.total,
      items: ocrResult.lineItems,
      taxAmount: ocrResult.tax
    }
    
    // Update receipt with OCR results
    await receiptsRepository.update(receiptId, {
      ocr_text: ocrResult.text,
      ocr_data: extractedData,
      ocr_status: 'completed'
    })
    
    return {
      success: true,
      extractedData
    }
  } catch (error) {
    // Update receipt with error
    await receiptsRepository.update(receiptId, {
      ocr_status: 'failed'
    })
    
    throw error
  }
```

**Expense Approval Process**
```
async function approveExpense(expenseId, approverId, decision, comments):
  // Validate input
  if (!['approved', 'rejected'].includes(decision)) 
    throw new ValidationError("Decision must be 'approved' or 'rejected'")
  
  // Get expense
  expense = await expensesRepository.findById(expenseId)
  if (!expense) throw new NotFoundError("Expense not found")
  
  // Check if user is an approver
  approval = await expenseApprovalsRepository.findByExpenseAndApprover(expenseId, approverId)
  if (!approval) throw new ForbiddenError("User is not an approver for this expense")
  
  // Check if already processed
  if (approval.status !== 'pending') 
    throw new ConflictError(`Approval already ${approval.status}`)
  
  // Start transaction
  return await db.transaction(async (tx) => {
    // Update approval record
    await expenseApprovalsRepository.update(approval.id, {
      status: decision,
      comments,
      action_date: new Date()
    }, tx)
    
    // Check if all approvals are complete
    const approvals = await expenseApprovalsRepository.findByExpenseId(expenseId)
    const allApproved = approvals.every(a => a.status === 'approved')
    const anyRejected = approvals.some(a => a.status === 'rejected')
    
    // Update expense status if all approvals complete
    if (allApproved) {
      await expensesRepository.update(expenseId, {
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date()
      }, tx)
    } else if (anyRejected) {
      await expensesRepository.update(expenseId, {
        status: 'rejected'
      }, tx)
    }
    
    // Create audit log
    await auditLogService.logActivity(
      expense.organization_id,
      approverId,
      decision === 'approved' ? 'approve' : 'reject',
      'expense',
      expenseId,
      null,
      {
        comments
      }
    )
    
    // Notify expense creator
    await notificationService.notifyExpenseDecision(
      expenseId,
      expense.created_by,
      approverId,
      decision,
      comments
    )
    
    return {
      success: true,
      status: decision,
      expenseStatus: allApproved ? 'approved' : (anyRejected ? 'rejected' : 'pending_approval')
    }
  })
```

#### API Endpoints

**Expense Endpoints**

1. **Create Expense**
   - `POST /api/expenses`
   - Auth: Required
   - Request:
     ```json
     {
       "categoryId": "550e8400-e29b-41d4-a716-446655440000",
       "transactionId": "550e8400-e29b-41d4-a716-446655440001",
       "vendor": "Office Supplies Ltd",
       "date": "2023-01-15",
       "amount": 500.00,
       "currency": "ZMW",
       "description": "Office stationery purchase",
       "paymentMethod": "mobile_money",
       "reference": "RECEIPT-12345",
       "isRecurring": false,
       "isTaxDeductible": true,
       "status": "draft",
       "notes": "Monthly supply order",
       "tags": ["550e8400-e29b-41d4-a716-446655440002"],
       "receipt": {
         "content": "base64-encoded-file-content",
         "fileType": "image/jpeg"
       }
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440003",
       "categoryId": "550e8400-e29b-41d4-a716-446655440000",
       "date": "2023-01-15",
       "amount": 500.00,
       "status": "draft",
       "policyViolations": [],
       "requiresReceipt": false
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 404 Not Found: Category not found

2. **Get Expenses**
   - `GET /api/expenses?categoryId={categoryId}&startDate={startDate}&endDate={endDate}&status={status}&page={page}&limit={limit}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "expenses": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440003",
           "date": "2023-01-15",
           "vendor": "Office Supplies Ltd",
           "category": {
             "id": "550e8400-e29b-41d4-a716-446655440000",
             "name": "Office Supplies"
           },
           "amount": 500.00,
           "currency": "ZMW",
           "status": "draft",
           "hasReceipt": true
         }
       ],
       "pagination": {
         "total": 50,
         "page": 1,
         "limit": 20,
         "pages": 3
       },
       "summary": {
         "totalExpenses": 50,
         "totalAmount": 25000.00
       }
     }
     ```

3. **Get Expense Details**
   - `GET /api/expenses/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440003",
       "category": {
         "id": "550e8400-e29b-41d4-a716-446655440000",
         "name": "Office Supplies"
       },
       "transaction": {
         "id": "550e8400-e29b-41d4-a716-446655440001",
         "date": "2023-01-15",
         "amount": 500.00
       },
       "vendor": "Office Supplies Ltd",
       "date": "2023-01-15",
       "amount": 500.00,
       "currency": "ZMW",
       "description": "Office stationery purchase",
       "paymentMethod": "mobile_money",
       "reference": "RECEIPT-12345",
       "isRecurring": false,
       "recurrencePattern": null,
       "isTaxDeductible": true,
       "status": "draft",
       "notes": "Monthly supply order",
       "createdBy": {
         "id": "550e8400-e29b-41d4-a716-446655440004",
         "name": "John Doe"
       },
       "approvedBy": null,
       "approvedAt": null,
       "receipts": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440005",
           "fileName": "receipt_1673784000000.jpg",
           "fileType": "image/jpeg",
           "fileSize": 256000,
           "thumbnailUrl": "https://storage.azure.com/...",
           "downloadUrl": "https://storage.azure.com/...",
           "ocrStatus": "completed"
         }
       ],
       "tags": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440002",
           "name": "Monthly",
           "color": "#FF5733"
         }
       ],
       "approvals": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440006",
           "approverId": "550e8400-e29b-41d4-a716-446655440007",
           "approverName": "Jane Smith",
           "status": "pending",
           "comments": null,
           "actionDate": null
         }
       ],
       "createdAt": "2023-01-15T12:00:00Z",
       "updatedAt": "2023-01-15T12:00:00Z"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Expense not found

4. **Update Expense**
   - `PUT /api/expenses/{id}`
   - Auth: Required
   - Request:
     ```json
     {
       "categoryId": "550e8400-e29b-41d4-a716-446655440008",
       "vendor": "Office Supplies Ltd - Updated",
       "date": "2023-01-16",
       "amount": 550.00,
       "description": "Updated description",
       "isTaxDeductible": false,
       "notes": "Updated notes"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440003",
       "categoryId": "550e8400-e29b-41d4-a716-446655440008",
       "vendor": "Office Supplies Ltd - Updated",
       "date": "2023-01-16",
       "amount": 550.00,
       "description": "Updated description",
       "isTaxDeductible": false,
       "notes": "Updated notes",
       "status": "draft",
       "updatedAt": "2023-01-16T10:00:00Z"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 403 Forbidden: Cannot update approved expense
     - 404 Not Found: Expense not found

5. **Delete Expense**
   - `DELETE /api/expenses/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "success": true,
       "message": "Expense deleted successfully"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Cannot delete approved expense
     - 404 Not Found: Expense not found

**Receipt Endpoints**

1. **Upload Receipt**
   - `POST /api/expenses/{id}/receipts`
   - Auth: Required
   - Request:
     ```json
     {
       "content": "base64-encoded-file-content",
       "fileType": "image/jpeg"
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440005",
       "fileName": "receipt_1673784000000.jpg",
       "fileType": "image/jpeg",
       "fileSize": 256000,
       "thumbnailUrl": "https://storage.azure.com/...",
       "downloadUrl": "https://storage.azure.com/..."
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid file
     - 404 Not Found: Expense not found

2. **Get Receipt OCR Data**
   - `GET /api/receipts/{id}/ocr`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440005",
       "ocrStatus": "completed",
       "ocrData": {
         "vendor": "Office Supplies Ltd",
         "date": "2023-01-15",
         "amount": 500.00,
         "taxAmount": 80.00,
         "items": [
           {
             "description": "Printer Paper A4",
             "quantity": 5,
             "unitPrice": 50.00,
             "amount": 250.00
           },
           {
             "description": "Ink Cartridges",
             "quantity": 2,
             "unitPrice": 125.00,
             "amount": 250.00
           }
         ]
       },
       "ocrText": "Office Supplies Ltd\n123 Main St\nLusaka, Zambia\n..."
     }
     ```
   - Error Responses:
     - 404 Not Found: Receipt not found
     - 409 Conflict: OCR processing not complete

**Approval Endpoints**

1. **Approve or Reject Expense**
   - `POST /api/expenses/{id}/approve`
   - Auth: Required
   - Request:
     ```json
     {
       "decision": "approved", // or "rejected"
       "comments": "Approved as per policy"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "status": "approved",
       "expenseStatus": "approved"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid decision
     - 403 Forbidden: User not an approver
     - 404 Not Found: Expense not found
     - 409 Conflict: Already approved/rejected

2. **Get Pending Approvals**
   - `GET /api/expenses/pending-approval`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "pendingApprovals": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440006",
           "expense": {
             "id": "550e8400-e29b-41d4-a716-446655440003",
             "date": "2023-01-15",
             "vendor": "Office Supplies Ltd",
             "amount": 500.00,
             "description": "Office stationery purchase"
           },
           "submitter": {
             "id": "550e8400-e29b-41d4-a716-446655440004",
             "name": "John Doe"
           },
           "submittedAt": "2023-01-15T12:00:00Z"
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

**Tag Endpoints**

1. **Create Tag**
   - `POST /api/expense-tags`
   - Auth: Required
   - Request:
     ```json
     {
       "name": "Monthly",
       "color": "#FF5733"
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440002",
       "name": "Monthly",
       "color": "#FF5733"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 409 Conflict: Tag name already exists

2. **Get Tags**
   - `GET /api/expense-tags`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "tags": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440002",
           "name": "Monthly",
           "color": "#FF5733"
         }
       ]
     }
     ```

**Reporting Endpoints**

1. **Get Expense Report**
   - `GET /api/reports/expenses?startDate={startDate}&endDate={endDate}&groupBy={category|vendor|month}&format={json|csv|pdf}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "reportData": {
         "startDate": "2023-01-01",
         "endDate": "2023-01-31",
         "groupBy": "category",
         "totalAmount": 25000.00,
         "groups": [
           {
             "name": "Office Supplies",
             "amount": 5000.00,
             "percentage": 20,
             "count": 10
           },
           {
             "name": "Utilities",
             "amount": 8000.00,
             "percentage": 32,
             "count": 5
           },
           {
             "name": "Travel",
             "amount": 12000.00,
             "percentage": 48,
             "count": 8
           }
         ]
       },
       "downloadUrl": "https://storage.azure.com/..." // Only for CSV/PDF formats
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid parameters

#### Frontend Components

**Expense Management Components**

1. **ExpensesList**
   - Filterable by date range, category, status
   - Sortable columns for date, amount, vendor
   - Status indicators with color coding
   - Receipt indicators
   - Quick action buttons (view, edit, delete)
   - Bulk selection for batch operations
   - Summary statistics (total, by category)

2. **ExpenseForm**
   - Date picker with calendar visualization
   - Amount input with currency selection
   - Category selector with hierarchical display
   - Vendor input with autocomplete from history
   - Payment method selection
   - Tax deductibility toggle
   - Notes field with character counter
   - Tag selection with color indicators
   - Transaction linking option

3. **ReceiptUploader**
   - Drag-and-drop file upload area
   - Camera access on mobile devices
   - File size and type validation
   - Upload progress indicator
   - Preview of uploaded receipt
   - OCR processing status indicator
   - Multiple receipt support

4. **ReceiptViewer**
   - Image display with zoom and rotate controls
   - PDF viewer for document receipts
   - OCR text overlay option
   - Download button
   - Delete option with confirmation
   - Navigation between multiple receipts

5. **ExpenseDetail**
   - Comprehensive expense information display
   - Receipt thumbnails with viewer
   - Approval status and history
   - Transaction link details
   - Audit trail of modifications
   - Action buttons based on current status
   - Related expenses suggestion

6. **ApprovalWorkflow**
   - List of pending approvals
   - Expense details summary
   - Receipt viewer
   - Approve/Reject buttons
   - Comments field
   - History of previous approvals
   - Policy violation indicators

7. **ExpenseReporting**
   - Date range selector
   - Grouping options (category, vendor, date)
   - Chart visualization of expense distribution
   - Tabular data with sorting and filtering
   - Export options (PDF, CSV, Excel)
   - Saved report templates
   - Scheduled report configuration

#### Background Jobs

1. **Receipt OCR Processing**
   - Processes uploaded receipts with OCR
   - Extracts vendor, date, amount, and line items
   - Updates receipt record with extracted data
   - Suggests updates to expense based on OCR data
   - Handles errors with appropriate logging

2. **Recurring Expense Creation**
   - Creates new expenses based on recurring patterns
   - Applies appropriate dates and amounts
   - Links to original recurring expense
   - Notifies users of created recurring expenses
   - Handles exceptions with appropriate logging

3. **Expense Report Generation**
   - Generates scheduled expense reports
   - Creates PDF/CSV/Excel files based on templates
   - Stores reports in Azure Blob Storage
   - Sends email notifications with report links
   - Handles large datasets with pagination and batching

#### Security Considerations

1. **Receipt Storage Security**
   - Secure storage of receipt images and documents
   - Encryption of sensitive receipt data
   - Access control based on organization and user roles
   - Secure URLs with expiration for downloads
   - Virus scanning for uploaded files

2. **Approval Security**
   - Role-based approval permissions
   - Segregation of duties (submitter cannot approve)
   - Audit logging of all approval actions
   - Prevention of approval tampering
   - Notification of suspicious approval patterns

3. **Data Access Controls**
   - Organization-level isolation of expense data
   - Role-based permissions for expense operations
   - Field-level security for sensitive information
   - Audit logging of all expense modifications
   - API rate limiting to prevent abuse

#### Testing Strategy

1. **Unit Tests**
   - Expense calculation functions
   - Policy validation logic
   - Approval workflow rules
   - Receipt processing utilities
   - OCR data extraction

2. **Integration Tests**
   - Expense creation and update flows
   - Receipt upload and processing
   - Approval workflows
   - Reporting generation
   - Transaction linking

3. **End-to-End Tests**
   - Complete expense lifecycle (create → upload receipt → approve)
   - Mobile receipt capture workflow
   - Expense reporting workflow
   - Recurring expense creation
   - Batch operations

4. **Performance Tests**
   - Receipt upload and processing times
   - OCR processing throughput
   - Report generation with large datasets
   - Bulk expense operations

#### Error Handling

1. **Receipt Processing Errors**
   - File type validation errors
   - Size limit exceeded errors
   - OCR processing failures
   - Storage service unavailability
   - Corrupted image handling

2. **Approval Workflow Errors**
   - Missing approver handling
   - Concurrent approval conflicts
   - Approval timeout handling
   - Notification delivery failures
   - Policy rule evaluation errors

3. **Reporting Errors**
   - Large dataset handling
   - Timeout management for complex reports
   - Export format conversion errors
   - Storage quota exceeded handling
   - Scheduled report generation failures

#### Logging and Monitoring

1. **Expense Activity Monitoring**
   - Creation, modification, and deletion events
   - Approval workflow events
   - Policy violation events
   - Receipt processing events
   - Reporting generation events

2. **Performance Monitoring**
   - Receipt upload and processing times
   - OCR processing queue length
   - Report generation times
   - API endpoint response times
   - Background job execution times

3. **Error Rate Monitoring**
   - Receipt processing failure rate
   - OCR extraction accuracy
   - Approval workflow errors
   - Report generation failures
   - API error rates by endpoint

### Key Edge Cases

1. **Receipt Processing**
   - Very large receipt images
   - Poor quality or blurry images
   - Receipts in languages other than English
   - Receipts with unusual formats
   - Multiple receipts for single expense

2. **Expense Approval**
   - Approver is unavailable or on leave
   - Multiple approval levels with dependencies
   - Approval amount thresholds edge cases
   - Policy exceptions requiring override
   - Retroactive policy changes

3. **Expense Data**
   - Expenses in foreign currencies
   - Very old expenses being entered
   - Duplicate expense detection edge cases
   - Split expenses across multiple categories
   - Negative expenses (refunds/returns)

4. **Reporting**
   - Reporting across fiscal year boundaries
   - Currency conversion for multi-currency reports
   - Very large datasets causing timeout
   - Custom grouping and filtering edge cases
   - Tax reporting for specific Zambian requirements
```
