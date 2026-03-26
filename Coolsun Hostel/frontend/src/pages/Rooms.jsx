import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Edit3, Users, Home, AlertCircle, Save, X, Trash2 } from 'lucide-react';
import axios from 'axios';

const Rooms = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRoom, setEditingRoom] = useState(null);
    const [isAddingRoom, setIsAddingRoom] = useState(false);
    const [newRoom, setNewRoom] = useState({ number: '', floor: 1, type: 'Small', capacity: 2, base_rent: 10000, is_bulk_rented: false });
    const [error, setError] = useState(null);
    const [floors, setFloors] = useState([]);

    const fetchRooms = async () => {
        try {
            const res = await axios.get('/api/rooms');
            setRooms(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch rooms", err);
            setError("Could not load room inventory.");
            setLoading(false);
        }
    };

    const fetchFloors = async () => {
        try {
            const res = await axios.get('/api/floors');
            setFloors(res.data);
        } catch (err) {
            console.error("Failed to fetch floors", err);
        }
    };

    useEffect(() => {
        fetchRooms();
        fetchFloors();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/rooms/${editingRoom.id}`, editingRoom);
            setEditingRoom(null);
            fetchRooms();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || "Update failed";
            alert(msg);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/rooms', newRoom);
            setIsAddingRoom(false);
            setNewRoom({ number: '', floor: 1, type: 'Small', capacity: 2, base_rent: 10000, is_bulk_rented: false });
            fetchRooms();
        } catch (err) {
            console.error("Create Room Error:", err);
            const errorMsg = err.response?.data?.message || err.response?.data?.error || "Connection error: Could not reach server";
            alert(`⚠️ Error: ${errorMsg}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this room?")) return;
        try {
            await axios.delete(`/api/rooms/${id}`);
            setEditingRoom(null);
            fetchRooms();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete room");
        }
    };

    if (loading) return <div className="p-8 text-white/50 animate-pulse">Scanning Grid...</div>;

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Room Inventory</h1>
                    <p className="text-white/40 text-sm mt-1">Configure property layout and pricing</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-mono uppercase">
                        Total Rooms: {rooms.length}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsAddingRoom(true)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-green-500/20"
                    >
                        + Add Room
                    </motion.button>
                </div>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 flex items-center">
                    <AlertCircle size={18} className="mr-2" /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {rooms.map(room => (
                    <motion.div
                        key={room.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 border-white/5 bg-white/[0.02] flex flex-col justify-between group"
                    >
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg ${room.available_slots > 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/10 text-white/40'
                                        }`}>
                                        {room.number}
                                    </div>
                                    {room.is_bulk_rented && (
                                        <div className="ml-3 px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase rounded-md border border-purple-500/30 text-center">
                                            Bulk<br/>Rented
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setEditingRoom(room)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Edit3 size={18} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40 uppercase tracking-wider text-[10px]">Type</span>
                                    <span className="text-white font-medium">{room.type}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-white/40 uppercase tracking-wider text-[10px]">Base Rent</span>
                                    <span className={room.is_bulk_rented ? "text-purple-400 font-bold" : "text-blue-400 font-bold"}>
                                        {room.is_bulk_rented ? "Rs. 0 (Covered)" : `Rs. ${room.base_rent.toLocaleString()}`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">Occupancy</p>
                                <p className="text-xs font-medium text-white">{room.occupied_beds} / {room.capacity}</p>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${room.available_slots === 0 ? 'bg-red-500' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${(room.occupied_beds / room.capacity) * 100}%` }}
                                />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingRoom && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingRoom(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-md p-8 border-blue-500/30 shadow-2xl relative z-[111] pointer-events-auto"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Home size={20} className="mr-3 text-blue-400" /> Configure Room {editingRoom.number}
                                </h3>
                                <button onClick={() => setEditingRoom(null)} className="text-white/30 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Room Number</label>
                                        <input
                                            type="text"
                                            value={editingRoom.number}
                                            onChange={e => setEditingRoom({ ...editingRoom, number: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Type</label>
                                        <select
                                            value={editingRoom.type}
                                            onChange={e => setEditingRoom({ ...editingRoom, type: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl appearance-none"
                                        >
                                            <option value="Small">Small</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Large">Large</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Base Monthly Rent (Rs)</label>
                                    <input
                                        type="number"
                                        disabled={editingRoom.is_bulk_rented}
                                        value={editingRoom.base_rent}
                                        onChange={e => setEditingRoom({ ...editingRoom, base_rent: e.target.value })}
                                        className={`glass-input w-full h-12 px-4 rounded-xl font-bold ${editingRoom.is_bulk_rented ? 'text-white/20' : 'text-blue-400'}`}
                                    />
                                    {editingRoom.is_bulk_rented && (
                                        <p className="text-[10px] text-purple-400 mt-2 font-bold uppercase tracking-tight">
                                            Managed by Bulk Rental Agreement (Read-Only)
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold flex justify-between">
                                        Total Capacity
                                        <span className="text-white/20 font-normal">Active Tenants: {editingRoom.occupied_beds}</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={editingRoom.capacity}
                                        min={editingRoom.occupied_beds}
                                        onChange={e => setEditingRoom({ ...editingRoom, capacity: parseInt(e.target.value) })}
                                        className="glass-input w-full h-12 px-4 rounded-xl"
                                    />
                                    {editingRoom.capacity < editingRoom.occupied_beds && (
                                        <p className="text-red-400 text-[10px] mt-2 flex items-center">
                                            <AlertCircle size={10} className="mr-1" /> Cannot reduce below current tenants
                                        </p>
                                    )}
                                </div>
                                
                                <div className="pt-2">
                                    <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                        <input 
                                            type="checkbox"
                                            checked={editingRoom.is_bulk_rented}
                                            onChange={e => setEditingRoom({...editingRoom, is_bulk_rented: e.target.checked})}
                                            className="w-5 h-5 rounded border-purple-500/30 text-purple-600 focus:ring-purple-500 bg-black/20"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-white block">Part of Bulk Rental?</span>
                                            <span className="text-[10px] text-purple-400/60 uppercase font-mono">Room Rent will be 0 for sub-tenants</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="flex space-x-4 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(editingRoom.id)}
                                        className="py-4 px-6 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-xl font-bold transition-all border border-red-500/30"
                                        title="Delete Room"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <button
                                        disabled={editingRoom.capacity < editingRoom.occupied_beds}
                                        type="submit"
                                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-blue-500/30"
                                    >
                                        <Save size={18} className="mr-2" /> Save Configuration
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Add Room Modal */}
                {isAddingRoom && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddingRoom(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-md p-8 border-green-500/30 shadow-2xl relative z-[111] pointer-events-auto"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Home size={20} className="mr-3 text-green-400" /> Add New Room
                                </h3>
                                <button onClick={() => setIsAddingRoom(false)} className="text-white/30 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Room Number *</label>
                                        <input
                                            required
                                            type="text"
                                            value={newRoom.number}
                                            onChange={e => {
                                                const num = e.target.value;
                                                // Auto-detect floor: handles 101, F101, G101
                                                let autoFloor = newRoom.floor;
                                                if (num.length >= 1) {
                                                    const match = num.match(/\d/);
                                                    if (match) {
                                                        autoFloor = parseInt(match[0]);
                                                        if (num[0].toUpperCase() === 'G') autoFloor = 0;
                                                    } else if (num[0].toUpperCase() === 'G') {
                                                        autoFloor = 0;
                                                    }
                                                }
                                                const isBulk = floors.find(f => f.floor_number === autoFloor)?.is_bulk_rented || false;
                                                setNewRoom({ ...newRoom, number: num, floor: autoFloor, is_bulk_rented: isBulk });
                                            }}
                                            placeholder="e.g. 101, 201, 301..."
                                            className="glass-input w-full h-12 px-4 rounded-xl"
                                        />
                                        <p className="text-[10px] text-blue-400/70 mt-1 font-bold">↑ Floor Auto-Detected (101→F1, 201→F2, G1→Ground)</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Floor (Auto-Detected)</label>
                                        <input
                                            required
                                            type="number"
                                            value={newRoom.floor}
                                            onChange={e => {
                                                const fNum = parseInt(e.target.value);
                                                const isBulk = floors.find(f => f.floor_number === fNum)?.is_bulk_rented || false;
                                                setNewRoom({ ...newRoom, floor: fNum, is_bulk_rented: isBulk });
                                            }}
                                            className="glass-input w-full h-12 px-4 rounded-xl text-blue-400 font-bold"
                                        />
                                        <div className="mt-1">
                                          {floors.find(f => f.floor_number === parseInt(newRoom.floor))?.is_bulk_rented && (
                                            <p className="text-[10px] text-purple-400 font-bold flex items-center">
                                              <AlertCircle size={10} className="mr-1" /> This floor is currently Bulk Rented
                                            </p>
                                          )}
                                        </div>
                                    </div>
                                </div>


                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Type</label>
                                        <select
                                            value={newRoom.type}
                                            onChange={e => setNewRoom({ ...newRoom, type: e.target.value })}
                                            className="glass-input w-full h-12 px-4 rounded-xl appearance-none"
                                        >
                                            <option value="Small">Small</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Large">Large</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold flex justify-between">Capacity</label>
                                        <input
                                            required
                                            type="number"
                                            value={newRoom.capacity}
                                            min="1"
                                            onChange={e => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })}
                                            className="glass-input w-full h-12 px-4 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Base Monthly Rent (Rs)</label>
                                    <input
                                        required
                                        type="number"
                                        disabled={newRoom.is_bulk_rented}
                                        value={newRoom.base_rent}
                                        onChange={e => setNewRoom({ ...newRoom, base_rent: e.target.value })}
                                        className={`glass-input w-full h-12 px-4 rounded-xl font-bold ${newRoom.is_bulk_rented ? 'text-white/20' : 'text-green-400'}`}
                                    />
                                     {newRoom.is_bulk_rented && (
                                        <p className="text-[10px] text-blue-400 mt-2 font-bold uppercase tracking-tight">
                                            Bulk Renting Active: Rent is covered by floor owner
                                        </p>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                        <input 
                                            type="checkbox"
                                            checked={newRoom.is_bulk_rented}
                                            onChange={e => setNewRoom({...newRoom, is_bulk_rented: e.target.checked})}
                                            className="w-5 h-5 rounded border-purple-500/30 text-purple-600 focus:ring-purple-500 bg-black/20"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-white block">Bulk Rented?</span>
                                            <span className="text-[10px] text-purple-400/60 uppercase font-mono tracking-tighter">This room will have Rs. 0 rent for sub-tenants</span>
                                        </div>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 mt-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-green-500/30"
                                >
                                    <Save size={18} className="mr-2" /> Create Room
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}


            </AnimatePresence>
        </div>
    );
};

export default Rooms;
