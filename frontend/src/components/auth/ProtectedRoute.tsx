'use client';

import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallbackPath = '/auth/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(fallbackPath);
        return;
      }

      // Check if user has required roles
      if (requiredRoles.length > 0 && user) {
        const hasRequiredRole = requiredRoles.includes(user.role);
        if (!hasRequiredRole) {
          router.push('/unauthorized');
          return;
        }
      }

      // Check if email is verified
      if (user && !user.emailVerified) {
        router.push('/auth/verify-email');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRoles, router, fallbackPath]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or doesn't have required roles
  if (!isAuthenticated || (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role))) {
    return null;
  }

  // Don't render if email not verified
  if (user && !user.emailVerified) {
    return null;
  }

  return <>{children}</>;
}
