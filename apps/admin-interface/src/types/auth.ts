/**
 * @file auth.ts
 * @description Kimlik doğrulama, kullanıcı, rol ve davet modelleri tip tanımları.
 */

export type SystemRole = 'superadmin' | 'admin' | 'user';
export type UserStatus = 'active' | 'pending_approval' | 'rejected' | 'banned';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: SystemRole;
  roles: string[];
  customPermissions: {
    allow: string[];
    deny: string[];
  };
  isActive: boolean;
  status: UserStatus;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface SetupStatus {
  isSetupComplete: boolean;
  isSetupRequired?: boolean;
  message?: string;
}

export interface Invitation {
  id: string;
  code: string;
  assignedRoles: string[];
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  createdBy?: string;
  createdAt: string;
  isExpired: boolean;
  isExhausted: boolean;
}

export interface CreateInvitationPayload {
  assignedRoles: string[];
  maxUses: number;
  expiresInHours: number;
}
