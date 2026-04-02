import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MoreVertical, MessageCircle, Edit, Trash2, UserPlus, Filter, X, Save, Wifi, Users, LogOut, AlertTriangle, CheckCircle, FileText, CreditCard, Receipt, RotateCcw, Archive } from 'lucide-react';
import axios from 'axios';
import DocumentViewerModal from '../components/DocumentViewerModal';

const Tenants = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingTenant, setEditingTenant] = useState(null);
    const [roomTenants, setRoomTenants] = useState([]);
    const [moveOutTenant, setMoveOutTenant] = useState(null);
    const [settlementPreview, setSettlementPreview] = useState(null);
    const fileInputRef = React.useRef(null);
    const [moveOutForm, setMoveOutForm] = useState({
        notice_date: new Date().toISOString().split('T')[0],
        exit_date: '',
        damage_deduction: 0,
        fine_deduction: 0,
        notes: ''
    });
    const [moveOutLoading, setMoveOutLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
    const [showArchived, setShowArchived] = useState(false);
    const [archivedCount, setArchivedCount] = useState(0);
    
    // Add Manual Charge State
    const [chargeModalTenant, setChargeModalTenant] = useState(null);
    const [chargeForm, setChargeForm] = useState({
        type: 'RENT',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });
    const [chargeLoading, setChargeLoading] = useState(false);

    // Document Viewer State
    const [viewer, setViewer] = useState({ isOpen: false, url: '', title: '' });

    const fetchTenants = async () => {
        try {
            const res = await axios.get(`/api/tenants?show_archived=true`);
            const allTenants = res.data;
            setTenants(allTenants);
            setArchivedCount(allTenants.filter(t => t.is_archived).length);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch tenants", err);
            setLoading(false);
        }
    };

    useEffect(() => { fetchTenants(); }, []);

    // Fetch settlement preview when move-out is opened
    const openMoveOut = async (tenant) => {
        setMoveOutTenant(tenant);
        setMoveOutForm({
            notice_date: new Date().toISOString().split('T')[0],
            exit_date: '',
            damage_deduction: 0,
            fine_deduction: 0,
            notes: ''
        });
        try {
            const r = await axios.get(`/api/moveout/${tenant.id}`);
            setSettlementPreview(r.data);
        } catch (e) {
            setSettlementPreview({ security_deposit_held: 0, unpaid_rent: 0, estimated_refund: 0 });
        }
    };

    const handleMoveOut = async () => {
        if (!moveOutForm.exit_date) { alert('Exit date is required'); return; }
        if (!window.confirm(`Process move-out for ${moveOutTenant.name}? This will archive their record.`)) return;
        setMoveOutLoading(true);
        try {
            const payload = {
                tenant_id: moveOutTenant.id,
                notice_date: moveOutForm.notice_date,
                exit_date: moveOutForm.exit_date,
                security_deposit_held: settlementPreview?.security_deposit_held || 0,
                damage_deduction: parseFloat(moveOutForm.damage_deduction) || 0,
                fine_deduction: parseFloat(moveOutForm.fine_deduction) || 0,
                unpaid_rent: settlementPreview?.unpaid_rent || 0,
                notes: moveOutForm.notes
            };
            const r = await axios.post('/api/moveout', payload);
            alert(`✅ Move-out processed!\nRefund to tenant: Rs. ${r.data.refund_amount}`);
            setMoveOutTenant(null);
            setSettlementPreview(null);
            fetchTenants();
        } catch (e) {
            alert(e.response?.data?.error || 'Move-out failed');
        } finally {
            setMoveOutLoading(false);
        }
    };

    const handleAddCharge = async (e) => {
        e.preventDefault();
        if (!chargeForm.amount || parseFloat(chargeForm.amount) <= 0) {
            alert("A valid amount is required");
            return;
        }

        setChargeLoading(true);
        try {
            const payload = {
                tenant_id: chargeModalTenant.id,
                ...chargeForm
            };
            await axios.post('/api/finance/manual-charge', payload);
            alert(`✅ Charge added successfully!`);
            setChargeModalTenant(null);
            fetchTenants(); // Re-fetch immediately to update live balance
        } catch (err) {
            alert(err.response?.data?.error || "Failed to add charge");
        } finally {
            setChargeLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/tenants/${editingTenant.id}`, editingTenant);
            setEditingTenant(null);
            fetchTenants();
        } catch (err) {
            alert(err.response?.data?.error || "Update failed");
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        const { id, name } = deleteConfirm;
        try {
            console.log(`Confirming delete for ${name} (ID: ${id})`);
            const res = await axios.delete(`/api/tenants/${id}`);
            console.log("Delete successful:", res.data);
            setDeleteConfirm(null);
            alert(`✅ ${name} has been archived successfully.`);
            fetchTenants();
        } catch (err) {
            console.error("Archive failed:", err);
            alert(err.response?.data?.error || `Failed to archive ${name}`);
        }
    };

    const handleRestore = async (tenant) => {
        if (!window.confirm(`Restore ${tenant.name} to active registry?`)) return;
        try {
            await axios.put(`/api/tenants/${tenant.id}/restore`);
            alert(`✅ ${tenant.name} has been restored!`);
            fetchTenants();
        } catch (err) {
            alert(err.response?.data?.error || "Restore failed");
        }
    };

    const handleCsvUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/api/tenants/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(res.data.message || 'Import successful');
            fetchTenants();
        } catch (err) {
            alert(err.response?.data?.error || 'CSV Import failed. Check format.');
        }
        e.target.value = null; // Reset input
    };

    const filteredTenants = tenants.filter(t => {
        const matchesSearch = t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.phone?.includes(searchTerm);
        
        const matchesView = showArchived ? t.is_archived : !t.is_archived;
        
        return matchesSearch && matchesView;
    });

    // Compute live refund estimate
    const liveRefund = settlementPreview
        ? Math.max(0, (settlementPreview.security_deposit_held || 0)
            - (parseFloat(moveOutForm.damage_deduction) || 0)
            - (parseFloat(moveOutForm.fine_deduction) || 0)
            - (settlementPreview.unpaid_rent || 0))
        : 0;

    return (
        <div className="space-y-6 p-4 md:p-0">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Tenant Registry</h1>
                    <p className="text-white/40 text-sm">
                        {showArchived ? `${archivedCount} Archived Records` : `Manage ${tenants.length - archivedCount} Active Tenants`}
                    </p>
                </div>
                <div className="flex space-x-3">
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleCsvUpload}
                        className="hidden"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => fileInputRef.current.click()}
                        className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium flex items-center shadow-lg transition-colors border border-white/10"
                    >
                        Bulk CSV
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center shadow-lg shadow-blue-500/20"
                        onClick={() => window.location.href = '/wizard'}
                    >
                        <UserPlus size={20} className="mr-2" /> New Onboarding
                    </motion.button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-panel p-4 rounded-xl flex items-center space-x-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Name, Room, or Phone..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10">
                    <button 
                        onClick={() => setShowArchived(false)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${!showArchived ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        Active
                    </button>
                    <button 
                        onClick={() => setShowArchived(true)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${showArchived ? 'bg-orange-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        Archived {archivedCount > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">{archivedCount}</span>}
                    </button>
                </div>

                <button className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/10">
                    <Filter size={20} />
                </button>
            </div>

            {/* Registry Table */}
            <div className="glass-panel overflow-x-auto rounded-xl pb-24">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-xs uppercase text-white/40 font-semibold tracking-wider">
                        <tr>
                            <th className="p-6">Tenant Name</th>
                            <th className="p-6">Room / Bed</th>
                            <th className="p-6">Phone</th>
                            <th className="p-6">Compliance</th>
                            <th className="p-6">Documents</th>
                            <th className="p-6">Status</th>
                            <th className="p-6">Payment</th>
                            <th className="p-6">Balance</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredTenants.map((tenant) => (
                            <tr key={tenant.id} className={`hover:bg-white/5 transition-colors group ${tenant.is_archived ? 'opacity-60 bg-black/10' : ''}`}>
                                <td className="p-6 font-medium text-white">
                                    {tenant.name}
                                    {tenant.is_archived && <span className="ml-2 text-[8px] bg-white/10 px-1 py-0.5 rounded text-white/40 uppercase tracking-tighter">Archived</span>}
                                </td>
                                <td className="p-6">
                                    <div className="text-white/70">{tenant.room}</div>
                                    <div className="text-[10px] text-white/30 uppercase tracking-widest">{tenant.bed}</div>
                                </td>
                                <td className="p-6 text-white/50 text-xs font-mono">{tenant.phone}</td>
                                <td className="p-6">
                                    <div className="flex items-center">
                                        <div className={`h-2 w-2 rounded-full mr-2 ${tenant.compliance?.status === 'VERIFIED' || tenant.compliance?.status === 'NORMAL' ? 'bg-green-500' :
                                            tenant.compliance?.status === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500'
                                            }`} />
                                        <span className="text-xs text-white/60">{tenant.compliance?.status || 'Pending'}</span>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2">
                                        {tenant.id_card_front_url && (
                                            <button 
                                                onClick={() => setViewer({ isOpen: true, url: tenant.id_card_front_url, title: `${tenant.name} - ID Front` })}
                                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                                title="View ID Front"
                                            >
                                                <CreditCard size={14} />
                                            </button>
                                        )}
                                        {tenant.id_card_back_url && (
                                            <button 
                                                onClick={() => setViewer({ isOpen: true, url: tenant.id_card_back_url, title: `${tenant.name} - ID Back` })}
                                                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                                                title="View ID Back"
                                            >
                                                <CreditCard size={14} />
                                            </button>
                                        )}
                                        {tenant.police_form_url && (
                                            <button 
                                                onClick={() => setViewer({ isOpen: true, url: tenant.police_form_url, title: `${tenant.name} - Police Form` })}
                                                className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                                                title="View Police Form"
                                            >
                                                <FileText size={14} />
                                            </button>
                                        )}
                                        {tenant.agreement_url && (
                                            <button 
                                                onClick={() => setViewer({ isOpen: true, url: tenant.agreement_url, title: `${tenant.name} - Agreement Form` })}
                                                className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                                title="View Agreement Form"
                                            >
                                                <FileText size={14} />
                                            </button>
                                        )}
                                        {!tenant.id_card_front_url && !tenant.id_card_back_url && !tenant.police_form_url && !tenant.agreement_url && (
                                            <span className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">No Files</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${tenant.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                        }`}>
                                        {tenant.status}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${tenant.payment_method === 'Cash' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {tenant.payment_method || 'Cash'}
                                    </span>
                                </td>
                                <td className="p-6 font-mono text-white/80 text-right">
                                    <div className="flex flex-col items-end group relative">
                                        <div className="flex items-center space-x-1">
                                            <span className="text-sm font-bold text-white">Rs. {tenant.balance.toLocaleString()}</span>
                                            {tenant.balance > 0 && (
                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-tighter animate-pulse">Pending</span>
                                            )}
                                        </div>

                                        {(tenant.rent_balance > 0 || tenant.security_balance > 0 || tenant.utility_balance > 0) && (
                                            <div className="flex space-x-1 mt-1">
                                                {tenant.rent_balance > 0 && <span className="text-[9px] px-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded" title="Rent">R</span>}
                                                {tenant.security_balance > 0 && <span className="text-[9px] px-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded" title="Security">S</span>}
                                                {tenant.utility_balance > 0 && <span className="text-[9px] px-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded" title="Utility">U</span>}
                                            </div>
                                        )}

                                        {/* Hover Tooltip Breakdown */}
                                        <div className="absolute right-0 bottom-full mb-2 w-48 p-3 bg-black/95 border border-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl backdrop-blur-xl">
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 border-b border-white/5 pb-1">Ledger Summary</h4>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-white/60">Total Paid:</span>
                                                    <span className="text-green-400 font-bold">Rs. {tenant.total_paid?.toLocaleString()}</span>
                                                </div>
                                                <div className="h-px bg-white/5 my-1" />
                                                {tenant.rent_balance > 0 && (
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-blue-400">Rent Due:</span>
                                                        <span className="text-white font-medium">Rs. {tenant.rent_balance.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {tenant.security_balance > 0 && (
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-yellow-400">Security Due:</span>
                                                        <span className="text-white font-medium">Rs. {tenant.security_balance.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {tenant.utility_balance > 0 && (
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-purple-400">Utility Due:</span>
                                                        <span className="text-white font-medium">Rs. {tenant.utility_balance.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="pt-1.5 border-t border-white/5 mt-1 flex justify-between text-xs font-bold">
                                                    <span className="text-white">Total Pending:</span>
                                                    <span className="text-red-400 underline decoration-red-400/30">Rs. {tenant.balance.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a href={`https://wa.me/${tenant.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors">
                                            <MessageCircle size={18} />
                                        </a>
                                        <button
                                            title="Add Manual Charge/Bill"
                                            onClick={() => {
                                                setChargeModalTenant(tenant);
                                                setChargeForm({
                                                    type: 'RENT',
                                                    amount: '',
                                                    date: new Date().toISOString().split('T')[0],
                                                    description: ''
                                                });
                                            }}
                                            className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-400 transition-colors"
                                        >
                                            <Receipt size={18} />
                                        </button>
                                        <button
                                            title="Edit"
                                            onClick={() => {
                                                const roomOccupants = tenants.filter(t => t.room === tenant.room && t.id !== tenant.id);
                                                setRoomTenants(roomOccupants);
                                                setEditingTenant({ ...tenant, internet_opt_in: tenant.internet_opt_in !== false });
                                            }}
                                            className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            title="Move-Out / Settle"
                                            onClick={() => openMoveOut(tenant)}
                                            className="p-2 rounded-lg hover:bg-orange-500/20 text-orange-400 transition-colors"
                                        >
                                            <LogOut size={18} />
                                        </button>
                                        <button
                                            title="Archive"
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: tenant.id, name: tenant.name }); }}
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-500/60 hover:text-red-500 transition-colors"
                                        >
                                            <Archive size={18} />
                                        </button>
                                        {tenant.is_archived && (
                                            <button
                                                title="Restore"
                                                onClick={() => handleRestore(tenant)}
                                                className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                                            >
                                                <RotateCcw size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTenants.length === 0 && !loading && (
                    <div className="text-center py-16 text-white/30">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{searchTerm ? 'No matching tenants.' : 'No active tenants.'}</p>
                    </div>
                )}
            </div>

            {/* ── EDIT TENANT MODAL ── */}
            <AnimatePresence>
                {editingTenant && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setEditingTenant(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-2xl p-8 border-blue-500/30 shadow-2xl relative z-[1000] pointer-events-auto max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center">Edit Tenant: {editingTenant.name}</h3>
                                <button onClick={() => setEditingTenant(null)} className="text-white/30 hover:text-white transition-colors"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleUpdate} className="space-y-6">
                                {/* Personal Information Section */}
                                <div className="space-y-4">
                                    <h4 className="text-xs text-blue-400 uppercase tracking-widest font-bold border-b border-blue-500/20 pb-2">Personal Information</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Full Name</label>
                                            <input type="text" value={editingTenant.name || ''}
                                                onChange={e => setEditingTenant({ ...editingTenant, name: e.target.value })}
                                                className="glass-input w-full h-12 px-4 rounded-xl" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Father's Name</label>
                                            <input type="text" value={editingTenant.father_name || ''}
                                                onChange={e => setEditingTenant({ ...editingTenant, father_name: e.target.value })}
                                                className="glass-input w-full h-12 px-4 rounded-xl" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">CNIC</label>
                                            <input type="text" value={editingTenant.cnic || ''}
                                                onChange={e => setEditingTenant({ ...editingTenant, cnic: e.target.value })}
                                                className="glass-input w-full h-12 px-4 rounded-xl" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Phone Number</label>
                                            <input type="text" value={editingTenant.phone || ''}
                                                onChange={e => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                                                className="glass-input w-full h-12 px-4 rounded-xl" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Emergency Contact</label>
                                            <input type="text" value={editingTenant.emergency_contact || ''}
                                                onChange={e => setEditingTenant({ ...editingTenant, emergency_contact: e.target.value })}
                                                className="glass-input w-full h-12 px-4 rounded-xl" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Police Station</label>
                                            <input type="text" value={editingTenant.police_station || ''}
                                                onChange={e => setEditingTenant({ ...editingTenant, police_station: e.target.value })}
                                                className="glass-input w-full h-12 px-4 rounded-xl" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Permanent Address</label>
                                        <input type="text" value={editingTenant.permanent_address || ''}
                                            onChange={e => setEditingTenant({ ...editingTenant, permanent_address: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl" />
                                    </div>
                                </div>

                                {/* Tenancy & Billing Section */}
                                <div className="space-y-4 pt-4 mt-4">
                                    <h4 className="text-xs text-blue-400 uppercase tracking-widest font-bold border-b border-blue-500/20 pb-2">Tenancy & Billing Details</h4>
                                    
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Applied Billing System (Initial)</label>
                                        <select value={editingTenant.tenancy_type || 'Shared'}
                                            onChange={(e) => setEditingTenant({ ...editingTenant, tenancy_type: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl bg-black/40 text-white cursor-pointer select-none">
                                            <option value="Shared">Pro-Rata Rent (Shared Mode)</option>
                                            <option value="Shared Full">Full Month Rent (Shared Mode)</option>
                                            <option value="Private">Full Room Rent (Private Mode)</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Monthly Rent (Rs.)</label>
                                            <input type="number" value={editingTenant.rent_amount ?? ''}
                                                onChange={e => setEditingTenant({ ...editingTenant, rent_amount: e.target.value ? parseFloat(e.target.value) : 0 })}
                                                className="glass-input w-full h-12 px-4 rounded-xl" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Security Deposit (Rs.)</label>
                                            <input type="number" value={editingTenant.security_deposit ?? ''}
                                                onChange={e => setEditingTenant({ ...editingTenant, security_deposit: e.target.value ? parseFloat(e.target.value) : 0 })}
                                                className="glass-input w-full h-12 px-4 rounded-xl" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Bed Label</label>
                                        <input type="text" value={editingTenant.bed_label || editingTenant.bed || ''}
                                            placeholder="e.g. Window Side"
                                            onChange={e => setEditingTenant({ ...editingTenant, bed_label: e.target.value, bed: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl" />
                                    </div>
                                    
                                    <div className="space-y-2 pt-2">
                                        <label className="text-[10px] items-center text-white/40 uppercase tracking-widest flex font-bold">
                                            <Users size={12} className="mr-1" /> Tenancy Hierarchy
                                        </label>
                                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                            <p className="text-xs text-white/60 mb-3">Does this person pay rent via a primary room tenant?</p>
                                            <select value={editingTenant.parent_tenant_id || ''}
                                                onChange={(e) => setEditingTenant({ ...editingTenant, parent_tenant_id: e.target.value })}
                                                className="glass-input w-full h-12 px-4 rounded-xl bg-black/40 text-white cursor-pointer">
                                                <option value="">Independent Tenant (Primary)</option>
                                                {roomTenants.map(t => (
                                                    <option key={t.id} value={t.id}>Sub-tenant to: {t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest block font-bold mt-2">Additional Services</label>
                                        <div className={`glass-card p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${editingTenant.internet_opt_in ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-black/20'}`}
                                            onClick={() => setEditingTenant({ ...editingTenant, internet_opt_in: !editingTenant.internet_opt_in })}>
                                            <div className="flex items-center">
                                                <Wifi size={18} className={editingTenant.internet_opt_in ? "text-purple-400 mr-3" : "text-white/30 mr-3"} />
                                                <div>
                                                    <div className="text-white font-bold text-sm">Hostel Internet Access</div>
                                                    <div className="text-xs text-white/50 mt-0.5">Opt-in to share the monthly Wi-Fi bill</div>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full transition-colors flex items-center p-1 ${editingTenant.internet_opt_in ? 'bg-purple-500' : 'bg-white/10'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${editingTenant.internet_opt_in ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit"
                                    className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-blue-500/30">
                                    <Save size={18} className="mr-2" /> Update Registry
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── MOVE-OUT / SETTLEMENT MODAL ── */}
            <AnimatePresence>
                {moveOutTenant && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => { setMoveOutTenant(null); setSettlementPreview(null); }}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-lg p-8 border-orange-500/30 shadow-2xl relative z-[1000] pointer-events-auto max-h-[90vh] overflow-y-auto">

                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <LogOut className="text-orange-400" size={20} /> Move-Out Settlement
                                    </h3>
                                    <p className="text-white/50 text-sm mt-1">{moveOutTenant.name} — Room {moveOutTenant.room}</p>
                                </div>
                                <button onClick={() => { setMoveOutTenant(null); setSettlementPreview(null); }}
                                    className="text-white/30 hover:text-white transition-colors"><X size={20} /></button>
                            </div>

                            {/* Settlement Preview Cards */}
                            {settlementPreview && (
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                        <p className="text-blue-400 text-xs uppercase tracking-wider mb-1">Deposit Held</p>
                                        <p className="text-white font-bold">Rs. {settlementPreview.security_deposit_held?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                                        <p className="text-red-400 text-xs uppercase tracking-wider mb-1">Unpaid Rent</p>
                                        <p className="text-white font-bold">Rs. {settlementPreview.unpaid_rent?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className={`p-3 rounded-xl border text-center ${liveRefund > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                        <p className={`text-xs uppercase tracking-wider mb-1 ${liveRefund > 0 ? 'text-green-400' : 'text-red-400'}`}>Est. Refund</p>
                                        <p className="text-white font-bold">Rs. {liveRefund.toLocaleString()}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Notice Date</label>
                                        <input type="date" value={moveOutForm.notice_date}
                                            onChange={e => setMoveOutForm({ ...moveOutForm, notice_date: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Exit Date *</label>
                                        <input type="date" value={moveOutForm.exit_date}
                                            onChange={e => setMoveOutForm({ ...moveOutForm, exit_date: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Damage Deduction (Rs.)</label>
                                        <input type="number" min="0" value={moveOutForm.damage_deduction}
                                            onChange={e => setMoveOutForm({ ...moveOutForm, damage_deduction: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Fine Deduction (Rs.)</label>
                                        <input type="number" min="0" value={moveOutForm.fine_deduction}
                                            onChange={e => setMoveOutForm({ ...moveOutForm, fine_deduction: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Notes (condition of room, reason, etc.)</label>
                                    <textarea value={moveOutForm.notes} rows={2}
                                        onChange={e => setMoveOutForm({ ...moveOutForm, notes: e.target.value })}
                                        placeholder="Optional notes about the move-out..."
                                        className="glass-input w-full px-4 py-3 rounded-xl resize-none" />
                                </div>

                                {/* Final Settlement Box */}
                                <div className={`p-4 rounded-xl border ${liveRefund > 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-white font-bold">Final Refund to Tenant</p>
                                        <p className={`text-2xl font-black ${liveRefund > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            Rs. {liveRefund.toLocaleString()}
                                        </p>
                                    </div>
                                    <p className="text-white/40 text-xs mt-1">
                                        Deposit Rs.{settlementPreview?.security_deposit_held || 0} − Damage Rs.{moveOutForm.damage_deduction || 0} − Fines Rs.{moveOutForm.fine_deduction || 0} − Unpaid Rs.{settlementPreview?.unpaid_rent || 0}
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => { setMoveOutTenant(null); setSettlementPreview(null); }}
                                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-medium transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={handleMoveOut} disabled={moveOutLoading}
                                        className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-60">
                                        <LogOut size={18} />
                                        {moveOutLoading ? 'Processing...' : 'Process Move-Out'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── DELETE CONFIRMATION MODAL ── */}
            <AnimatePresence>
                {deleteConfirm && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirm(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-sm p-8 border-red-500/30 shadow-2xl relative z-[1000] text-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Archive size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Archive Tenant?</h3>
                            <p className="text-white/60 mb-8">
                                Are you sure you want to move <span className="text-white font-bold">{deleteConfirm.name}</span> to the archive? Their occupancy will be freed, but all financial and document history is preserved and restorable by an admin.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleDelete}
                                    className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-500/30">
                                    Archive Now
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── ADD MANUAL CHARGE MODAL ── */}
            <AnimatePresence>
                {chargeModalTenant && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setChargeModalTenant(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 50 }}
                            className="glass-card w-full max-w-lg p-8 border-purple-500/30 shadow-2xl relative z-[1010]">
                            
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Receipt className="text-purple-400" size={24} /> Add Manual Charge
                                    </h3>
                                    <p className="text-white/50 text-sm mt-1">Tenant: <span className="font-bold text-white">{chargeModalTenant.name}</span></p>
                                </div>
                                <button onClick={() => setChargeModalTenant(null)} className="text-white/30 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddCharge} className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Charge Type *</label>
                                        <select 
                                            value={chargeForm.type}
                                            onChange={(e) => setChargeForm({...chargeForm, type: e.target.value})}
                                            className="glass-input w-full h-12 px-4 rounded-xl bg-black/40 text-white cursor-pointer"
                                        >
                                            <option value="RENT">Rent Arrears</option>
                                            <option value="DEPOSIT">Security Deposit</option>
                                            <option value="UTILITY">Utility Bill</option>
                                            <option value="FINE">Fine / Warning Penalty</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Amount (Rs.) *</label>
                                        <input type="number" step="any" required min="1"
                                            value={chargeForm.amount}
                                            onChange={(e) => setChargeForm({...chargeForm, amount: e.target.value})}
                                            placeholder="e.g. 50000"
                                            className="glass-input w-full h-12 px-4 rounded-xl placeholder:text-white/20" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Bill Generated Date (For Backdating) *</label>
                                    <input type="date" required
                                        value={chargeForm.date}
                                        title="Select a past date to backdate this bill to when it actually occurred"
                                        onChange={(e) => setChargeForm({...chargeForm, date: e.target.value})}
                                        className="glass-input w-full h-12 px-4 rounded-xl bg-black/40 text-white cursor-pointer" 
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Description / Note</label>
                                    <input type="text"
                                        value={chargeForm.description}
                                        onChange={(e) => setChargeForm({...chargeForm, description: e.target.value})}
                                        placeholder="Optional explanation for this charge..."
                                        className="glass-input w-full h-12 px-4 rounded-xl placeholder:text-white/20" 
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setChargeModalTenant(null)}
                                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={chargeLoading}
                                        className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50">
                                        {chargeLoading ? 'Adding...' : 'Apply Charge'}
                                    </button>
                                </div>
                            </form>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <DocumentViewerModal 
                isOpen={viewer.isOpen}
                onClose={() => setViewer({ ...viewer, isOpen: false })}
                imageUrl={viewer.url}
                title={viewer.title}
            />
        </div>
    );
};

export default Tenants;
