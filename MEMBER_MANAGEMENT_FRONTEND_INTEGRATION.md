# Member Management System - Frontend Integration Guide

## 📋 Overview

This document provides comprehensive guidance for integrating the Member Management System with your frontend application. The system follows a **User => Team => Member** hierarchy with advanced features like status management, permissions, and team analytics.

## 🎯 API Base URL
```
Base URL: {API_BASE_URL}/members
```

---

## 🚀 Quick Start Integration

### 1. TypeScript Interfaces

Create these interfaces in your frontend for type safety:

```typescript
// types/member.types.ts
export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

export interface Member {
  _id: string;
  user: string | User; // ObjectId or populated User object
  role: string | Role; // ObjectId or populated Role object  
  team: string | Team; // ObjectId or populated Team object
  status: MemberStatus;
  permissions: string[];
  joinedAt: Date;
  lastActiveAt?: Date;
  notes?: string;
  
  // Invitation fields
  inviteToken?: string;
  inviteTokenExpiresAt?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberQuery {
  teamId?: string;
  userId?: string;
  status?: MemberStatus;
  page?: number;
  limit?: number;
}

export interface CreateMemberData {
  user: string;
  role: string;
  team: string;
  status?: MemberStatus;
  permissions?: string[];
  joinedAt?: Date;
  notes?: string;
  invitedBy?: string;
}

export interface UpdateMemberData {
  role?: string;
  status?: MemberStatus;
  permissions?: string[];
  notes?: string;
  lastActiveAt?: Date;
}
```

### 2. API Service Class

```typescript
// services/memberService.ts
import axios from 'axios';
import { Member, MemberQuery, CreateMemberData, UpdateMemberData, MemberStatus } from '../types/member.types';

class MemberService {
  private baseURL = `${process.env.REACT_APP_API_BASE_URL}/members`;

  // ==================== BASIC CRUD ====================
  
  /**
   * Get all members with optional filtering
   */
  async getMembers(query?: MemberQuery): Promise<Member[]> {
    const params = new URLSearchParams();
    
    if (query?.teamId) params.append('teamId', query.teamId);
    if (query?.userId) params.append('userId', query.userId);
    if (query?.status) params.append('status', query.status);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await axios.get(`${this.baseURL}?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a specific member by ID
   */
  async getMember(memberId: string): Promise<Member> {
    const response = await axios.get(`${this.baseURL}/${memberId}`);
    return response.data;
  }

  /**
   * Create a new member
   */
  async createMember(memberData: CreateMemberData): Promise<Member> {
    const response = await axios.post(this.baseURL, memberData);
    return response.data;
  }

  /**
   * Update an existing member
   */
  async updateMember(memberId: string, updateData: UpdateMemberData): Promise<Member> {
    const response = await axios.put(`${this.baseURL}/${memberId}`, updateData);
    return response.data;
  }

  /**
   * Remove a member (soft delete)
   */
  async removeMember(memberId: string): Promise<Member> {
    const response = await axios.delete(`${this.baseURL}/${memberId}`);
    return response.data;
  }

  // ==================== TEAM-BASED QUERIES ====================

  /**
   * Get all members of a specific team
   */
  async getTeamMembers(teamId: string, query?: Partial<MemberQuery>): Promise<Member[]> {
    const params = new URLSearchParams();
    
    if (query?.status) params.append('status', query.status);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await axios.get(`${this.baseURL}/team/${teamId}?${params.toString()}`);
    return response.data;
  }

  /**
   * Get count of all team members
   */
  async getTeamMembersCount(teamId: string): Promise<number> {
    const response = await axios.get(`${this.baseURL}/team/${teamId}/count`);
    return response.data.count;
  }

  /**
   * Get count of active team members
   */
  async getActiveTeamMembersCount(teamId: string): Promise<number> {
    const response = await axios.get(`${this.baseURL}/team/${teamId}/count/active`);
    return response.data.count;
  }

  /**
   * Get team members by status
   */
  async getTeamMembersByStatus(teamId: string, status: MemberStatus): Promise<Member[]> {
    const response = await axios.get(`${this.baseURL}/team/${teamId}/status/${status}`);
    return response.data;
  }

  // ==================== USER-BASED QUERIES ====================

  /**
   * Get all teams where user is a member
   */
  async getUserMemberships(userId: string, query?: Partial<MemberQuery>): Promise<Member[]> {
    const params = new URLSearchParams();
    
    if (query?.status) params.append('status', query.status);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await axios.get(`${this.baseURL}/user/${userId}?${params.toString()}`);
    return response.data;
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Check if user is a member of specific team
   */
  async isMember(userId: string, teamId: string): Promise<boolean> {
    const response = await axios.get(`${this.baseURL}/check/${userId}/${teamId}`);
    return response.data.isMember;
  }

  /**
   * Get user's role in specific team
   */
  async getUserRoleInTeam(userId: string, teamId: string): Promise<Member | null> {
    try {
      const response = await axios.get(`${this.baseURL}/role/${userId}/${teamId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  /**
   * Check if user has specific permission in team
   */
  async hasPermission(userId: string, teamId: string, permission: string): Promise<boolean> {
    const response = await axios.get(`${this.baseURL}/permission/${userId}/${teamId}/${permission}`);
    return response.data.hasPermission;
  }

  // ==================== STATUS MANAGEMENT ====================

  /**
   * Update member status
   */
  async updateMemberStatus(memberId: string, status: MemberStatus): Promise<Member> {
    const response = await axios.patch(`${this.baseURL}/${memberId}/status`, { status });
    return response.data;
  }

  /**
   * Update member permissions
   */
  async updateMemberPermissions(memberId: string, permissions: string[]): Promise<Member> {
    const response = await axios.patch(`${this.baseURL}/${memberId}/permissions`, { permissions });
    return response.data;
  }
}

export const memberService = new MemberService();
```

---

## 🎨 React Hooks Examples

### 1. Basic Member Management Hook

```typescript
// hooks/useMembers.ts
import { useState, useEffect } from 'react';
import { memberService } from '../services/memberService';
import { Member, MemberQuery } from '../types/member.types';

export const useMembers = (query?: MemberQuery) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await memberService.getMembers(query);
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [JSON.stringify(query)]);

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    setMembers
  };
};
```

### 2. Team Members Hook

```typescript
// hooks/useTeamMembers.ts
import { useState, useEffect } from 'react';
import { memberService } from '../services/memberService';
import { Member, MemberStatus } from '../types/member.types';

export const useTeamMembers = (teamId: string) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [membersData, totalCountData, activeCountData] = await Promise.all([
        memberService.getTeamMembers(teamId),
        memberService.getTeamMembersCount(teamId),
        memberService.getActiveTeamMembersCount(teamId)
      ]);

      setMembers(membersData);
      setTotalCount(totalCountData);
      setActiveCount(activeCountData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId]);

  const addMember = async (memberData: CreateMemberData) => {
    const newMember = await memberService.createMember(memberData);
    setMembers(prev => [...prev, newMember]);
    setTotalCount(prev => prev + 1);
    if (newMember.status === MemberStatus.ACTIVE) {
      setActiveCount(prev => prev + 1);
    }
    return newMember;
  };

  const updateMemberStatus = async (memberId: string, status: MemberStatus) => {
    const updatedMember = await memberService.updateMemberStatus(memberId, status);
    setMembers(prev => prev.map(m => m._id === memberId ? updatedMember : m));
    
    // Update counts
    await fetchTeamData(); // Refetch for accurate counts
    return updatedMember;
  };

  const removeMember = async (memberId: string) => {
    await memberService.removeMember(memberId);
    setMembers(prev => prev.filter(m => m._id !== memberId));
    setTotalCount(prev => prev - 1);
    // Refetch for accurate active count
    const newActiveCount = await memberService.getActiveTeamMembersCount(teamId);
    setActiveCount(newActiveCount);
  };

  return {
    members,
    totalCount,
    activeCount,
    loading,
    error,
    refetch: fetchTeamData,
    addMember,
    updateMemberStatus,
    removeMember
  };
};
```

### 3. Permission Check Hook

```typescript
// hooks/usePermissions.ts
import { useState, useEffect } from 'react';
import { memberService } from '../services/memberService';

export const usePermissions = (userId: string, teamId: string, permissions: string[]) => {
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!userId || !teamId || permissions.length === 0) return;
      
      setLoading(true);
      const results: Record<string, boolean> = {};
      
      await Promise.all(
        permissions.map(async (permission) => {
          try {
            results[permission] = await memberService.hasPermission(userId, teamId, permission);
          } catch {
            results[permission] = false;
          }
        })
      );
      
      setPermissionMap(results);
      setLoading(false);
    };

    checkPermissions();
  }, [userId, teamId, JSON.stringify(permissions)]);

  return {
    permissions: permissionMap,
    loading,
    hasPermission: (permission: string) => permissionMap[permission] || false
  };
};
```

---

## 🎯 UI Component Examples

### 1. Member List Component

```tsx
// components/MemberList.tsx
import React from 'react';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { Member, MemberStatus } from '../types/member.types';

interface MemberListProps {
  teamId: string;
  onMemberSelect?: (member: Member) => void;
}

export const MemberList: React.FC<MemberListProps> = ({ teamId, onMemberSelect }) => {
  const { members, totalCount, activeCount, loading, error } = useTeamMembers(teamId);

  if (loading) return <div className="loading">Loading members...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const getStatusColor = (status: MemberStatus) => {
    switch (status) {
      case MemberStatus.ACTIVE: return 'text-green-600';
      case MemberStatus.INACTIVE: return 'text-gray-500';
      case MemberStatus.PENDING: return 'text-yellow-600';
      case MemberStatus.SUSPENDED: return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="member-list">
      {/* Header with stats */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Team Members</h3>
        <div className="flex gap-4 text-sm">
          <span>Total: <strong>{totalCount}</strong></span>
          <span>Active: <strong className="text-green-600">{activeCount}</strong></span>
          <span>Inactive: <strong className="text-gray-500">{totalCount - activeCount}</strong></span>
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member._id}
            onClick={() => onMemberSelect?.(member)}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                {/* User avatar or initials */}
                U
              </div>
              <div>
                <div className="font-medium">{member.user}</div>
                <div className="text-sm text-gray-500">Role: {member.role}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${getStatusColor(member.status)}`}>
                {member.status}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(member.joinedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No members found
        </div>
      )}
    </div>
  );
};
```

### 2. Add Member Modal

```tsx
// components/AddMemberModal.tsx
import React, { useState } from 'react';
import { CreateMemberData, MemberStatus } from '../types/member.types';

interface AddMemberModalProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMemberData) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  teamId,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Partial<CreateMemberData>>({
    team: teamId,
    status: MemberStatus.ACTIVE,
    permissions: []
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user || !formData.role) return;

    setLoading(true);
    try {
      await onSubmit(formData as CreateMemberData);
      onClose();
      setFormData({ team: teamId, status: MemberStatus.ACTIVE });
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add Team Member</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">User</label>
            <select
              value={formData.user || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, user: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Select User</option>
              {/* Add your user options here */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={formData.role || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Select Role</option>
              {/* Add your role options here */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as MemberStatus }))}
              className="w-full p-2 border rounded-md"
            >
              {Object.values(MemberStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-2 border rounded-md"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### 3. Member Status Badge Component

```tsx
// components/MemberStatusBadge.tsx
import React from 'react';
import { MemberStatus } from '../types/member.types';

interface MemberStatusBadgeProps {
  status: MemberStatus;
  className?: string;
}

export const MemberStatusBadge: React.FC<MemberStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: MemberStatus) => {
    switch (status) {
      case MemberStatus.ACTIVE:
        return { color: 'bg-green-100 text-green-800', label: 'Active' };
      case MemberStatus.INACTIVE:
        return { color: 'bg-gray-100 text-gray-800', label: 'Inactive' };
      case MemberStatus.PENDING:
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
      case MemberStatus.SUSPENDED:
        return { color: 'bg-red-100 text-red-800', label: 'Suspended' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}>
      {config.label}
    </span>
  );
};
```

---

## 📊 Advanced Integration Examples

### 1. Team Dashboard with Member Analytics

```tsx
// components/TeamDashboard.tsx
import React from 'react';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { MemberList } from './MemberList';
import { MemberStatus } from '../types/member.types';

interface TeamDashboardProps {
  teamId: string;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ teamId }) => {
  const { members, totalCount, activeCount, loading } = useTeamMembers(teamId);

  const statusCounts = members.reduce((acc, member) => {
    acc[member.status] = (acc[member.status] || 0) + 1;
    return acc;
  }, {} as Record<MemberStatus, number>);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="team-dashboard">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
          <div className="text-sm text-gray-600">Total Members</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          <div className="text-sm text-gray-600">Active Members</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">{statusCounts[MemberStatus.PENDING] || 0}</div>
          <div className="text-sm text-gray-600">Pending Approval</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{statusCounts[MemberStatus.SUSPENDED] || 0}</div>
          <div className="text-sm text-gray-600">Suspended</div>
        </div>
      </div>

      {/* Member List */}
      <div className="bg-white rounded-lg border">
        <MemberList teamId={teamId} />
      </div>
    </div>
  );
};
```

### 2. Permission-Based Component Wrapper

```tsx
// components/PermissionWrapper.tsx
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionWrapperProps {
  userId: string;
  teamId: string;
  requiredPermissions: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  userId,
  teamId,
  requiredPermissions,
  fallback = null,
  children
}) => {
  const { permissions, loading } = usePermissions(userId, teamId, requiredPermissions);

  if (loading) return <div>Checking permissions...</div>;

  const hasAllPermissions = requiredPermissions.every(permission => permissions[permission]);

  if (!hasAllPermissions) return <>{fallback}</>;

  return <>{children}</>;
};

// Usage example:
// <PermissionWrapper
//   userId={currentUser.id}
//   teamId={team.id}
//   requiredPermissions={['manage_members', 'edit_team']}
//   fallback={<div>You don't have permission to view this</div>}
// >
//   <AdminPanel />
// </PermissionWrapper>
```

---

## 🔒 Security & Best Practices

### 1. Authentication Headers
```typescript
// Add to your axios instance
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. Error Handling
```typescript
// Enhanced error handling in service
const handleApiError = (error: any) => {
  if (error.response?.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.response?.status === 403) {
    throw new Error('You do not have permission to perform this action');
  } else if (error.response?.status === 404) {
    throw new Error('Member not found');
  } else if (error.response?.status === 409) {
    throw new Error('User is already a member of this team');
  } else {
    throw new Error(error.response?.data?.message || 'An error occurred');
  }
};
```

### 3. Optimistic Updates
```typescript
// In your hooks - update UI immediately, rollback on error
const updateMemberStatus = async (memberId: string, status: MemberStatus) => {
  // Optimistic update
  setMembers(prev => prev.map(m => 
    m._id === memberId ? { ...m, status } : m
  ));

  try {
    const updatedMember = await memberService.updateMemberStatus(memberId, status);
    // Confirm update
    setMembers(prev => prev.map(m => 
      m._id === memberId ? updatedMember : m
    ));
  } catch (error) {
    // Rollback on error
    setMembers(prev => prev.map(m => 
      m._id === memberId ? { ...m, status: m.status } : m
    ));
    throw error;
  }
};
```

---

## 🚀 Performance Optimization

### 1. Caching Strategy
```typescript
// Use React Query for caching
import { useQuery, useMutation, useQueryClient } from 'react-query';

export const useTeamMembersQuery = (teamId: string) => {
  return useQuery(
    ['teamMembers', teamId],
    () => memberService.getTeamMembers(teamId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};
```

### 2. Pagination Implementation
```typescript
const usePaginatedMembers = (teamId: string, pageSize = 20) => {
  const [page, setPage] = useState(1);
  
  const { data, loading, error } = useMembers({
    teamId,
    page,
    limit: pageSize
  });

  return {
    members: data || [],
    loading,
    error,
    currentPage: page,
    setPage,
    hasNextPage: data?.length === pageSize,
    hasPrevPage: page > 1
  };
};
```

---

## 📋 Checklist for Integration

- [ ] Set up TypeScript interfaces
- [ ] Create API service class
- [ ] Implement authentication headers
- [ ] Add error handling
- [ ] Create basic hooks (useMembers, useTeamMembers)
- [ ] Build UI components (MemberList, AddMemberModal)
- [ ] Implement permission checking
- [ ] Add loading states and error messages
- [ ] Set up caching strategy
- [ ] Implement pagination if needed
- [ ] Add optimistic updates for better UX
- [ ] Test all CRUD operations
- [ ] Test permission-based features
- [ ] Add proper error boundaries

---

## 🎯 Ready-to-Use API Endpoints Summary

```
GET    /members                                    # List all members with filters
GET    /members/:id                               # Get specific member
POST   /members                                   # Create new member
PUT    /members/:id                              # Update member
DELETE /members/:id                              # Remove member
PATCH  /members/:id/status                       # Update status
PATCH  /members/:id/permissions                  # Update permissions

GET    /members/team/:teamId                     # Get team members  
GET    /members/team/:teamId/count               # Count team members
GET    /members/team/:teamId/count/active        # Count active members
GET    /members/team/:teamId/status/:status      # Get members by status

GET    /members/user/:userId                     # Get user memberships

GET    /members/check/:userId/:teamId            # Check membership
GET    /members/role/:userId/:teamId             # Get user role
GET    /members/permission/:userId/:teamId/:perm # Check permission
```

This comprehensive integration guide provides everything needed to build a full-featured member management system in your frontend application! 🚀