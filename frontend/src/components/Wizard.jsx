import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bed, Check, Upload, FileText, Camera, AlertCircle, Shield, Wifi, Users, X } from 'lucide-react';
import axios from 'axios';

// --- Steps Definition ---
const steps = [
  { id: 2, title: 'Tenant Details' },
  { id: 3, title: 'Billing & Security' },
  { id: 4, title: 'Documents' },
];

// Removed mockRooms - now using live state in component

// --- Upload Card Component ---
const UploadCard = ({ title, icon: Icon, file, onSelect, onRemove }) => {
  return (
    <div className="relative group cursor-pointer">
      <input
        type="file"
        key={file ? file.name : 'empty'}
        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
        onChange={(e) => {
           if(e.target.files && e.target.files[0]) {
               onSelect(e.target.files[0]);
           }
        }}
        accept="image/*,.pdf,.doc,.docx"
      />
      {file && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if(onRemove) onRemove();
          }}
          className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white shadow-lg transition-colors border border-red-400"
          title="Remove File"
        >
          <X size={14} strokeWidth={3} />
        </button>
      )}
      <div className={`glass-card p-6 flex flex-col items-center justify-center h-48 border-2 border-dashed transition-all ${file ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 hover:border-blue-500/30'}`}>
        {file ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center w-full">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center mb-2 shadow-lg shadow-green-500/20">
              <Check className="text-white" />
            </div>
            <span className="text-sm font-medium text-green-400 truncate w-full max-w-[150px] text-center">{file.name}</span>
            <span className="text-xs text-white/30 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </motion.div>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Icon className="text-white/50" />
            </div>
            <span className="text-sm font-medium text-white/70">{title}</span>
            <span className="text-xs text-white/30 mt-2">Tap to Upload</span>
          </>
        )}
      </div>
    </div>
  )
}

const Wizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveRooms, setLiveRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomTenants, setRoomTenants] = useState([]); // NEW: For hierarchy

  const fetchRooms = async () => {
    try {
      const res = await axios.get('/api/rooms');
      setLiveRooms(res.data);
      setRoomsLoading(false);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const [formData, setFormData] = useState({
    roomId: null,
    roomNumber: '',
    bedLabel: '',
    name: '',
    cnic: '',
    phone: '',
    emergencyContact: '', // Added field
    rent: 0,
    dueDay: 1,
    agreementDate: new Date().toISOString().split('T')[0],
    moveInDate: new Date().toISOString().split('T')[0],
    cnicExpiryDate: '', // Added field (Parity)
    securityDeposit: '',
    amountPaidNow: '',
    files: {
      id_front: null,
      id_back: null,
      tenant_photo: null,
      agreement: null,
      police_form: null
    },
    internet_opt_in: true,
    is_partial_payment: false,
    payment_method: 'Cash',
    parent_tenant_id: '', // NEW: Track main tenancy holder
    billingMode: 'pro-rata', // 'full', 'pro-rata', or 'private'
    baseRent: 0, // Store original room rent
    roomTotalRent: 0, // Store full room rent
    tenancyType: 'Shared', // 'Shared' or 'Private'
    isRentResponsible: true // NEW: Toggle for sub-tenant rent
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const fetchRoomTenants = async (roomId) => {
    try {
      const res = await axios.get('/api/tenants');
      // Filter to only active tenants in THIS block and remove sub-tenants to prevent deep nesting
      const roomOccupants = res.data.filter(t => t.room === liveRooms.find(r => r.id === roomId)?.number);
      setRoomTenants(roomOccupants);
    } catch (err) {
      console.error("Failed to fetch tenants for room", err);
    }
  };

  const handleRoomSelect = (room) => {
    if (room.is_bulk_rented) {
      if (room.active_floor_tenants >= room.max_bulk_capacity) {
        alert(`This floor is bulk rented and has reached its strict capacity limit of ${room.max_bulk_capacity} tenants.`);
        return; // strictly block selection
      }
      // Zero out rent for sub-tenants since bulk-tenant pays
      setFormData({ 
          ...formData, 
          roomId: room.id, 
          roomNumber: room.number, 
          baseRent: 0,
          roomTotalRent: 0,
          rent: 0, 
          tenancyType: 'Shared',
          parentTenantId: room.bulk_tenant_id ? room.bulk_tenant_id.toString() : '' 
      });
      fetchRoomTenants(room.id);
      nextStep();
      return;
    }

    // Implement Per-Head Rule: Rent = Base Rent / Capacity
    const perHeadRent = room.capacity > 0 ? Math.round(room.base_rent / room.capacity) : room.base_rent;
    
    // Automatically calculate pro-rata rent for the first time
    const initialRent = calculateRentBreakdown(perHeadRent, 'pro-rata', formData.moveInDate).total;

    setFormData({ 
        ...formData, 
        roomId: room.id, 
        roomNumber: room.number, 
        baseRent: perHeadRent,
        roomTotalRent: room.base_rent,
        rent: initialRent, 
        tenancyType: 'Shared',
        parentTenantId: '' 
    });
    fetchRoomTenants(room.id);
    nextStep();
  };

  const calculateRentBreakdown = (base, mode, moveIn) => {
    const moveInDate = new Date(moveIn);
    if (isNaN(moveInDate.getTime())) return { total: base, daysInMonth: 30, daysRemaining: 30, perDay: 0 };
    
    const year = moveInDate.getFullYear();
    const month = moveInDate.getMonth();
    
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const daysRemaining = Math.max(0, totalDaysInMonth - moveInDate.getDate());
    
    const total = mode === 'full' ? base : Math.round((base / totalDaysInMonth) * daysRemaining);
    
    return {
      total,
      daysInMonth: totalDaysInMonth,
      daysRemaining: daysRemaining,
      perDay: (base / totalDaysInMonth).toFixed(2)
    };
  };

  useEffect(() => {
    // Determine which base rent to use: Full Room or Per-Bed
    const activeBase = formData.billingMode === 'private' ? formData.roomTotalRent : formData.baseRent;
    const breakdown = calculateRentBreakdown(activeBase, formData.billingMode === 'full' ? 'full' : 'pro-rata', formData.moveInDate);
    
    // NEW: If tenant is NOT responsible for rent (covered by primary), force to 0
    const finalRent = formData.isRentResponsible ? breakdown.total : 0;
    const finalBase = formData.isRentResponsible ? activeBase : 0;

    setFormData(prev => ({ 
      ...prev, 
      rent: finalRent,
      baseRent: finalBase,
      tenancyType: formData.billingMode === 'private' ? 'Private' : 'Shared'
    }));
  }, [formData.billingMode, formData.moveInDate, formData.baseRent, formData.roomTotalRent, formData.isRentResponsible]);

  const canProceedBilling = () => {
    if (currentStep !== 3) return true;
    const rent = Number(formData.rent);
    const security = Number(formData.securityDeposit);
    const paid = Number(formData.amountPaidNow);
    return rent >= 0 && security >= 0 && paid >= 0;
  };

  const canProceedStep2 = () => {
    if (formData.parentTenantId === 'select') return false;
    if (!formData.name || !formData.phone || !formData.cnic) return false;
    return true;
  };

  const handleFileSelect = (type, file) => {
    setFormData({
      ...formData,
      files: { ...formData.files, [type]: file }
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const data = new FormData();

    // Append Text Data
    data.append('room_id', formData.roomId);
    data.append('name', formData.name);
    data.append('cnic', formData.cnic);
    data.append('phone', formData.phone);
    data.append('bed_label', formData.bedLabel);
    data.append('base_rent', formData.baseRent);
    data.append('rent_amount', formData.rent);
    data.append('agreement_start_date', formData.agreementDate);
    data.append('actual_move_in_date', formData.moveInDate);
    data.append('cnic_expiry_date', formData.cnicExpiryDate);
    data.append('emergency_contact', formData.emergencyContact);
    data.append('security_deposit', formData.securityDeposit || 0);
    data.append('amount_paid_now', formData.amountPaidNow || 0);
    data.append('internet_opt_in', formData.internet_opt_in);
    data.append('is_partial_payment', formData.is_partial_payment);
    data.append('tenancy_type', formData.tenancyType);
    data.append('payment_method', formData.payment_method);
    data.append('due_day', formData.dueDay);
    if (formData.parentTenantId) data.append('parent_tenant_id', formData.parentTenantId);

    // Append Files
    if (formData.files.id_front) data.append('id_front', formData.files.id_front);
    if (formData.files.id_back) data.append('id_back', formData.files.id_back);
    if (formData.files.agreement) data.append('agreement', formData.files.agreement);
    if (formData.files.police_form) data.append('police_form', formData.files.police_form);

    try {
      const res = await axios.post('/api/onboarding', data);
      console.log(res.data);
      
      // WhatsApp Receipt Logic
      const tenantName = formData.name;
      const roomNum = formData.roomNumber;
      const totalPaid = Number(formData.amountPaidNow || 0);
      const phone = formData.phone;
      
      const message = `*Hostel Onboarding Receipt*\n\nWelcome *${tenantName}* to Coolsun Hostel!\n\nRoom: ${roomNum}\nAmount Received: Rs. ${totalPaid}\nStatus: Confirmed\n\nThank you for choosing Coolsun!`;
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      
      alert("Tenant Onboarded Successfully!");
      
      // Open WhatsApp in new tab
      window.open(waUrl, '_blank');
      
      // Redirect current tab after a slight delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error) {
      console.error("Onboarding Error:", error);
      alert("Error: " + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-4 md:p-0">

      {/* Sticky Glass Progress Bar */}
      <div className="sticky top-4 z-[40] mb-8 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-2xl shadow-2xl">
        <div className="flex justify-between items-center">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div
                className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${currentStep >= step.id
                  ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/40'
                  : 'border-white/10 bg-black/20 text-white/30'
                  }`}
              >
                {currentStep > step.id ? <Check size={18} /> : step.id}
              </div>
              <span className={`text-xs mt-2 font-medium tracking-wide uppercase ${currentStep >= step.id ? 'text-blue-400' : 'text-white/30'
                }`}>
                {step.title}
              </span>
            </div>
          ))}
          {/* Connecting Line */}
          <div className="absolute top-9 left-0 h-0.5 w-full bg-white/5 -z-0" />
        </div>
      </div>

      {/* Step Content */}
      <motion.div
        key={currentStep}
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -20, opacity: 0 }}
        className="glass-card p-8 min-h-[500px]"
      >
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Select a Room</h2>
            {roomsLoading ? (
              <div className="p-8 text-white/50 animate-pulse">Syncing vacancies...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveRooms.map((room) => {
                  const available = room.available_slots;
                  const isFull = available === 0;

                  return (
                    <motion.div
                      key={room.id}
                      whileHover={!isFull ? { scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' } : {}}
                      className={`relative overflow-hidden rounded-2xl border p-6 transition-all ${isFull
                        ? 'border-red-500/20 bg-red-500/5 opacity-70 cursor-not-allowed'
                        : 'border-white/10 bg-white/5 cursor-pointer hover:border-blue-500/30'
                        }`}
                      onClick={() => !isFull && handleRoomSelect(room)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white flex items-center">
                            Room {room.number}
                            {room.is_bulk_rented && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full uppercase tracking-wider border border-purple-500/30" title={`Floor Capacity: ${room.active_floor_tenants}/${room.max_bulk_capacity}`}>
                                Bulk Rented
                              </span>
                            )}
                          </h3>
                          <span className="text-xs font-medium uppercase tracking-wider text-white/40">{room.type}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${room.is_bulk_rented ? 'text-purple-400' : 'text-blue-400'}`}>
                              {room.is_bulk_rented ? 'Rs. 0' : `Rs. ${(room.base_rent || 0).toLocaleString()}`}
                          </p>
                          <p className="text-xs text-white/40">{room.is_bulk_rented ? 'Covered by Owner' : 'per head'}</p>
                        </div>
                      </div>

                      {/* Visual Bed Grid */}
                      <div className="flex space-x-2 mt-4">
                        {/* Render Occupied Beds */}
                        {[...Array(room.occupied_beds || 0)].map((_, i) => (
                          <div key={`occ-${i}`} className="h-10 w-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500" title="Occupied">
                            <User size={20} />
                          </div>
                        ))}
                        {/* Render Available Beds */}
                        {[...Array(available)].map((_, i) => (
                          <div key={`avl-${i}`} className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse" title="Available">
                            <Bed size={20} />
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                        <span className={`text-sm font-medium ${isFull ? 'text-red-400' : 'text-green-400'}`}>
                          {isFull ? 'Full House' : `${available} Beds Available`}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 max-w-xl mx-auto pb-10">
            <h2 className="text-2xl font-bold text-white">Tenant Details</h2>

            {/* NEW: Hierarchical Tenancy Selection */}
            <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Tenancy Type</label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setFormData({ ...formData, parentTenantId: '' })}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${!formData.parentTenantId ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/40 text-white/50 hover:bg-white/10'}`}
                >
                  Primary Holder
                </button>
                <button
                  onClick={() => setFormData({ ...formData, parentTenantId: 'select' })}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${formData.parentTenantId ? 'bg-yellow-600 text-white shadow-lg' : 'bg-black/40 text-white/50 hover:bg-white/10'}`}
                >
                  Sub-tenant (Sharing)
                </button>
              </div>

              {formData.parentTenantId && (
                  </select>
                </div>
              )}
            </div>

            {formData.parentTenantId && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400 block">Rent Responsibility</label>
                <div
                  className={`glass-card p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${formData.isRentResponsible ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/5' : 'border-white/10 bg-black/20 opacity-60'}`}
                  onClick={() => setFormData({ ...formData, isRentResponsible: !formData.isRentResponsible })}
                >
                  <div className="flex items-center">
                    <User size={18} className={formData.isRentResponsible ? "text-blue-400 mr-3" : "text-white/30 mr-3"} />
                    <div>
                      <div className="text-white font-bold text-sm">
                        {formData.isRentResponsible ? 'Tenant Pays Rent' : 'Rent Covered by Primary'}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {formData.isRentResponsible 
                          ? 'This tenant will be charged an independent share of room rent.' 
                          : 'This tenant will have Rs. 0 monthly rent. Data collected for compliance only.'}
                      </div>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center p-1 ${formData.isRentResponsible ? 'bg-blue-600' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isRentResponsible ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            )}


            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-white/40">Full Name (English / Urdu)</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ali Khan / علی خان"
                className="glass-input h-14 w-full px-4 rounded-xl text-lg"
              />
              <p className="text-xs text-white/30 text-right">System supports bilingual entry</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block">CNIC / ID Number</label>
                <input
                  type="text"
                  value={formData.cnic}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    let res = '';
                    if (val.length > 0) {
                      res = val.substring(0, 5);
                      if (val.length > 5) {
                        res += '-' + val.substring(5, 12);
                        if (val.length > 12) {
                          res += '-' + val.substring(12, 13);
                        }
                      }
                    }
                    setFormData({ ...formData, cnic: res });
                  }}
                  className="glass-input h-14 w-full px-5 rounded-2xl"
                  placeholder="31202-XXXXXXX-X"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block">CNIC Expiry (Parity)</label>
                <input
                  type="date"
                  value={formData.cnicExpiryDate}
                  onChange={(e) => setFormData({ ...formData, cnicExpiryDate: e.target.value })}
                  className="glass-input h-14 w-full px-5 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block">Phone (WhatsApp)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.startsWith('92')) val = val.substring(2);
                    if (val.startsWith('0')) val = val.substring(1);
                    const formatted = val ? `+92${val.substring(0, 10)}` : '';
                    setFormData({ ...formData, phone: formatted });
                  }}
                  className="glass-input h-14 w-full px-5 rounded-2xl"
                  placeholder="+923000000000"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block">Emergency Contact</label>
                <input
                  type="tel"
                  value={formData.emergencyContact}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.startsWith('92')) val = val.substring(2);
                    if (val.startsWith('0')) val = val.substring(1);
                    const formatted = val ? `+92${val.substring(0, 10)}` : '';
                    setFormData({ ...formData, emergencyContact: formatted });
                  }}
                  className="glass-input h-14 w-full px-5 rounded-2xl"
                  placeholder="+92..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-white/40">Bed Location / Label</label>
              <input
                value={formData.bedLabel}
                onChange={(e) => setFormData({ ...formData, bedLabel: e.target.value })}
                placeholder="e.g. Window Side, Bed A, Upper Bunk"
                className="glass-input h-14 w-full px-4 rounded-xl"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] text-blue-400 uppercase tracking-widest block font-bold mt-4">Additional Services</label>
              <div
                className={`glass-card p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${formData.internet_opt_in ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-black/20'}`}
                onClick={() => setFormData({ ...formData, internet_opt_in: !formData.internet_opt_in })}
              >
                <div className="flex items-center">
                  <Wifi size={18} className={formData.internet_opt_in ? "text-purple-400 mr-3" : "text-white/30 mr-3"} />
                  <div>
                    <div className="text-white font-bold text-sm">Hostel Internet Access</div>
                    <div className="text-xs text-white/50 mt-0.5">Opt-in to share the monthly Wi-Fi bill</div>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center p-1 ${formData.internet_opt_in ? 'bg-purple-500' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.internet_opt_in ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white">Security & Pro-Rata Engine</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-white/40">Agreement Date</label>
                <input
                  type="date"
                  value={formData.agreementDate}
                  onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
                  className="glass-input h-14 w-full px-4 rounded-xl text-white bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-white/40">Move-In Date</label>
                <input
                  type="date"
                  value={formData.moveInDate}
                  onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value, dueDay: new Date(e.target.value).getDate() || formData.dueDay })}
                  className="glass-input h-14 w-full px-4 rounded-xl text-white bg-white/5"
                />
              </div>
            </div>

            {/* Monthly Rent Due Day Selector */}
            <div className="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-widest">📅 Monthly Rent Due Day</h4>
                  <p className="text-xs text-white/40 mt-0.5">Which day of the month should this tenant pay rent?</p>
                </div>
                <div className="text-2xl font-black text-yellow-400 font-mono">{formData.dueDay}th</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {[1,5,10,15,20,25,28].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFormData({ ...formData, dueDay: d })}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${formData.dueDay === d ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    {d}
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-white/30 text-xs">Custom:</span>
                  <input
                    type="number"
                    min="1" max="31"
                    value={formData.dueDay}
                    onChange={e => setFormData({ ...formData, dueDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })}
                    className="w-16 h-10 px-2 rounded-lg bg-black/40 border border-white/10 text-white text-center font-bold text-sm focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
              </div>
              <p className="text-[10px] text-white/30">
                Example: Tenant arrived on the {formData.moveInDate ? new Date(formData.moveInDate).getDate() : '—'}th → rent due on {formData.dueDay}th every month going forward.
              </p>
            </div>


            {/* Pro-Rata Intelligence Module */}
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6 space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center">
                    <Shield size={16} className="mr-2" /> Billing Automation
                  </h3>
                  <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                    <button 
                      onClick={() => setFormData({ ...formData, billingMode: 'full' })}
                      className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${formData.billingMode === 'full' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'}`}
                    >FULL MONTH</button>
                    <button 
                      onClick={() => setFormData({ ...formData, billingMode: 'pro-rata' })}
                      className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${formData.billingMode === 'pro-rata' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'}`}
                    >PRO-RATE</button>
                    <button 
                      onClick={() => setFormData({ ...formData, billingMode: 'private' })}
                      className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${formData.billingMode === 'private' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-white/40 hover:text-white'}`}
                    >FULL ROOM (PRIVATE)</button>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 uppercase font-black">Base Rent</label>
                    <div className={`text-lg font-mono transition-colors ${formData.billingMode === 'private' ? 'text-purple-400' : 'text-white'}`}>
                      Rs. {(formData.billingMode === 'private' ? formData.roomTotalRent : formData.baseRent).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 uppercase font-black">Days in Month</label>
                    <div className="text-lg font-mono text-white">{calculateRentBreakdown(formData.billingMode === 'private' ? formData.roomTotalRent : formData.baseRent, formData.billingMode === 'full' ? 'full' : 'pro-rata', formData.moveInDate).daysInMonth}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 uppercase font-black">Days Remaining</label>
                    <div className="text-lg font-mono text-blue-400 font-bold">{calculateRentBreakdown(formData.billingMode === 'private' ? formData.roomTotalRent : formData.baseRent, formData.billingMode === 'full' ? 'full' : 'pro-rata', formData.moveInDate).daysRemaining}</div>
                  </div>
               </div>

               <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-white/40 uppercase font-black mb-1">Per-Day Rate</div>
                    <div className="text-xs text-white/60">Rs. {formData.isRentResponsible ? calculateRentBreakdown(formData.billingMode === 'private' ? formData.roomTotalRent : formData.baseRent, formData.billingMode === 'full' ? 'full' : 'pro-rata', formData.moveInDate).perDay : '0.00'}</div>
                  </div>
                  <div className="text-right">
                    {!formData.isRentResponsible ? (
                      <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-yellow-500">Billing Covered by Primary</span>
                        <div className="text-2xl font-mono font-black text-white/20 line-through decoration-white/40">Rs. {Number(formData.rent).toLocaleString()}</div>
                      </div>
                    ) : (
                      <>
                        <div className="text-[10px] text-green-400 uppercase font-black mb-1">Calculated Rent</div>
                        <div className="text-2xl font-mono font-black text-green-400">Rs. {Number(formData.rent).toLocaleString()}</div>
                      </>
                    )}
                  </div>
               </div>
            </div>

            {/* Manual Overrides & Security */}
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 block">Security Deposit (Separate Field)</label>
                  <input
                    type="number"
                    value={formData.securityDeposit}
                    onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                    className="glass-input h-14 w-full px-4 rounded-xl text-white bg-white/5 font-mono text-lg border-blue-500/30 focus:border-blue-500"
                    placeholder="5000"
                  />
               </div>

               <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-green-400 mb-2 block">Total Amount Received (Today)</label>
                  <input
                    type="number"
                    value={formData.amountPaidNow}
                    onChange={(e) => setFormData({ ...formData, amountPaidNow: e.target.value })}
                    className="glass-input h-16 w-full px-4 rounded-xl text-green-400 bg-green-500/10 border-green-500/30 focus:border-green-500 font-mono text-2xl font-bold shadow-lg shadow-green-500/5"
                    placeholder={(Number(formData.rent) + Number(formData.securityDeposit)).toString()}
                  />
               </div>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex justify-between text-xs text-white/60">
                  <span>Rent Payable:</span>
                  <span>Rs. {Number(formData.rent).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>Security Payable:</span>
                  <span>Rs. {Number(formData.securityDeposit).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span>Final Initial Payment:</span>
                  <span>Rs. {(Number(formData.rent) + Number(formData.securityDeposit)).toLocaleString()}</span>
                </div>
            </div>

          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Required Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <UploadCard
                title="ID Front"
                icon={FileText}
                file={formData.files.id_front}
                onSelect={(f) => handleFileSelect('id_front', f)}
                onRemove={() => handleFileSelect('id_front', null)}
              />
              <UploadCard
                title="ID Back"
                icon={FileText}
                file={formData.files.id_back}
                onSelect={(f) => handleFileSelect('id_back', f)}
                onRemove={() => handleFileSelect('id_back', null)}
              />
              <UploadCard
                title="Agreement"
                icon={FileText}
                file={formData.files.agreement}
                onSelect={(f) => handleFileSelect('agreement', f)}
                onRemove={() => handleFileSelect('agreement', null)}
              />
              <UploadCard
                title="Police Form"
                icon={Shield}
                file={formData.files.police_form}
                onSelect={(f) => handleFileSelect('police_form', f)}
                onRemove={() => handleFileSelect('police_form', null)}
              />
            </div>
            {!formData.files.police_form && (
              <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center">
                <AlertCircle className="text-yellow-500 mr-2" />
                <span className="text-sm text-yellow-200">Warning: Proceeding without Police Form will trigger a Compliance Alert.</span>
              </div>
            )}
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center">Final Review</h2>

            {/* Glass Receipt */}
            <div className="glass-card p-8 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Shield size={100} />
              </div>

              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-white">{formData.name}</h3>
                <p className="text-sm text-white/50">Room {formData.roomNumber} &bull; {formData.bedLabel}</p>
                {formData.parentTenantId ? (
                  <p className="text-xs text-yellow-400 mt-1 font-bold">Sub-Tenant (Liabilities covered by Primary holder)</p>
                ) : (
                  <p className="text-xs text-blue-400 mt-1 font-bold">Primary Room Tenant</p>
                )}
                <p className="text-xs text-purple-400 mt-1">Internet Access: {formData.internet_opt_in ? 'Opted In' : 'Opted Out'}</p>
              </div>

              <div className="space-y-2 text-sm z-10 relative bg-black/20 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between text-white/70">
                  <span>Monthly Rent</span>
                  <span>Rs. {Number(formData.rent || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Security Deposit</span>
                  <span>Rs. {Number(formData.securityDeposit || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-blue-300 font-bold pt-2 border-t border-white/10">
                  <span>Total Due</span>
                  <span>Rs. {(Number(formData.rent || 0) + Number(formData.securityDeposit || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-400 font-bold pt-2 border-t border-white/10">
                  <span>Amount Received</span>
                  <span>Rs. {Number(formData.amountPaidNow || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/50 text-[10px] uppercase tracking-widest pt-1">
                  <span>Method</span>
                  <span>{formData.payment_method}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-white/40">Compliance Status</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${formData.files.police_form ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {formData.files.police_form ? 'VERIFIED' : 'PENDING'}
                </span>
              </div>
            </div>
          </div>
        )}

      </motion.div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center pb-20">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-8 py-3 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 disabled:opacity-0 transition-all font-medium"
        >
          Back
        </button>

        {currentStep < 5 && (
          <button
            onClick={nextStep}
            disabled={!canProceedBilling() || (currentStep === 2 && !canProceedStep2())}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Step
          </button>
        )}

        {currentStep === 5 && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-3 rounded-xl bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-500/30 transition-all font-bold flex items-center"
          >
            {isSubmitting ? 'Onboarding...' : 'Confirm & WhatsApp'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Wizard;
