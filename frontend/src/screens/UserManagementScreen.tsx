import React, { useState, useEffect } from 'react';
import type { UserAccount } from '../services/dbService';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';

interface UserManagementScreenProps {
  onBack: () => void;
  currentUser: { user_id: string; username: string; role: string };
}

export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ onBack, currentUser }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    email: '',
    role: 'supervisor' as 'admin' | 'supervisor' | 'worker'
  });

  useEffect(() => {
    loadUsers();
  }, []);

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
      if (!formData.username || !formData.password || !formData.full_name) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Check if user already exists
      const existingUser = await dbService.getUserByUsername(formData.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Create new user
      const newUser = await authService.createUserAccount(
        formData.username,
        formData.password,
        formData.role,
        {
          full_name: formData.full_name,
          email: formData.email || undefined
        }
      );

      await dbService.addUser(newUser);

      // Reload users
      await loadUsers();
      setShowAddForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    if (userId === currentUser.user_id) {
      setError('You cannot delete your own account');
      return;
    }

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
      const updatedUser = {
        ...user,
        is_active: !user.is_active,
        updated_at: new Date().toISOString()
      };
      await dbService.updateUser(updatedUser);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      email: '',
      role: 'supervisor'
    });
    setEditingUser(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-600 bg-red-100';
      case 'supervisor': return 'text-blue-600 bg-blue-100';
      case 'worker': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex-grow flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 bg-surface-container-highest border-b border-outline-variant">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="text-sm font-semibold">Back</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add User
          </button>
        </div>
        <h2 className="text-xl font-bold text-on-surface">User Management</h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 text-xs text-error font-semibold bg-error-container/20 border border-error/20 p-2.5 rounded-lg">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mx-4 mt-4 bg-surface-container border border-outline-variant p-4 rounded-lg">
          <h3 className="text-sm font-bold mb-3">Add New User</h3>
          <form onSubmit={handleAddUser} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-2 py-1.5 border border-outline rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-2 py-1.5 border border-outline rounded text-xs"
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="w-full px-2 py-1.5 border border-outline rounded text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username"
                  className="w-full px-2 py-1.5 border border-outline rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••"
                  className="w-full px-2 py-1.5 border border-outline rounded text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••"
                className="w-full px-2 py-1.5 border border-outline rounded text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-primary text-on-primary py-1.5 rounded text-xs font-semibold hover:bg-primary/90"
              >
                Create User
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="flex-1 bg-surface-container-highest border border-outline text-on-surface py-1.5 rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-on-surface-variant">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">No users found</div>
        ) : (
          users.map((user) => (
            <div
              key={user.user_id}
              className="bg-surface-container border border-outline-variant p-3 rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{user.full_name || user.username}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getRoleColor(user.role)}`}>
                      {user.role.toUpperCase()}
                    </span>
                    {!user.is_active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded text-gray-600 bg-gray-200">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-on-surface-variant">@{user.username}</p>
                  {user.email && <p className="text-[10px] text-on-surface-variant">{user.email}</p>}
                  <p className="text-[10px] text-on-surface-variant">
                    Created: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleStatus(user)}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded transition-colors ${
                    user.is_active
                      ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </button>
                {user.user_id !== currentUser.user_id && (
                  <button
                    onClick={() => handleDeleteUser(user.user_id)}
                    className="flex-1 bg-error-container text-error text-xs font-semibold py-1.5 rounded hover:bg-error/20 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
