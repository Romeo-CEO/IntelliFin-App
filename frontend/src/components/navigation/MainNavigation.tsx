'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  DollarSign,
  Receipt,
  BarChart3,
  Building2,
  Calculator,
  TrendingUp,
  Menu,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavigationItem[];
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    id: 'customers',
    label: 'Customers',
    href: '/dashboard/customers',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'invoices',
    label: 'Invoices',
    href: '/dashboard/invoices',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'payments',
    label: 'Payments',
    href: '/dashboard/payments',
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    id: 'expenses',
    label: 'Expenses',
    href: '/dashboard/expenses',
    icon: <Receipt className="w-5 h-5" />,
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: <Calculator className="w-5 h-5" />,
    children: [
      {
        id: 'chart-of-accounts',
        label: 'Chart of Accounts',
        href: '/dashboard/accounting',
        icon: <Building2 className="w-4 h-4" />,
      },
      {
        id: 'journal-entries',
        label: 'Journal Entries',
        href: '/dashboard/accounting/journal-entries',
        icon: <FileText className="w-4 h-4" />,
      },
      {
        id: 'financial-reports',
        label: 'Financial Reports',
        href: '/dashboard/accounting/reports',
        icon: <BarChart3 className="w-4 h-4" />,
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/dashboard/reports',
    icon: <TrendingUp className="w-5 h-5" />,
  },
];

interface MainNavigationProps {
  className?: string;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['accounting']));

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const isParentActive = (children?: NavigationItem[]) => {
    if (!children) return false;
    return children.some(child => isActive(child.href));
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const itemIsActive = isActive(item.href);
    const parentIsActive = isParentActive(item.children);

    if (hasChildren) {
      return (
        <div key={item.id} className="nav-group">
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`nav-item nav-group-toggle ${parentIsActive ? 'active' : ''}`}
            style={{ paddingLeft: `${16 + level * 16}px` }}
          >
            <div className="nav-item-content">
              <div className="nav-item-icon">{item.icon}</div>
              <span className="nav-item-label">{item.label}</span>
              {item.badge && (
                <span className="nav-item-badge">{item.badge}</span>
              )}
            </div>
            <div className="nav-item-chevron">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </button>
          
          {isExpanded && (
            <div className="nav-children">
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.href!}
        className={`nav-item ${itemIsActive ? 'active' : ''}`}
        style={{ paddingLeft: `${16 + level * 16}px` }}
        onClick={() => setIsMobileOpen(false)}
      >
        <div className="nav-item-content">
          <div className="nav-item-icon">{item.icon}</div>
          <span className="nav-item-label">{item.label}</span>
          {item.badge && (
            <span className="nav-item-badge">{item.badge}</span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Navigation Sidebar */}
      <nav className={`main-navigation ${isMobileOpen ? 'mobile-open' : ''} ${className}`}>
        <div className="nav-header">
          <div className="nav-logo">
            <DollarSign className="w-8 h-8 text-primary" />
            <span className="nav-logo-text">IntelliFin</span>
          </div>
        </div>

        <div className="nav-content">
          <div className="nav-items">
            {navigationItems.map(item => renderNavigationItem(item))}
          </div>
        </div>

        <div className="nav-footer">
          <div className="nav-user">
            <div className="user-avatar">
              <span>U</span>
            </div>
            <div className="user-info">
              <div className="user-name">User Name</div>
              <div className="user-role">Admin</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.mobile-menu-button {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1001;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.main-navigation {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transform: translateX(0);
  transition: transform 0.3s ease;
}

.nav-header {
  padding: 24px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-neutral-900);
}

.nav-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  color: var(--color-neutral-700);
  text-decoration: none;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
}

.nav-item:hover {
  background: var(--color-neutral-100);
  color: var(--color-neutral-900);
}

.nav-item.active {
  background: var(--color-primary);
  color: white;
}

.nav-item-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.nav-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-item-label {
  flex: 1;
}

.nav-item-badge {
  background: var(--color-semantic-error);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.nav-item-chevron {
  display: flex;
  align-items: center;
  color: var(--color-neutral-500);
}

.nav-group-toggle {
  border-radius: 0;
}

.nav-children {
  background: var(--color-neutral-50);
}

.nav-children .nav-item {
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
}

.nav-children .nav-item:hover {
  background: var(--color-neutral-200);
}

.nav-children .nav-item.active {
  background: var(--color-primary);
  color: white;
}

.nav-footer {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: var(--color-neutral-900);
  font-size: 0.875rem;
}

.user-role {
  font-size: 0.75rem;
  color: var(--color-neutral-600);
}

.mobile-overlay {
  display: none;
}

@media (max-width: 768px) {
  .mobile-menu-button {
    display: block;
  }

  .main-navigation {
    transform: translateX(-100%);
  }

  .main-navigation.mobile-open {
    transform: translateX(0);
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
}
`;
