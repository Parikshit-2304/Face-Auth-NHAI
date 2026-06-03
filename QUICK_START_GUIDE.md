# Quick Start Guide: Role-Based Access Control System

## What's New

The Face Authentication System has been upgraded from a simple PIN-based system to a **professional Role-Based Access Control (RBAC)** system with secure username/password authentication.

### Old System ❌
- Hardcoded PINs (888888 = Admin, 123456 = Supervisor)
- No actual user management
- No password security
- Limited role distinction

### New System ✅
- Secure username/password authentication
- PBKDF2-SHA256 password hashing with salt
- Full user management interface
- Three roles: Admin, Supervisor, Worker
- Permission-based feature access
- Session persistence

---

## Getting Started

### Step 1: First Launch (Initial Setup)
When you launch the application for the first time:

1. The system detects no admin users exist
2. **Initial Setup Screen** appears
3. Create your first admin account:
   - **Full Name**: Enter your name
   - **Email**: (Optional) Your email
   - **Username**: Choose a username (e.g., "admin", "supervisor_john")
   - **Password**: Strong password (6+ characters recommended)
   - **Confirm Password**: Re-enter password

4. Click **"Create Admin Account"**
5. You'll be automatically logged in and redirected to the Admin Dashboard

### Step 2: Admin Login (Subsequent Launches)
1. Enter your **username** you created
2. Enter your **password**
3. Click **"Login"**
4. You're now logged in to the Admin Dashboard

### Step 3: Create Additional Users
As an Admin, you can now manage other users:

1. Go to **Admin Dashboard**
2. Click the **"User Management"** card
3. Click **"Add User"** button
4. Fill in the form:
   - **Full Name**: Name of the new user
   - **Email**: (Optional)
   - **Username**: Unique username
   - **Password**: Auto-generated or custom
   - **Role**: Choose "Supervisor" or "Admin"
5. Click **"Create User"**
6. The new user can now login with their credentials

---

## Role Permissions

### 👤 Admin Role
**Full system access including:**
- ✅ Enroll and manage workers
- ✅ View worker directory
- ✅ Approve/reject attendance
- ✅ Manage users (create, edit, deactivate)
- ✅ Access sync center
- ✅ Configure system settings
- ✅ All features available

### 👤 Supervisor Role
**Limited access for field operations:**
- ✅ Record attendance with biometric scanner
- ✅ View worker directory
- ✅ View attendance records
- ❌ Cannot add/manage workers
- ❌ Cannot manage users
- ❌ Cannot access sync center
- ❌ Cannot modify settings

### 👤 Worker Role (Future)
- Planned for self-service features
- Attendance history view
- Limited biometric recording

---

## How to Test

### Test Scenario 1: Admin Creates Supervisor
1. Create admin account on first launch
2. From Admin Dashboard → Click "User Management"
3. Click "Add User"
4. Create new user with "Supervisor" role
5. Test login with new supervisor account
6. Verify supervisor dashboard shows appropriate features

### Test Scenario 2: Supervisor Account Features
1. Login as supervisor user
2. Verify dashboard shows:
   - Attendance Scanner ✅
   - Worker Directory ✅
   - Settings ✅
3. Verify User Management card is NOT visible ❌

### Test Scenario 3: Session Persistence
1. Login as admin
2. Refresh the page (F5)
3. You should remain logged in
4. Logout and verify you're back at login screen

### Test Scenario 4: User Deactivation
1. Login as admin
2. Go to User Management
3. Click "Deactivate" on a user
4. Try logging in as that user
5. Should fail with "Invalid username or password"

### Test Scenario 5: Password Verification
1. Try logging in with:
   - Wrong username → "Invalid username or password" ❌
   - Wrong password → "Invalid username or password" ❌
   - Correct credentials → Login succeeds ✅

---

## User Management Tasks

### Add New User
1. Admin Dashboard → User Management
2. Click "Add User"
3. Fill form and click "Create User"
4. User appears in list and can login

### View Users
1. Admin Dashboard → User Management
2. See all users with:
   - Username
   - Full name
   - Email (if provided)
   - Role (color-coded)
   - Active status
   - Creation date

### Deactivate User
1. User Management
2. Find user in list
3. Click "Deactivate" button
4. User will be marked as "INACTIVE"
5. They cannot login

### Reactivate User
1. User Management
2. Find inactive user
3. Click "Activate" button
4. User can login again

### Delete User
1. User Management
2. Find user
3. Click "Delete" button
4. Confirm deletion
5. User is permanently removed
6. **Note**: Cannot delete own account

---

## Password Security

### Password Requirements
- **Minimum 6 characters** (recommended 8+)
- **Case-sensitive**: "Admin123" ≠ "admin123"
- **No spaces** in password
- Special characters recommended: !@#$%^&*

### How Passwords Are Stored
- Never stored in plain text ❌
- Hashed using PBKDF2-SHA256 ✅
- Each user has unique salt ✅
- Even we cannot see your password ✅

### Forgot Password
- **Current Feature**: None (contact admin)
- **Planned**: Password reset functionality
- Temporary workaround: Admin can delete and recreate user

---

## Troubleshooting

### "Initial Setup Screen on Every Launch"
**Problem**: Setup screen appears every time
**Solution**: 
- Ensure first admin was created successfully
- Check browser's IndexedDB is not blocked
- Clear browser cache and try again

### "Cannot Login - Wrong Password"
**Problem**: Getting "Invalid username or password"
**Solutions**:
- Check caps lock is OFF (passwords are case-sensitive)
- Verify username spelling
- Try copying/pasting password
- Ask admin to recreate account

### "User Not Appearing in List"
**Problem**: Just created user doesn't show
**Solution**:
- Refresh the page
- Reload User Management screen
- Check if form submitted successfully

### "Lost Login After Page Refresh"
**Problem**: Session lost when refreshing
**Solution**:
- Check localStorage is not blocked
- Try logging in again
- Clear browser cache
- Use private/incognito window to test

---

## Security Best Practices

### ✅ Do's
- Use strong, unique passwords
- Don't share your login credentials
- Change password periodically
- Log out from public devices
- Use the latest browser version

### ❌ Don'ts
- Don't write passwords on paper/post-its
- Don't use same password for multiple accounts
- Don't share credentials over chat/email
- Don't login on untrusted networks
- Don't leave device unattended while logged in

---

## Technical Details

### Database Storage
- User accounts stored in **IndexedDB**
- Separate from worker/attendance data
- Encrypted with device-locked encryption
- Username indexed for quick lookup

### Session Storage
- Sessions stored in **browser localStorage**
- Include: user_id, username, role, login_time
- Cleared on logout
- Persists across page refreshes

### Password Hashing
- Algorithm: **PBKDF2-SHA256**
- Iterations: **100,000**
- Salt: **16 bytes** (random per user)
- Output: **256-bit** hash

---

## Feature Roadmap

### Phase 1 (Current) ✅
- Username/password login
- User management
- Role-based access control
- Session management

### Phase 2 (Planned)
- Two-factor authentication (2FA)
- Email-based password reset
- Login history/audit log
- Last login timestamp

### Phase 3 (Future)
- Custom role creation
- Granular permissions
- SSO integration
- Password expiration policies

---

## Support

### Common Questions

**Q: Can I have multiple admin accounts?**
A: Yes, you can create as many admin accounts as needed

**Q: What happens if I forget my password?**
A: Contact another admin to delete your account and create a new one

**Q: Can I change my username?**
A: Currently no, but it's planned for future

**Q: How long is a session valid?**
A: Sessions persist as long as localStorage is not cleared

**Q: Can workers login?**
A: Not yet, planned for future release

---

## Next Steps

1. **Test the system** with the scenarios above
2. **Create test accounts** for each role
3. **Verify permissions** work correctly
4. **Check session persistence** works
5. **Review user management** features

---

## Version Information

- **System Version**: 3.0.0
- **Release Date**: June 2026
- **Status**: Production Ready
- **Previous Version**: 2.x (PIN-based)

---

For detailed technical documentation, see:
- `RBAC_DOCUMENTATION.md` - Complete feature docs
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details

**Happy testing! 🎉**
