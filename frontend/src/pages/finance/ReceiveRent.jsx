import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building, Shield, User, Users, CheckCircle, AlertCircle, Loader2, ArrowRight, CreditCard, Receipt } from 'lucide-react';
import axios from 'axios';

const ReceiveRent = () => {
    const [collectMode, setCollectMode] = useState('ROOM'); // 'ROOM' or 'ALL'
    
    // ROOM Mode States
    const [searchTerm, setSearchTerm] = useState('');
    const [roomData, setRoomData] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    
    // ALL Mode States
    const [allDebtors, setAllDebtors] = useState([]);
    const [tenantPayAmounts, setTenantPayAmounts] = useState({});

    // Shared States
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (collectMode === 'ALL') {
            fetchAllDebtors();
        } else {
            setResult(null);
        }
    }, [collectMode]);

    const fetchAllDebtors = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await axios.get('/api/tenants');
            // strictly greater than 0
            const debtors = res.data.filter(t => t.balance > 0).sort((a,b) => a.room.localeCompare(b.room));
            setAllDebtors(debtors);
            
            const prefill = {};
            debtors.forEach(d => { prefill[d.id] = d.balance });
            setTenantPayAmounts(prefill);
        } catch (e) {
            setResult({ success: false, message: "Failed to fetch debtors list." });
        }
        setLoading(false);
    };

    const handleSearch = async () => {
        if (!searchTerm) return;
        setLoading(true);
        setRoomData(null);
        setResult(null);
        setPaymentAmount('');
        try {
            const res = await axios.get(`/api/finance/room-summary/${searchTerm}`);
            setRoomData(res.data);
            if (res.data.bulk_details?.is_bulk) {
                setPaymentAmount(res.data.bulk_details.bulk_balance.toString());
            } else {
                setPaymentAmount(res.data.total_pending.toString());
            }
        } catch (e) {
            setResult({ success: false, message: e.response?.data?.error || "Room not found or no active tenants." });
        }
        setLoading(false);
    };

    const handlePayment = async () => {
        if (!roomData || !paymentAmount || parseFloat(paymentAmount) <= 0) return;
        
        setSubmitting(true);
        try {
            const amountDecimal = parseFloat(paymentAmount);
            
            if (roomData.bulk_details?.is_bulk) {
                // Bulk payment targets the bulk tenant specifically
                await axios.post('/api/finance/pay', {
                    tenant_id: roomData.bulk_details.bulk_tenant_id,
                    amount: amountDecimal,
                    payment_method: 'Cash'
                });
            } else {
                // Traditional distribution for non-bulk rooms
                let remaining = amountDecimal;
                const allTenants = [...roomData.primary, ...roomData.sub_tenants];
                
                for (const tenant of allTenants) {
                    if (remaining <= 0) break;
                    if (tenant.balance <= 0) continue;
                    
                    const amountToPay = Math.min(remaining, tenant.balance);
                    await axios.post('/api/finance/pay', {
                        tenant_id: tenant.id,
                        amount: amountToPay,
                        payment_method: 'Cash'
                    });
                    remaining -= amountToPay;
                }
            }
            
            setResult({ success: true, message: `Successfully collected Rs. ${paymentAmount} for ${roomData.bulk_details?.is_bulk ? 'Bulk Agreement' : 'Room ' + roomData.room_number}.` });
            setRoomData(null);
            setSearchTerm('');
            setPaymentAmount('');
        } catch (e) {
            setResult({ success: false, message: "Error processing payment distribution." });
        }
        setSubmitting(false);
    };

    const handleSinglePayment = async (tenantId) => {
        const amount = tenantPayAmounts[tenantId];
        if (!amount || parseFloat(amount) <= 0) return;
        
        setSubmitting(true);
        try {
            await axios.post('/api/finance/pay', {
                tenant_id: tenantId,
                amount: parseFloat(amount),
                payment_method: 'Cash'
            });
            setResult({ success: true, message: `Successfully collected Rs. ${amount}.` });
            fetchAllDebtors(); // refresh after pay
        } catch (e) {
            setResult({ success: false, message: e.response?.data?.error || "Error processing payment." });
        }
        setSubmitting(false);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Receive Rent</h1>
                    <p className="text-white/40 text-sm">Collect and record payments for rooms and tenants</p>
                </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-white/5 p-1 rounded-2xl w-fit border border-white/10 shadow-2xl">
                <button 
                    onClick={() => setCollectMode('ROOM')}
                    className={`px-8 py-3 rounded-xl text-sm font-bold tracking-widest transition-all uppercase ${collectMode === 'ROOM' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >Single Room</button>
                <button 
                    onClick={() => setCollectMode('ALL')}
                    className={`px-8 py-3 rounded-xl text-sm font-bold tracking-widest transition-all uppercase ${collectMode === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >Whole Hostel</button>
            </div>

            {result && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className={`p-6 rounded-2xl border flex items-center gap-4 ${result.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {result.success ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                    <div>
                        <h4 className="font-bold uppercase tracking-widest text-xs mb-1">{result.success ? 'Success' : 'Attention'}</h4>
                        <p className="text-sm">{result.message}</p>
                    </div>
                </motion.div>
            )}

            {collectMode === 'ROOM' && (
                <>
                    {/* Search Bar */}
                    <div className="glass-panel p-2 rounded-2xl border border-white/10 flex items-center shadow-2xl">
                        <div className="px-4 text-white/40">
                            <Search size={24} />
                        </div>
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Enter Room Number (e.g. 101)..."
                            className="flex-1 bg-transparent border-none text-xl font-bold text-white placeholder:text-white/10 h-14 outline-none px-2 tracking-widest"
                        />
                        <button 
                            onClick={handleSearch}
                            disabled={loading || !searchTerm}
                            className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Fetch Record"}
                            {!loading && <ArrowRight size={20} />}
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {roomData ? (
                            <motion.div 
                                key="room-view"
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                            >
                                {/* Summary Sidebar */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="glass-panel p-8 rounded-3xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Building size={120} />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6">Room Identity</h3>
                                        <div className="text-5xl font-black text-white mb-2">#{roomData.room_number}</div>
                                        <p className="text-white/40 text-sm font-medium">Active Tenancy Group</p>
                                        
                                        <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                                            <div className="flex justify-between items-end">
                                                <span className="text-xs text-white/30 font-bold uppercase">
                                                    {roomData.bulk_details?.is_bulk ? 'Bulk Group Total' : 'Total Pending'}
                                                </span>
                                                <span className={`text-2xl font-black ${roomData.bulk_details?.is_bulk ? 'text-blue-400' : 'text-red-400'}`}>
                                                    Rs. {(roomData.bulk_details?.is_bulk ? roomData.bulk_details.bulk_balance : roomData.total_pending).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {roomData.bulk_details?.is_bulk && (
                                        <div className="glass-panel p-6 rounded-3xl border border-blue-500/30 bg-blue-500/10 shadow-xl overflow-hidden relative">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Shield size={48} className="text-blue-500" />
                                            </div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-4">Bulk Rental Linked Rooms</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {roomData.bulk_details.linked_rooms.map(roomNum => (
                                                    <span key={roomNum} className={`px-2 py-1 rounded-lg text-[10px] font-black border ${roomNum === roomData.room_number ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                                        {roomNum}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="mt-4 text-[9px] text-white/30 font-medium leading-relaxed italic">
                                                * These rooms are billed as a single group to the bulk agreement holder.
                                            </p>
                                        </div>
                                    )}

                                    <div className="glass-panel p-8 rounded-3xl border border-white/5 space-y-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Collect Payment</h3>
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-white/20">
                                                    <span className="font-bold">Rs.</span>
                                                </div>
                                                <input 
                                                    type="number" 
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    className="glass-input w-full h-14 pl-12 pr-4 rounded-xl text-xl font-black text-white tracking-tight"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <button 
                                                onClick={handlePayment}
                                                disabled={submitting || !paymentAmount}
                                                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 group"
                                            >
                                                {submitting ? <Loader2 className="animate-spin" /> : <CreditCard size={20} />}
                                                {submitting ? 'Processing...' : 'Collect Room Total'}
                                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                            <p className="text-[10px] text-center text-white/20 font-medium">Funds will be distributed to clear oldest balances first</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Hierarchical Breakdown */}
                                <div className="lg:col-span-2 space-y-4">
                                    {roomData.bulk_details?.is_bulk ? (
                                        <>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 px-2">Bulk Agreement Holder</h3>
                                            <div className="glass-panel p-6 rounded-3xl border-2 border-blue-500/50 bg-blue-500/20 shadow-2xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <Shield size={80} />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/20">
                                                            {roomData.bulk_details.bulk_tenant_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-2xl font-black text-white">{roomData.bulk_details.bulk_tenant_name}</h4>
                                                            <div className="flex items-center gap-4 text-white/40 text-[10px] mt-2 font-bold tracking-widest uppercase">
                                                                <span className="flex items-center gap-1 text-blue-400"><Shield size={14} /> Agreement Owner</span>
                                                                <span>• Floor: {roomData.bulk_details.floor_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-blue-400 font-black text-2xl">Rs. {roomData.bulk_details.bulk_balance.toLocaleString()}</div>
                                                        <div className="text-[10px] text-white/20 uppercase font-bold tracking-widest mt-1">Agreement Balance</div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-8 space-y-4">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-2">Registered Sub-Tenants (Current Room)</h3>
                                                {roomData.primary.map(tenant => (
                                                    <div key={tenant.id} className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/5 opacity-60">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 font-bold">
                                                                    {tenant.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-base font-bold text-white/80">{tenant.name}</h4>
                                                                    <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Lives here • Bed {tenant.bed}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-white/40 font-bold text-sm">Rs. 0</div>
                                                                <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-0.5">Rent Included</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-2">Primary Resident (Primary Holder)</h3>
                                    {roomData.primary.map(tenant => (
                                        <div key={tenant.id} className="glass-panel p-6 rounded-3xl border-2 border-blue-500/30 bg-blue-500/10 shadow-xl">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                                                        {tenant.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold text-white">{tenant.name}</h4>
                                                        <div className="flex items-center gap-3 text-white/40 text-xs mt-1">
                                                            <span className="flex items-center gap-1"><User size={12} /> Primary</span>
                                                            <span className="flex items-center gap-1"><Receipt size={12} /> Bed: {tenant.bed}</span>
                                                            <span>• {tenant.phone}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-red-400 font-black text-xl">Rs. {tenant.balance.toLocaleString()}</div>
                                                    <div className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Personal Due</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {roomData.sub_tenants.length > 0 && (
                                        <>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-2 mt-8">Sub-Tenants / Group Residents</h3>
                                            <div className="space-y-3 pl-4 border-l-2 border-white/5">
                                                {roomData.sub_tenants.map(tenant => (
                                                    <div key={tenant.id} className="glass-panel p-5 rounded-2xl border border-white/5 bg-white/5">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 font-bold">
                                                                    {tenant.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-base font-bold text-white/80">{tenant.name}</h4>
                                                                    <div className="flex items-center gap-3 text-white/30 text-[10px] mt-0.5 font-medium">
                                                                        <span className="flex items-center gap-1"><Users size={10} /> Sub-Tenant</span>
                                                                        <span className="flex items-center gap-1"><Receipt size={10} /> Bed: {tenant.bed}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-white font-bold">Rs. {tenant.balance.toLocaleString()}</div>
                                                                <p className="text-[8px] text-white/20 font-bold uppercase tracking-tighter">Due</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="placeholder"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="glass-panel p-20 rounded-3xl border border-dashed border-white/10 text-center space-y-4"
                            >
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/10">
                                    <Building size={32} />
                                </div>
                                <div className="max-w-xs mx-auto">
                                    <h3 className="text-white/40 font-bold">No Room Selected</h3>
                                    <p className="text-sm text-white/20 leading-relaxed">Enter a room number above to fetch the billing summary for primary and sub-tenants.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}

            {collectMode === 'ALL' && (
                <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                        <Users className="text-blue-500" /> Pending Debtors List
                    </h3>
                    
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="animate-spin text-white/40" size={32} />
                        </div>
                    ) : allDebtors.length === 0 ? (
                        <div className="text-center p-12 text-white/40">
                            <CheckCircle size={48} className="mx-auto mb-4 text-green-500/50" />
                            <p className="text-lg font-bold">All clear!</p>
                            <p className="text-sm">There are no tenants with pending balances.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allDebtors.map(tenant => (
                                <div key={tenant.id} className="bg-black/30 p-5 rounded-2xl border border-red-500/10 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{tenant.name}</h4>
                                                <p className="text-xs text-white/40 uppercase tracking-wider mt-0.5">Room {tenant.room} • Bed {tenant.bed}</p>
                                            </div>
                                            <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-black">
                                                Rs. {tenant.balance.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">Rs</div>
                                            <input 
                                                type="number"
                                                value={tenantPayAmounts[tenant.id] || ''}
                                                onChange={(e) => setTenantPayAmounts({...tenantPayAmounts, [tenant.id]: e.target.value})}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-white font-bold text-sm outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleSinglePayment(tenant.id)}
                                            disabled={submitting}
                                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50"
                                        >
                                            Collect
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReceiveRent;
