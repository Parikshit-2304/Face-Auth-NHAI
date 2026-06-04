import React, { useState, useEffect } from 'react';
import type { UserAccount } from '../services/dbService';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';

interface UserManagementScreenProps {
  onBack: () => void;
  currentUser: { user_id: string; username: string; role: string };
}

const roleConfig = {
  admin: { bg: '#FEF2F2', color: '#BF0603', border: '#FECACA', label: 'Admin' },
  supervisor: { bg: 'rgba(17,41,107,0.06)', color: '#11296B', border: 'rgba(17,41,107,0.15)', label: 'Supervisor' },
  worker: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Worker' },
} as const;

export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ onBack, currentUser }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    email: '',
    role: 'supervisor' as 'admin' | 'supervisor' | 'worker',
  });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      await dbService.init();
      const allUsers = await dbService.getAllUsers();
      setUsers(allUsers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!formData.username || !formData.password || !formData.full_name)
        throw new Error('Please fill in all required fields');
      if (formData.password !== formData.confirmPassword)
        throw new Error('Passwords do not match');
      const existingUser = await dbService.getUserByUsername(formData.username);
      if (existingUser) throw new Error('Username already exists');
      const newUser = await authService.createUserAccount(
        formData.username, formData.password, formData.role,
        { full_name: formData.full_name, email: formData.email || undefined },
      );
      await dbService.addUser(newUser);
      await loadUsers();
      setShowAddForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    if (userId === currentUser.user_id) { setError('You cannot delete your own account'); return; }
    try {
      setError(null);
      await dbService.deleteUser(userId);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    try {
      setError(null);
      const updatedUser = { ...user, is_active: !user.is_active, updated_at: new Date().toISOString() };
      await dbService.updateUser(updatedUser);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', confirmPassword: '', full_name: '', email: '', role: 'supervisor' });
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || '??';

  return (
    <div style={styles.page} className="fade-in">
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={styles.title}>User Management</h2>
          <p style={styles.subtitle}>Manage accounts and role-based access control</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); }}
          className="nhai-btn-primary"
          style={{ padding: '8px 16px', fontSize: 12 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Add User
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox} className="fade-in">
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#BF0603' }}>error</span>
          <span style={styles.errorText}>{error}</span>
          <button onClick={() => setError(null)} style={styles.errorClose}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      )}

      {/* Add user form */}
      {showAddForm && (
        <div className="nhai-card" style={styles.addFormCard} id="add-user-form">
          <div style={styles.addFormHeader}>
            <div style={styles.addFormIconBox}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#11296B' }}>
                person_add
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={styles.addFormTitle}>Add New User</p>
              <p style={styles.addFormSubtitle}>Create a new account with role-based access</p>
            </div>
            <button
              onClick={() => { setShowAddForm(false); resetForm(); }}
              style={styles.closeFormBtn}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          <form onSubmit={handleAddUser} style={styles.addForm}>
            {/* Row 1 */}
            <div style={styles.formGrid}>
              <div style={styles.formField}>
                <label className="nhai-label">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  className="nhai-input"
                />
              </div>
              <div style={styles.formField}>
                <label className="nhai-label">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="nhai-input"
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div style={styles.formField}>
              <label className="nhai-label">Email (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="nhai-input"
              />
            </div>

            {/* Row 2 */}
            <div style={styles.formGrid}>
              <div style={styles.formField}>
                <label className="nhai-label">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username"
                  className="nhai-input"
                />
              </div>
              <div style={styles.formField}>
                <label className="nhai-label">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••"
                  className="nhai-input"
                />
              </div>
            </div>

            <div style={styles.formField}>
              <label className="nhai-label">Confirm Password *</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••"
                className="nhai-input"
              />
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); resetForm(); }}
                className="nhai-btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button type="submit" className="nhai-btn-primary" style={{ flex: 2 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div style={styles.list}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="nhai-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skeleton" style={{ height: 14, width: '55%', borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 11, width: '35%', borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: 34, color: '#DDE1EC' }}>group</span>
          </div>
          <p style={styles.emptyTitle}>No users found</p>
          <p style={styles.emptyDesc}>Create your first user account to get started.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {users.map((user) => {
            const role = user.role as keyof typeof roleConfig;
            const rc = roleConfig[role] ?? roleConfig.worker;
            const isSelf = user.user_id === currentUser.user_id;
            const initials = getInitials(user.full_name || user.username);

            return (
              <div key={user.user_id} className="nhai-card" style={styles.userCard}>
                {/* Avatar + Info */}
                <div style={styles.userRow}>
                  <div
                    style={{
                      ...styles.userAvatar,
                      background: rc.bg,
                      border: `1.5px solid ${rc.border}`,
                    }}
                  >
                    <span
                      style={{
                        ...styles.userAvatarText,
                        color: rc.color,
                      }}
                    >
                      {initials}
                    </span>
                  </div>

                  <div style={styles.userInfo}>
                    <div style={styles.userNameRow}>
                      <p style={styles.userName}>{user.full_name || user.username}</p>
                      <span
                        className="nhai-badge"
                        style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}
                      >
                        {rc.label}
                      </span>
                      {!user.is_active && (
                        <span className="nhai-badge" style={{ background: '#F7F8FC', color: '#8892AB', border: '1px solid #DDE1EC' }}>
                          Inactive
                        </span>
                      )}
                      {isSelf && (
                        <span className="nhai-badge nhai-badge-gold">You</span>
                      )}
                    </div>
                    <p style={styles.userUsername}>@{user.username}</p>
                    <div style={styles.userMetaRow}>
                      {user.email && (
                        <span style={styles.userMeta}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>mail</span>
                          {user.email}
                        </span>
                      )}
                      <span style={styles.userMeta}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>calendar_today</span>
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!isSelf && (
                  <div style={styles.userActions}>
                    <button
                      onClick={() => handleToggleStatus(user)}
                      style={{
                        ...styles.actionBtn,
                        background: user.is_active ? '#FFFBEB' : '#F0FDF4',
                        color: user.is_active ? '#D97706' : '#16A34A',
                        border: `1px solid ${user.is_active ? '#FDE68A' : '#BBF7D0'}`,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {user.is_active ? 'pause_circle' : 'play_circle'}
                      </span>
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.user_id)}
                      style={{
                        ...styles.actionBtn,
                        background: '#FEF2F2',
                        color: '#BF0603',
                        border: '1px solid #FECACA',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16, paddingTop: 8 },
  header: { display: 'flex', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, background: '#F7F8FC', border: '1px solid #DDE1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#0D1B3E',
  },
  title: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: '#0D1B3E', margin: 0 },
  subtitle: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#8892AB', marginTop: 2 },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2',
    border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px',
  },
  errorText: { fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#BF0603', fontWeight: 500, flex: 1 },
  errorClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#BF0603', display: 'flex', alignItems: 'center', padding: 0 },
  addFormCard: { padding: '20px 22px' },
  addFormHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  addFormIconBox: {
    width: 40, height: 40, borderRadius: 12, background: 'rgba(17,41,107,0.06)', border: '1px solid rgba(17,41,107,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  addFormTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#0D1B3E', margin: 0 },
  addFormSubtitle: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#8892AB', marginTop: 2 },
  closeFormBtn: {
    width: 32, height: 32, borderRadius: 8, background: '#F7F8FC', border: '1px solid #DDE1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8892AB', flexShrink: 0,
  },
  addForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  formField: { display: 'flex', flexDirection: 'column' },
  formActions: { display: 'flex', gap: 10, marginTop: 4 },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px', gap: 10, textAlign: 'center',
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: '50%', background: '#F7F8FC', border: '1px solid #DDE1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#4A5578', margin: 0 },
  emptyDesc: { fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#8892AB', margin: 0, maxWidth: 280, lineHeight: 1.5 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  userCard: { padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 },
  userRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  userAvatar: {
    width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userAvatarText: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 15, lineHeight: 1 },
  userInfo: { flex: 1, minWidth: 0 },
  userNameRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#0D1B3E', margin: 0 },
  userUsername: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#8892AB', marginTop: 2 },
  userMetaRow: { display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  userMeta: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#8892AB',
  },
  userActions: { display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #EEF0F8' },
  actionBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700,
    transition: 'all 0.15s',
  },
};