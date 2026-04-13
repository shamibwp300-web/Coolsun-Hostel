import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  Calendar, 
  Building2, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';

const GenerateRent = () => {
  const [mode, setMode] = useState('hostel'); // 'hostel' or 'room'
  const [roomNumber, setRoomNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const payload = mode === 'room' ? { room_number: roomNumber } : {};
      const res = await axios.post('/api/finance/generate-rent', payload);
      setResult(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate rent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center">
            Generate Rent <PlusCircle className="ml-3 text-blue-500" size={32} />
          </h1>
          <p className="text-white/40 mt-1 font-medium italic">Automated monthly billing for rooms and bulk agreements</p>
        </div>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Billing Cycle</p>
          <p className="text-sm text-blue-400 font-bold">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-1 items-center flex space-x-1 mb-6 max-w-md">
            <button 
              onClick={() => setMode('hostel')}
              className={`flex-1 flex items-center justify-center py-3 rounded-xl text-sm font-bold transition-all ${mode === 'hostel' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
            >
              <Building2 size={18} className="mr-2" /> WHOLE HOSTEL
            </button>
            <button 
              onClick={() => setMode('room')}
              className={`flex-1 flex items-center justify-center py-3 rounded-xl text-sm font-bold transition-all ${mode === 'room' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
            >
              <Search size={18} className="mr-2" /> SINGLE ROOM
            </button>
          </div>

          <motion.div 
            layout
            className="glass-card p-8 border-white/10 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                <TrendingUp size={200} />
            </div>

            <div className="space-y-6 relative z-10">
              {mode === 'room' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <label className="text-xs font-black uppercase tracking-widest text-white/40 block">Target Room Number</label>
                  <div className="relative max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                    <input 
                      type="text"
                      placeholder="e.g. 201"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 glass-input rounded-2xl text-xl font-bold tracking-tight"
                    />
                  </div>
                </motion.div>
              )}

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 flex items-start">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 mr-4 text-blue-400">
                  <Calendar size={22} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Automated Pro-Rata Check</h4>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">
                    The system will automatically identify new tenants and check their agreement dates. 
                    It will also ensure no duplicate bills are generated for this billing cycle.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleGenerate}
                  disabled={loading || (mode === 'room' && !roomNumber)}
                  className={`w-full h-16 rounded-2xl font-black text-lg tracking-tight flex items-center justify-center transition-all ${loading ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-500/20 active:scale-[0.98]'}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-3" size={24} /> GENERATING BILLS...
                    </>
                  ) : (
                    <>
                      {mode === 'hostel' ? 'CONFIRM HOSTEL-WIDE GENERATION' : 'GENERATE ROOM BILL'} 
                      <ArrowRight className="ml-3" size={20} />
                    </>
                  )}
                </button>
              </div>

              {result && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center text-green-400"
                >
                  <CheckCircle2 className="mr-3 shrink-0" size={20} />
                  <span className="text-sm font-bold uppercase tracking-tight">{result}</span>
                </motion.div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center text-red-400"
                >
                  <AlertCircle className="mr-3 shrink-0" size={20} />
                  <span className="text-sm font-bold">{error}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6 bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-4">Smart Logic</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mt-0.5 shrink-0 mr-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-xs text-white/50 leading-relaxed font-medium">
                  <span className="text-white block font-bold mb-0.5 uppercase tracking-tighter">Skip Re-billing</span>
                  If rent has already been generated or paid for the target month, the system will ignore that profile.
                </p>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mt-0.5 shrink-0 mr-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-xs text-white/50 leading-relaxed font-medium">
                  <span className="text-white block font-bold mb-0.5 uppercase tracking-tighter">Bulk Agreements</span>
                  Floors marked as Bulk Rented will generate a single floor-wide bill for the owner, skipping individual tenants.
                </p>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mt-0.5 shrink-0 mr-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-xs text-white/50 leading-relaxed font-medium">
                  <span className="text-white block font-bold mb-0.5 uppercase tracking-tighter">Sub-Tenants Check</span>
                  Sub-tenants with Rs. 0 rent in their profile are automatically excluded from the generation cycle.
                </p>
              </li>
            </ul>
          </div>

          <div className="bg-white/2 overflow-hidden rounded-2xl border border-white/5 p-1 relative">
             <div className="p-5 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">System Status</p>
                <div className="flex items-center space-x-2">
                   <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Active</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateRent;
