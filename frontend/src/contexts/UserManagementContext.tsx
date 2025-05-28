'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types for user management
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string;
  message?: string;
  inviterName: string;
  createdAt: string;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  RESENT = 'RESENT',
}

export interface CreateInvitationData {
  email: string;
  role: UserRole;
  message?: string;
}

export interface UserManagementContextType {
  // Users
  users: User[];
  selectedUser: User | null;
  isLoadingUsers: boolean;
  usersError: string | null;
  
  // Invitations
  invitations: Invitation[];
  selectedInvitation: Invitation | null;
  isLoadingInvitations: boolean;
  invitationsError: string | null;
  
  // Actions
  loadUsers: () => Promise<void>;
  loadInvitations: () => Promise<void>;
  createInvitation: (data: CreateInvitationData) => Promise<void>;
  resendInvitation: (id: string, message?: string) => Promise<void>;
  cancelInvitation: (id: string) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  
  // Selection
  selectUser: (user: User | null) => void;
  selectInvitation: (invitation: Invitation | null) => void;
  
  // Filters and pagination
  userFilters: {
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  };
  invitationFilters: {
    status?: InvitationStatus;
    search?: string;
  };
  setUserFilters: (filters: any) => void;
  setInvitationFilters: (filters: any) => void;
  
  // Permissions
  canInviteUsers: boolean;
  canManageUsers: boolean;
  canDeleteUsers: boolean;
}

const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);

interface UserManagementProviderProps {
  children: ReactNode;
}

export function UserManagementProvider({ children }: UserManagementProviderProps) {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  
  const [userFilters, setUserFilters] = useState<any>({});
  const [invitationFilters, setInvitationFilters] = useState<any>({});

  // Load users
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUsersError(null);
    
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      
      const data = await response.json();
      setUsers(data.users || data);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Load invitations
  const loadInvitations = useCallback(async () => {
    setIsLoadingInvitations(true);
    setInvitationsError(null);
    
    try {
      const response = await fetch('/api/invitations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load invitations');
      }
      
      const data = await response.json();
      setInvitations(data.invitations || data);
    } catch (error) {
      setInvitationsError(error instanceof Error ? error.message : 'Failed to load invitations');
    } finally {
      setIsLoadingInvitations(false);
    }
  }, []);

  // Create invitation
  const createInvitation = useCallback(async (data: CreateInvitationData) => {
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create invitation');
      }
      
      // Reload invitations
      await loadInvitations();
    } catch (error) {
      throw error;
    }
  }, [loadInvitations]);

  // Resend invitation
  const resendInvitation = useCallback(async (id: string, message?: string) => {
    try {
      const response = await fetch(`/api/invitations/${id}/resend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resend invitation');
      }
      
      // Reload invitations
      await loadInvitations();
    } catch (error) {
      throw error;
    }
  }, [loadInvitations]);

  // Cancel invitation
  const cancelInvitation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel invitation');
      }
      
      // Reload invitations
      await loadInvitations();
    } catch (error) {
      throw error;
    }
  }, [loadInvitations]);

  // Update user role
  const updateUserRole = useCallback(async (userId: string, role: UserRole) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user role');
      }
      
      // Reload users
      await loadUsers();
    } catch (error) {
      throw error;
    }
  }, [loadUsers]);

  // Update user status
  const updateUserStatus = useCallback(async (userId: string, status: UserStatus) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user status');
      }
      
      // Reload users
      await loadUsers();
    } catch (error) {
      throw error;
    }
  }, [loadUsers]);

  // Delete user
  const deleteUser = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      
      // Reload users
      await loadUsers();
    } catch (error) {
      throw error;
    }
  }, [loadUsers]);

  // Selection functions
  const selectUser = useCallback((user: User | null) => {
    setSelectedUser(user);
  }, []);

  const selectInvitation = useCallback((invitation: Invitation | null) => {
    setSelectedInvitation(invitation);
  }, []);

  // Permission checks (simplified - in real app, this would check actual user permissions)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canInviteUsers = [UserRole.TENANT_ADMIN, UserRole.ADMIN].includes(currentUser.role);
  const canManageUsers = [UserRole.TENANT_ADMIN, UserRole.ADMIN].includes(currentUser.role);
  const canDeleteUsers = [UserRole.TENANT_ADMIN].includes(currentUser.role);

  const value: UserManagementContextType = {
    users,
    selectedUser,
    isLoadingUsers,
    usersError,
    invitations,
    selectedInvitation,
    isLoadingInvitations,
    invitationsError,
    loadUsers,
    loadInvitations,
    createInvitation,
    resendInvitation,
    cancelInvitation,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    selectUser,
    selectInvitation,
    userFilters,
    invitationFilters,
    setUserFilters,
    setInvitationFilters,
    canInviteUsers,
    canManageUsers,
    canDeleteUsers,
  };

  return (
    <UserManagementContext.Provider value={value}>
      {children}
    </UserManagementContext.Provider>
  );
}

export function useUserManagement() {
  const context = useContext(UserManagementContext);
  if (context === undefined) {
    throw new Error('useUserManagement must be used within a UserManagementProvider');
  }
  return context;
}
