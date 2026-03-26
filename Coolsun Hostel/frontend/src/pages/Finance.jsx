import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Download, Plus, CheckCircle, X, Shield } from 'lucide-react';
import axios from 'axios';

const Finance = () => {
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);

    const [summary, setSummary] = useState({ current_collected: 0, current_pending: 0 });
    const [transactions, setTransactions] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);

    const [expenseForm, setExpenseForm] = useState({
        type: 'Business',
        category: 'Repairs',
        amount: '',
        description: '',
        subNote: ''
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

    const fetchData = async () => {
        try {
            const [dashRes, ledgRes, expRes, tenRes] = await Promise.all([
                axios.get('/api/dashboard/summary'),
                axios.get('/api/finance/ledger'),
                axios.get('/api/finance/expenses'),
                axios.get('/api/tenants')
            ]);
            setSummary(dashRes.data.financials);
            // Show all ledger records (including PENDING rent invoices)
            setTransactions(ledgRes.data);
            setExpenses(expRes.data);
            setTenants(tenRes.data);
        } catch (e) {
            console.error("Error fetching finance data", e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
            setExpenseForm({ type: 'Business', category: 'Repairs', amount: '', description: '', subNote: '' });
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
        if (!openingBalanceForm.tenant_id || !openingBalanceForm.amount) return alert("Select tenant and enter amount");
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

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="space-y-6 relative p-4 md:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Financial Ledger</h1>
                    <p className="text-white/40 text-sm">Real-time Revenue & Expense Tracking</p>
                </div>
                <div className="flex space-x-3 w-full md:w-auto">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowPaymentModal(true)}
                        className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center shadow-lg shadow-blue-500/20"
                    >
                        <DollarSign size={20} className="mr-2" /> Receive Payment
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowOpeningBalanceModal(true)}
                        className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center shadow-lg shadow-purple-500/20"
                    >
                        <Plus size={20} className="mr-2" /> Opening Balance
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGenerateRent}
                        className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium flex items-center justify-center shadow-lg shadow-green-500/20"
                    >
                        <Calendar size={20} className="mr-2" /> Generate Rent
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
                                <div className="flex bg-white/5 p-1 rounded-xl mb-2">
                                    <button
                                        onClick={() => setOpeningBalanceForm({ ...openingBalanceForm, balance_type: 'DUE' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${openingBalanceForm.balance_type === 'DUE' ? 'bg-orange-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                    >Previous Due (Owed)</button>
                                    <button
                                        onClick={() => setOpeningBalanceForm({ ...openingBalanceForm, balance_type: 'ADVANCE' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${openingBalanceForm.balance_type === 'ADVANCE' ? 'bg-green-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                    >Advance (Paid)</button>
                                </div>
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
                                <div>
                                    <label className="text-xs uppercase text-white/40 font-medium tracking-wider mb-1 block">Amount (Rs)</label>
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
                                    className={`w-full py-3 rounded-xl text-white font-bold tracking-wide mt-4 disabled:opacity-50 transition-all ${openingBalanceForm.balance_type === 'DUE' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-green-600 hover:bg-green-500'}`}
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

                                <div>
                                    <label className="text-xs uppercase text-white/40 font-medium tracking-wider mb-1 block">Amount</label>
                                    <input type="number" value={expenseForm.amount}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                        className="glass-input w-full h-12 px-4 rounded-xl text-lg font-mono" placeholder="0.00" />
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
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <TrendingUp className="mr-2 text-blue-400" /> Revenue Stream
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/5 p-4 rounded-lg">
                                <p className="text-xs uppercase text-white/40">Total Collected</p>
                                <p className="text-2xl font-bold text-green-400">Rs. {Number(summary?.current_collected || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg border-l-2 border-orange-500/50">
                                <p className="text-xs uppercase text-white/40">Current Pending</p>
                                <p className="text-2xl font-bold text-orange-400">Rs. {Number(summary?.current_pending || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg border-l-2 border-red-500/50">
                                <p className="text-xs uppercase text-white/40">Arrears (Older)</p>
                                <p className="text-2xl font-bold text-red-500">Rs. {Number(summary?.legacy_arrears || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg border border-red-500/20">
                                <p className="text-xs uppercase text-white/40 font-bold text-red-400">Total Expenses</p>
                                <p className="text-2xl font-bold text-white">Rs. {Number(summary?.current_expenses || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg border border-green-500/20">
                                <p className="text-xs uppercase text-white/40 font-bold text-green-400">Net Cash in Hand</p>
                                <p className="text-2xl font-bold text-white">Rs. {Number(summary?.net_cash || 0).toLocaleString()}</p>
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
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <TrendingDown className="mr-2 text-red-400" /> Expense Log
                        </h3>
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg mb-6">
                            <div>
                                <p className="text-xs uppercase text-white/40">Total Logged</p>
                                <p className="text-2xl font-bold text-white">Rs. {totalExpenses.toLocaleString()}</p>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowExpenseModal(true)}
                                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center"
                            >
                                <Plus size={16} className="mr-1" /> Log Expense
                            </motion.button>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {expenses.length === 0 ? (
                                <p className="text-white/30 text-center py-4 text-sm">No expenses logged.</p>
                            ) : expenses.map((exp, i) => (
                                <div key={i} className="flex justify-between items-center p-3 border-b border-white/5 last:border-0 group relative">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <p className="text-sm font-medium text-white">{exp.description}</p>
                                            {exp.type === 'Personal' && <span className="ml-2 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] font-bold rounded">OWNER PERSONAL</span>}
                                        </div>
                                        <p className="text-xs text-white/40">{exp.category} {exp.note && ` - ${exp.note}`}</p>
                                        <p className="text-[10px] text-white/20 mt-1">{exp.date}</p>
                                    </div>
                                    <p className="text-sm font-bold text-red-400">-{exp.amount.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Finance;
