import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, FileText, CheckCircle, Clock, Save, X, Upload, Trash2, Eye, CreditCard } from 'lucide-react';
import axios from 'axios';
import DocumentViewerModal from '../components/DocumentViewerModal';

const PoliceVerification = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [viewer, setViewer] = useState({ isOpen: false, url: '', title: '' });

    const fetchRecords = async () => {
        try {
            const res = await axios.get('/api/police/records');
            setRecords(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const filteredRecords = records.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.cnic.includes(searchTerm) ||
        r.room_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Verified':
                return <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex items-center"><CheckCircle size={12} className="mr-1" /> Verified</span>;
            case 'Submitted':
                return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium flex items-center"><Clock size={12} className="mr-1" /> Submitted</span>;
            case 'Pending':
            default:
                return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center"><Shield size={12} className="mr-1" /> Pending</span>;
        }
    };

    const handleSaveData = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/police/records/${selectedTenant.id}`, {
                father_name: selectedTenant.father_name,
                permanent_address: selectedTenant.permanent_address,
                police_station: selectedTenant.police_station,
                police_status: selectedTenant.police_status
            });
            fetchRecords();
            setSelectedTenant(null);
        } catch (err) {
            alert("Failed to save data");
        }
    };

    const handleUpload = async (e, docType = 'Police_Form') => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', docType);

        setUploading(true);
        try {
            await axios.post(`/api/police/upload/${selectedTenant.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Re-fetch to update document url
            const res = await axios.get('/api/police/records');
            setRecords(res.data);
            const updated = res.data.find(r => r.id === selectedTenant.id);
            setSelectedTenant(updated);
        } catch (err) {
            alert(err.response?.data?.error || "Upload failed");
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm("Delete this scanned form?")) return;
        try {
            await axios.delete(`/api/police/upload/${docId}`);
            const res = await axios.get('/api/police/records');
            setRecords(res.data);
            const updated = res.data.find(r => r.id === selectedTenant.id);
            setSelectedTenant(updated);
        } catch (err) {
            alert("Delete failed");
        }
    };

    if (loading) return <div className="p-8 text-white/50 animate-pulse">Loading Records...</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                        <Shield className="mr-3 text-blue-400" size={32} />
                        Police Verification
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Manage tenant verification forms and compliance data</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center">
                        <Search className="text-white/40 mr-2" size={18} />
                        <input
                            type="text"
                            placeholder="Search tenants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-white focus:outline-none w-48 text-sm"
                        />
                    </div>
                </div>
            </header>

            <div className="glass-card border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                <th className="p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Tenant</th>
                                <th className="p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Room</th>
                                <th className="p-4 text-xs font-medium text-white/40 uppercase tracking-wider">CNIC</th>
                                <th className="p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Hub</th>
                                <th className="p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Doc</th>
                                <th className="p-4 text-xs font-medium text-white/40 uppercase tracking-wider cursor-pointer select-none border-l border-white/5 text-center w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredRecords.map((t) => (
                                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4">
                                        <div className="text-sm font-medium text-white">{t.name}</div>
                                        <div className="text-xs text-white/40">{t.phone}</div>
                                    </td>
                                    <td className="p-4 text-sm text-white/80">{t.room_number}</td>
                                    <td className="p-4 text-sm text-white/80 font-mono">{t.cnic}</td>
                                    <td className="p-4">{getStatusBadge(t.police_status)}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {t.id_card_front_url && (
                                                <button 
                                                    onClick={() => setViewer({ isOpen: true, url: t.id_card_front_url, title: `${t.name} - ID Front` })}
                                                    className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                                    title="View ID Front"
                                                >
                                                    <CreditCard size={14} />
                                                </button>
                                            )}
                                            {t.id_card_back_url && (
                                                <button 
                                                    onClick={() => setViewer({ isOpen: true, url: t.id_card_back_url, title: `${t.name} - ID Back` })}
                                                    className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                                                    title="View ID Back"
                                                >
                                                    <CreditCard size={14} />
                                                </button>
                                            )}
                                            {t.police_form_url && (
                                                <button 
                                                    onClick={() => setViewer({ isOpen: true, url: t.police_form_url, title: `${t.name} - Police Form` })}
                                                    className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                                    title="View Police Form"
                                                >
                                                    <FileText size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {t.document_url ? (
                                            <button 
                                                onClick={() => setViewer({ isOpen: true, url: t.document_url, title: `${t.name} - Signed Form` })}
                                                className="text-blue-400 hover:text-blue-300 flex items-center text-xs"
                                            >
                                                <Eye size={14} className="mr-1" /> View
                                            </button>
                                        ) : (
                                            <span className="text-white/20 text-xs">None</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center border-l border-white/5">
                                        <button
                                            onClick={() => setSelectedTenant(t)}
                                            className="px-4 py-1.5 bg-white/5 hover:bg-blue-500/20 text-white hover:text-blue-400 text-xs rounded-lg transition-colors border border-white/10 hover:border-blue-500/30"
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredRecords.length === 0 && (
                        <div className="p-8 text-center text-white/40">No records found matching search.</div>
                    )}
                </div>
            </div>

            {/* Manage Modal */}
            <AnimatePresence>
                {selectedTenant && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTenant(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="glass-card w-full max-w-5xl p-0 overflow-hidden relative z-[1000] flex flex-col md:flex-row shadow-2xl border-white/10"
                        >
                            {/* Left Side: Data Entry */}
                            <div className="w-full md:w-80 p-6 border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.02]">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white leading-tight">{selectedTenant.name}</h3>
                                        <p className="text-white/40 text-xs">Room {selectedTenant.room_number} • {selectedTenant.cnic}</p>
                                    </div>
                                    <div className="md:hidden">
                                        <button onClick={() => setSelectedTenant(null)} className="text-white/40 p-1"><X size={20} /></button>
                                    </div>
                                </div>

                                <form onSubmit={handleSaveData} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 block">Father's Name</label>
                                        <input
                                            type="text"
                                            value={selectedTenant.father_name || ''}
                                            onChange={e => setSelectedTenant({ ...selectedTenant, father_name: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 block">Police Station / District</label>
                                        <input
                                            type="text"
                                            value={selectedTenant.police_station || ''}
                                            onChange={e => setSelectedTenant({ ...selectedTenant, police_station: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 block">Permanent Address</label>
                                        <textarea
                                            value={selectedTenant.permanent_address || ''}
                                            onChange={e => setSelectedTenant({ ...selectedTenant, permanent_address: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none h-24 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 block">Verification Status Override</label>
                                        <select
                                            value={selectedTenant.police_status}
                                            onChange={e => setSelectedTenant({ ...selectedTenant, police_status: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none appearance-none"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Submitted">Submitted (Waiting)</option>
                                            <option value="Verified">Fully Verified</option>
                                        </select>
                                    </div>

                                    <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex justify-center items-center mt-6">
                                        <Save size={16} className="mr-2" /> Save Details
                                    </button>
                                </form>
                            </div>

                            {/* Right Side: Document View/Upload */}
                            <div className="flex-1 p-6 bg-black/40 relative overflow-y-auto max-h-[80vh]">
                                <button onClick={() => setSelectedTenant(null)} className="absolute top-4 right-4 text-white/30 hover:text-white hidden md:block">
                                    <X size={20} />
                                </button>

                                <h3 className="text-sm font-bold text-white mb-6 flex items-center"><FileText size={16} className="mr-2 text-white/40" /> Verification Documents</h3>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Police Form Section */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest block">Police Verification Form</label>
                                            <label htmlFor="police-doc-upload" className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase cursor-pointer flex items-center gap-1 transition-colors">
                                                {uploading ? <Clock size={10} className="animate-spin" /> : <Upload size={10} />}
                                                {selectedTenant.document_url ? 'Replace' : 'Upload'}
                                            </label>
                                        </div>
                                        {selectedTenant.document_url ? (
                                            <div className="aspect-[3/4] rounded-lg border border-white/10 bg-white/5 flex items-center justify-center p-2 relative group overflow-hidden">
                                                {selectedTenant.document_url.endsWith('.pdf') ?
                                                    <FileText size={48} className="text-white/20" /> :
                                                    <img src={selectedTenant.document_url} alt="Form" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                }
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); setViewer({ isOpen: true, url: selectedTenant.document_url, title: `${selectedTenant.name} - Police Form` })}}
                                                        className="p-2 bg-blue-500 rounded-full text-white hover:scale-110 transition-transform"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button onClick={(e) => { e.preventDefault(); handleDeleteDoc(selectedTenant.police_form_id || selectedTenant.document_id) }} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform cursor-pointer relative z-50 pointer-events-auto">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="aspect-[3/4] rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center p-4 text-center">
                                                <Shield size={32} className="text-white/10 mb-2" />
                                                <p className="text-xs text-white/40">No form uploaded yet.</p>
                                            </div>
                                        )}

                                        <div className="mt-2">
                                            <input
                                                type="file"
                                                id="police-doc-upload"
                                                className="hidden"
                                                accept=".pdf, .png, .jpg, .jpeg"
                                                onChange={handleUpload}
                                                disabled={uploading}
                                            />
                                            <label
                                                htmlFor="police-doc-upload"
                                                className={`w-full py-2.5 rounded-lg text-xs font-medium transition-all flex justify-center items-center cursor-pointer border ${uploading ? 'bg-white/5 text-white/30 border-white/5' : 'bg-white/10 hover:bg-white/15 text-white border-white/20 hover:border-white/30'
                                                    }`}
                                            >
                                                {uploading ? <Clock size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
                                                {uploading ? 'Uploading...' : (selectedTenant.document_url ? 'Replace Form' : 'Upload Form Scan')}
                                            </label>
                                        </div>
                                        
                                        {/* Agreement Form Section */}
                                        <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] text-white/40 uppercase tracking-widest block">Hostel Agreement Form</label>
                                                <input type="file" id="agreement-doc-upload" className="hidden" accept=".pdf, .png, .jpg, .jpeg" onChange={(e) => handleUpload(e, 'Agreement')} disabled={uploading} />
                                                <label htmlFor="agreement-doc-upload" className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase cursor-pointer flex items-center gap-1 transition-colors">
                                                    {uploading ? <Clock size={10} className="animate-spin" /> : <Upload size={10} />}
                                                    {selectedTenant.agreement_url ? 'Replace' : 'Upload'}
                                                </label>
                                            </div>
                                            {selectedTenant.agreement_url ? (
                                                <div className="aspect-[3/4] rounded-lg border border-white/10 bg-white/5 flex items-center justify-center p-2 relative group overflow-hidden">
                                                    {selectedTenant.agreement_url.endsWith('.pdf') ?
                                                        <FileText size={48} className="text-white/20" /> :
                                                        <img src={selectedTenant.agreement_url} alt="Agreement" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    }
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); setViewer({ isOpen: true, url: selectedTenant.agreement_url, title: `${selectedTenant.name} - Agreement Form` })}}
                                                            className="p-2 bg-blue-500 rounded-full text-white hover:scale-110 transition-transform"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {selectedTenant.agreement_id && (
                                                            <button onClick={(e) => { e.preventDefault(); handleDeleteDoc(selectedTenant.agreement_id) }} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform cursor-pointer relative z-50 pointer-events-auto">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-[3/4] rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center p-4 text-center">
                                                    <FileText size={32} className="text-white/10 mb-2" />
                                                    <p className="text-xs text-white/40">No agreement uploaded yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* ID Section */}
                                    <div className="space-y-6">
                                        {/* Front */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] text-white/40 uppercase tracking-widest block">CNIC Front</label>
                                                <input type="file" id="id-front-upload" className="hidden" accept=".png, .jpg, .jpeg" onChange={(e) => handleUpload(e, 'ID_Front')} disabled={uploading} />
                                                <label htmlFor="id-front-upload" className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase cursor-pointer flex items-center gap-1 transition-colors">
                                                    {uploading ? <Clock size={10} className="animate-spin" /> : <Upload size={10} />}
                                                    {selectedTenant.id_card_front_url ? 'Replace' : 'Upload'}
                                                </label>
                                            </div>
                                            {selectedTenant.id_card_front_url ? (
                                                <div className="aspect-video rounded-lg border border-white/10 bg-white/5 overflow-hidden group relative">
                                                    <img src={selectedTenant.id_card_front_url} alt="ID Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); setViewer({ isOpen: true, url: selectedTenant.id_card_front_url, title: `${selectedTenant.name} - ID Front` })}}
                                                            className="p-2 bg-blue-500 rounded-full text-white hover:scale-110 transition-transform"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {selectedTenant.id_card_front_id && (
                                                            <button onClick={(e) => { e.preventDefault(); handleDeleteDoc(selectedTenant.id_card_front_id) }} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform cursor-pointer relative z-50 pointer-events-auto">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-video rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-white/20">
                                                    <CreditCard size={24} className="mb-2 opacity-20" />
                                                    <span className="text-[10px] uppercase font-bold tracking-widest">No ID Front</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Back */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] text-white/40 uppercase tracking-widest block">CNIC Back</label>
                                                <input type="file" id="id-back-upload" className="hidden" accept=".png, .jpg, .jpeg" onChange={(e) => handleUpload(e, 'ID_Back')} disabled={uploading} />
                                                <label htmlFor="id-back-upload" className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase cursor-pointer flex items-center gap-1 transition-colors">
                                                    {uploading ? <Clock size={10} className="animate-spin" /> : <Upload size={10} />}
                                                    {selectedTenant.id_card_back_url ? 'Replace' : 'Upload'}
                                                </label>
                                            </div>
                                            {selectedTenant.id_card_back_url ? (
                                                <div className="aspect-video rounded-lg border border-white/10 bg-white/5 overflow-hidden group relative">
                                                    <img src={selectedTenant.id_card_back_url} alt="ID Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); setViewer({ isOpen: true, url: selectedTenant.id_card_back_url, title: `${selectedTenant.name} - ID Back` })}}
                                                            className="p-2 bg-blue-500 rounded-full text-white hover:scale-110 transition-transform"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {selectedTenant.id_card_back_id && (
                                                            <button onClick={(e) => { e.preventDefault(); handleDeleteDoc(selectedTenant.id_card_back_id) }} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform cursor-pointer relative z-50 pointer-events-auto">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-video rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-white/20">
                                                    <CreditCard size={24} className="mb-2 opacity-20" />
                                                    <span className="text-[10px] uppercase font-bold tracking-widest">No ID Back</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            <DocumentViewerModal 
                isOpen={viewer.isOpen}
                onClose={() => setViewer({ ...viewer, isOpen: false })}
                imageUrl={viewer.url}
                title={viewer.title}
            />
        </div>
    );
};

export default PoliceVerification;
