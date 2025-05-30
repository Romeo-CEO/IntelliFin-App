'use client';

import React, { useState, useCallback } from 'react';

import { useDashboard } from '../../contexts/DashboardContext';
import { Dashboard } from '../../types/dashboard.types';

interface DashboardToolbarProps {
  dashboard: Dashboard;
  isEditing: boolean;
  onEditToggle: () => void;
  currentBreakpoint: string;
  className?: string;
}

/**
 * Dashboard toolbar component with editing controls and actions
 */
export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  dashboard,
  isEditing,
  onEditToggle,
  currentBreakpoint,
  className = '',
}) => {
  const {
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    setAsDefault,
    state
  } = useDashboard();

  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Handle dashboard settings update
  const handleSettingsUpdate = useCallback(async (settings: any) => {
    try {
      await updateDashboard(dashboard.id, { settings });
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to update dashboard settings:', error);
    }
  }, [dashboard.id, updateDashboard]);

  // Handle dashboard deletion
  const handleDelete = useCallback(async () => {
    if (window.confirm(`Are you sure you want to delete "${dashboard.name}"?`)) {
      try {
        await deleteDashboard(dashboard.id);
      } catch (error) {
        console.error('Failed to delete dashboard:', error);
      }
    }
  }, [dashboard.id, dashboard.name, deleteDashboard]);

  // Handle dashboard duplication
  const handleDuplicate = useCallback(async () => {
    const name = prompt('Enter name for the duplicated dashboard:', `${dashboard.name} (Copy)`);
    if (name) {
      try {
        await duplicateDashboard(dashboard.id, name);
      } catch (error) {
        console.error('Failed to duplicate dashboard:', error);
      }
    }
  }, [dashboard.id, dashboard.name, duplicateDashboard]);

  // Handle set as default
  const handleSetAsDefault = useCallback(async () => {
    try {
      await setAsDefault(dashboard.id);
    } catch (error) {
      console.error('Failed to set as default:', error);
    }
  }, [dashboard.id, setAsDefault]);

  // Get breakpoint display name
  const getBreakpointName = (bp: string) => {
    const names = {
      lg: 'Desktop',
      md: 'Tablet',
      sm: 'Mobile',
      xs: 'Small Mobile',
      xxs: 'Extra Small',
    };
    return names[bp as keyof typeof names] || bp;
  };

  return (
    <div className={`dashboard-toolbar ${className}`}>
      <div className="toolbar-content">
        {/* Dashboard Info */}
        <div className="dashboard-info">
          <h1 className="dashboard-title">
            {dashboard.name}
            {dashboard.isDefault && (
              <span className="default-badge">Default</span>
            )}
          </h1>
          {dashboard.description && (
            <p className="dashboard-description">{dashboard.description}</p>
          )}
        </div>

        {/* Toolbar Actions */}
        <div className="toolbar-actions">
          {/* Breakpoint Indicator */}
          <div className="breakpoint-indicator">
            <span className="text-xs text-gray-500">
              {getBreakpointName(currentBreakpoint)}
            </span>
          </div>

          {/* Edit Toggle */}
          <button
            onClick={onEditToggle}
            className={`edit-button ${isEditing ? 'active' : ''}`}
            title={isEditing ? 'Exit edit mode' : 'Enter edit mode'}
          >
            {isEditing ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Done
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="settings-button"
            title="Dashboard settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* More Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="menu-button"
              title="More actions"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="menu-dropdown">
                <div className="menu-items">
                  {!dashboard.isDefault && (
                    <button
                      onClick={() => {
                        handleSetAsDefault();
                        setShowMenu(false);
                      }}
                      className="menu-item"
                    >
                      <span>⭐</span>
                      Set as Default
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleDuplicate();
                      setShowMenu(false);
                    }}
                    className="menu-item"
                  >
                    <span>📋</span>
                    Duplicate
                  </button>

                  <button
                    onClick={() => {
                      // Export functionality would go here
                      setShowMenu(false);
                    }}
                    className="menu-item"
                  >
                    <span>📤</span>
                    Export
                  </button>

                  <div className="menu-divider" />

                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="menu-item danger"
                    disabled={dashboard.isDefault}
                  >
                    <span>🗑️</span>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.dashboard-toolbar {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 24px;
  position: relative;
}

.toolbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 100%;
}

.dashboard-info {
  flex: 1;
  min-width: 0;
}

.dashboard-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.default-badge {
  background: #10b981;
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
}

.dashboard-description {
  color: #6b7280;
  margin: 4px 0 0;
  font-size: 0.875rem;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breakpoint-indicator {
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #6b7280;
}

.edit-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-button:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.edit-button.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.settings-button,
.menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-button:hover,
.menu-button:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
  color: #374151;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  width: 160px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 50;
}

.menu-items {
  padding: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  font-size: 0.875rem;
  color: #374151;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background: #f3f4f6;
}

.menu-item.danger {
  color: #dc2626;
}

.menu-item.danger:hover {
  background: #fef2f2;
}

.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .dashboard-toolbar {
    padding: 12px 16px;
  }

  .toolbar-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .toolbar-actions {
    align-self: stretch;
    justify-content: flex-end;
  }

  .dashboard-title {
    font-size: 1.25rem;
  }

  .breakpoint-indicator {
    display: none;
  }
}
`;
