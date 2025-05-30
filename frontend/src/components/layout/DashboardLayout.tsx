'use client';

import React from 'react';

import { MainNavigation } from '../navigation/MainNavigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`dashboard-layout ${className}`}>
      <MainNavigation />
      
      <main className="dashboard-main">
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
}

.dashboard-main {
  flex: 1;
  margin-left: 280px;
  min-width: 0;
  transition: margin-left 0.3s ease;
}

.dashboard-content {
  min-height: 100vh;
  padding: 0;
}

@media (max-width: 768px) {
  .dashboard-main {
    margin-left: 0;
  }
  
  .dashboard-content {
    padding-top: 60px;
  }
}
`;
