// Authentication Service for User Management with Role-Based Access Control

export type UserRole = 'admin' | 'supervisor' | 'worker';

export interface UserAccount {
  user_id: string;
  username: string;
  password_hash: string; // PBKDF2 derived hash
  salt: string;
  role: UserRole;
  email?: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface AuthSession {
  user_id: string;
  username: string;
  role: UserRole;
  login_time: string;
}

export interface RolePermissions {
  canAddWorker: boolean;
  canManageWorkers: boolean;
  canApproveAttendance: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canSyncData: boolean;
  canUpdateSettings: boolean;
}

// Password hashing using PBKDF2
async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  
  // Generate a random salt if not provided
  const saltBytes = salt 
    ? new Uint8Array(atob(salt).split('').map(c => c.charCodeAt(0)))
    : window.crypto.getRandomValues(new Uint8Array(16));
  
  const saltBase64 = btoa(String.fromCharCode(...saltBytes));
  
  // Create base key from password
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive the hash
  const hashBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );
  
  const hashArray = new Uint8Array(hashBits);
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  
  return { hash: hashBase64, salt: saltBase64 };
}

async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}

class AuthenticationService {
  private currentSession: AuthSession | null = null;

  // Get permissions for a role
  static getPermissions(role: UserRole): RolePermissions {
    const permissions: Record<UserRole, RolePermissions> = {
      admin: {
        canAddWorker: true,
        canManageWorkers: true,
        canApproveAttendance: true,
        canManageUsers: true,
        canViewReports: true,
        canSyncData: true,
        canUpdateSettings: true,
      },
      supervisor: {
        canAddWorker: false,
        canManageWorkers: true,
        canApproveAttendance: true,
        canManageUsers: false,
        canViewReports: true,
        canSyncData: false,
        canUpdateSettings: false,
      },
      worker: {
        canAddWorker: false,
        canManageWorkers: false,
        canApproveAttendance: false,
        canManageUsers: false,
        canViewReports: false,
        canSyncData: false,
        canUpdateSettings: false,
      },
    };
    return permissions[role];
  }

  // Create a new user account
  async createUserAccount(
    username: string,
    password: string,
    role: UserRole,
    options?: { email?: string; full_name?: string }
  ): Promise<UserAccount> {
    // Validate inputs
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (!['admin', 'supervisor', 'worker'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Hash the password
    const { hash, salt } = await hashPassword(password);

    // Create user account
    const user: UserAccount = {
      user_id: 'u_' + Math.random().toString(36).substring(2, 11),
      username,
      password_hash: hash,
      salt,
      role,
      email: options?.email,
      full_name: options?.full_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    };

    return user;
  }

  // Authenticate user with username and password
  async authenticateUser(
    username: string,
    password: string,
    userAccount: UserAccount
  ): Promise<AuthSession | null> {
    // Verify username
    if (userAccount.username !== username) {
      return null;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(
      password,
      userAccount.password_hash,
      userAccount.salt
    );

    if (!isPasswordValid) {
      return null;
    }

    // Check if user is active
    if (!userAccount.is_active) {
      return null;
    }

    // Create session
    const session: AuthSession = {
      user_id: userAccount.user_id,
      username: userAccount.username,
      role: userAccount.role,
      login_time: new Date().toISOString(),
    };

    this.currentSession = session;
    return session;
  }

  // Get current session
  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  // Logout
  logout(): void {
    this.currentSession = null;
  }

  // Update password
  async updatePassword(
    user: UserAccount,
    oldPassword: string,
    newPassword: string
  ): Promise<UserAccount> {
    // Verify old password
    const isValid = await verifyPassword(oldPassword, user.password_hash, user.salt);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const { hash, salt } = await hashPassword(newPassword);

    // Update user
    return {
      ...user,
      password_hash: hash,
      salt,
      updated_at: new Date().toISOString(),
    };
  }

  // Check if user has permission
  canPerformAction(role: UserRole, action: keyof RolePermissions): boolean {
    const permissions = AuthenticationService.getPermissions(role);
    return permissions[action];
  }
}

export const authService = new AuthenticationService();
