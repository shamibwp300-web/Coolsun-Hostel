import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Download, Plus, CheckCircle, X, Shield, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';

const Finance = () => {
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);

    const [summary, setSummary] = useState({ current_collected: 0, current_pending: 0 });
    const [transactions, setTransactions] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [expenseFilter, setExpenseFilter] = useState('All'); // 'All', 'Business', 'Personal'
    const [expenseSearch, setExpenseSearch] = useState('');
    const [expenseStartDate, setExpenseStartDate] = useState('');
    const [expenseEndDate, setExpenseEndDate] = useState('');
    const [revenueStartDate, setRevenueStartDate] = useState('');
    const [revenueEndDate, setRevenueEndDate] = useState('');
    const [revenuePreset, setRevenuePreset] = useState('All-Time'); // 'Today', 'Week', 'Month', 'All-Time'
    const [editingExpense, setEditingExpense] = useState(null);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);

    const [expenseForm, setExpenseForm] = useState({
        type: 'Business',
        category: 'Repairs',
        amount: '',
        description: '',
        subNote: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [paymentForm, setPaymentForm] = useState({
        tenant_id: '',
        amount: ''
    });

    const [openingBalanceForm, setOpeningBalanceForm] = useState({
        tenant_id: '',
        amount: '',
        balance_type: 'DUE' // 'DUE' or 'ADVANCE'
    });

    const fetchExpenses = async () => {
        try {
            const params = new URLSearchParams();
            if (expenseFilter !== 'All') params.append('type', expenseFilter);
            if (expenseSearch) params.append('search', expenseSearch);
            if (expenseStartDate) params.append('start_date', expenseStartDate);
            if (expenseEndDate) params.append('end_date', expenseEndDate);

            const res = await axios.get(`/api/finance/expenses?${params.toString()}`);
            setExpenses(res.data);
        } catch (e) {
            console.error("Error fetching expenses", e);
        }
    };

    const fetchData = async () => {
        try {
            const params = new URLSearchParams();
            if (revenueStartDate) params.append('start_date', revenueStartDate);
            if (revenueEndDate) params.append('end_date', revenueEndDate);

            const [dashRes, ledgRes, tenRes] = await Promise.all([
                axios.get(`/api/dashboard/summary?${params.toString()}`),
                axios.get('/api/finance/ledger'),
                axios.get('/api/tenants')
            ]);
            setSummary(dashRes.data.financials);
            setTransactions(ledgRes.data);
            setTenants(tenRes.data);
            fetchExpenses();
        } catch (e) {
            console.error("Error fetching finance data", e);
        }
    };

    const handleRevenuePreset = (preset) => {
        setRevenuePreset(preset);
        const today = new Date();
        let start = '';
        let end = today.toISOString().split('T')[0];

        if (preset === 'Today') {
            start = end;
        } else if (preset === 'Week') {
            const weekAgo = new Date();
            weekAgo.setDate(today.getDate() - 7);
            start = weekAgo.toISOString().split('T')[0];
        } else if (preset === 'Month') {
            const firstDay = new Date(today.getFullYear(), today.month, 1);
            start = firstDay.toISOString().split('T')[0];
        } else if (preset === 'All-Time') {
            start = '';
            end = '';
        }

        setRevenueStartDate(start);
        setRevenueEndDate(end);
    };

    const resetRevenueFilters = () => {
        handleRevenuePreset('All-Time');
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [expenseFilter, expenseStartDate, expenseEndDate]);

    useEffect(() => {
        fetchData();
    }, [revenueStartDate, revenueEndDate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchExpenses();
        }, 500);
        return () => clearTimeout(timer);
    }, [expenseSearch]);

    // Body Scroll Lock for Modal
    useEffect(() => {
        if (showExpenseModal || showPaymentModal) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [showExpenseModal, showPaymentModal]);

    const handleExpenseSubmit = async () => {
        if (!expenseForm.amount || !expenseForm.description) return alert("Please fill details");
        setLoading(true);
        try {
            await axios.post('/api/finance/expenses', expenseForm);
            setShowExpenseModal(false);
            setExpenseForm({ 
                type: 'Business', 
                category: 'Repairs', 
                amount: '', 
                description: '', 
                subNote: '',
                date: new Date().toISOString().split('T')[0] 
            });
            fetchData();
        } catch (e) {
            alert("Error logging expense");
        }
        setLoading(false);
    };

    const handlePaymentSubmit = async () => {
        if (!paymentForm.tenant_id || !paymentForm.amount) return alert("Select tenant and enter amount");
        setLoading(true);
        try {
            await axios.post('/api/finance/pay', paymentForm);
            setShowPaymentModal(false);
            setPaymentForm({ tenant_id: '', amount: '' });
            fetchData();
        } catch (e) {
            alert(e.response?.data?.error || "Error receiving payment");
        }
        setLoading(false);
    };

    const handleOpeningBalanceSubmit = async () => {
        if (openingBalanceForm.balance_type !== 'OWNER_FUND' && !openingBalanceForm.tenant_id) return alert("Select tenant");
        if (!openingBalanceForm.amount) return alert("Enter amount");
        setLoading(true);
        try {
            await axios.post('/api/finance/opening-balance', openingBalanceForm);
            setShowOpeningBalanceModal(false);
            setOpeningBalanceForm({ tenant_id: '', amount: '', balance_type: 'DUE' });
            fetchData();
        } catch (e) {
            alert(e.response?.data?.error || "Error adding opening balance");
        }
        setLoading(false);
    };

    const handleGenerateRent = async () => {
        if (!window.confirm("Generate this month's rent for all active tenants?")) return;
        try {
            const res = await axios.post('/api/finance/generate-rent');
            alert(res.data.message);
            fetchData();
        } catch (e) {
            alert("Error generating rent");
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        try {
            await axios.delete(`/api/finance/expenses/${id}`);
            fetchData();
        } catch (err) {
            alert("Failed to delete expense");
        }
    };
    
    const handleUpdateExpense = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/finance/expenses/${editingExpense.id}`, editingExpense);
            setEditingExpense(null);
            fetchData();
        } catch (err) {
            alert("Failed to update expense");
        }
    };

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    const handleZeroLedger = async () => {
        const userInput = window.prompt(
            "⚠️ DANGER: This will permanently ZERO OUT Total Collected, Current Pending, and Arrears.\n\nAll Tenants, Rooms, and Expenses will be completely safe.\n\nIf you want to proceed and ZERO out the ledger, type 'CONFIRM' below:"
        );
        if (userInput === "CONFIRM") {
            try {
                await axios.post('/api/admin/reset-ledger', { confirm: "RESET_LEDGER_ONLY" });
                alert("✅ SUCCESS! The ledger has been effectively zeroed out. Total Collected and Pending are now 0.");
                fetchData(); // refresh the numbers
            } catch (err) {
                alert("❌ Failed to zero ledger. Please try again.");
            }
        } else if (userInput !== null) {
            alert("Action cancelled. You must type exactly 'CONFIRM' to zero the ledger.");
        }
    };

    return (
        <div className="space-y-6 relative p-4 md:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Financial Ledger</h1>
                    <p className="text-white/40 text-sm">Real-time Revenue & Expense Tracking</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowPaymentModal(true)}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center shadow-lg shadow-blue-500/20 text-sm"
                    >
                        <DollarSign size={16} className="mr-2" /> Receive Payment
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowOpeningBalanceModal(true)}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center shadow-lg shadow-purple-500/20 text-sm"
                    >
                        <Plus size={16} className="mr-2" /> Opening Balance
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGenerateRent}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium flex items-center justify-center shadow-lg shadow-green-500/20 text-sm"
                    >
                        <Calendar size={16} className="mr-2" /> Generate Rent
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleZeroLedger}
                        className="flex-1 md:flex-none px-4 py-2 border border-red-500 bg-red-900/40 hover:bg-red-600 text-red-200 hover:text-white font-bold rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 text-sm transition-colors"
                    >
                        Zero Ledger
                    </motion.button>
                </div>
            </div>

            {/* Receive Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowPaymentModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-md p-6 border-blue-500/30 shadow-2xl relative z-[111]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Receive Payment</h3>
                                <button onClick={() => setShowPaymentModal(false)} className="text-white/30 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase text-white/40 font-medium tracking-wider mb-1 block">Select Tenant</label>
                                    <select
                                        value={paymentForm.tenant_id}
                                        onChange={e => setPaymentForm({ ...paymentForm, tenant_id: e.target.value })}
                                        className="glass-input w-full h-12 px-4 rounded-xl text-white bg-black/40">
                                        <option value="">-- Choose Tenant --</option>
                                        {tenants.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} (Room {t.room}) — Current Due: Rs.{t.balance || 0}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-white/40 font-medium tracking-wider mb-1 block">Amount Received (Rs)</label>
                                    <input
                                        type="number"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        className="glass-input w-full h-12 px-4 rounded-xl text-lg font-mono"
                                        placeholder="0.00"
                                    />
                                </div>
                                <button
                                    onClick={handlePaymentSubmit}
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wide mt-4 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Mark as Paid'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Opening Balance Modal */}
            <AnimatePresence>
                {showOpeningBalanceModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowOpeningBalanceModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-md p-6 border-purple-500/30 shadow-2xl relative z-[111]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Add Opening Balance</h3>
                                <button onClick={() => setShowOpeningBalanceModal(false)} className="text-white/30 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex bg-white/5 p-1 rounded-xl mb-4 gap-1">
                                    <button
                                        onClick={() => setOpeningBalanceForm({ ...openingBalanceForm, balance_type: 'DUE' })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${openingBalanceForm.balance_type === 'DUE' ? 'bg-orange-600 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                    >Previous Due</button>
                                    <button
                                        onClick={() => setOpeningBalanceForm({ ...openingBalanceForm, balance_type: 'ADVANCE' })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${openingBalanceForm.balance_type === 'ADVANCE' ? 'bg-green-600 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                    >Advance</button>
                                    <button
                                        onClick={() => setOpeningBalanceForm({ ...openingBalanceForm, balance_type: 'OWNER_FUND', tenant_id: '' })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${openingBalanceForm.balance_type === 'OWNER_FUND' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                    >Owner Fund</button>
                                </div>
                                {openingBalanceForm.balance_type !== 'OWNER_FUND' && (
                                <div>
                                    <label className="text-xs uppercase text-white/40 font-medium tracking-wider mb-1 block">Select Tenant</label>
                                    <select
                                        value={openingBalanceForm.tenant_id}
                                        onChange={e => setOpeningBalanceForm({ ...openingBalanceForm, tenant_id: e.target.value })}
                                        className="glass-input w-full h-12 px-4 rounded-xl text-white bg-black/40">
                                        <option value="">-- Choose Tenant --</option>
                                        {tenants.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                                            <option key={t.id} value={t.id}>{t.name} (Room {t.room})</option>
                                        ))}
                                    </select>
                                </div>
                                )}
                                <div>
                                    <label className="text-xs uppercase text-white/40 font-medium tracking-wider mb-1 block">Amount (Rs) {openingBalanceForm.balance_type === 'OWNER_FUND' ? '- Self Addition' : ''}</label>
                                    <input
                                        type="number"
                                        value={openingBalanceForm.amount}
                                        onChange={(e) => setOpeningBalanceForm({ ...openingBalanceForm, amount: e.target.value })}
                                        className="glass-input w-full h-12 px-4 rounded-xl text-lg font-mono"
                                        placeholder="0.00"
                                    />
                                </div>
                                <button
                                    onClick={handleOpeningBalanceSubmit}
                                    disabled={loading}
                                    className={`w-full py-3 rounded-xl text-white font-bold tracking-wide mt-4 disabled:opacity-50 transition-all ${openingBalanceForm.balance_type === 'DUE' ? 'bg-orange-600 hover:bg-orange-500' : openingBalanceForm.balance_type === 'ADVANCE' ? 'bg-green-600 hover:bg-green-500' : 'bg-purple-600 hover:bg-purple-500'}`}
                                >
                                    {loading ? 'Processing...' : 'Add Balance'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Expense Modal */}
            <AnimatePresence>
                {showExpenseModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowExpenseModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-md p-6 border-red-500/30 shadow-2xl relative z-[111]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Log New Expense</h3>
                                <button onClick={() => setShowExpenseModal(false)} className="text-white/30 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                {/* Type Toggle */}
                                <div className="flex bg-white/5 p-1 rounded-xl">
                                    <button
                                        onClick={() => setExpenseForm({ ...expenseForm, type: 'Business' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${expenseForm.type === 'Business' ? 'bg-red-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                    >Business Expense</button>
                                    <button
                                        onClick={() => setExpenseForm({ ...expenseForm, type: 'Personal' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${expenseForm.type === 'Personal' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                    >Owner Withdrawal</button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs uppercase text-white/40 font-medium tracking-wider mb-1 block">Date</label>
                                        <input type="date" value={expenseForm.date}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-white/40 font-medium tracking-wider mb-1 block">Amount</label>
                                        <input type="number" value={expenseForm.amount}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl text-lg font-mono" placeholder="0.00" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs uppercase text-white/40 font-medium tracking-wider mb-1 block">Description</label>
                                    <input type="text" value={expenseForm.description}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                        className="glass-input w-full h-12 px-4 rounded-xl"
                                        placeholder={expenseForm.type === 'Business' ? "e.g. Plumbing Repair" : "e.g. Home Renovation"} />
                                </div>

                                {expenseForm.type === 'Personal' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                        <label className="text-xs uppercase text-purple-300 font-medium flex items-center mb-1 mt-2">
                                            <span className="bg-purple-500/20 px-2 py-0.5 rounded mr-2">REQUIRED</span>Usage Sub-Note
                                        </label>
                                        <textarea value={expenseForm.subNote}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, subNote: e.target.value })}
                                            className="glass-input w-full h-20 p-4 rounded-xl text-sm border-purple-500/30 focus:border-purple-500"
                                            placeholder="Explain why this withdrawal was made..." />
                                    </motion.div>
                                )}

                                <button onClick={handleExpenseSubmit} disabled={loading}
                                    className={`w-full py-3 rounded-xl text-white font-bold shadow-lg mt-4 disabled:opacity-50 transition-all ${expenseForm.type === 'Business' ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'}`}>
                                    {loading ? 'Logging...' : 'Confirm Log'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Revenue Stream */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-xl border-l-4 border-blue-500">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h3 className="text-lg font-semibold text-white flex items-center">
                                <TrendingUp className="mr-2 text-blue-400" /> Revenue Stream
                            </h3>
                            <div className="flex bg-white/5 p-1 rounded-lg">
                                {['Today', 'Week', 'Month', 'All-Time'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => handleRevenuePreset(p)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${revenuePreset === p ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={resetRevenueFilters}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all text-red-400/60 hover:text-red-400 hover:bg-red-400/10 ml-1 border-l border-white/10 pl-3"
                                    title="Reset Revenue Filters"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Custom Date Range for Revenue */}
                        {(revenuePreset === 'All-Time' || revenuePreset === 'Custom') && (
                            <div className="grid grid-cols-2 gap-4 mb-6 bg-white/5 p-3 rounded-lg border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="text-[10px] uppercase text-white/30 font-bold mb-1 block ml-1">From</label>
                                    <input 
                                        type="date" 
                                        value={revenueStartDate}
                                        onChange={(e) => {
                                            setRevenueStartDate(e.target.value);
                                            setRevenuePreset('Custom');
                                        }}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-white/30 font-bold mb-1 block ml-1">To</label>
                                    <input 
                                        type="date" 
                                        value={revenueEndDate}
                                        onChange={(e) => {
                                            setRevenueEndDate(e.target.value);
                                            setRevenuePreset('Custom');
                                        }}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/20"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/5 p-4 rounded-lg flex flex-col justify-between min-h-[100px]">
                                <p className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2">Total Collected</p>
                                <div>
                                    <p className="text-[10px] text-green-400/60 font-bold mb-1">Rs.</p>
                                    <p className="text-xl font-bold text-green-400 leading-tight">
                                        {Number(summary?.current_collected || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg border-l-2 border-orange-500/50 flex flex-col justify-between min-h-[100px]">
                                <p className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2">Current Pending</p>
                                <div>
                                    <p className="text-[10px] text-orange-400/60 font-bold mb-1">Rs.</p>
                                    <p className="text-xl font-bold text-orange-400 leading-tight">
                                        {Number(summary?.current_pending || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg border-l-2 border-red-500/50 flex flex-col justify-between min-h-[100px]">
                                <p className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2">Arrears (Older)</p>
                                <div>
                                    <p className="text-[10px] text-red-500/60 font-bold mb-1">Rs.</p>
                                    <p className="text-xl font-bold text-red-500 leading-tight">
                                        {Number(summary?.legacy_arrears || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg border border-red-500/20 flex flex-col justify-between min-h-[100px]">
                                <p className="text-[10px] uppercase text-red-400/60 font-bold tracking-wider mb-2">Total Expenses</p>
                                <div>
                                    <p className="text-[10px] text-white/40 font-bold mb-1">Rs.</p>
                                    <p className="text-xl font-bold text-white leading-tight">
                                        {Number(summary?.current_expenses || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg border border-green-500/20 flex flex-col justify-between min-h-[100px]">
                                <p className="text-[10px] uppercase text-green-400/60 font-bold tracking-wider mb-2">Net Cash in Hand</p>
                                <div>
                                    <p className="text-[10px] text-white/40 font-bold mb-1">Rs.</p>
                                    <p className="text-xl font-bold text-white leading-tight">
                                        {Number(summary?.net_cash || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Recent Transactions</h4>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {transactions.length === 0 ? (
                                <p className="text-white/30 text-center py-4 text-sm">No recent payments logged.</p>
                            ) : transactions.map((txn) => (
                                <div key={txn.id} className="flex justify-between items-center p-3 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5">
                                    <div className="flex items-center">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${txn.type === 'DEPOSIT' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {txn.type === 'DEPOSIT' ? <Shield size={18} /> : <DollarSign size={18} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-white">{txn.name}</p>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${txn.status === 'PENDING' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {txn.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/40">Room {txn.room} &bull; <span className={txn.type === 'DEPOSIT' ? 'text-purple-300' : 'text-blue-300'}>{txn.type}</span> {txn.description && `(${txn.description})`}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">Rs. {txn.amount.toLocaleString()}</p>
                                        <p className="text-xs text-white/30">{txn.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Expense Log */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-xl border-l-4 border-red-500">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h3 className="text-lg font-semibold text-white flex items-center">
                                <TrendingDown className="mr-2 text-red-400" /> Expense Log
                            </h3>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowExpenseModal(true)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-red-500/20 transition-colors flex items-center"
                            >
                                <Plus size={16} className="mr-1" /> Log Expense
                            </motion.button>
                        </div>

                        {/* Professional Filters */}
                        <div className="bg-white/5 p-4 rounded-xl mb-6 border border-white/5 space-y-4">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="text-[10px] uppercase text-white/30 font-bold mb-1 block ml-1">Search Description</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={expenseSearch}
                                            onChange={(e) => setExpenseSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && fetchExpenses()}
                                            placeholder="e.g. Repair, Food..."
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-red-500/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                                    <div>
                                        <label className="text-[10px] uppercase text-white/30 font-bold mb-1 block ml-1">From</label>
                                        <input 
                                            type="date" 
                                            value={expenseStartDate}
                                            onChange={(e) => setExpenseStartDate(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-white/30 font-bold mb-1 block ml-1">To</label>
                                        <input 
                                            type="date" 
                                            value={expenseEndDate}
                                            onChange={(e) => setExpenseEndDate(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
                                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                                    {['All', 'Business', 'Personal'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setExpenseFilter(f)}
                                            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${expenseFilter === f ? 'bg-red-500 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {f === 'Personal' ? 'Owner' : f}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    {(expenseSearch || expenseStartDate || expenseEndDate || expenseFilter !== 'All') && (
                                        <button 
                                            onClick={() => {
                                                setExpenseSearch('');
                                                setExpenseStartDate('');
                                                setExpenseEndDate('');
                                                setExpenseFilter('All');
                                            }}
                                            className="text-[10px] font-bold text-white/30 hover:text-red-400 uppercase tracking-widest transition-colors"
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase text-white/30 font-bold">Filtered Total</p>
                                        <p className="text-lg font-bold text-white">Rs. {expenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {expenses.filter(e => expenseFilter === 'All' || e.type === expenseFilter).length === 0 ? (
                                <p className="text-white/30 text-center py-4 text-sm">No {expenseFilter.toLowerCase()} expenses logged.</p>
                            ) : expenses.filter(e => expenseFilter === 'All' || e.type === expenseFilter).map((exp, i) => (
                                <div key={i} className="flex justify-between items-center p-3 border-b border-white/5 last:border-0 group relative">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <p className="text-sm font-medium text-white">{exp.description}</p>
                                                {exp.type === 'Personal' && <span className="ml-2 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] font-bold rounded">OWNER PERSONAL</span>}
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => setEditingExpense(exp)}
                                                    className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-blue-400 transition-colors"
                                                >
                                                    <Edit size={12} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteExpense(exp.id)}
                                                    className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-white/40">{exp.category} {exp.note && ` - ${exp.note}`}</p>
                                        <p className="text-[10px] text-white/20 mt-1">{exp.display_date || exp.date}</p>
                                    </div>
                                    <p className="text-sm font-bold text-red-400">-{exp.amount.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Edit Expense Modal */}
                <AnimatePresence>
                    {editingExpense && (
                        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }}
                                onClick={() => setEditingExpense(null)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }} 
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="glass-panel w-full max-w-md p-6 relative z-[1002]"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white">Edit Expense</h3>
                                    <button onClick={() => setEditingExpense(null)} className="text-white/40 hover:text-white"><X size={20} /></button>
                                </div>
                                <form onSubmit={handleUpdateExpense} className="space-y-4">
                                    <div>
                                        <label className="text-xs text-white/40 uppercase mb-1 block">Description</label>
                                        <input 
                                            type="text" 
                                            value={editingExpense.description}
                                            onChange={e => setEditingExpense({...editingExpense, description: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-white/40 uppercase mb-1 block">Amount</label>
                                            <input 
                                                type="number" 
                                                value={editingExpense.amount}
                                                onChange={e => setEditingExpense({...editingExpense, amount: e.target.value})}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-white/40 uppercase mb-1 block">Date</label>
                                            <input 
                                                type="date" 
                                                value={editingExpense.date ? (editingExpense.date.includes(',') ? new Date(editingExpense.date).toISOString().split('T')[0] : editingExpense.date) : ''}
                                                onChange={e => setEditingExpense({...editingExpense, date: e.target.value})}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-white/40 uppercase mb-1 block">Type</label>
                                            <select 
                                                value={editingExpense.type}
                                                onChange={e => setEditingExpense({...editingExpense, type: e.target.value})}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 appearance-none"
                                            >
                                                <option value="Business">Business</option>
                                                <option value="Personal">Owner/Personal</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all mt-4">
                                        Update Expense
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Finance;
