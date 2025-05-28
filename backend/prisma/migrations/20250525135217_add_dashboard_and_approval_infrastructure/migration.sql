-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED', 'RESENT');

-- CreateEnum
CREATE TYPE "CategorizationRuleType" AS ENUM ('KEYWORD_MATCH', 'AMOUNT_RANGE', 'COUNTERPARTY_MATCH', 'DESCRIPTION_PATTERN', 'COMBINED_RULE');

-- CreateEnum
CREATE TYPE "CategorizationConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ApprovalPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'ESCALATED', 'DELEGATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('METRIC_CARD', 'CHART_LINE', 'CHART_BAR', 'CHART_PIE', 'CHART_DOUGHNUT', 'TABLE', 'LIST', 'CALENDAR', 'PROGRESS', 'GAUGE', 'MAP', 'TEXT', 'IMAGE', 'IFRAME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DashboardPermissionType" AS ENUM ('VIEW', 'EDIT', 'ADMIN');

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "tenant_id" UUID NOT NULL,
    "organization_id" UUID,
    "invited_by" UUID NOT NULL,
    "invited_user" UUID,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorization_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "CategorizationRuleType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB NOT NULL,
    "description" TEXT,
    "confidence" "CategorizationConfidence" NOT NULL DEFAULT 'MEDIUM',
    "match_count" INTEGER NOT NULL DEFAULT 0,
    "last_matched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "categorization_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_category_suggestions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "rule_id" UUID,
    "confidence" "CategorizationConfidence" NOT NULL,
    "reason" TEXT,
    "is_accepted" BOOLEAN,
    "accepted_at" TIMESTAMP(3),
    "accepted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_category_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "ApprovalPriority" NOT NULL DEFAULT 'NORMAL',
    "due_date" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "total_amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_tasks" (
    "id" UUID NOT NULL,
    "approval_request_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "status" "ApprovalTaskStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "ApprovalDecision",
    "comments" TEXT,
    "decided_at" TIMESTAMP(3),
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "delegated_from" UUID,
    "escalated_from" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "match_count" INTEGER NOT NULL DEFAULT 0,
    "last_matched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_history" (
    "id" UUID NOT NULL,
    "approval_request_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "from_status" "ApprovalRequestStatus",
    "to_status" "ApprovalRequestStatus",
    "comments" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_delegates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "delegator_id" UUID NOT NULL,
    "delegate_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "reason" TEXT,
    "amount_limit" DECIMAL(15,2),
    "category_ids" UUID[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_delegates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboards" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB NOT NULL,
    "settings" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" UUID NOT NULL,
    "dashboard_id" UUID NOT NULL,
    "widget_type" "WidgetType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "position" JSONB NOT NULL,
    "configuration" JSONB NOT NULL,
    "dataSource" JSONB,
    "refresh_interval" INTEGER,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_permissions" (
    "id" UUID NOT NULL,
    "dashboard_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permission" "DashboardPermissionType" NOT NULL,
    "granted_by" UUID NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_tenant_id_idx" ON "user_invitations"("tenant_id");

-- CreateIndex
CREATE INDEX "user_invitations_email_idx" ON "user_invitations"("email");

-- CreateIndex
CREATE INDEX "user_invitations_token_idx" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_status_idx" ON "user_invitations"("status");

-- CreateIndex
CREATE INDEX "user_invitations_expires_at_idx" ON "user_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "user_invitations_invited_by_idx" ON "user_invitations"("invited_by");

-- CreateIndex
CREATE INDEX "categorization_rules_organization_id_idx" ON "categorization_rules"("organization_id");

-- CreateIndex
CREATE INDEX "categorization_rules_category_id_idx" ON "categorization_rules"("category_id");

-- CreateIndex
CREATE INDEX "categorization_rules_type_idx" ON "categorization_rules"("type");

-- CreateIndex
CREATE INDEX "categorization_rules_is_active_idx" ON "categorization_rules"("is_active");

-- CreateIndex
CREATE INDEX "categorization_rules_priority_idx" ON "categorization_rules"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "categorization_rules_organization_id_name_key" ON "categorization_rules"("organization_id", "name");

-- CreateIndex
CREATE INDEX "transaction_category_suggestions_organization_id_idx" ON "transaction_category_suggestions"("organization_id");

-- CreateIndex
CREATE INDEX "transaction_category_suggestions_transaction_id_idx" ON "transaction_category_suggestions"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_category_suggestions_category_id_idx" ON "transaction_category_suggestions"("category_id");

-- CreateIndex
CREATE INDEX "transaction_category_suggestions_rule_id_idx" ON "transaction_category_suggestions"("rule_id");

-- CreateIndex
CREATE INDEX "transaction_category_suggestions_confidence_idx" ON "transaction_category_suggestions"("confidence");

-- CreateIndex
CREATE INDEX "transaction_category_suggestions_is_accepted_idx" ON "transaction_category_suggestions"("is_accepted");

-- CreateIndex
CREATE INDEX "transaction_category_suggestions_created_at_idx" ON "transaction_category_suggestions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_category_suggestions_transaction_id_category_id_key" ON "transaction_category_suggestions"("transaction_id", "category_id");

-- CreateIndex
CREATE INDEX "approval_requests_organization_id_idx" ON "approval_requests"("organization_id");

-- CreateIndex
CREATE INDEX "approval_requests_expense_id_idx" ON "approval_requests"("expense_id");

-- CreateIndex
CREATE INDEX "approval_requests_requester_id_idx" ON "approval_requests"("requester_id");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_priority_idx" ON "approval_requests"("priority");

-- CreateIndex
CREATE INDEX "approval_requests_due_date_idx" ON "approval_requests"("due_date");

-- CreateIndex
CREATE INDEX "approval_requests_submitted_at_idx" ON "approval_requests"("submitted_at");

-- CreateIndex
CREATE INDEX "approval_tasks_approval_request_id_idx" ON "approval_tasks"("approval_request_id");

-- CreateIndex
CREATE INDEX "approval_tasks_approver_id_idx" ON "approval_tasks"("approver_id");

-- CreateIndex
CREATE INDEX "approval_tasks_status_idx" ON "approval_tasks"("status");

-- CreateIndex
CREATE INDEX "approval_tasks_decision_idx" ON "approval_tasks"("decision");

-- CreateIndex
CREATE INDEX "approval_tasks_sequence_idx" ON "approval_tasks"("sequence");

-- CreateIndex
CREATE INDEX "approval_tasks_created_at_idx" ON "approval_tasks"("created_at");

-- CreateIndex
CREATE INDEX "approval_rules_organization_id_idx" ON "approval_rules"("organization_id");

-- CreateIndex
CREATE INDEX "approval_rules_is_active_idx" ON "approval_rules"("is_active");

-- CreateIndex
CREATE INDEX "approval_rules_priority_idx" ON "approval_rules"("priority");

-- CreateIndex
CREATE INDEX "approval_rules_created_by_idx" ON "approval_rules"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "approval_rules_organization_id_name_key" ON "approval_rules"("organization_id", "name");

-- CreateIndex
CREATE INDEX "approval_history_approval_request_id_idx" ON "approval_history"("approval_request_id");

-- CreateIndex
CREATE INDEX "approval_history_user_id_idx" ON "approval_history"("user_id");

-- CreateIndex
CREATE INDEX "approval_history_action_idx" ON "approval_history"("action");

-- CreateIndex
CREATE INDEX "approval_history_created_at_idx" ON "approval_history"("created_at");

-- CreateIndex
CREATE INDEX "approval_delegates_organization_id_idx" ON "approval_delegates"("organization_id");

-- CreateIndex
CREATE INDEX "approval_delegates_delegator_id_idx" ON "approval_delegates"("delegator_id");

-- CreateIndex
CREATE INDEX "approval_delegates_delegate_id_idx" ON "approval_delegates"("delegate_id");

-- CreateIndex
CREATE INDEX "approval_delegates_is_active_idx" ON "approval_delegates"("is_active");

-- CreateIndex
CREATE INDEX "approval_delegates_start_date_idx" ON "approval_delegates"("start_date");

-- CreateIndex
CREATE INDEX "approval_delegates_end_date_idx" ON "approval_delegates"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "approval_delegates_delegator_id_delegate_id_start_date_key" ON "approval_delegates"("delegator_id", "delegate_id", "start_date");

-- CreateIndex
CREATE INDEX "dashboards_organization_id_idx" ON "dashboards"("organization_id");

-- CreateIndex
CREATE INDEX "dashboards_created_by_idx" ON "dashboards"("created_by");

-- CreateIndex
CREATE INDEX "dashboards_is_default_idx" ON "dashboards"("is_default");

-- CreateIndex
CREATE INDEX "dashboards_is_public_idx" ON "dashboards"("is_public");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboard_id_idx" ON "dashboard_widgets"("dashboard_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_widget_type_idx" ON "dashboard_widgets"("widget_type");

-- CreateIndex
CREATE INDEX "dashboard_widgets_is_visible_idx" ON "dashboard_widgets"("is_visible");

-- CreateIndex
CREATE INDEX "dashboard_permissions_dashboard_id_idx" ON "dashboard_permissions"("dashboard_id");

-- CreateIndex
CREATE INDEX "dashboard_permissions_user_id_idx" ON "dashboard_permissions"("user_id");

-- CreateIndex
CREATE INDEX "dashboard_permissions_permission_idx" ON "dashboard_permissions"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_permissions_dashboard_id_user_id_key" ON "dashboard_permissions"("dashboard_id", "user_id");

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_user_fkey" FOREIGN KEY ("invited_user") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_category_suggestions" ADD CONSTRAINT "transaction_category_suggestions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_category_suggestions" ADD CONSTRAINT "transaction_category_suggestions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_category_suggestions" ADD CONSTRAINT "transaction_category_suggestions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_category_suggestions" ADD CONSTRAINT "transaction_category_suggestions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "categorization_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_category_suggestions" ADD CONSTRAINT "transaction_category_suggestions_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_delegated_from_fkey" FOREIGN KEY ("delegated_from") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_escalated_from_fkey" FOREIGN KEY ("escalated_from") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegates" ADD CONSTRAINT "approval_delegates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegates" ADD CONSTRAINT "approval_delegates_delegator_id_fkey" FOREIGN KEY ("delegator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegates" ADD CONSTRAINT "approval_delegates_delegate_id_fkey" FOREIGN KEY ("delegate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_permissions" ADD CONSTRAINT "dashboard_permissions_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_permissions" ADD CONSTRAINT "dashboard_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_permissions" ADD CONSTRAINT "dashboard_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
