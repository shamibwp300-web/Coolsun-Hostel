import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Plus, Settings, Trash2, Edit2, 
  Maximize2, Grid, Layout, Monitor, 
  HelpCircle, Shield, X, Check, ExternalLink,
  Lock, RefreshCw, Scan, Camera
} from 'lucide-react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

const CCTV = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'manage'
  const [gridCols, setGridCols] = useState(2); // 1, 2, 3 cols
  const [isScanning, setIsScanning] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Embed',
    url: '',
    description: '',
    position_index: 0
  });

  const rawRole = localStorage.getItem('userRole');
  const userRole = rawRole ? rawRole.replace(/"/g, '') : 'Admin';
  const isOwner = userRole === 'Owner';

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/cctv/cameras');
      setCameras(res.data);
    } catch (err) {
      console.error('Failed to fetch cameras', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  useEffect(() => {
    let scanner = null;
    if (isScanning && showModal) {
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true
      });

      scanner.render((decodedText) => {
        // Success callback
        if (decodedText.startsWith('http')) {
          setFormData(prev => ({ ...prev, url: decodedText, type: 'Stream' }));
        } else {
          setFormData(prev => ({ ...prev, name: `Cam - ${decodedText}` }));
        }
        setIsScanning(false);
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      }, (error) => {
        // Error callback (silent to avoid spamming the console)
      });
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Clean up error", e));
      }
    };
  }, [isScanning, showModal]);

  const handleOpenModal = (camera = null) => {
    if (camera) {
      setEditingCamera(camera);
      setFormData({
        name: camera.name,
        type: camera.type,
        url: camera.url,
        description: camera.description || '',
        position_index: camera.position_index
      });
    } else {
      setEditingCamera(null);
      setFormData({
        name: '',
        type: 'Embed',
        url: '',
        description: '',
        position_index: cameras.length
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCamera) {
        await axios.put(`/api/cctv/cameras/${editingCamera.id}`, formData);
      } else {
        await axios.post('/api/cctv/cameras', formData);
      }
      setShowModal(false);
      fetchCameras();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save camera');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this camera feed?')) return;
    try {
      await axios.delete(`/api/cctv/cameras/${id}`);
      fetchCameras();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete camera');
    }
  };

  const CameraFeed = ({ camera }) => {
    if (camera.type === 'Embed') {
      return (
        <iframe 
          src={camera.url}
          className="w-full h-full border-0 pointer-events-auto"
          allow="autoplay; fullscreen; picture-in-picture"
          title={camera.name}
        />
      );
    }
    
    return (
      <div className="w-full h-full bg-black/60 flex flex-col items-center justify-center p-4 text-center">
        <Monitor size={48} className="text-white/10 mb-4" />
        <p className="text-white/40 text-xs font-medium max-w-[200px]">
          Direct Stream Playback (HLS/WebRTC) requires a compatible browser or specific codec configuration.
        </p>
        <button 
          onClick={() => window.open(camera.url, '_blank')}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all text-xs"
        >
          <ExternalLink size={14} /> Open Stream Directly
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Video className="text-red-500 animate-pulse" /> CCTV Surveillance Hub
          </h2>
          <p className="text-white/40 text-sm font-medium">Real-time monitoring and perimeter security</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-white/40 hover:text-white'}`}
          >
            Monitor
          </button>
          {isOwner && (
            <button 
              onClick={() => setViewMode('manage')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'manage' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-white/40 hover:text-white'}`}
            >
              Configure
            </button>
          )}
        </div>
      </div>

      {/* Grid Controls (only in monitor mode) */}
      {viewMode === 'grid' && cameras.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/30 text-[10px] font-black uppercase tracking-tighter">
            <Grid size={12} /> Grid Size:
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button 
                key={n}
                onClick={() => setGridCols(n)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-black transition-all ${gridCols === n ? 'bg-white/10 text-blue-400' : 'text-white/20 hover:text-white/40'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main View */}
      <div className="min-h-[60vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Syncing Camera Nodes...</p>
          </div>
        ) : viewMode === 'grid' ? (
          cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Shield size={40} className="text-white/10" />
              </div>
              <h3 className="text-xl font-bold text-white">No Active Surveillance</h3>
              <p className="text-white/40 text-sm max-w-xs">Contact your administrator to add hostel camera feeds to this dashboard.</p>
              {isOwner && (
                <button 
                  onClick={() => handleOpenModal()}
                  className="mt-4 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  Configure Hardware
                </button>
              )}
            </div>
          ) : (
            <div 
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
            >
              {cameras.map(camera => (
                <motion.div 
                  key={camera.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl group"
                >
                  <CameraFeed camera={camera} />
                  
                  {/* Overlay */}
                  <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        <span className="text-white font-black text-xs uppercase tracking-widest shadow-lg">{camera.name}</span>
                      </div>
                      <span className="text-white/40 text-[8px] font-bold uppercase translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                        {camera.type} Feed LIVE
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* Management Mode */
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10">
              <div>
                <h4 className="text-white font-bold">Node Management</h4>
                <p className="text-white/40 text-xs">Configure stream parameters and hardware links</p>
              </div>
              <button 
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                <Plus size={18} /> Register Camera
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cameras.map(camera => (
                <div key={camera.id} className="glass-panel p-6 rounded-3xl border border-white/10 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                        <Video size={20} className="text-white/30" />
                      </div>
                      <div>
                        <h5 className="text-white font-bold">{camera.name}</h5>
                        <p className="text-white/30 text-[10px] tracking-widest font-black uppercase">{camera.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(camera)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(camera.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-white/40 font-mono truncate">{camera.url}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Hardware Help Section */}
            <div className="bg-blue-600/5 border border-blue-500/20 p-8 rounded-[2.5rem] mt-12">
               <div className="flex items-start gap-4">
                 <HelpCircle className="text-blue-500 mt-1" size={24} />
                 <div>
                   <h4 className="text-white font-bold text-lg mb-2">Connecting Physical Hardware</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                      <div className="space-y-3">
                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Option A: Cloud Embedding (Easiest)</p>
                        <p className="text-white/50 text-sm leading-relaxed">
                          Login to your provider's web portal (EZVIZ, Hik-Connect, XMeye). Find the "Broadcast" or "Share" section and look for **iFrame Embed Code**. Paste only the "src" URL here.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Option B: IP Streaming</p>
                        <p className="text-white/50 text-sm leading-relaxed">
                          Use a relay service like `go2rtc` or `Monocle` to convert your local NVR signal to a **WebRTC** or **HLS (.m3u8)** link. This requires a static IP or Port Forwarding.
                        </p>
                      </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-void/80 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-void border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">{editingCamera ? 'Modify Feed' : 'Link Hardware'}</h3>
                  <p className="text-white/40 text-sm font-medium">Synchronize physical nodes to system</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 rounded-2xl hover:bg-white/5 text-white/40 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="flex justify-center mb-4">
                  {!isScanning ? (
                    <button 
                      type="button"
                      onClick={() => setIsScanning(true)}
                      className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all"
                    >
                      <Scan size={16} /> Scan Camera Sticker
                    </button>
                  ) : (
                    <div className="w-full">
                      <div id="reader" className="overflow-hidden rounded-2xl border-2 border-blue-500/30 bg-black/40" />
                      <button 
                        type="button" 
                        onClick={() => setIsScanning(false)}
                        className="mt-2 w-full text-[10px] text-white/30 uppercase font-black hover:text-red-400 transition-colors"
                      >
                        Cancel Scanning
                      </button>
                      <p className="mt-2 text-[8px] text-white/20 text-center uppercase tracking-widest font-bold">
                        Note: Camera access requires a secure (HTTPS) connection.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Node Identity</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:border-blue-500 transition-all" 
                    placeholder="e.g. Front Gate - Cam 01"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Feed Protocol</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold appearance-none focus:outline-none focus:border-blue-500"
                    >
                      <option value="Embed">iFrame Embed</option>
                      <option value="Stream">HLS / IP Stream</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Grid Position</label>
                    <input 
                      type="number"
                      value={formData.position_index}
                      onChange={e => setFormData({...formData, position_index: parseInt(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Source URL / Hash Code</label>
                  <textarea 
                    required
                    rows={4}
                    value={formData.url}
                    onChange={e => setFormData({...formData, url: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-all" 
                    placeholder={formData.type === 'Embed' ? 'Paste the "src" attribute from the embed code...' : 'e.g. http://192.168.1.100:8083/stream/node1/index.m3u8'}
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-[1.5rem] bg-white/5 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
                    Abort
                  </button>
                  <button type="submit" className="flex-2 grow py-5 rounded-[1.5rem] bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20">
                    {editingCamera ? 'Confirm Update' : 'Initialize Feed'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CCTV;
