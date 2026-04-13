import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Server, Shield, Smartphone, Plus, Trash2, Edit2, Check, X, AlertCircle, AlertTriangle } from 'lucide-react';

import axios from 'axios';
import UserManagement from './UserManagement';

const API = '/api';

const Settings = () => {
    const [fines, setFines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newFine, setNewFine] = useState({ name: '', amount: '', description: '' });
    const [showAddFine, setShowAddFine] = useState(false);
    const [editingFine, setEditingFine] = useState(null); // { id, name, amount, description }
    const [pendingExpenses, setPending] = useState([]);
    const rawRole = localStorage.getItem('userRole');
    const userRole = rawRole ? rawRole.replace(/"/g, '') : 'Admin';
    const rawPerms = localStorage.getItem('userPermissions');
    const userPermissions = rawPerms ? JSON.parse(rawPerms) : {};

    const [expTab, setExpTab] = useState('fines'); // 'fines' | 'approvals' | 'users'
    const [resetConfirm, setResetConfirm] = useState(false);
    const [resetTyped, setResetTyped] = useState('');
    const [resetting, setResetting] = useState(false);
    const [includeStructure, setIncludeStructure] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'success' | null
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [passwordStatus, setPasswordStatus] = useState(null); // 'changing' | 'success' | 'error'
    const [passwordError, setPasswordError] = useState('');


    const fetchFines = async () => {
        try { const r = await axios.get(`${API}/settings/fines`); setFines(r.data); }
        catch (e) { console.error(e); }
    };

    const fetchPending = async () => {
        try { const r = await axios.get(`${API}/expenses/pending`); setPending(r.data); }
        catch (e) { console.error(e); }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchFines(), fetchPending()]);
            setLoading(false);
        };
        load();
    }, []);

    const addFine = async () => {
        if (!newFine.name.trim() || !newFine.amount) return;
        await axios.post(`${API}/settings/fines`, newFine);
        setNewFine({ name: '', amount: '', description: '' });
        setShowAddFine(false);
        fetchFines();
    };

    const updateFine = async () => {
        if (!editingFine) return;
        await axios.put(`${API}/settings/fines/${editingFine.id}`, editingFine);
        setEditingFine(null);
        fetchFines();
    };

    const deleteFine = async (id) => {
        if (!window.confirm('Delete this fine type?')) return;
        await axios.delete(`${API}/settings/fines/${id}`);
        fetchFines();
    };

    const approveExpense = async (id, action) => {
        await axios.put(`${API}/expenses/${id}/approve`, { action });
        fetchPending();
    };

    const handleReset = async () => {
        if (resetTyped !== 'RESET ALL DATA') {
            alert('Please type exactly: RESET ALL DATA');
            return;
        }
        setResetting(true);
        try {
            const r = await axios.post(`${API}/admin/reset`, { 
                confirm: 'RESET_ALL_DATA',
                includeStructure: includeStructure
            });
            alert(r.data.message);
            setResetConfirm(false);
            setResetTyped('');
            setIncludeStructure(false);
            // Refresh counts if needed, or redirect
            window.location.reload(); 
        } catch (e) {
            alert(e.response?.data?.error || 'Reset failed');
        } finally {
            setResetting(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaveStatus('saving');
        // Simulated save for UI feedback as requested
        setTimeout(() => {
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 3000);
        }, 1000);
    };

    const handlePasswordChange = async () => {
        if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
            setPasswordError("All fields are required");
            setPasswordStatus('error');
            return;
        }
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordError("Passwords do not match");
            setPasswordStatus('error');
            return;
        }

        setPasswordStatus('changing');
        setPasswordError('');
        try {
            const r = await axios.post(`${API}/settings/change-password`, passwordForm);
            setPasswordStatus('success');
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => setPasswordStatus(null), 5000);
        } catch (e) {
            setPasswordStatus('error');
            setPasswordError(e.response?.data?.error || 'Password change failed');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-0">
            <div>
                <h1 className="text-3xl font-bold text-white">System Settings</h1>
                <p className="text-white/40 text-sm">Configure your Hostel ERP Core</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* General Config */}
                <div className="glass-panel p-8 rounded-xl space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <Server className="mr-3 text-blue-400" /> General Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-white/40">Hostel Name</label>
                            <input type="text" defaultValue="Coolsun Hostel" className="glass-input h-12 w-full px-4 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-white/40">Manager PIN</label>
                            <input type="password" defaultValue="****" className="glass-input h-12 w-full px-4 rounded-xl" />
                        </div>
                    </div>
                </div>

                {/* Fine Library + Approval Pipeline */}
                <div className="glass-panel p-8 rounded-xl space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <Shield className="mr-3 text-red-400" /> Financial Controls
                    </h3>

                    {/* Sub-tabs */}
                    <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
                        {[
                            { key: 'fines', label: 'Fine Library' },
                            { key: 'approvals', label: `Pending Approvals (${pendingExpenses.length})` },
                            (userRole === 'Owner' || userPermissions.settings) ? { key: 'users', label: 'User Management' } : null,
                        ].filter(Boolean).map(t => (
                            <button key={t.key} onClick={() => setExpTab(t.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${expTab === t.key
                                    ? 'bg-blue-600 text-white'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                    }`}>{t.label}</button>
                        ))}
                    </div>

                    {/* Fine Library */}
                    {expTab === 'fines' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-white/50 text-sm">Define fine types and amounts. Staff selects from this list when applying a fine.</p>
                                <button onClick={() => setShowAddFine(!showAddFine)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-sm transition-all">
                                    <Plus className="w-4 h-4" /> Add Fine
                                </button>
                            </div>

                            <AnimatePresence>
                                {showAddFine && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input value={newFine.name} onChange={e => setNewFine({ ...newFine, name: e.target.value })}
                                                placeholder="Fine name (e.g. Late Rent Fee)" type="text"
                                                className="px-3 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-sm" />
                                            <input value={newFine.amount} onChange={e => setNewFine({ ...newFine, amount: e.target.value })}
                                                placeholder="Amount (Rs.)" type="number"
                                                className="px-3 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-sm" />
                                            <input value={newFine.description} onChange={e => setNewFine({ ...newFine, description: e.target.value })}
                                                placeholder="Description (optional)" type="text"
                                                className="px-3 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-sm" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={addFine} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Add</button>
                                            <button onClick={() => setShowAddFine(false)} className="px-4 py-2 rounded-xl bg-white/5 text-white/50 text-sm hover:bg-white/10">Cancel</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {loading ? (
                                <div className="text-center py-6 text-white/30 text-sm">Loading fine types...</div>
                            ) : (
                                <div className="space-y-2">
                                    {fines.map(f => (
                                        <div key={f.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                            {editingFine?.id === f.id ? (
                                                <>
                                                    <input value={editingFine.name} onChange={e => setEditingFine({ ...editingFine, name: e.target.value })}
                                                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none" />
                                                    <input value={editingFine.amount} onChange={e => setEditingFine({ ...editingFine, amount: e.target.value })}
                                                        type="number"
                                                        className="w-28 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none" />
                                                    <button onClick={updateFine} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditingFine(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex-1">
                                                        <p className="text-white text-sm font-medium">{f.name}</p>
                                                        {f.description && <p className="text-white/40 text-xs">{f.description}</p>}
                                                    </div>
                                                    <span className="text-yellow-400 font-bold text-sm">Rs. {f.amount.toLocaleString()}</span>
                                                    <button onClick={() => setEditingFine({ ...f })} className="text-white/40 hover:text-white transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => deleteFine(f.id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {fines.length === 0 && (
                                        <p className="text-center text-white/30 py-4 text-sm">No fine types defined.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Expense Approval Queue */}
                    {expTab === 'approvals' && (
                        <div className="space-y-3">
                            {pendingExpenses.length === 0 ? (
                                <div className="text-center py-8 text-white/30">
                                    <Check className="w-10 h-10 mx-auto mb-2 text-green-400/50" />
                                    <p className="text-sm">All expenses approved. Nothing pending.</p>
                                </div>
                            ) : (
                                pendingExpenses.map(e => (
                                    <div key={e.id} className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                                        <div className="flex items-start justify-between flex-wrap gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                                                    <span className="text-white font-medium text-sm">{e.category}</span>
                                                    <span className="text-yellow-400 font-bold">Rs. {parseFloat(e.amount).toLocaleString()}</span>
                                                </div>
                                                <p className="text-white/60 text-xs mt-1">{e.description}</p>
                                                {e.sub_note && <p className="text-white/40 text-xs italic">Note: {e.sub_note}</p>}
                                                <p className="text-white/30 text-xs mt-1">{e.date?.split('T')[0]}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => approveExpense(e.id, 'Approved')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-all">
                                                    <Check className="w-3.5 h-3.5" /> Approve
                                                </button>
                                                <button onClick={() => approveExpense(e.id, 'Rejected')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all">
                                                    <X className="w-3.5 h-3.5" /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {expTab === 'users' && (
                        <UserManagement />
                    )}
                </div>

                {/* API Integration */}
                <div className="glass-panel p-8 rounded-xl space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <Smartphone className="mr-3 text-purple-400" /> API Integrations
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-white/40">WhatsApp Business API Key</label>
                            <input type="text" defaultValue="" placeholder="Enter Meta WhatsApp API key..." className="glass-input h-12 w-full px-4 rounded-xl font-mono text-sm" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="h-5 w-5 accent-blue-500 rounded" />
                            <span className="text-sm text-white/70">Auto-send Rent Reminders on 5th of every month</span>
                        </div>
                    </div>
                </div>

                {/* Security Section (NEW) */}
                <div className="glass-panel p-8 rounded-xl space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <Shield className="mr-3 text-green-400" /> Security & Account
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-white/40">Current Password</label>
                            <input
                                type="password"
                                value={passwordForm.current_password}
                                onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                className="glass-input h-12 w-full px-4 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-white/40">New Password</label>
                            <input
                                type="password"
                                value={passwordForm.new_password}
                                onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                className="glass-input h-12 w-full px-4 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-white/40">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordForm.confirm_password}
                                onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                className="glass-input h-12 w-full px-4 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePasswordChange}
                            disabled={passwordStatus === 'changing'}
                            className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-all disabled:bg-green-800"
                        >
                            {passwordStatus === 'changing' ? 'Updating...' : 'Update Password'}
                        </button>

                        {passwordStatus === 'success' && (
                            <span className="text-green-400 text-xs font-bold flex items-center gap-1">
                                <Check size={14} /> Password Updated!
                            </span>
                        )}
                        {passwordStatus === 'error' && (
                            <span className="text-red-400 text-xs font-bold flex items-center gap-1">
                                <AlertTriangle size={14} /> {passwordError}
                            </span>
                        )}
                    </div>
                </div>

                {/* ⚠️ DANGER ZONE */}
                <div className="glass-panel p-8 rounded-xl space-y-6 border border-red-500/20 bg-red-500/5">
                    <h3 className="text-xl font-bold text-red-400 flex items-center">
                        <AlertTriangle className="mr-3" /> Danger Zone
                    </h3>
                    <p className="text-white/50 text-sm">This will permanently delete all Tenants, Ledger entries, Utility Bills, and Expenses. Rooms, Floors, and User accounts will be preserved.</p>
                    {!resetConfirm ? (
                        <button
                            onClick={() => setResetConfirm(true)}
                            className="px-6 py-3 rounded-xl bg-red-600/30 hover:bg-red-600/60 text-red-400 font-bold border border-red-500/30 transition-all flex items-center gap-2"
                        >
                            <Trash2 size={18} /> Reset All Operational Data
                        </button>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-5 bg-red-900/20 border border-red-500/40 rounded-xl">
                            <p className="text-red-300 font-bold text-sm">⚠️ Are you absolutely sure? Type <span className="font-mono bg-black/40 px-2 py-0.5 rounded">RESET ALL DATA</span> to confirm:</p>
                            <input
                                value={resetTyped}
                                onChange={e => setResetTyped(e.target.value)}
                                placeholder="Type: RESET ALL DATA"
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-red-500/50 text-white font-mono focus:outline-none focus:border-red-400"
                            />
                            
                            <label className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-red-500/20 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={includeStructure}
                                    onChange={e => setIncludeStructure(e.target.checked)}
                                    className="w-5 h-5 accent-red-500"
                                />
                                <div>
                                    <span className="text-sm font-bold text-red-300 block">Wipe Rooms & Floors too?</span>
                                    <span className="text-[10px] text-red-400/60 uppercase">Warning: This will delete all physical room data</span>
                                </div>
                            </label>
                            <div className="flex gap-3">
                                <button onClick={() => { setResetConfirm(false); setResetTyped(''); }}
                                    className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10 transition-all">Cancel</button>
                                <button onClick={handleReset} disabled={resetting || resetTyped !== 'RESET ALL DATA'}
                                    className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold transition-all flex items-center justify-center gap-2">
                                    <Trash2 size={16} />{resetting ? 'Clearing...' : 'Confirm Reset'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="flex justify-end items-center gap-4">
                    {saveStatus === 'success' && (
                        <motion.span initial={{opacity:0}} animate={{opacity:1}} className="text-green-400 text-sm font-bold flex items-center gap-1">
                            <Check size={16}/> Settings Saved Successfully!
                        </motion.span>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSaveSettings}
                        disabled={saveStatus === 'saving'}
                        className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center shadow-lg shadow-blue-500/30 disabled:bg-blue-800">
                        {saveStatus === 'saving' ? 'Saving...' : <><Save size={20} className="mr-2" /> Save Changes</>}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
