# Expense Approval Workflow Architecture

## Overview
The expense approval workflow system provides configurable approval processes for expense management in IntelliFin. It supports role-based approvals, threshold-based routing, delegation capabilities, and comprehensive audit trails.

## Workflow States and Transitions

### Expense States
- **DRAFT**: Initial state when expense is created
- **PENDING_APPROVAL**: Expense submitted for approval
- **APPROVED**: Expense approved by authorized approver
- **REJECTED**: Expense rejected with reason
- **PAID**: Expense approved and payment processed

### State Transitions
```
DRAFT → PENDING_APPROVAL (submit for approval)
PENDING_APPROVAL → APPROVED (approve)
PENDING_APPROVAL → REJECTED (reject)
PENDING_APPROVAL → DRAFT (return for revision)
APPROVED → PAID (process payment)
REJECTED → DRAFT (resubmit after revision)
```

## Approval Rules Engine

### Rule Types
1. **Amount-based Rules**: Approval required above certain thresholds
2. **Category-based Rules**: Specific categories require approval
3. **Role-based Rules**: Different approval levels based on user roles
4. **Time-based Rules**: Approval requirements based on time periods

### Rule Configuration
```typescript
interface ApprovalRule {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: ApprovalCondition[];
  actions: ApprovalAction[];
}

interface ApprovalCondition {
  field: 'amount' | 'category' | 'submitter_role' | 'date';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'in' | 'not_in';
  value: any;
}

interface ApprovalAction {
  type: 'require_approval' | 'auto_approve' | 'notify';
  approverRoles: UserRole[];
  approverUsers?: string[];
  escalationTimeHours?: number;
}
```

## Approval Process Flow

### 1. Expense Submission
- User creates expense in DRAFT state
- User submits expense for approval
- System evaluates approval rules
- Creates approval request if required
- Sends notifications to approvers

### 2. Approval Evaluation
- System checks all active approval rules
- Determines required approvers based on conditions
- Creates approval tasks for each required approver
- Supports parallel or sequential approval flows

### 3. Approval Decision
- Approver reviews expense details and receipts
- Approver makes decision (approve/reject/return)
- System updates expense status
- Sends notifications to submitter and other stakeholders

### 4. Escalation Handling
- Automatic escalation after timeout
- Delegation to backup approvers
- Manager override capabilities

## Database Schema

### Approval Request
```sql
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  expense_id UUID NOT NULL REFERENCES expenses(id),
  requester_id UUID NOT NULL REFERENCES users(id),
  status approval_status NOT NULL DEFAULT 'PENDING',
  priority approval_priority NOT NULL DEFAULT 'NORMAL',
  due_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Approval Task
```sql
CREATE TABLE approval_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID NOT NULL REFERENCES approval_requests(id),
  approver_id UUID NOT NULL REFERENCES users(id),
  status task_status NOT NULL DEFAULT 'PENDING',
  decision approval_decision,
  comments TEXT,
  decided_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Approval Rule
```sql
CREATE TABLE approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Notification System

### Notification Types
- **APPROVAL_REQUIRED**: Sent to approvers when approval is needed
- **APPROVAL_REMINDER**: Reminder for pending approvals
- **APPROVAL_ESCALATION**: Escalation notifications
- **APPROVAL_COMPLETED**: Notification when approval is completed
- **APPROVAL_REJECTED**: Notification when expense is rejected

### Notification Channels
- **Email**: Primary notification channel
- **In-app**: Real-time notifications within the application
- **SMS**: Optional for urgent approvals (future enhancement)

### Notification Templates
```typescript
interface NotificationTemplate {
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: string[];
}
```

## Security and Permissions

### Role-based Access Control
- **ADMIN**: Can configure approval rules and override decisions
- **MANAGER**: Can approve expenses within defined limits
- **USER**: Can submit expenses and view own approval status
- **VIEWER**: Read-only access to approval information

### Permission Matrix
| Action | USER | MANAGER | ADMIN |
|--------|------|---------|-------|
| Submit Expense | ✓ | ✓ | ✓ |
| Approve Expense | - | ✓ | ✓ |
| Configure Rules | - | - | ✓ |
| View All Approvals | - | ✓ | ✓ |
| Override Decisions | - | - | ✓ |

## Integration Points

### Expense Management System
- Seamless integration with existing expense creation and management
- Automatic status updates based on approval decisions
- Receipt attachment support in approval process

### Notification System
- Email notifications for approval requests and decisions
- In-app notification center for real-time updates
- Configurable notification preferences

### Audit Trail
- Complete history of approval decisions
- User action tracking
- Compliance reporting capabilities

## Performance Considerations

### Scalability
- Efficient rule evaluation using indexed queries
- Batch processing for bulk approvals
- Caching of frequently accessed approval rules

### Optimization
- Lazy loading of approval history
- Pagination for large approval lists
- Background processing for notifications

## Compliance and Audit

### Audit Trail Requirements
- All approval decisions must be logged
- User actions must be traceable
- Approval rule changes must be versioned
- Compliance with Zambian financial regulations

### Data Retention
- Approval records retained for regulatory periods
- Soft delete for approval requests
- Archive old approval data for performance

## Future Enhancements

### Advanced Features
- Multi-level approval workflows
- Conditional approval routing
- Integration with external approval systems
- Mobile app notifications
- AI-powered approval recommendations

### Analytics
- Approval time analytics
- Bottleneck identification
- Approval pattern analysis
- Performance metrics and KPIs
