import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  CreditCard, 
  User, 
  Users, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowRight,
  Home,
  Receipt,
  Coins,
  DollarSign
} from 'lucide-react';
import axios from 'axios';

const ReceiveRent = () => {
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'hostel'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [hostelData, setHostelData] = useState([]);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(null);
  const [repairing, setRepairing] = useState(false);

  // Fetch Hostel Summary for "Whole Hostel" view
  const fetchHostelSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/finance/hostel-summary');
      setHostelData(res.data);
    } catch (err) {
      setError("Failed to fetch hostel summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'hostel') {
      fetchHostelSummary();
    }
  }, [viewMode]);

  // Fetch Room Summary
  const fetchRoomRecord = async (num = searchQuery) => {
    if (!num) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setRoomData(null);
    
    try {
      const res = await axios.get(`/api/finance/room-summary/${num}`);
      setRoomData(res.data);
      if (viewMode === 'hostel') setViewMode('single');
    } catch (err) {
      setError(err.response?.data?.error || "Room record not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleDataRepair = async () => {
    if (!window.confirm("This will zero out balances for ALL sub-tenants who are covered by a Primary tenant. Proceed?")) return;
    setRepairing(true);
    try {
      const res = await axios.post('/api/finance/data-repair');
      setSuccess(`Repair successful: ${res.data.entries_voided} charges voided.`);
      if (roomData) fetchRoomRecord(roomData.room_number);
      if (viewMode === 'hostel') fetchHostelSummary();
    } catch (err) {
      setError("Data repair failed.");
    } finally {
      setRepairing(false);
    }
  };

  const handleCollectTotal = async () => {
    if (!roomData) return;
    setPaying(true);
    setError(null);
    
    try {
      // Logic: Iterate through all tenants and pay their full balances
      const totalTenants = [...roomData.primary, ...roomData.sub_tenants];
      
      for (const tenant of totalTenants) {
        if (tenant.balance > 0) {
          await axios.post('/api/finance/pay', {
            tenant_id: tenant.id,
            amount: tenant.balance,
            payment_method: paymentMethod
          });
        }
      }
      
      setSuccess(`Successfully collected Rs. ${roomData.total_pending.toLocaleString()} for Room ${roomData.room_number}`);
      // Refresh data
      fetchRoomRecord(roomData.room_number);
    } catch (err) {
      setError("Partial success/failure during bulk payment. Please check records.");
    } finally {
      setPaying(false);
    }
  };

  const TenantCard = ({ tenant, isPrimary }) => (
    <div className={`relative group p-6 rounded-2xl border transition-all duration-300 ${isPrimary ? 'bg-blue-600/10 border-blue-500/30 shadow-lg shadow-blue-500/5' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-md ${isPrimary ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/40'}`}>
            {tenant.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-white font-bold tracking-tight">{tenant.name}</h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isPrimary ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'bg-white/10 text-white/40'}`}>
                {isPrimary ? 'Primary Resident' : 'Group Resident'}
              </span>
              <span className="text-[9px] text-white/20">•</span>
              <span className="text-[10px] text-white/40 font-mono">{tenant.bed || 'No Bed Assigned'}</span>
            </div>
            {tenant.phone && <p className="text-[10px] text-white/30 mt-1 font-medium">{tenant.phone}</p>}
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">{isPrimary ? 'Personal Balance' : 'Outstanding'}</p>
          <p className={`text-xl font-mono font-black ${tenant.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
            Rs. {tenant.balance.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );

  const HostelSummaryView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {hostelData.map((room) => (
        <motion.div 
          key={room.room_id}
          whileHover={{ scale: 1.02 }}
          onClick={() => fetchRoomRecord(room.room_number)}
          className="glass-card p-6 border-white/10 hover:border-blue-500/30 cursor-pointer transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
            <Home size={80} />
          </div>
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-black text-white">#{room.room_number}</h3>
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">Room Total</p>
            </div>
            <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${room.total_pending > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {room.total_pending > 0 ? 'DUE' : 'CLEAR'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-white/60 font-bold">{room.primary_name}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-tighter">{room.occupancy} Residents</p>
              </div>
              <p className={`text-xl font-mono font-black ${room.total_pending > 0 ? 'text-red-400' : 'text-white/40'}`}>
                 Rs. {room.total_pending.toLocaleString()}
              </p>
            </div>
            
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
               <span className="text-[9px] font-bold text-white/20 tracking-widest uppercase italic">Click to manage</span>
               <ArrowRight size={14} className="text-white/20 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </motion.div>
      ))}
      {hostelData.length === 0 && !loading && (
        <div className="col-span-full py-20 text-center text-white/20">
          No occupied rooms found.
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tighter">Receive Rent</h1>
          <p className="text-white/40 font-medium italic">Collect and record payments for rooms and tenants</p>
        </div>
        <button 
          onClick={handleDataRepair}
          disabled={repairing}
          className="text-[10px] font-black text-white/20 hover:text-yellow-500/50 uppercase tracking-[0.2em] transition-colors flex items-center"
        >
          {repairing ? <Loader2 size={12} className="animate-spin mr-2" /> : <AlertCircle size={12} className="mr-2" />}
          Emergency Data Repair
        </button>
      </div>

      {/* Mode Selector & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="glass-card p-1 flex space-x-1 shrink-0">
           <button 
             onClick={() => setViewMode('single')}
             className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${viewMode === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
           >SINGLE ROOM</button>
           <button 
             onClick={() => setViewMode('hostel')}
             className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${viewMode === 'hostel' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
           >WHOLE HOSTEL</button>
        </div>
        
        <div className="flex-1 w-full relative">
          <div className="flex items-center space-x-3 w-full backdrop-blur-xl bg-white/5 border border-white/10 p-2 rounded-2xl shadow-2xl focus-within:border-blue-500/50 transition-all">
            <div className="pl-3 text-white/20"><Search size={22} /></div>
            <input 
              type="text" 
              placeholder="Enter Room Number (e.g. 201)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchRoomRecord()}
              className="flex-1 bg-transparent border-none text-xl font-bold text-white focus:ring-0 placeholder:text-white/10 py-3"
            />
            <button 
              onClick={() => fetchRoomRecord()}
              disabled={loading || !searchQuery}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center transition-all shadow-lg active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span className="flex items-center tracking-tight">Fetch Record <ArrowRight className="ml-2" size={18} /></span>}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'hostel' ? (
          <HostelSummaryView key="hostel" />
        ) : roomData ? (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Sidebar Stats */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-card p-8 border-white/10 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                  <Home size={200} />
                </div>
                
                <div className="relative z-10 space-y-8">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Room Identity</span>
                    <h2 className="text-6xl font-black text-white mt-2 tracking-tighter">#{roomData.room_number}</h2>
                    <p className="text-xs text-white/40 mt-1 uppercase font-bold tracking-widest">Active Tenancy Group</p>
                  </div>

                  <div className="h-px bg-white/5" />

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Total Room Pending</p>
                    <div className="flex items-baseline space-x-2">
                       <span className="text-4xl font-black text-red-500 font-mono leading-none">Rs. {roomData.total_pending.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Cash', 'Online'].map(m => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 rounded-lg text-xs font-black transition-all border ${paymentMethod === m ? 'bg-white text-black border-white shadow-lg shadow-white/10' : 'bg-black/40 text-white/40 border-white/5 hover:border-white/10'}`}
                        >
                          {m.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleCollectTotal}
                    disabled={paying || roomData.total_pending <= 0}
                    className={`w-full h-16 rounded-2xl font-black text-md tracking-tight flex items-center justify-center transition-all ${paying || roomData.total_pending <= 0 ? 'bg-white/5 text-white/20' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-xl shadow-green-500/20 active:scale-95'}`}
                  >
                    {paying ? <Loader2 className="animate-spin" size={24} /> : <><CreditCard className="mr-3" size={20} /> COLLECT ROOM TOTAL <ArrowRight className="ml-2" size={18} /></>}
                  </button>
                  <p className="text-[10px] text-white/20 text-center italic">Funds will be distributed to clear oldest balances first</p>
                </div>
              </div>

              {success && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center text-green-400">
                  <CheckCircle2 className="mr-3 shrink-0" size={20} />
                  <span className="text-xs font-bold">{success}</span>
                </div>
              )}
            </div>

            {/* Hierarchical Tenant List */}
            <div className="lg:col-span-8 space-y-8">
              {/* Primary Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                   <div className="h-1 w-1 bg-blue-500 rounded-full" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Primary Resident (Account Holder)</h3>
                </div>
                {roomData.primary.length > 0 ? (
                  roomData.primary.map(t => <TenantCard key={t.id} tenant={t} isPrimary={true} />)
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-white/5 bg-white/[0.02] text-white/20 text-center text-sm font-medium">
                    No primary resident assigned to this room record.
                  </div>
                )}
              </div>

              {/* Sub-tenants Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                   <div className="h-1 w-1 bg-white/20 rounded-full" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Sub-tenants / Group Residents</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {roomData.sub_tenants.length > 0 ? (
                    roomData.sub_tenants.map(t => <TenantCard key={t.id} tenant={t} isPrimary={false} />)
                  ) : (
                    <div className="p-6 rounded-2xl border border-dashed border-white/5 bg-white/[0.02] text-white/10 text-center text-xs">
                      No sub-tenants currently linked to this room's primary account.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-white/20 space-y-4">
             {loading ? (
               <Loader2 className="animate-spin" size={48} />
             ) : (
               <>
                 <Receipt size={64} className="opacity-10" />
                 <p className="text-sm font-medium tracking-wide">Enter a room number above to retrieve billing details</p>
               </>
             )}
          </div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 right-8 z-50 p-4 rounded-xl bg-red-600 text-white shadow-2xl flex items-center space-x-3"
        >
          <AlertCircle size={20} />
          <span className="font-bold text-sm tracking-tight">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:bg-black/10 rounded-full p-1"><CheckCircle2 size={16} /></button>
        </motion.div>
      )}
    </div>
  );
};

export default ReceiveRent;
