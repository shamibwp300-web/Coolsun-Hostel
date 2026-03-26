import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, PenTool, Camera, Upload } from 'lucide-react';

const IssueInbox = ({ issues: propIssues, isLoading: propLoading, onRefresh }) => {
    const [localIssues, setLocalIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [resolveForm, setResolveForm] = useState({ cost: '', isCash: true, desc: '', proofPhoto: null });

    const fetchIssues = async () => {
        if (propIssues) return; // Don't fetch if props are provided
        try {
            setLoading(true);
            const r = await axios.get('/api/maintenance'); // Fetch all maintenance issues
            
            // Filter issues to display Approved, Open, In Progress, and Pending
            const displayStatuses = ['Pending', 'Approved', 'Open', 'In Progress'];
            const filtered = r.data.filter(issue => displayStatuses.includes(issue.status));
            setLocalIssues(filtered);
        } catch (e) {
            console.error("Failed to fetch maintenance issues:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [propIssues]);

    const issues = propIssues || localIssues;
    const isLoading = propLoading !== undefined ? propLoading : loading;

    const handleResolveClick = (issue) => {
        setSelectedIssue(issue);
        setResolveForm({ cost: '', isCash: true, desc: `Fix for: ${issue.description}`, proofPhoto: null });
    };

    const submitResolution = async () => {
        if (!resolveForm.proofPhoto && selectedIssue.priority === 'Critical') {
            alert("Critical issues require photo proof!");
            return;
        }

        try {
            // Update issue status to Resolved
            await axios.put(`/api/maintenance/${selectedIssue.id}`, { status: 'Resolved' });
            
            // If there's a cost, create an expense
            if (resolveForm.cost > 0) {
                await axios.post('/api/expenses', {
                    amount: resolveForm.cost,
                    category: 'Repairs',
                    description: resolveForm.desc,
                    paid_from_cash_drawer: resolveForm.isCash,
                    maintenance_id: selectedIssue.id
                });
            }

            alert("Issue marked as resolved!");
            setSelectedIssue(null);
            fetchIssues();
        } catch (e) {
            console.error("Resolution failed:", e);
            alert("Failed to resolve issue. Check console.");
        }
    };

    if (loading) return <div className="p-6 text-white/50">Loading inbox...</div>;

    return (
        <div className="glass-card p-6 h-full flex flex-col">
            <h3 className="text-sm font-medium uppercase tracking-wider text-white/50 mb-4 flex justify-between items-center">
                Issue Inbox <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs">{issues.length} Open</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {issues.length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-sm italic">No pending issues</div>
                ) : (
                    issues.map(issue => (
                        <div 
                            key={issue.id} 
                            className={`p-3 rounded-xl border transition-all cursor-pointer hover:bg-white/5 ${
                                issue.priority === 'Critical' 
                                    ? 'border-red-500/30 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                                    : 'border-white/10 bg-black/20'
                            }`}
                            onClick={() => handleResolveClick(issue)}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex gap-1.5">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                        issue.priority === 'Critical' ? 'bg-red-500 text-white' : 
                                        issue.priority === 'High' ? 'bg-orange-500 text-white' : 'bg-blue-500/50 text-blue-100'
                                    }`}>{issue.priority}</span>
                                    
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                        issue.status === 'Approved' ? 'bg-blue-600 text-white' : 
                                        issue.status === 'In Progress' ? 'bg-yellow-600 text-white' : 
                                        issue.status === 'Open' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/50'
                                    }`}>{issue.status}</span>
                                </div>
                                <span className="text-[10px] text-white/30">{new Date(issue.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-white/90 line-clamp-2">{issue.description}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Resolve Modal (Inline for v1) */}
            {selectedIssue && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="glass-card w-full max-w-sm p-6 border-blue-500/30 shadow-2xl">
                        <h4 className="text-lg font-bold text-white mb-4">Resolve Issue #{selectedIssue.id}</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-white/50 uppercase">Cost Incurred?</label>
                                <input 
                                    type="number" 
                                    placeholder="0"
                                    value={resolveForm.cost}
                                    onChange={e => setResolveForm({...resolveForm, cost: e.target.value})}
                                    className="glass-input w-full h-10 px-3 rounded-lg mt-1"
                                />
                            </div>
                            
                            {resolveForm.cost > 0 && (
                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                                    <span className="text-sm text-white/80">Paid from Cash Drawer?</span>
                                    <input 
                                        type="checkbox" 
                                        checked={resolveForm.isCash}
                                        onChange={e => setResolveForm({...resolveForm, isCash: e.target.checked})}
                                        className="h-5 w-5 accent-blue-500"
                                    />
                                </div>
                            )}

                            {/* Task Proof Upload */}
                            <div className="relative group cursor-pointer border border-dashed border-white/20 rounded-xl hover:border-blue-500/50 transition-all p-4 bg-white/5">
                                <input 
                                    type="file" 
                                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                                    onChange={(e) => setResolveForm({...resolveForm, proofPhoto: e.target.files[0]})}
                                    accept="image/*"
                                />
                                <div className="flex flex-col items-center justify-center text-center">
                                    {resolveForm.proofPhoto ? (
                                        <>
                                            <CheckCircle className="text-green-400 mb-2" size={24} />
                                            <span className="text-xs text-green-300 font-medium truncate w-full px-4">{resolveForm.proofPhoto.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="text-white/40 mb-2" size={24} />
                                            <span className="text-xs text-white/50">Upload Proof of Work</span>
                                            {selectedIssue.priority === 'Critical' && <span className="text-[10px] text-red-400 mt-1 uppercase tracking-wider font-bold">Required</span>}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex space-x-3 mt-6">
                                <button onClick={() => setSelectedIssue(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5">Cancel</button>
                                <button onClick={submitResolution} className="flex-1 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 font-medium">Mark Done</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssueInbox;
