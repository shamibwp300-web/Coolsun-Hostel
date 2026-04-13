import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Shield, Lock, Trash2, Edit2, 
  Check, X, Search, LayoutDashboard, UserCheck, 
  Settings, Zap, Wallet, Home, Building2, ListChecks,
  Wrench, Video, BarChart2, ShieldAlert
} from 'lucide-react';
import axios from 'axios';

const PERMISSION_MODULES = [
  { id: 'dashboard', label: 'Dashboard Hub', icon: <LayoutDashboard size={14} /> },
  { id: 'wizard', label: 'Tenant Wizard', icon: <UserPlus size={14} /> },
  { id: 'tenants', label: 'Tenant Registry', icon: <Users size={14} /> },
  { id: 'rooms', label: 'Room Inventory', icon: <Home size={14} /> },
  { id: 'bulk_rent', label: 'Bulk Rental', icon: <Building2 size={14} /> },
  { id: 'police', label: 'Police Verification', icon: <Shield size={14} /> },
  { id: 'tasks', label: 'Tasks & Staff', icon: <ListChecks size={14} /> },
  { id: 'electricity', label: 'Utility Billing', icon: <Zap size={14} /> },
  { id: 'finance', label: 'Financial Engine', icon: <Wallet size={14} /> },
  { id: 'maintenance', label: 'Issue Inbox', icon: <Wrench size={14} /> },
  { id: 'cctv', label: 'CCTV Surveillance', icon: <Video size={14} /> },
  { id: 'reports', label: 'System Reports', icon: <BarChart2 size={14} /> },
  { id: 'audit', label: 'Audit Log Vault', icon: <ShieldAlert size={14} /> },
  { id: 'settings', label: 'Settings & Users', icon: <Settings size={14} /> },
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'Admin',
    permissions: {}
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '', // Don't show password
        role: user.role,
        permissions: user.permissions || {}
      });
    } else {
      setEditingUser(null);
      // Default all permissions to true for new users? 
      // User asked for "custom options select", so maybe default to false.
      setFormData({
        username: '',
        password: '',
        role: 'Admin',
        permissions: {}
      });
    }
    setShowModal(true);
  };

  const togglePermission = (id) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [id]: !prev.permissions[id]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.id}`, formData);
      } else {
        await axios.post('/api/users', formData);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Shield className="text-blue-500" /> User Management
          </h2>
          <p className="text-white/40 text-sm font-medium">Configure access control and staff permissions</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          <UserPlus size={18} /> Add New Staff
        </button>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40">User Identity</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40">Role</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40">Active Scope</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                      <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Fetching Personnel Data...</p>
                    </div>
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${user.role === 'Owner' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/20'}`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-bold text-lg">{user.username}</div>
                        <div className="text-[10px] text-white/30 font-medium uppercase tracking-widest">ID: {user.id.toString().padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${user.role === 'Owner' ? 'bg-blue-600/10 border-blue-600/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {Object.entries(user.permissions || {}).filter(([_, v]) => v).map(([k]) => (
                        <span key={k} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[8px] text-white/40 font-bold uppercase">
                          {k}
                        </span>
                      ))}
                      {(!user.permissions || Object.values(user.permissions).every(v => !v)) && <span className="text-red-400/40 text-[10px] italic">No access granted</span>}
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/10"
                      >
                        <Edit2 size={16} />
                      </button>
                      {user.role !== 'Owner' && (
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-400/40 hover:text-red-400 transition-all border border-red-500/10"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-void/80 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-void border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">{editingUser ? 'Edit Personnel' : 'Add New Staff'}</h3>
                  <p className="text-white/40 text-sm font-medium">Set identity and access permissions</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 rounded-2xl hover:bg-white/5 text-white/40 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Username</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input 
                        required
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all" 
                        placeholder="e.g. manager_ali"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Password {editingUser && '(Leave empty to keep current)'}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input 
                        type="password"
                        required={!editingUser}
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all" 
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Administrative Role</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Admin', 'Manager', 'Owner'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({...formData, role: r})}
                        className={`py-4 rounded-2xl font-black text-sm transition-all border ${formData.role === r ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 italic">Module Access Permissions</label>
                    <span className="text-[8px] text-blue-400 font-black uppercase bg-blue-400/10 px-2 py-1 rounded-md">Custom Select</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PERMISSION_MODULES.map(module => (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => togglePermission(module.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl text-left transition-all border group ${formData.permissions[module.id] ? 'bg-blue-600/20 border-blue-500/40 text-blue-400 shadow-inner' : 'bg-white/[0.02] border-white/5 text-white/20 hover:border-white/20'}`}
                      >
                        <div className={`p-2 rounded-lg ${formData.permissions[module.id] ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/10 group-hover:text-white/40 transition-colors'}`}>
                          {module.icon}
                        </div>
                        <span className="text-[11px] font-bold tracking-tight">{module.label}</span>
                        {formData.permissions[module.id] && <Check className="ml-auto text-blue-400" size={14} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-[1.5rem] bg-white/5 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
                    Discard
                  </button>
                  <button type="submit" className="flex-2 grow py-5 rounded-[1.5rem] bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20">
                    {editingUser ? 'Save Changes' : 'Grant System Access'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
