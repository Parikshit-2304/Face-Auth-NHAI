# Role-Based Access Control (RBAC) System Documentation

## Overview
The Face Authentication System now includes a comprehensive Role-Based Access Control (RBAC) system that replaces the old PIN-based authentication with secure username/password authentication and permission-based access control.

## Key Features

### 1. **Authentication System**
- **Secure Password Hashing**: Passwords are hashed using PBKDF2 with 100,000 iterations and SHA-256
- **Session Management**: Sessions are stored in localStorage for persistence across page refreshes
- **User Account Management**: Full user CRUD operations with database storage in IndexedDB

### 2. **Role-Based Permissions**

#### Admin Role
- ✅ Add and manage workers
- ✅ View worker directory
- ✅ Approve/reject unverified attendance
- ✅ Manage other users (create, edit, deactivate)
- ✅ Access sync center and manage data synchronization
- ✅ Update system settings
- ✅ Full access to all features

#### Supervisor Role
- ✅ View and manage workers
- ✅ Record attendance using biometric scanner
- ✅ View unverified attendance (read-only)
- ❌ Cannot approve attendance
- ❌ Cannot manage users
- ❌ Cannot access sync center
- ❌ Cannot modify settings

#### Worker Role
- ⏳ Planned for future implementation
- Will have limited attendance recording capabilities

### 3. **Initial Setup**
On first launch, the system detects if no admin users exist and displays the Initial Setup Screen where you can:
- Create the first admin account
- Set username and password
- Add optional email and full name
- Immediately log in as admin

### 4. **User Management Screen**
Available only to Admin users, allows:
- View all system users
- Add new users with custom roles
- Activate/deactivate user accounts
- Delete users (except own account)
- View user details (creation date, email, role)

### 5. **Login Flow**
1. User enters username and password
2. System verifies credentials using secure password verification
3. Session is created and stored locally
4. User is logged in and can access features based on their role

## Database Schema

### Users Table
```typescript
interface UserAccount {
  user_id: string;           // Unique identifier
  username: string;          // Unique username
  password_hash: string;     // PBKDF2 derived hash
  salt: string;              // Salt for password hashing
  role: 'admin' | 'supervisor' | 'worker';
  email?: string;            // Optional email
  full_name?: string;        // Optional full name
  created_at: string;        // Creation timestamp
  updated_at: string;        // Last update timestamp
  is_active: boolean;        // Account active status
}
```

## Security Features

1. **Password Security**
   - PBKDF2 with 100,000 iterations
   - SHA-256 hashing algorithm
   - Random 16-byte salt per user
   - Passwords never stored in plain text

2. **Session Management**
   - Sessions stored in localStorage
   - Session includes user_id, username, and role
   - Sessions persist across browser refreshes

3. **Database Encryption**
   - All biometric data encrypted with AES-256-GCM
   - User credentials hashed and salted
   - Device-locked encryption for embeddings

## API Reference

### Authentication Service (`authService.ts`)

#### Create User Account
```typescript
const user = await authService.createUserAccount(
  'username',
  'password',
  'admin',
  { email: 'user@example.com', full_name: 'John Doe' }
);
```

#### Authenticate User
```typescript
const session = await authService.authenticateUser(
  'username',
  'password',
  userAccount
);
```

#### Check Permissions
```typescript
const canAdd = authService.canPerformAction('admin', 'canAddWorker');
```

#### Get Role Permissions
```typescript
const permissions = AuthenticationService.getPermissions('supervisor');
```

### Database Service (`dbService.ts`)

#### User CRUD Operations
```typescript
// Add user
await dbService.addUser(userAccount);

// Get user by ID
const user = await dbService.getUser('user_id');

// Get user by username
const user = await dbService.getUserByUsername('username');

// Get all users
const users = await dbService.getAllUsers();

// Update user
await dbService.updateUser(updatedUser);

// Delete user
await dbService.deleteUser('user_id');

// Get all admin users
const admins = await dbService.getAllAdminUsers();
```

## Screen Flows

### For Admin Users
1. **Login Screen** → Enter username/password
2. **Admin Dashboard** → View all features
   - Enroll Worker
   - Worker Directory
   - Review Logs
   - Config System
   - Sync Center Monitor
   - **User Management** (NEW)

### For Supervisor Users
1. **Login Screen** → Enter username/password
2. **Supervisor Dashboard** → Limited features
   - Attendance Scanner
   - Worker Directory
   - Settings

### First Time Setup
1. **Initial Setup Screen** → Create first admin account
2. **Automatic Login** → Redirects to Admin Dashboard
3. Ready to use!

## Migration from PIN System

The old PIN-based system has been completely replaced:
- ❌ Removed: Hardcoded PINs (888888 for admin, 123456 for supervisor)
- ❌ Removed: Keypad component for PIN entry
- ✅ Added: Username/password login
- ✅ Added: Secure password hashing
- ✅ Added: User management interface

## Future Enhancements

1. **Two-Factor Authentication (2FA)**
   - SMS/Email OTP
   - TOTP support

2. **Audit Logging**
   - Track all user actions
   - Login/logout history
   - Data access logs

3. **Worker Role**
   - Limited biometric self-service
   - Attendance history view

4. **Advanced Permissions**
   - Custom roles
   - Granular permission assignment
   - Role templates

5. **Password Management**
   - Password reset functionality
   - Password expiration policies
   - Change password screen

## Troubleshooting

### "Invalid username or password" on login
- Verify username spelling
- Ensure caps lock is not on
- Password is case-sensitive

### Initial setup screen appears on every launch
- Initial setup only shows if no admin users exist
- First admin created should resolve this
- Check IndexedDB for user records

### Session lost after page refresh
- Check browser localStorage settings
- Ensure cookies/storage is not blocked
- Try logging in again

## Support

For issues or feature requests, contact the development team with:
- Steps to reproduce
- Browser/device information
- Error messages (if any)
- Screenshots

---

**Version**: 3.0.0 (RBAC Release)
**Last Updated**: June 2026
**Status**: Production Ready
