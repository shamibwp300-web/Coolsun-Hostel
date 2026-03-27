import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Building2, 
  CheckSquare, 
  Square, 
  Save, 
  RefreshCcw, 
  Users, 
  CreditCard, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const BulkRenting = () => {
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [bulkConfig, setBulkConfig] = useState({
    is_bulk_rented: false,
    bulk_tenant_id: '',
    bulk_rent_amount: '',
    bulk_security_deposit: '',
    max_bulk_capacity: 30,
    selected_room_ids: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [floorsRes, roomsRes, tenantsRes] = await Promise.all([
        axios.get('/api/floors'),
        axios.get('/api/rooms'),
        axios.get('/api/tenants')
      ]);
      setFloors(floorsRes.data);
      setRooms(roomsRes.data);
      setTenants(tenantsRes.data);

      // Auto-select if there's an active bulk floor and nothing is selected
      if (!selectedFloorId) {
         const active = floorsRes.data.find(f => f.is_bulk_rented);
         if (active) {
            handleFloorChange(active.id, floorsRes.data, roomsRes.data);
         }
      } else {
         // Re-trigger floor change to update config with new data
         handleFloorChange(selectedFloorId, floorsRes.data, roomsRes.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleFloorChange = (floorId, floorsList = floors, roomsList = rooms) => {
    setSelectedFloorId(floorId.toString());
    const floor = floorsList.find(f => f.id === parseInt(floorId));
    if (floor) {
      // Get rooms currently marked as bulk for this floor
      const floorRooms = roomsList.filter(r => r.floor === floor.floor_number);
      const bulkRoomIds = floorRooms.filter(r => r.is_bulk_rented).map(r => r.id);

      setBulkConfig({
        is_bulk_rented: floor.is_bulk_rented,
        bulk_tenant_id: floor.bulk_tenant_id || '',
        bulk_rent_amount: floor.bulk_rent_amount || '',
        bulk_security_deposit: floor.bulk_security_deposit || '',
        max_bulk_capacity: floor.max_bulk_capacity || 30,
        selected_room_ids: bulkRoomIds
      });
    }
  };

  const toggleRoomSelection = (roomId) => {
    setBulkConfig(prev => {
      const isSelected = prev.selected_room_ids.includes(roomId);
      const newSelection = isSelected 
        ? prev.selected_room_ids.filter(id => id !== roomId)
        : [...prev.selected_room_ids, roomId];
      
      return { 
        ...prev, 
        selected_room_ids: newSelection,
        is_bulk_rented: newSelection.length > 0
      };
    });
  };

  const selectAllRooms = () => {
    const floor = floors.find(f => f.id === parseInt(selectedFloorId));
    if (!floor) return;
    const floorRoomIds = rooms.filter(r => r.floor === floor.floor_number).map(r => r.id);
    setBulkConfig(prev => ({ 
      ...prev, 
      selected_room_ids: floorRoomIds, 
      is_bulk_rented: true 
    }));
  };

  const handleSave = async () => {
    if (!selectedFloorId) return;
    try {
      setSaving(true);
      await axios.post(`/api/floors/${selectedFloorId}/bulk_config`, bulkConfig);
      alert("Bulk Configuration Saved Successfully!");
      fetchData(); // Refresh data
    } catch (err) {
      console.error("Error saving config:", err);
      alert("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin text-blue-500"><RefreshCcw size={40} /></div>
    </div>
  );

  const currentFloorRooms = selectedFloorId 
    ? rooms.filter(r => r.floor === floors.find(f => f.id === parseInt(selectedFloorId))?.floor_number)
    : [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Building2 size={32} className="mr-4 text-blue-400" /> Bulk Floor Renting Management
        </h1>
        <p className="text-white/50 mt-2">Manage whole-floor agreements and bulk sub-tenant groups.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Floor Selection & Basics */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 border-white/10">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 block underline decoration-blue-500/50">1. Select Floor</label>
            <select 
              value={selectedFloorId}
              onChange={(e) => handleFloorChange(e.target.value)}
              className="glass-input w-full h-12 px-4 rounded-xl mb-4 appearance-none text-white font-bold"
            >
              <option value="">-- Choose a Floor --</option>
              {floors.map(f => (
                <option key={f.id} value={f.id}>{f.name} {f.is_bulk_rented ? ' (Bulk Active)' : ''}</option>
              ))}
            </select>
            
            {selectedFloorId && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t border-white/5">
                 <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Bulk Owner (Registered Tenant)</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                    <select 
                      value={bulkConfig.bulk_tenant_id}
                      onChange={e => setBulkConfig({...bulkConfig, bulk_tenant_id: e.target.value})}
                      className="glass-input w-full h-12 pl-12 pr-4 rounded-xl appearance-none bg-black/40 text-sm"
                    >
                      <option value="">-- Select a Registered Owner --</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (CNIC: {t.cnic})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Fixed Floor Rent (Monthly)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400" size={18} />
                    <input 
                      type="number"
                      placeholder="e.g. 60000"
                      value={bulkConfig.bulk_rent_amount || ''}
                      onChange={e => setBulkConfig({...bulkConfig, bulk_rent_amount: e.target.value})}
                      className="glass-input w-full h-12 pl-12 pr-4 rounded-xl text-green-400 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Security Deposit (One-time)</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
                    <input 
                      type="number"
                      placeholder="e.g. 150000"
                      value={bulkConfig.bulk_security_deposit || ''}
                      onChange={e => setBulkConfig({...bulkConfig, bulk_security_deposit: e.target.value})}
                      className="glass-input w-full h-12 pl-12 pr-4 rounded-xl text-purple-400 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">Max Sub-Tenant Capacity</label>
                  <input 
                    type="number"
                    value={bulkConfig.max_bulk_capacity}
                    onChange={e => setBulkConfig({...bulkConfig, max_bulk_capacity: e.target.value})}
                    className="glass-input w-full h-12 px-4 rounded-xl"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Middle Column: Room Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border-white/10 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block underline decoration-purple-500/50">2. Select Included Rooms</label>
              {selectedFloorId && (
                <button 
                  onClick={selectAllRooms}
                  className="text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1 rounded-md transition-colors"
                >
                  Select All Rooms
                </button>
              )}
            </div>

            {!selectedFloorId ? (
              <div className="flex flex-col items-center justify-center h-64 text-white/20">
                <AlertCircle size={48} className="mb-4" />
                <p>Select a floor first to see available rooms</p>
              </div>
            ) : currentFloorRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-white/40 border-2 border-dashed border-white/10 rounded-2xl mx-8">
                <AlertCircle size={40} className="mb-3 text-orange-400 opacity-80" />
                <p className="font-bold text-lg mb-1">No Rooms Available</p>
                <p className="text-xs text-center px-8">There are exactly 0 rooms registered on this floor in the database. Please navigate to the "Room Inventory" page to add new rooms to this floor first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {currentFloorRooms.map(room => {
                  const isSelected = bulkConfig.selected_room_ids.includes(room.id);
                  return (
                    <motion.div
                      key={room.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleRoomSelection(room.id)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col items-center justify-center text-center ${
                        isSelected 
                        ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10' 
                        : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="text-blue-400 mb-2" size={24} /> : <Square className="text-white/20 mb-2" size={24} />}
                      <span className="text-lg font-bold">Room {room.number}</span>
                      <span className="text-[10px] text-white/40 mt-1 uppercase">{room.type} ({room.capacity} Beds)</span>
                      {isSelected && <span className="text-[10px] text-blue-400 font-bold mt-2">RENT: Rs 0</span>}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Footer */}
          {selectedFloorId && (
            <div className="glass-card p-6 border-blue-500/20 bg-blue-500/5 mt-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <h4 className="text-lg font-bold text-white">Agreement Summary</h4>
                  <p className="text-sm text-white/50">
                    Floor: <span className="text-white font-mono">{floors.find(f => f.id === parseInt(selectedFloorId))?.name}</span> | 
                    Rooms: <span className="text-blue-400 font-bold">{bulkConfig.selected_room_ids.length}</span> | 
                    Total Rent: <span className="text-green-400 font-bold">Rs {Number(bulkConfig.bulk_rent_amount || 0).toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-purple-400 mt-1">
                    Security Deposit: Rs {Number(bulkConfig.bulk_security_deposit || 0).toLocaleString()}
                  </p>
                </div>
                
                <button 
                  onClick={handleSave}
                  disabled={saving || bulkConfig.selected_room_ids.length === 0}
                  className="w-full md:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-blue-500/30"
                >
                  {saving ? <div className="animate-spin mr-2"><RefreshCcw size={18} /></div> : <Save size={18} className="mr-2" />}
                  {bulkConfig.is_bulk_rented ? "Update Bulk Agreement" : "Confirm Bulk Rental"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Bulk Agreements Table */}
      <div className="mt-12">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <CheckSquare size={24} className="mr-3 text-green-400" /> Active Bulk Agreements
        </h3>
        
        <div className="glass-card overflow-hidden border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-widest text-white/40">
                  <th className="p-4 font-bold">Floor Name</th>
                  <th className="p-4 font-bold">Owner (Tenant ID)</th>
                  <th className="p-4 font-bold">Monthly Rent</th>
                  <th className="p-4 font-bold">Capacity</th>
                  <th className="p-4 font-bold">Included Rooms</th>
                  <th className="p-4 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white">
                {floors.filter(f => f.is_bulk_rented).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-white/30">
                      No active bulk agreements found. Select a floor above to create one.
                    </td>
                  </tr>
                ) : (
                  floors.filter(f => f.is_bulk_rented).map(floor => {
                    // Count rooms included in this agreement
                    const floorRoomCount = rooms.filter(r => r.floor === floor.floor_number && r.is_bulk_rented).length;
                    
                    return (
                      <tr key={floor.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold flex items-center">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mr-3 font-mono text-xs">F{floor.floor_number}</div>
                          {floor.name}
                        </td>
                        <td className="p-4 text-white/70 font-bold">
                          {floor.bulk_tenant_id 
                            ? (tenants.find(t => t.id === floor.bulk_tenant_id)?.name || `ID: ${floor.bulk_tenant_id}`) 
                            : "Unassigned"}
                        </td>
                        <td className="p-4 font-bold text-green-400">Rs {Number(floor.bulk_rent_amount || 0).toLocaleString()}</td>
                        <td className="p-4 text-white/70">
                          {floor.active_tenants} / {floor.max_bulk_capacity} Sub-tenants
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold border border-purple-500/30">
                            {floorRoomCount} Rooms
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              handleFloorChange(floor.id.toString(), floors, rooms);
                            }}
                            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all border border-white/10"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkRenting;
