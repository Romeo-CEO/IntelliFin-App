# Role-Based Access Control (RBAC) Model for IntelliFin

## Overview

IntelliFin implements a hierarchical role-based access control system designed for Zambian SMEs and Mobile Money Agents. The system provides granular permissions while maintaining simplicity for non-tech-savvy users.

## Role Hierarchy

### 1. SUPER_ADMIN
- **Scope**: System-wide access across all tenants
- **Purpose**: Platform administration and maintenance
- **Users**: IntelliFin platform administrators only
- **Permissions**: All system permissions

### 2. TENANT_ADMIN
- **Scope**: Full access within their tenant/organization
- **Purpose**: Business owner or primary administrator
- **Users**: Business owners, primary decision makers
- **Permissions**: All tenant-level permissions

### 3. ADMIN
- **Scope**: Administrative access within tenant
- **Purpose**: Senior staff with administrative responsibilities
- **Users**: Office managers, senior accountants
- **Permissions**: Most tenant permissions except user management

### 4. MANAGER
- **Scope**: Departmental or functional management
- **Purpose**: Team leads with approval authority
- **Users**: Department heads, supervisors
- **Permissions**: Approval workflows, team oversight

### 5. USER
- **Scope**: Standard operational access
- **Purpose**: Day-to-day business operations
- **Users**: Staff members, data entry personnel
- **Permissions**: Basic CRUD operations within scope

### 6. VIEWER
- **Scope**: Read-only access
- **Purpose**: Reporting and monitoring
- **Users**: Auditors, consultants, read-only stakeholders
- **Permissions**: View-only access to assigned modules

## Permission Categories

### 1. User Management
- `users:create` - Invite new users
- `users:read` - View user information
- `users:update` - Modify user details
- `users:delete` - Remove users
- `users:manage_roles` - Assign/modify user roles
- `users:view_audit` - View user activity logs

### 2. Organization Management
- `organization:read` - View organization details
- `organization:update` - Modify organization information
- `organization:settings` - Manage organization settings
- `organization:branding` - Update branding and preferences

### 3. Customer Management
- `customers:create` - Add new customers
- `customers:read` - View customer information
- `customers:update` - Modify customer details
- `customers:delete` - Remove customers
- `customers:import` - Import customer data
- `customers:export` - Export customer data

### 4. Invoice Management
- `invoices:create` - Create new invoices
- `invoices:read` - View invoices
- `invoices:update` - Modify invoices
- `invoices:delete` - Remove invoices
- `invoices:send` - Send invoices to customers
- `invoices:approve` - Approve invoices for sending
- `invoices:zra_submit` - Submit to ZRA Smart Invoice

### 5. Payment Management
- `payments:create` - Record payments
- `payments:read` - View payment information
- `payments:update` - Modify payment records
- `payments:delete` - Remove payment records
- `payments:reconcile` - Reconcile payments with transactions

### 6. Expense Management
- `expenses:create` - Create expense records
- `expenses:read` - View expenses
- `expenses:update` - Modify expenses
- `expenses:delete` - Remove expenses
- `expenses:approve` - Approve expense submissions
- `expenses:reject` - Reject expense submissions
- `expenses:upload_receipts` - Upload receipt attachments

### 7. Transaction Management
- `transactions:read` - View transaction data
- `transactions:categorize` - Categorize transactions
- `transactions:link` - Link transactions to invoices/expenses
- `transactions:sync` - Trigger transaction synchronization

### 8. Mobile Money Integration
- `mobile_money:read` - View mobile money accounts
- `mobile_money:link` - Link mobile money accounts
- `mobile_money:unlink` - Unlink mobile money accounts
- `mobile_money:sync` - Manage synchronization settings

### 9. Reporting and Analytics
- `reports:financial` - Access financial reports
- `reports:tax` - Access tax reports
- `reports:custom` - Create custom reports
- `reports:export` - Export report data
- `analytics:dashboard` - View analytics dashboard

### 10. System Administration
- `system:audit_logs` - View system audit logs
- `system:backup` - Manage data backups
- `system:integrations` - Manage third-party integrations
- `system:settings` - Modify system settings

## Role-Permission Matrix

| Permission Category | SUPER_ADMIN | TENANT_ADMIN | ADMIN | MANAGER | USER | VIEWER |
|-------------------|-------------|--------------|-------|---------|------|--------|
| User Management | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Organization Management | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Customer Management | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (read) |
| Invoice Management | ✓ | ✓ | ✓ | ✓ (approve) | ✓ | ✓ (read) |
| Payment Management | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (read) |
| Expense Management | ✓ | ✓ | ✓ | ✓ (approve) | ✓ | ✓ (read) |
| Transaction Management | ✓ | ✓ | ✓ | ✓ | ✓ (read) | ✓ (read) |
| Mobile Money Integration | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Reporting and Analytics | ✓ | ✓ | ✓ | ✓ | ✓ (basic) | ✓ |
| System Administration | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ |

## Zambian Business Context

### Traditional Business Roles
- **Business Owner** → TENANT_ADMIN
- **Accountant/Bookkeeper** → ADMIN
- **Shop Manager** → MANAGER
- **Sales Staff** → USER
- **External Auditor** → VIEWER

### Mobile Money Agent Roles
- **Agent Owner** → TENANT_ADMIN
- **Senior Agent** → ADMIN
- **Agent** → USER
- **Supervisor** → MANAGER

## Permission Inheritance

### Hierarchical Inheritance
- Higher roles inherit all permissions from lower roles
- TENANT_ADMIN has all permissions within their tenant
- SUPER_ADMIN has all permissions across all tenants

### Contextual Permissions
- Permissions are scoped to the user's tenant
- Cross-tenant access is restricted to SUPER_ADMIN only
- Resource-level permissions consider ownership and hierarchy

## Security Considerations

### Multi-Tenancy
- All permissions are tenant-scoped by default
- Cross-tenant data access is prevented at the database level
- User roles are validated within tenant context

### Audit Trail
- All permission checks are logged
- Role changes are tracked with timestamps and actors
- Failed permission attempts are monitored

### Session Management
- Permissions are cached in user sessions
- Role changes require session refresh
- Expired sessions invalidate all permissions

## Implementation Guidelines

### Permission Checking
```typescript
// Check single permission
@RequirePermission('invoices:create')
async createInvoice() { ... }

// Check multiple permissions (OR)
@RequirePermissions(['invoices:update', 'invoices:approve'])
async updateInvoice() { ... }

// Check role-based access
@RequireRole(UserRole.ADMIN)
async adminFunction() { ... }
```

### Dynamic Permission Checking
```typescript
// Runtime permission checking
if (await this.permissionService.hasPermission(user, 'customers:delete')) {
  // Allow deletion
}

// Resource-based permissions
if (await this.permissionService.canAccessResource(user, 'invoice', invoiceId)) {
  // Allow access
}
```

### Frontend Permission Handling
```typescript
// Component-level permission checking
<PermissionGuard permission="invoices:create">
  <CreateInvoiceButton />
</PermissionGuard>

// Hook-based permission checking
const canCreateInvoice = usePermission('invoices:create');
```

## Migration Strategy

### Phase 1: Basic Roles
- Implement core roles (TENANT_ADMIN, USER, VIEWER)
- Basic permission checking for critical operations

### Phase 2: Granular Permissions
- Add detailed permission categories
- Implement resource-level permissions

### Phase 3: Advanced Features
- Dynamic role creation
- Custom permission sets
- Workflow-based permissions

## Compliance and Audit

### Zambian Regulatory Requirements
- User access logs for ZRA compliance
- Financial data access tracking
- Role-based segregation of duties

### Audit Requirements
- All permission changes logged
- Regular access reviews
- Compliance reporting capabilities
