```markdown
## Feature 3: Invoice Management

### Goal
Implement a comprehensive invoice creation and management system that automates VAT calculations based on ZRA rules, enables professional invoice generation and delivery to customers, and ensures seamless submission to the ZRA Smart Invoice system for tax compliance.

### API Relationships
- Interacts with Customer Service for customer data management
- Communicates with ZRA Smart Invoice API for real-time or queued submission
- Connects with Email Service for invoice delivery
- Integrates with Transaction Service for payment reconciliation
- Utilizes PDF Generation Service for creating professional invoice documents
- Leverages Azure Blob Storage for invoice archiving

### Detailed Requirements

#### Invoice Creation Requirements
1. **Professional Invoice Generation**
   - Customizable invoice templates with business branding
   - Line item entry with product/service details
   - Automatic calculation of subtotals, VAT, and totals
   - Support for multiple VAT rates based on ZRA regulations
   - Discount application (percentage or fixed amount)
   - Tax-inclusive and tax-exclusive pricing options
   - Invoice numbering with customizable format and automatic sequencing
   - Due date calculation based on configurable payment terms

2. **Customer Management**
   - Customer database with contact information
   - Customer categorization and grouping
   - ZRA TIN capture for B2B invoices
   - Customer-specific payment terms and tax settings
   - Customer statement generation
   - Customer portal access for invoice viewing (optional for MVP)

3. **Product/Service Catalog**
   - Product and service database with descriptions
   - Price management with historical tracking
   - VAT category assignment per product/service
   - Unit of measure definitions
   - Product/service categorization
   - ZRA standard codes integration

#### Invoice Delivery Requirements
1. **PDF Generation**
   - Professional, branded PDF invoices
   - Digital signature support
   - QR code generation for payment or verification
   - Attachment of terms and conditions
   - Multiple language support (English primary, local languages optional)
   - Accessibility considerations for screen readers

2. **Email Delivery**
   - Customizable email templates
   - Attachment of PDF invoices
   - Tracking of email delivery status
   - Scheduled sending options
   - Reminder emails for unpaid invoices
   - Bulk sending capabilities

3. **Alternative Delivery Methods**
   - Download option for manual delivery
   - Print functionality with proper formatting
   - WhatsApp integration (optional for MVP)
   - SMS notification with payment link (optional for MVP)

#### ZRA Smart Invoice Integration Requirements
1. **Real-time Submission**
   - Compliance with ZRA VSDC API specifications
   - Proper formatting of invoice data according to ZRA requirements
   - Digital signing of submissions
   - Receipt and storage of ZRA confirmation
   - Error handling and retry mechanisms
   - Submission status tracking

2. **Compliance Features**
   - VAT calculation according to current ZRA rates
   - Proper tax categorization of line items
   - Required fields validation before submission
   - Audit trail of all submissions and responses
   - Reporting of submission statistics
   - Handling of ZRA API downtime or failures

#### Invoice Management Requirements
1. **Status Tracking**
   - Status workflow: Draft → Sent → Partially Paid → Paid → Overdue → Bad Debt
   - Automatic status updates based on payment records
   - Visual indicators of current status
   - Filtering and reporting by status
   - Bulk status updates
   - Status change notifications

2. **Payment Recording**
   - Manual payment entry with date, amount, and method
   - Partial payment support
   - Automatic payment matching from Airtel Money transactions
   - Payment receipt generation
   - Overpayment handling
   - Refund processing

3. **Reporting and Analytics**
   - Accounts receivable aging reports
   - Invoice summary reports by customer, period, status
   - Revenue reports by product/service category
   - VAT collection reports for tax filing
   - Payment method analysis
   - Late payment tracking

### Implementation Guide

#### Database Schema

**Customers Table**
```
Table customers {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  name VARCHAR(255) [not null]
  contact_person VARCHAR(100)
  email VARCHAR(255)
  phone VARCHAR(20)
  address TEXT
  city VARCHAR(100)
  country VARCHAR(100) [default: 'Zambia']
  zra_tin VARCHAR(20)
  payment_terms INTEGER [default: 14] // Days
  notes TEXT
  is_active BOOLEAN [default: true]
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    zra_tin
    name
  }
}
```

**Products Table**
```
Table products {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  name VARCHAR(255) [not null]
  description TEXT
  sku VARCHAR(50)
  zra_item_code VARCHAR(50)
  unit_price DECIMAL(15,2) [not null]
  currency VARCHAR(3) [default: 'ZMW']
  vat_rate DECIMAL(5,2) [default: 16.00]
  vat_inclusive BOOLEAN [default: false]
  unit_of_measure VARCHAR(20) [default: 'each']
  category VARCHAR(100)
  is_active BOOLEAN [default: true]
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    sku
    zra_item_code
    name
  }
}
```

**Invoices Table**
```
Table invoices {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  customer_id UUID [ref: > customers.id, not null]
  invoice_number VARCHAR(50) [not null]
  reference VARCHAR(100)
  issue_date DATE [not null]
  due_date DATE [not null]
  subtotal DECIMAL(15,2) [not null]
  vat_amount DECIMAL(15,2) [not null]
  discount_amount DECIMAL(15,2) [default: 0]
  total_amount DECIMAL(15,2) [not null]
  currency VARCHAR(3) [default: 'ZMW']
  status VARCHAR(20) [not null] // 'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'bad_debt'
  notes TEXT
  terms TEXT
  payment_instructions TEXT
  zra_submission_status VARCHAR(20) // 'pending', 'submitted', 'accepted', 'rejected', 'error'
  zra_submission_id VARCHAR(100)
  zra_submission_date TIMESTAMP
  zra_response TEXT
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    customer_id
    invoice_number
    issue_date
    due_date
    status
    zra_submission_status
  }
}
```

**Invoice Items Table**
```
Table invoice_items {
  id UUID [pk]
  invoice_id UUID [ref: > invoices.id, not null]
  product_id UUID [ref: > products.id]
  description VARCHAR(255) [not null]
  quantity DECIMAL(15,2) [not null]
  unit_price DECIMAL(15,2) [not null]
  vat_rate DECIMAL(5,2) [not null]
  vat_amount DECIMAL(15,2) [not null]
  discount_amount DECIMAL(15,2) [default: 0]
  total_amount DECIMAL(15,2) [not null]
  zra_item_code VARCHAR(50)
  unit_of_measure VARCHAR(20) [default: 'each']
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    invoice_id
    product_id
  }
}
```

**Payments Table**
```
Table payments {
  id UUID [pk]
  organization_id UUID [ref: > organizations.id, not null]
  invoice_id UUID [ref: > invoices.id, not null]
  transaction_id UUID [ref: > transactions.id]
  amount DECIMAL(15,2) [not null]
  currency VARCHAR(3) [default: 'ZMW']
  payment_date DATE [not null]
  payment_method VARCHAR(50) [not null] // 'cash', 'mobile_money', 'bank_transfer', 'check', 'credit_card'
  reference VARCHAR(100)
  notes TEXT
  created_by UUID [ref: > users.id, not null]
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    organization_id
    invoice_id
    transaction_id
    payment_date
  }
}
```

**Invoice Attachments Table**
```
Table invoice_attachments {
  id UUID [pk]
  invoice_id UUID [ref: > invoices.id, not null]
  file_name VARCHAR(255) [not null]
  file_type VARCHAR(50) [not null]
  file_size INTEGER [not null]
  storage_path VARCHAR(255) [not null]
  is_pdf BOOLEAN [default: true]
  created_at TIMESTAMP [default: `now()`]
  
  indexes {
    invoice_id
  }
}
```

**Email Logs Table**
```
Table email_logs {
  id UUID [pk]
  invoice_id UUID [ref: > invoices.id, not null]
  recipient VARCHAR(255) [not null]
  subject VARCHAR(255) [not null]
  status VARCHAR(20) [not null] // 'sent', 'delivered', 'opened', 'failed'
  error_message TEXT
  sent_at TIMESTAMP [default: `now()`]
  opened_at TIMESTAMP
  
  indexes {
    invoice_id
    status
    sent_at
  }
}
```

**ZRA Submission Logs Table**
```
Table zra_submission_logs {
  id UUID [pk]
  invoice_id UUID [ref: > invoices.id, not null]
  attempt_number INTEGER [not null]
  status VARCHAR(20) [not null] // 'success', 'failed'
  request_payload TEXT
  response_payload TEXT
  error_message TEXT
  submitted_at TIMESTAMP [default: `now()`]
  
  indexes {
    invoice_id
    status
    submitted_at
  }
}
```

#### Invoice Creation Flow

**Invoice Creation Process**
```
function createInvoice(organizationId, userId, invoiceData):
  // Validate input
  if (!invoiceData.customerId) throw new ValidationError("Customer is required")
  if (!invoiceData.items || invoiceData.items.length === 0) 
    throw new ValidationError("At least one invoice item is required")
  
  // Get customer details
  customer = await customersRepository.findById(invoiceData.customerId)
  if (!customer) throw new NotFoundError("Customer not found")
  
  // Generate invoice number
  invoiceNumber = await generateInvoiceNumber(organizationId)
  
  // Calculate dates
  issueDate = invoiceData.issueDate || new Date()
  dueDate = invoiceData.dueDate || calculateDueDate(issueDate, customer.payment_terms)
  
  // Start transaction
  return await db.transaction(async (tx) => {
    // Calculate totals
    let subtotal = 0
    let vatAmount = 0
    let discountAmount = invoiceData.discountAmount || 0
    
    // Create invoice
    invoice = await invoicesRepository.create({
      organization_id: organizationId,
      customer_id: invoiceData.customerId,
      invoice_number: invoiceNumber,
      reference: invoiceData.reference,
      issue_date: issueDate,
      due_date: dueDate,
      subtotal: 0, // Will update after adding items
      vat_amount: 0, // Will update after adding items
      discount_amount: discountAmount,
      total_amount: 0, // Will update after adding items
      currency: invoiceData.currency || 'ZMW',
      status: invoiceData.status || 'draft',
      notes: invoiceData.notes,
      terms: invoiceData.terms,
      payment_instructions: invoiceData.paymentInstructions
    }, tx)
    
    // Create invoice items
    for (const item of invoiceData.items) {
      let product = null
      
      // If product ID is provided, get product details
      if (item.productId) {
        product = await productsRepository.findById(item.productId)
        if (!product) throw new NotFoundError(`Product with ID ${item.productId} not found`)
      }
      
      // Calculate item amounts
      const quantity = item.quantity
      const unitPrice = item.unitPrice || (product ? product.unit_price : 0)
      const vatRate = item.vatRate || (product ? product.vat_rate : 16.00)
      const itemSubtotal = quantity * unitPrice
      const itemDiscount = item.discountAmount || 0
      const itemVatAmount = calculateVAT(itemSubtotal - itemDiscount, vatRate)
      const itemTotal = itemSubtotal - itemDiscount + itemVatAmount
      
      // Create invoice item
      await invoiceItemsRepository.create({
        invoice_id: invoice.id,
        product_id: item.productId,
        description: item.description || (product ? product.name : ''),
        quantity,
        unit_price: unitPrice,
        vat_rate: vatRate,
        vat_amount: itemVatAmount,
        discount_amount: itemDiscount,
        total_amount: itemTotal,
        zra_item_code: item.zraItemCode || (product ? product.zra_item_code : null),
        unit_of_measure: item.unitOfMeasure || (product ? product.unit_of_measure : 'each')
      }, tx)
      
      // Update totals
      subtotal += itemSubtotal
      vatAmount += itemVatAmount
    }
    
    // Update invoice with calculated totals
    const totalAmount = subtotal - discountAmount + vatAmount
    
    await invoicesRepository.update(invoice.id, {
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount
    }, tx)
    
    // Create audit log
    await auditLogService.logActivity(
      organizationId,
      userId,
      'create',
      'invoice',
      invoice.id,
      null,
      {
        invoice_number: invoiceNumber,
        customer_id: invoiceData.customerId,
        total_amount: totalAmount
      }
    )
    
    // If status is not draft, generate PDF
    if (invoice.status !== 'draft') {
      await generateAndStoreInvoicePDF(invoice.id)
    }
    
    return {
      id: invoice.id,
      invoiceNumber,
      customerId: invoice.customer_id,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      subtotal,
      vatAmount,
      discountAmount,
      totalAmount,
      status: invoice.status
    }
  })
```

**Invoice Number Generation**
```
async function generateInvoiceNumber(organizationId):
  // Get organization settings
  settings = await organizationSettingsRepository.findByOrganizationId(organizationId)
  
  // Get invoice number format
  format = settings.invoice_number_format || 'INV-{YEAR}-{SEQUENCE}'
  
  // Get current sequence number
  currentSequence = await getNextSequenceNumber(organizationId, 'invoice')
  
  // Format the invoice number
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  
  // Replace placeholders in format
  let invoiceNumber = format
    .replace('{YEAR}', year)
    .replace('{MONTH}', month)
    .replace('{DAY}', day)
    .replace('{SEQUENCE}', currentSequence.toString().padStart(5, '0'))
  
  return invoiceNumber
```

**PDF Generation Process**
```
async function generateAndStoreInvoicePDF(invoiceId):
  // Get invoice with related data
  invoice = await invoicesRepository.findByIdWithRelations(invoiceId)
  if (!invoice) throw new NotFoundError("Invoice not found")
  
  // Get organization details
  organization = await organizationsRepository.findById(invoice.organization_id)
  
  // Get organization logo if available
  let logoUrl = null
  if (organization.logo_path) {
    logoUrl = await storageService.getSignedUrl(organization.logo_path)
  }
  
  // Prepare data for PDF template
  const pdfData = {
    organization: {
      name: organization.name,
      address: organization.address,
      city: organization.city,
      country: organization.country,
      phone: organization.phone,
      email: organization.email,
      website: organization.website,
      zraTin: organization.zra_tin,
      logoUrl
    },
    customer: {
      name: invoice.customer.name,
      address: invoice.customer.address,
      city: invoice.customer.city,
      country: invoice.customer.country,
      contactPerson: invoice.customer.contact_person,
      email: invoice.customer.email,
      phone: invoice.customer.phone,
      zraTin: invoice.customer.zra_tin
    },
    invoice: {
      invoiceNumber: invoice.invoice_number,
      reference: invoice.reference,
      issueDate: formatDate(invoice.issue_date),
      dueDate: formatDate(invoice.due_date),
      subtotal: formatCurrency(invoice.subtotal, invoice.currency),
      vatAmount: formatCurrency(invoice.vat_amount, invoice.currency),
      discountAmount: formatCurrency(invoice.discount_amount, invoice.currency),
      totalAmount: formatCurrency(invoice.total_amount, invoice.currency),
      notes: invoice.notes,
      terms: invoice.terms,
      paymentInstructions: invoice.payment_instructions
    },
    items: invoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: formatCurrency(item.unit_price, invoice.currency),
      vatRate: `${item.vat_rate}%`,
      vatAmount: formatCurrency(item.vat_amount, invoice.currency),
      discountAmount: formatCurrency(item.discount_amount, invoice.currency),
      totalAmount: formatCurrency(item.total_amount, invoice.currency)
    }))
  }
  
  // Generate PDF using template
  const pdfBuffer = await pdfService.generateInvoicePDF(pdfData)
  
  // Generate filename
  const filename = `${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  
  // Store PDF in Azure Blob Storage
  const storagePath = `organizations/${invoice.organization_id}/invoices/${invoiceId}/${filename}`
  await storageService.uploadFile(storagePath, pdfBuffer, 'application/pdf')
  
  // Create attachment record
  await invoiceAttachmentsRepository.create({
    invoice_id: invoiceId,
    file_name: filename,
    file_type: 'application/pdf',
    file_size: pdfBuffer.length,
    storage_path: storagePath,
    is_pdf: true
  })
  
  return {
    filename,
    storagePath,
    size: pdfBuffer.length
  }
```

**Email Delivery Process**
```
async function sendInvoiceByEmail(invoiceId, emailOptions):
  // Get invoice with attachments
  invoice = await invoicesRepository.findByIdWithRelations(invoiceId)
  if (!invoice) throw new NotFoundError("Invoice not found")
  
  // Get customer email
  const recipientEmail = emailOptions.recipientEmail || invoice.customer.email
  if (!recipientEmail) throw new ValidationError("Recipient email is required")
  
  // Get PDF attachment
  const pdfAttachment = invoice.attachments.find(a => a.is_pdf)
  if (!pdfAttachment) {
    // Generate PDF if not exists
    await generateAndStoreInvoicePDF(invoiceId)
    invoice = await invoicesRepository.findByIdWithRelations(invoiceId)
    pdfAttachment = invoice.attachments.find(a => a.is_pdf)
  }
  
  // Get file content
  const fileContent = await storageService.downloadFile(pdfAttachment.storage_path)
  
  // Prepare email data
  const emailData = {
    to: recipientEmail,
    cc: emailOptions.cc,
    bcc: emailOptions.bcc,
    subject: emailOptions.subject || `Invoice ${invoice.invoice_number} from ${invoice.organization.name}`,
    body: emailOptions.body || getDefaultEmailBody(invoice),
    attachments: [
      {
        filename: pdfAttachment.file_name,
        content: fileContent,
        contentType: 'application/pdf'
      }
    ]
  }
  
  // Send email
  try {
    const result = await emailService.sendEmail(emailData)
    
    // Log email
    await emailLogsRepository.create({
      invoice_id: invoiceId,
      recipient: recipientEmail,
      subject: emailData.subject,
      status: 'sent',
      sent_at: new Date()
    })
    
    // Update invoice status if it was in draft
    if (invoice.status === 'draft') {
      await invoicesRepository.update(invoiceId, {
        status: 'sent'
      })
    }
    
    return {
      success: true,
      messageId: result.messageId,
      recipient: recipientEmail
    }
  } catch (error) {
    // Log failed email
    await emailLogsRepository.create({
      invoice_id: invoiceId,
      recipient: recipientEmail,
      subject: emailData.subject,
      status: 'failed',
      error_message: error.message,
      sent_at: new Date()
    })
    
    throw new Error(`Failed to send email: ${error.message}`)
  }
```

#### ZRA Smart Invoice Integration

**ZRA Invoice Submission Process**
```
async function submitInvoiceToZRA(invoiceId):
  // Get invoice with all related data
  invoice = await invoicesRepository.findByIdWithRelations(invoiceId)
  if (!invoice) throw new NotFoundError("Invoice not found")
  
  // Check if already submitted successfully
  if (invoice.zra_submission_status === 'accepted') {
    return {
      success: true,
      alreadySubmitted: true,
      submissionId: invoice.zra_submission_id,
      submissionDate: invoice.zra_submission_date
    }
  }
  
  // Get organization ZRA credentials
  zraCredentials = await zraCredentialsRepository.findByOrganizationId(invoice.organization_id)
  if (!zraCredentials || !zraCredentials.api_key) {
    throw new Error("ZRA API credentials not configured")
  }
  
  // Prepare invoice data for ZRA
  const zraInvoiceData = {
    header: {
      taxpayerID: zraCredentials.taxpayer_id,
      branchID: zraCredentials.branch_id,
      deviceID: zraCredentials.device_id,
      invoiceType: "SALES",
      invoiceNumber: invoice.invoice_number,
      invoiceDate: formatDate(invoice.issue_date, 'YYYY-MM-DD'),
      invoiceTime: formatTime(invoice.created_at, 'HH:mm:ss'),
      customerName: invoice.customer.name,
      customerAddress: invoice.customer.address,
      customerTIN: invoice.customer.zra_tin || "",
      totalAmount: invoice.total_amount,
      vatAmount: invoice.vat_amount
    },
    items: invoice.items.map(item => ({
      itemCode: item.zra_item_code || "DEFAULT",
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      unitOfMeasure: item.unit_of_measure,
      discountAmount: item.discount_amount,
      taxRate: item.vat_rate,
      taxAmount: item.vat_amount,
      totalAmount: item.total_amount
    })),
    payments: [{
      paymentType: "MOBILE_MONEY", // Default, can be updated based on actual payment
      paymentAmount: invoice.total_amount
    }]
  }
  
  // Create submission log entry
  const attemptNumber = await zraSubmissionLogsRepository.countByInvoiceId(invoiceId) + 1
  const submissionLog = await zraSubmissionLogsRepository.create({
    invoice_id: invoiceId,
    attempt_number: attemptNumber,
    status: 'pending',
    request_payload: JSON.stringify(zraInvoiceData)
  })
  
  try {
    // Update invoice status
    await invoicesRepository.update(invoiceId, {
      zra_submission_status: 'pending'
    })
    
    // Submit to ZRA API
    const response = await axios.post(ZRA_INVOICE_SUBMISSION_URL, zraInvoiceData, {
      headers: {
        'Authorization': `Bearer ${zraCredentials.api_key}`,
        'Content-Type': 'application/json'
      }
    })
    
    // Process successful response
    const submissionId = response.data.submissionId
    const submissionDate = new Date()
    
    // Update invoice
    await invoicesRepository.update(invoiceId, {
      zra_submission_status: 'accepted',
      zra_submission_id: submissionId,
      zra_submission_date: submissionDate,
      zra_response: JSON.stringify(response.data)
    })
    
    // Update submission log
    await zraSubmissionLogsRepository.update(submissionLog.id, {
      status: 'success',
      response_payload: JSON.stringify(response.data)
    })
    
    return {
      success: true,
      submissionId,
      submissionDate
    }
  } catch (error) {
    // Handle API error
    const errorMessage = error.response?.data?.message || error.message
    
    // Update invoice
    await invoicesRepository.update(invoiceId, {
      zra_submission_status: 'error',
      zra_response: JSON.stringify(error.response?.data || { error: error.message })
    })
    
    // Update submission log
    await zraSubmissionLogsRepository.update(submissionLog.id, {
      status: 'failed',
      response_payload: JSON.stringify(error.response?.data || { error: error.message }),
      error_message: errorMessage
    })
    
    // Queue for retry if appropriate
    if (isRetryableError(error) && attemptNumber < MAX_ZRA_SUBMISSION_ATTEMPTS) {
      await zraSubmissionQueue.add('retrySubmission', {
        invoiceId,
        attemptNumber
      }, {
        delay: calculateRetryDelay(attemptNumber),
        attempts: 1
      })
    }
    
    throw new Error(`ZRA submission failed: ${errorMessage}`)
  }
```

**Payment Recording Process**
```
async function recordInvoicePayment(invoiceId, paymentData, userId):
  // Validate input
  if (!paymentData.amount) throw new ValidationError("Payment amount is required")
  if (!paymentData.paymentDate) throw new ValidationError("Payment date is required")
  if (!paymentData.paymentMethod) throw new ValidationError("Payment method is required")
  
  // Get invoice
  invoice = await invoicesRepository.findById(invoiceId)
  if (!invoice) throw new NotFoundError("Invoice not found")
  
  // Start transaction
  return await db.transaction(async (tx) => {
    // Create payment record
    payment = await paymentsRepository.create({
      organization_id: invoice.organization_id,
      invoice_id: invoiceId,
      transaction_id: paymentData.transactionId,
      amount: paymentData.amount,
      currency: paymentData.currency || invoice.currency,
      payment_date: paymentData.paymentDate,
      payment_method: paymentData.paymentMethod,
      reference: paymentData.reference,
      notes: paymentData.notes,
      created_by: userId
    }, tx)
    
    // Calculate total paid amount
    const payments = await paymentsRepository.findByInvoiceId(invoiceId)
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    
    // Update invoice status based on payment
    let newStatus = invoice.status
    
    if (totalPaid >= invoice.total_amount) {
      newStatus = 'paid'
    } else if (totalPaid > 0) {
      newStatus = 'partially_paid'
    }
    
    // Update invoice
    await invoicesRepository.update(invoiceId, {
      status: newStatus
    }, tx)
    
    // Create audit log
    await auditLogService.logActivity(
      invoice.organization_id,
      userId,
      'create',
      'payment',
      payment.id,
      null,
      {
        invoice_id: invoiceId,
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod
      }
    )
    
    // If transaction ID is provided, update transaction reconciliation status
    if (paymentData.transactionId) {
      await transactionsRepository.update(paymentData.transactionId, {
        is_reconciled: true,
        invoice_id: invoiceId
      })
    }
    
    return {
      id: payment.id,
      invoiceId,
      amount: payment.amount,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      invoiceStatus: newStatus,
      totalPaid,
      remainingBalance: Math.max(0, invoice.total_amount - totalPaid)
    }
  })
```

#### API Endpoints

**Customer Endpoints**

1. **Create Customer**
   - `POST /api/customers`
   - Auth: Required
   - Request:
     ```json
     {
       "name": "ABC Corporation",
       "contactPerson": "John Doe",
       "email": "john@abccorp.com",
       "phone": "+260971234567",
       "address": "123 Business Park",
       "city": "Lusaka",
       "country": "Zambia",
       "zraTin": "1000000000",
       "paymentTerms": 30,
       "notes": "Key account"
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440000",
       "name": "ABC Corporation",
       "contactPerson": "John Doe",
       "email": "john@abccorp.com",
       "phone": "+260971234567",
       "address": "123 Business Park",
       "city": "Lusaka",
       "country": "Zambia",
       "zraTin": "1000000000",
       "paymentTerms": 30,
       "notes": "Key account",
       "isActive": true,
       "createdAt": "2023-01-01T00:00:00Z"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 409 Conflict: Customer with this name already exists

2. **Get Customers**
   - `GET /api/customers?search={search}&page={page}&limit={limit}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "customers": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440000",
           "name": "ABC Corporation",
           "contactPerson": "John Doe",
           "email": "john@abccorp.com",
           "phone": "+260971234567",
           "city": "Lusaka",
           "zraTin": "1000000000",
           "isActive": true
         }
       ],
       "pagination": {
         "total": 50,
         "page": 1,
         "limit": 20,
         "pages": 3
       }
     }
     ```

3. **Get Customer Details**
   - `GET /api/customers/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440000",
       "name": "ABC Corporation",
       "contactPerson": "John Doe",
       "email": "john@abccorp.com",
       "phone": "+260971234567",
       "address": "123 Business Park",
       "city": "Lusaka",
       "country": "Zambia",
       "zraTin": "1000000000",
       "paymentTerms": 30,
       "notes": "Key account",
       "isActive": true,
       "createdAt": "2023-01-01T00:00:00Z",
       "updatedAt": "2023-01-01T00:00:00Z",
       "statistics": {
         "totalInvoices": 10,
         "totalAmount": 5000.00,
         "paidAmount": 3000.00,
         "outstandingAmount": 2000.00
       }
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Customer not found

**Product Endpoints**

1. **Create Product**
   - `POST /api/products`
   - Auth: Required
   - Request:
     ```json
     {
       "name": "Web Development Service",
       "description": "Professional website development",
       "sku": "SRV-WEB-001",
       "zraItemCode": "SERV-001",
       "unitPrice": 1000.00,
       "currency": "ZMW",
       "vatRate": 16.00,
       "vatInclusive": false,
       "unitOfMeasure": "hour",
       "category": "Services"
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440001",
       "name": "Web Development Service",
       "description": "Professional website development",
       "sku": "SRV-WEB-001",
       "zraItemCode": "SERV-001",
       "unitPrice": 1000.00,
       "currency": "ZMW",
       "vatRate": 16.00,
       "vatInclusive": false,
       "unitOfMeasure": "hour",
       "category": "Services",
       "isActive": true,
       "createdAt": "2023-01-01T00:00:00Z"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 409 Conflict: Product with this SKU already exists

2. **Get Products**
   - `GET /api/products?search={search}&category={category}&page={page}&limit={limit}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "products": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440001",
           "name": "Web Development Service",
           "sku": "SRV-WEB-001",
           "unitPrice": 1000.00,
           "currency": "ZMW",
           "category": "Services",
           "isActive": true
         }
       ],
       "pagination": {
         "total": 30,
         "page": 1,
         "limit": 20,
         "pages": 2
       }
     }
     ```

**Invoice Endpoints**

1. **Create Invoice**
   - `POST /api/invoices`
   - Auth: Required
   - Request:
     ```json
     {
       "customerId": "550e8400-e29b-41d4-a716-446655440000",
       "issueDate": "2023-01-01",
       "dueDate": "2023-01-31",
       "reference": "PO-12345",
       "discountAmount": 100.00,
       "currency": "ZMW",
       "status": "draft",
       "notes": "Thank you for your business",
       "terms": "Payment due within 30 days",
       "paymentInstructions": "Please pay to Airtel Money: 0971234567",
       "items": [
         {
           "productId": "550e8400-e29b-41d4-a716-446655440001",
           "description": "Web Development Service",
           "quantity": 10,
           "unitPrice": 1000.00,
           "vatRate": 16.00,
           "discountAmount": 0,
           "unitOfMeasure": "hour"
         }
       ]
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440002",
       "invoiceNumber": "INV-2023-00001",
       "customerId": "550e8400-e29b-41d4-a716-446655440000",
       "issueDate": "2023-01-01",
       "dueDate": "2023-01-31",
       "subtotal": 10000.00,
       "vatAmount": 1600.00,
       "discountAmount": 100.00,
       "totalAmount": 11500.00,
       "status": "draft"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 404 Not Found: Customer or product not found

2. **Get Invoices**
   - `GET /api/invoices?status={status}&customerId={customerId}&startDate={startDate}&endDate={endDate}&page={page}&limit={limit}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "invoices": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440002",
           "invoiceNumber": "INV-2023-00001",
           "customer": {
             "id": "550e8400-e29b-41d4-a716-446655440000",
             "name": "ABC Corporation"
           },
           "issueDate": "2023-01-01",
           "dueDate": "2023-01-31",
           "totalAmount": 11500.00,
           "status": "draft",
           "zraSubmissionStatus": null
         }
       ],
       "pagination": {
         "total": 100,
         "page": 1,
         "limit": 20,
         "pages": 5
       },
       "summary": {
         "totalInvoices": 100,
         "totalAmount": 1150000.00,
         "paidAmount": 500000.00,
         "outstandingAmount": 650000.00
       }
     }
     ```

3. **Get Invoice Details**
   - `GET /api/invoices/{id}`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440002",
       "invoiceNumber": "INV-2023-00001",
       "reference": "PO-12345",
       "customer": {
         "id": "550e8400-e29b-41d4-a716-446655440000",
         "name": "ABC Corporation",
         "contactPerson": "John Doe",
         "email": "john@abccorp.com",
         "phone": "+260971234567"
       },
       "issueDate": "2023-01-01",
       "dueDate": "2023-01-31",
       "subtotal": 10000.00,
       "vatAmount": 1600.00,
       "discountAmount": 100.00,
       "totalAmount": 11500.00,
       "currency": "ZMW",
       "status": "draft",
       "notes": "Thank you for your business",
       "terms": "Payment due within 30 days",
       "paymentInstructions": "Please pay to Airtel Money: 0971234567",
       "zraSubmissionStatus": null,
       "zraSubmissionId": null,
       "zraSubmissionDate": null,
       "items": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440003",
           "description": "Web Development Service",
           "quantity": 10,
           "unitPrice": 1000.00,
           "vatRate": 16.00,
           "vatAmount": 1600.00,
           "discountAmount": 0,
           "totalAmount": 11600.00,
           "unitOfMeasure": "hour"
         }
       ],
       "payments": [],
       "attachments": [],
       "createdAt": "2023-01-01T00:00:00Z",
       "updatedAt": "2023-01-01T00:00:00Z"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Invoice not found

4. **Update Invoice**
   - `PUT /api/invoices/{id}`
   - Auth: Required
   - Request:
     ```json
     {
       "reference": "PO-12345-UPDATED",
       "notes": "Updated notes",
       "terms": "Updated terms",
       "paymentInstructions": "Updated payment instructions"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440002",
       "invoiceNumber": "INV-2023-00001",
       "reference": "PO-12345-UPDATED",
       "notes": "Updated notes",
       "terms": "Updated terms",
       "paymentInstructions": "Updated payment instructions",
       "updatedAt": "2023-01-02T00:00:00Z"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 403 Forbidden: Cannot update finalized invoice
     - 404 Not Found: Invoice not found

5. **Update Invoice Status**
   - `PATCH /api/invoices/{id}/status`
   - Auth: Required
   - Request:
     ```json
     {
       "status": "sent"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440002",
       "invoiceNumber": "INV-2023-00001",
       "status": "sent",
       "updatedAt": "2023-01-02T00:00:00Z"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid status transition
     - 404 Not Found: Invoice not found

6. **Generate Invoice PDF**
   - `POST /api/invoices/{id}/generate-pdf`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "success": true,
       "filename": "INV_2023_00001.pdf",
       "downloadUrl": "https://storage.azure.com/..."
     }
     ```
   - Error Responses:
     - 404 Not Found: Invoice not found
     - 500 Internal Server Error: PDF generation failed

7. **Send Invoice by Email**
   - `POST /api/invoices/{id}/send-email`
   - Auth: Required
   - Request:
     ```json
     {
       "recipientEmail": "john@abccorp.com",
       "cc": ["accounting@abccorp.com"],
       "bcc": ["records@mybusiness.com"],
       "subject": "Invoice INV-2023-00001 from My Business",
       "body": "Dear John,\n\nPlease find attached your invoice.\n\nRegards,\nMy Business"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "messageId": "message-id-from-email-service",
       "recipient": "john@abccorp.com"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Missing recipient
     - 404 Not Found: Invoice not found
     - 500 Internal Server Error: Email sending failed

8. **Submit Invoice to ZRA**
   - `POST /api/invoices/{id}/submit-to-zra`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "success": true,
       "submissionId": "zra-submission-id",
       "submissionDate": "2023-01-02T00:00:00Z"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invoice not ready for submission
     - 404 Not Found: Invoice not found
     - 500 Internal Server Error: Submission failed

**Payment Endpoints**

1. **Record Payment**
   - `POST /api/invoices/{id}/payments`
   - Auth: Required
   - Request:
     ```json
     {
       "amount": 5000.00,
       "paymentDate": "2023-01-15",
       "paymentMethod": "mobile_money",
       "reference": "AIRTEL-123456",
       "transactionId": "550e8400-e29b-41d4-a716-446655440004",
       "notes": "Partial payment"
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440005",
       "invoiceId": "550e8400-e29b-41d4-a716-446655440002",
       "amount": 5000.00,
       "paymentDate": "2023-01-15",
       "paymentMethod": "mobile_money",
       "invoiceStatus": "partially_paid",
       "totalPaid": 5000.00,
       "remainingBalance": 6500.00
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 404 Not Found: Invoice not found

2. **Get Invoice Payments**
   - `GET /api/invoices/{id}/payments`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "payments": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440005",
           "amount": 5000.00,
           "paymentDate": "2023-01-15",
           "paymentMethod": "mobile_money",
           "reference": "AIRTEL-123456",
           "createdAt": "2023-01-15T00:00:00Z",
           "createdBy": {
             "id": "550e8400-e29b-41d4-a716-446655440006",
             "name": "Jane Smith"
           }
         }
       ],
       "summary": {
         "totalPaid": 5000.00,
         "remainingBalance": 6500.00
       }
     }
     ```
   - Error Responses:
     - 404 Not Found: Invoice not found

#### Frontend Components

**Customer Management Components**

1. **CustomersList**
   - Searchable, sortable list of customers
   - Quick action buttons (view, edit, create invoice)
   - Pagination controls
   - "Add Customer" button
   - Status indicators for active/inactive customers

2. **CustomerForm**
   - Form for creating/editing customer details
   - Input validation for required fields
   - ZRA TIN validation
   - Address formatting for Zambian addresses
   - Payment terms selection

3. **CustomerDetail**
   - Comprehensive customer information display
   - Invoice history with status indicators
   - Payment history
   - Outstanding balance calculation
   - Action buttons for common tasks

**Product Management Components**

1. **ProductsList**
   - Searchable, filterable list of products/services
   - Category grouping
   - Price display with VAT indication
   - Quick action buttons (edit, archive)
   - "Add Product" button

2. **ProductForm**
   - Form for creating/editing products
   - VAT rate selection with ZRA compliance
   - Price calculation helpers (VAT inclusive/exclusive)
   - ZRA item code lookup or manual entry
   - Unit of measure selection

**Invoice Management Components**

1. **InvoicesList**
   - Filterable by status, date range, customer
   - Status indicators with color coding
   - Due date highlighting for upcoming/overdue
   - Amount display with payment status
   - Quick action buttons (view, edit, send, record payment)
   - Summary statistics (total, paid, outstanding)

2. **InvoiceCreationForm**
   - Multi-step form with progress indicator
   - Customer selection with quick-add option
   - Date pickers for issue and due dates
   - Line item entry with product lookup
   - Real-time calculation of subtotals, VAT, and totals
   - Discount application options
   - Notes and terms fields
   - Preview option before saving

3. **LineItemsEditor**
   - Product/service selection with search
   - Quantity and price inputs with real-time calculations
   - VAT rate selection with automatic calculation
   - Discount entry at line item level
   - Add/remove/reorder capabilities
   - Subtotal and total display

4. **InvoiceDetail**
   - Professional display of invoice information
   - Status banner with color coding
   - Action buttons based on current status
   - Payment history section
   - ZRA submission status and history
   - Download/print options
   - Email sending interface

5. **PaymentRecordingForm**
   - Amount input with validation against remaining balance
   - Date picker for payment date
   - Payment method selection
   - Reference number input
   - Option to link to existing transaction
   - Notes field for additional information

6. **EmailSendingForm**
   - Recipient field with default from customer
   - CC/BCC options
   - Subject line with default
   - Email body editor with template
   - Preview option
   - Attachment confirmation

7. **ZRASubmissionPanel**
   - Submission status display
   - Submission history with timestamps
   - Error details for failed submissions
   - Manual retry option
   - Compliance check before submission

#### Background Jobs

1. **Invoice Status Update Job**
   - Daily job to check for overdue invoices
   - Updates status based on due date
   - Sends notifications for newly overdue invoices
   - Identifies potential bad debt (e.g., 90+ days overdue)

2. **ZRA Submission Retry Job**
   - Processes failed ZRA submissions with exponential backoff
   - Monitors submission queue for stuck items
   - Updates invoice status based on submission results
   - Alerts administrators for persistent failures

3. **Invoice Reminder Job**
   - Sends payment reminders for upcoming and overdue invoices
   - Configurable reminder schedule (e.g., 3 days before, on due date, 7 days after)
   - Customizable reminder templates
   - Tracks reminder history

#### Security Considerations

1. **Invoice Access Control**
   - Organization-level isolation of invoice data
   - Role-based permissions for invoice operations
   - Audit logging of all invoice modifications
   - Restricted access to sensitive customer information

2. **PDF Security**
   - Secure storage of generated PDFs
   - Time-limited access URLs for downloads
   - Optional password protection for sensitive invoices
   - Digital signatures for authenticity verification

3. **Email Security**
   - SPF, DKIM, and DMARC for email authentication
   - Secure handling of email templates
   - Protection against email content injection
   - Rate limiting for email sending

4. **ZRA API Security**
   - Secure storage of ZRA API credentials
   - Proper error handling for API failures
   - Compliance with ZRA security requirements
   - Regular validation of API integration

#### Testing Strategy

1. **Unit Tests**
   - Invoice calculation functions
   - VAT computation logic
   - Status transition rules
   - PDF generation utilities
   - ZRA data formatting

2. **Integration Tests**
   - Invoice creation and update flows
   - Payment recording and status updates
   - Email sending integration
   - ZRA API submission process
   - PDF generation and storage

3. **End-to-End Tests**
   - Complete invoice lifecycle (create → send → pay → reconcile)
   - Customer management workflow
   - Product management workflow
   - ZRA submission workflow
   - Email delivery workflow

4. **Performance Tests**
   - Invoice listing with large datasets
   - PDF generation time
   - ZRA submission throughput
   - Concurrent invoice creation

#### Error Handling

1. **Invoice Creation Errors**
   - Validation errors with clear messages
   - Calculation discrepancies detection
   - Draft saving for incomplete invoices
   - Recovery options for form submission failures

2. **PDF Generation Errors**
   - Fallback templates for rendering issues
   - Error logging with invoice details
   - Retry mechanisms for transient failures
   - User-friendly error messages

3. **Email Delivery Errors**
   - Delivery status tracking
   - Retry options for failed emails
   - Alternative delivery suggestions
   - Detailed error logging for troubleshooting

4. **ZRA Submission Errors**
   - Categorization of error types (validation, authentication, server)
   - Specific guidance for resolving validation errors
   - Automatic retry for server errors
   - Manual override options for persistent issues

#### Logging and Monitoring

1. **Invoice Activity Monitoring**
   - Creation, modification, and status change events
   - Payment recording events
   - Email sending events
   - ZRA submission events

2. **Performance Monitoring**
   - Invoice creation response times
   - PDF generation times
   - Email delivery times
   - ZRA submission times

3. **Error Rate Monitoring**
   - Validation error frequency
   - PDF generation failure rate
   - Email delivery failure rate
   - ZRA submission failure rate

### Key Edge Cases

1. **Invoice Creation**
   - Zero-value invoices
   - Very large invoices (many line items)
   - Mixed VAT rates within single invoice
   - Foreign currency invoices
   - Invoices with very large amounts

2. **PDF Generation**
   - Extremely long product descriptions
   - Special characters in business or customer names
   - Custom fonts or branding elements
   - Very large number of line items
   - Multiple pages handling

3. **Email Delivery**
   - Invalid recipient email addresses
   - Large PDF attachments
   - Email server rejections
   - Delivery to strict corporate filters
   - Multiple recipients with different failure modes

4. **ZRA Submission**
   - API downtime or slow response
   - Validation errors from ZRA
   - Changes in ZRA API requirements
   - Duplicate submission attempts
   - Submission of backdated invoices

5. **Payment Processing**
   - Overpayments
   - Partial payments
   - Payments in different currency
   - Multiple payments for single invoice
   - Payment reversals or refunds
```
