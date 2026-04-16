import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, Home, Save, X, PlusCircle, Droplets, Wifi } from 'lucide-react';
import axios from 'axios';

const Electricity = () => {
    const [roomsStatus, setRoomsStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loggingForRoom, setLoggingForRoom] = useState(null); // Electricity
    const [loggingWaterForRoom, setLoggingWaterForRoom] = useState(null); // Water
    const [loggingWifiForRoom, setLoggingWifiForRoom] = useState(null); // Internet
    const [newReading, setNewReading] = useState({ current_reading: '', previous_reading: '', unit_cost: 0, meter_number: '' });
    const [newWaterBill, setNewWaterBill] = useState({ amount: '' });
    const [newWifiBill, setNewWifiBill] = useState({ amount: '' });
    const [error, setError] = useState(null);

    const fetchStatus = async () => {
        try {
            const res = await axios.get('/api/utilities/rooms-status');
            setRoomsStatus(res.data);
            setError(null);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch utilities status", err);
            const msg = err.response?.data?.error || "Could not load electricity data.";
            setError(msg);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleLogClick = (room) => {
        setLoggingForRoom(room);
        setNewReading({
            current_reading: '',
            previous_reading: room.last_reading,
            unit_cost: room.last_unit_cost > 0 ? room.last_unit_cost : 45.0,
            meter_number: room.meter_number || ''
        });
    };

    const handleSaveReading = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/utilities/meter-reading', {
                room_id: loggingForRoom.room_id,
                current_reading: newReading.current_reading,
                previous_reading: newReading.previous_reading,
                unit_cost: newReading.unit_cost,
                meter_number: newReading.meter_number
            });
            setLoggingForRoom(null);
            fetchStatus(); // Refresh the grid
        } catch (err) {
            alert(err.response?.data?.error || "Failed to log meter reading");
        }
    };

    const handleLogWaterClick = (room) => {
        setLoggingWaterForRoom(room);
        setNewWaterBill({ amount: '' });
    };

    const handleSaveWaterBill = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/utilities/water-bill', {
                room_id: loggingWaterForRoom.room_id,
                amount: newWaterBill.amount
            });
            setLoggingWaterForRoom(null);
            fetchStatus();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to log water bill");
        }
    };

    const handleLogWifiClick = (room) => {
        setLoggingWifiForRoom(room);
        setNewWifiBill({ amount: '' });
    };

    const handleSaveWifiBill = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/utilities/internet-bill', {
                room_id: loggingWifiForRoom.room_id,
                amount: newWifiBill.amount
            });
            setLoggingWifiForRoom(null);
            fetchStatus();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to log internet bill");
        }
    };

    if (loading) return <div className="p-8 text-white/50 animate-pulse">Syncing smart meters...</div>;

    return (
        <div className="space-y-8 p-4 md:p-0">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                        <Zap className="mr-3 text-yellow-400" size={32} />
                        Utilities & Billing
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Manage electricity readings and water bills</p>
                </div>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {roomsStatus.map(room => (
                    <motion.div
                        key={room.room_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 border-yellow-500/10 hover:border-yellow-500/30 transition-colors group relative overflow-hidden"
                    >
                        {/* Background flare */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors pointer-events-none" />

                        <div className="flex justify-between items-start mb-6">
                            <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center font-bold text-lg text-white">
                                {room.room_number}
                            </div>
                            <div className="flex-1 ml-4">
                                <h4 className="text-white font-medium">Room {room.room_number}</h4>
                                <div className="text-[10px] text-yellow-400/70 font-mono tracking-wider uppercase">
                                    {room.meter_number ? `Meter: ${room.meter_number}` : 'No Meter Set'}
                                </div>
                            </div>
                            <div className="flex flex-col space-y-2">
                                <button
                                    onClick={() => handleLogClick(room)}
                                    className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-bold hover:bg-yellow-500 hover:text-white transition-colors flex items-center w-full"
                                >
                                    <Zap size={14} className="mr-2" /> Log Electricity
                                </button>
                                <button
                                    onClick={() => handleLogWaterClick(room)}
                                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors flex items-center w-full justify-center"
                                >
                                    <Droplets size={14} className="mr-2" /> Log Water
                                </button>
                                <button
                                    onClick={() => handleLogWifiClick(room)}
                                    className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-bold hover:bg-purple-500 hover:text-white transition-colors flex items-center w-full justify-center"
                                >
                                    <Wifi size={14} className="mr-2" /> Log Internet
                                </button>
                            </div>
                        </div>

                        <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-4">
                            <div>
                                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1 flex items-center">
                                    <Activity size={10} className="mr-1 text-yellow-500" />
                                    Last Reading Dial
                                </div>
                                <div className="text-2xl font-mono text-white tracking-wider font-medium">
                                    {room.last_reading.toString().padStart(5, '0')}
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <div className="text-xs text-white/30">
                                        {room.last_reading_date ? `Logged on ${room.last_reading_date}` : 'No readings yet'}
                                    </div>
                                    <div className="text-xs font-bold text-yellow-400/70">
                                        @ Rs. {room.last_unit_cost.toLocaleString()}/unit
                                    </div>
                                </div>
                            </div>

                            {/* NEW: Display Last Billed Amount */}
                            {room.last_bill_amount > 0 && (
                                <div className="pt-4 border-t border-white/5">
                                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
                                        Last Bill Generated
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-2xl font-bold text-yellow-400">
                                            Rs. {room.last_bill_amount.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded">
                                            {room.last_units_consumed} units
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NEW: Display Last Water Bill */}
                            {room.last_water_bill_amount > 0 && (
                                <div className="pt-4 border-t border-white/5">
                                    <div className="text-[10px] text-blue-400/80 uppercase tracking-widest mb-1 flex items-center">
                                        <Droplets size={10} className="mr-1" />
                                        Last Water Bill Generated
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-2xl font-bold text-blue-400">
                                            Rs. {room.last_water_bill_amount.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-white/30">
                                            Logged on {room.last_water_bill_date}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NEW: Display Last Internet Bill */}
                            {room.last_internet_bill_amount > 0 && (
                                <div className="pt-4 border-t border-white/5">
                                    <div className="text-[10px] text-purple-400/80 uppercase tracking-widest mb-1 flex items-center">
                                        <Wifi size={10} className="mr-1" />
                                        Last Internet Bill Generated
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-2xl font-bold text-purple-400">
                                            Rs. {room.last_internet_bill_amount.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-white/30">
                                            Logged on {room.last_internet_bill_date}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-white/30 mt-1">
                                        Split among {room.internet_opt_in_count} opted-in tenants
                                        {room.internet_opt_in_count > 0 && ` (Rs. ${Math.round(room.last_internet_bill_amount / room.internet_opt_in_count).toLocaleString()} each)`}
                                    </div>
                                </div>
                            )}

                            {/* GRAND TOTAL SECTION */}
                            {(room.last_bill_amount > 0 || room.last_water_bill_amount > 0 || room.last_internet_bill_amount > 0) && (
                                <div className="pt-4 border-t border-yellow-500/20 bg-yellow-500/5 -mx-4 -mb-4 p-4 rounded-b-xl mt-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-white/60 font-medium">Total Utility Cost</span>
                                        <span className="text-lg font-bold text-white">
                                            Rs. {(room.last_bill_amount + room.last_water_bill_amount + room.last_internet_bill_amount).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-yellow-400/50 mt-1">
                                        *Total per tenant varies by internet opt-in.
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-between items-end">
                            <div className="text-xs text-white/40">
                                Active Tenants: {room.occupied_beds}/{room.capacity}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Log Reading Modal */}
            <AnimatePresence>
                {loggingForRoom && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setLoggingForRoom(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-card w-full max-w-md p-8 border-yellow-500/30 shadow-2xl relative z-[111]"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Zap size={20} className="mr-3 text-yellow-400" /> Room {loggingForRoom.room_number} Meter
                                </h3>
                                <button onClick={() => setLoggingForRoom(null)} className="text-white/30 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex flex-col group focus-within:border-yellow-500/30 transition-all">
                                    <label className="text-white/30 uppercase tracking-widest text-[10px] mb-2 font-bold flex justify-between">
                                        Meter Number
                                        <span className="text-[8px] text-yellow-500/50">*Assigned to room</span>
                                    </label>
                                    <input 
                                        type="text"
                                        value={newReading.meter_number || ''}
                                        onChange={e => setNewReading({ ...newReading, meter_number: e.target.value })}
                                        className="bg-transparent text-white font-mono text-2xl focus:outline-none placeholder:text-white/10"
                                        placeholder="Enter Meter #"
                                    />
                                </div>
                                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex flex-col group focus-within:border-yellow-500/30 transition-all">
                                    <label className="text-white/30 uppercase tracking-widest text-[10px] mb-2 font-bold flex justify-between">
                                        Previous Dial
                                        <span className="text-[8px] text-yellow-500/50">*Editable for corrections</span>
                                    </label>
                                    <input 
                                        type="number"
                                        value={newReading.previous_reading}
                                        onChange={e => setNewReading({ ...newReading, previous_reading: e.target.value })}
                                        className="bg-transparent text-white font-mono text-2xl focus:outline-none placeholder:text-white/10"
                                        placeholder="00000"
                                    />
                                </div>
                            </div>

                            <form onSubmit={handleSaveReading} className="space-y-6">
                                <div>
                                    <label className="text-[10px] text-yellow-400 uppercase tracking-widest mb-2 block font-bold">New Current Reading / Dial</label>
                                    <input
                                        required
                                        type="number"
                                        min={newReading.previous_reading}
                                        value={newReading.current_reading}
                                        onChange={e => setNewReading({ ...newReading, current_reading: e.target.value })}
                                        className="glass-input w-full h-14 px-4 rounded-xl text-2xl font-mono tracking-widest text-center"
                                        placeholder="00000"
                                    />
                                    {newReading.current_reading && parseFloat(newReading.current_reading) < parseFloat(newReading.previous_reading || 0) && (
                                        <p className="text-red-400 text-xs mt-2">Current reading cannot be lower than the previous reading.</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Per Unit Cost (Rs)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.1"
                                        value={newReading.unit_cost}
                                        onChange={e => setNewReading({ ...newReading, unit_cost: e.target.value })}
                                        className="glass-input w-full h-12 px-4 rounded-xl"
                                    />
                                </div>

                                {/* Dynamic Real-time Calculation */}
                                {newReading.current_reading > parseFloat(newReading.previous_reading || 0) && newReading.unit_cost > 0 && (
                                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                        <div className="flex justify-between text-xs text-white/60 mb-1">
                                            <span>Units Consumed</span>
                                            <span>{newReading.current_reading - newReading.previous_reading}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold text-yellow-400">
                                            <span>Calculated Bill</span>
                                            <span>Rs. {((newReading.current_reading - newReading.previous_reading) * newReading.unit_cost).toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!newReading.current_reading || parseFloat(newReading.current_reading) < parseFloat(newReading.previous_reading || 0)}
                                    className="w-full py-4 mt-4 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:bg-gray-700 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-yellow-500/20"
                                >
                                    <Save size={18} className="mr-2" /> Log & Calculate Bill
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Log Water Bill Modal */}
                {loggingWaterForRoom && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setLoggingWaterForRoom(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-card w-full max-w-md p-8 border-blue-500/30 shadow-2xl relative z-[111]"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Droplets size={20} className="mr-3 text-blue-400" /> Room {loggingWaterForRoom.room_number} Water Bill
                                </h3>
                                <button onClick={() => setLoggingWaterForRoom(null)} className="text-white/30 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveWaterBill} className="space-y-6">
                                <div>
                                    <label className="text-[10px] text-blue-400 uppercase tracking-widest mb-2 block font-bold">Total Bill Amount (Rs)</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        value={newWaterBill.amount}
                                        onChange={e => setNewWaterBill({ amount: e.target.value })}
                                        className="glass-input w-full h-14 px-4 rounded-xl text-2xl font-mono tracking-widest text-center"
                                        placeholder="1500"
                                    />
                                    <p className="text-white/40 text-xs mt-2 text-center">
                                        This flat amount will be divided automatically among the active tenants in the room.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newWaterBill.amount}
                                    className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-blue-500/20"
                                >
                                    <Save size={18} className="mr-2" /> Log & Split Water Bill
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Log Internet Bill Modal */}
                {loggingWifiForRoom && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setLoggingWifiForRoom(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-card w-full max-w-md p-8 border-purple-500/30 shadow-2xl relative z-[111]"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Wifi size={20} className="mr-3 text-purple-400" /> Room {loggingWifiForRoom.room_number} Internet Bill
                                </h3>
                                <button onClick={() => setLoggingWifiForRoom(null)} className="text-white/30 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveWifiBill} className="space-y-6">
                                <div>
                                    <label className="text-[10px] text-purple-400 uppercase tracking-widest mb-2 block font-bold">Total Bill Amount (Rs)</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        value={newWifiBill.amount}
                                        onChange={e => setNewWifiBill({ amount: e.target.value })}
                                        className="glass-input w-full h-14 px-4 rounded-xl text-2xl font-mono tracking-widest text-center"
                                        placeholder="1000"
                                    />
                                    <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl mt-3">
                                        <p className="text-purple-300/80 text-xs text-center font-medium">
                                            Currently <span className="text-white font-bold">{loggingWifiForRoom.internet_opt_in_count}</span> out of {loggingWifiForRoom.occupied_beds} active tenants are opted-in to Internet.
                                        </p>
                                        <p className="text-white/40 text-[10px] mt-1 text-center">
                                            The bill will ONLY be divided among opted-in tenants.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newWifiBill.amount}
                                    className="w-full py-4 mt-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-gray-700 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-purple-500/20"
                                >
                                    <Save size={18} className="mr-2" /> Log & Split Internet Bill
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Electricity;
