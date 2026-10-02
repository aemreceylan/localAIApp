/**
 * @file auth.types.ts
 * @description Kimlik doğrulama, kullanıcı profili ve oturum durum tipleri.
 */

export type UserRole = 'superadmin' | 'admin' | 'tenant_admin' | 'user';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  systemRole?: 'superadmin' | 'admin' | 'user';
  roles?: string[];
  customPermissions?: {
    allow: string[];
    deny: string[];
  };
  isActive: boolean;
  createdAt?: string | Date;
}

export interface SetupSuperAdminPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SetupStatusResponse {
  isSetupRequired: boolean;
}
