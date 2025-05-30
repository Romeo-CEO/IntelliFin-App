'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { ErrorMessage } from '../components/common/ErrorMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DashboardGrid } from '../components/dashboard/DashboardGrid';
import { useDashboard } from '../contexts/DashboardContext';

/**
 * Main dashboard page component
 * Handles dashboard loading and rendering
 */
export const DashboardPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const {
    state,
    loadDashboard,
    loadDefaultDashboard,
    createDefaultDashboard,
    clearError
  } = useDashboard();

  const [isInitializing, setIsInitializing] = useState(true);

  // Load dashboard on mount
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsInitializing(true);
        clearError();

        if (id) {
          // Load specific dashboard
          await loadDashboard(id);
        } else {
          // Load default dashboard
          await loadDefaultDashboard();

          // If no default dashboard exists, create one
          if (!state.currentDashboard) {
            const defaultDashboard = await createDefaultDashboard();
            router.replace(`/dashboard/${defaultDashboard.id}`);
          }
        }
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDashboard();
  }, [id, loadDashboard, loadDefaultDashboard, createDefaultDashboard, router, clearError]);

  // Handle retry
  const handleRetry = () => {
    if (id) {
      loadDashboard(id);
    } else {
      loadDefaultDashboard();
    }
  };

  // Show loading state during initialization
  if (isInitializing || state.isLoading) {
    return (
      <div className="dashboard-page loading">
        <div className="loading-container">
          <LoadingSpinner size="lg" />
          <div className="loading-text">
            {isInitializing ? 'Initializing dashboard...' : 'Loading dashboard...'}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (state.error) {
    return (
      <div className="dashboard-page error">
        <ErrorMessage
          title="Dashboard Error"
          message={state.error}
          onRetry={handleRetry}
          actions={[
            {
              label: 'Go to Default Dashboard',
              onClick: () => router.push('/dashboard'),
              variant: 'secondary',
            },
            {
              label: 'Create New Dashboard',
              onClick: () => router.push('/dashboard/new'),
              variant: 'primary',
            },
          ]}
        />
      </div>
    );
  }

  // Show empty state if no dashboard
  if (!state.currentDashboard) {
    return (
      <div className="dashboard-page empty">
        <div className="empty-container">
          <div className="empty-icon">📊</div>
          <h2 className="empty-title">No Dashboard Found</h2>
          <p className="empty-description">
            {id
              ? 'The requested dashboard could not be found or you do not have permission to view it.'
              : 'No default dashboard has been set up for your organization.'
            }
          </p>
          <div className="empty-actions">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-secondary"
            >
              Go to Default Dashboard
            </button>
            <button
              onClick={() => router.push('/dashboard/new')}
              className="btn btn-primary"
            >
              Create New Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <DashboardGrid
        dashboard={state.currentDashboard}
        className="dashboard-main"
      />
    </div>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.dashboard-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.dashboard-page.loading,
.dashboard-page.error,
.dashboard-page.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.loading-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.empty-container {
  max-width: 400px;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}

.empty-description {
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.dashboard-main {
  width: 100%;
  height: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .dashboard-page.loading,
  .dashboard-page.error,
  .dashboard-page.empty {
    padding: 1rem;
  }

  .empty-container {
    max-width: 100%;
  }

  .empty-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
`;
