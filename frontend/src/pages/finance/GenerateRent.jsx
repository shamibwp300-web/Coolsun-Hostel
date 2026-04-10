import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Building, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const GenerateRent = () => {
    const [mode, setMode] = useState('ALL'); // 'ALL' or 'ROOM'
    const [roomNumber, setRoomNumber] = useState('');
    const [billingMonth, setBillingMonth] = useState(''); // YYYY-MM
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleGenerate = async () => {
        if (mode === 'ROOM' && !roomNumber) return alert("Please enter a room number");
        
        const confirmMsg = mode === 'ALL' 
            ? "Generate this month's rent for ALL active tenants in the entire hostel?" 
            : `Generate this month's rent for Room ${roomNumber}?`;
            
        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        setResult(null);
        try {
            const res = await axios.post('/api/finance/generate-rent', {
                room_number: mode === 'ROOM' ? roomNumber : null,
                billing_month: billingMonth || null
            });
            setResult({ success: true, message: res.data.message });
            if (mode === 'ROOM') setRoomNumber('');
        } catch (e) {
            setResult({ 
                success: false, 
                message: e.response?.data?.error || "Error generating rent. This might happen if rent is already generated for this period." 
            });
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Generate Monthly Rent</h1>
                    <p className="text-white/40 text-sm">Issue monthly rent invoices and update ledger records</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Mode Selection */}
                <div className="space-y-4">
                    <div className={`glass-panel p-6 rounded-2xl border-2 transition-all cursor-pointer group ${mode === 'ALL' ? 'border-green-500/50 bg-green-500/5' : 'border-white/5 hover:border-white/10'}`}
                        onClick={() => setMode('ALL')}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${mode === 'ALL' ? 'bg-green-500 text-white' : 'bg-white/5 text-white/40'}`}>
                                <Building size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Whole Hostel</h3>
                                <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">Apply rent to every active tenant across all floors</p>
                            </div>
                        </div>
                    </div>

                    <div className={`glass-panel p-6 rounded-2xl border-2 transition-all cursor-pointer group ${mode === 'ROOM' ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5 hover:border-white/10'}`}
                        onClick={() => setMode('ROOM')}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${mode === 'ROOM' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/40'}`}>
                                <Search size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Single Room</h3>
                                <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">Issue billing for a specific room or primary resident group</p>
                            </div>
                        </div>
                        
                        {mode === 'ROOM' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-white/10">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Room Number</label>
                                <input 
                                    type="text" 
                                    value={roomNumber}
                                    onChange={(e) => setRoomNumber(e.target.value)}
                                    placeholder="e.g. 101"
                                    className="glass-input w-full h-12 px-4 rounded-xl text-lg font-mono font-bold tracking-widest placeholder:text-white/10 focus:border-blue-500"
                                    autoFocus
                                />
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Status & Action */}
                <div className="flex flex-col justify-center space-y-6">
                    <div className="glass-panel p-8 rounded-2xl text-center space-y-6 border border-white/5 shadow-2xl">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                            <Calendar size={40} className={mode === 'ALL' ? 'text-green-400' : 'text-blue-400'} />
                        </div>

                        <div className="w-full text-left mb-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Billing Month (Optional)</label>
                            <input 
                                type="month" 
                                value={billingMonth}
                                onChange={(e) => setBillingMonth(e.target.value)}
                                className="glass-input w-full h-12 px-4 rounded-xl text-lg font-bold text-white tracking-widest bg-black/40 focus:border-blue-500 mb-2"
                            />
                            <p className="text-[10px] text-white/30 font-medium">Leave empty to use the current month.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Ready to Generate?</h2>
                            <p className="text-sm text-white/40 px-4">
                                This will generate a <span className="text-white font-bold">PENDING</span> ledger entry for the current billing period. 
                                Invoices will automatically reflect in the Tenant Registry and Financial Ledger.
                            </p>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={loading || (mode === 'ROOM' && !roomNumber)}
                            className={`w-full py-4 rounded-xl font-black text-white uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                                mode === 'ALL' ? 'bg-green-600 hover:bg-green-500 shadow-green-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                            }`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Calendar size={20} />}
                            {loading ? 'Processing...' : 'Run Generation'}
                        </button>

                        {result && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-4 rounded-xl border flex items-center gap-3 text-left ${result.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                            >
                                {result.success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                                <p className="text-xs font-medium leading-relaxed">{result.message}</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerateRent;
