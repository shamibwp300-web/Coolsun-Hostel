import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Download, ChevronLeft, Shield, FileText, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const SEVERITY_COLORS = { Critical: '#EF4444', High: '#F59E0B', Routine: '#3B82F6' };

const mockComplianceData = [
  { id: 1, name: 'Ali Khan', room: '101', expiry: '2026-03-01', status: 'Safe' },
  { id: 2, name: 'Hamza Malik', room: '102', expiry: '2026-02-25', status: 'Warning' },
  { id: 3, name: 'Usman Ghani', room: '201', expiry: '2026-02-15', status: 'Critical' },
];

const Reports = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('All');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/dashboard/summary');
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch report data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const tabs = [
    { id: 'financials', label: 'Financials' },
    { id: 'occupancy', label: 'Occupancy' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'maintenance', label: 'Maintenance' },
  ];

  const handleDownload = () => {
    alert("Generating PDF Report... (Mocked)");
  };

  return (
    <div className="space-y-8">
      <div className="mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <button onClick={() => navigate('/dashboard')} className="mr-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Reports Hub</h1>
              <p className="text-white/40 text-sm">Detailed Analytics & Audit</p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center shadow-lg shadow-blue-500/20 transition-all"
          >
            <Download size={18} className="mr-2" /> Download Summary
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8 bg-white/5 p-1 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-8 min-h-[500px]"
        >
          {loading ? (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'financials' && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-6">Expense Breakdown</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data?.financials?.expense_breakdown?.length > 0 ? data.financials.expense_breakdown : [{name: 'No Expenses', value: 1}]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {data?.financials?.expense_breakdown?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            {(!data?.financials?.expense_breakdown || data.financials.expense_breakdown.length === 0) && <Cell fill="#333" />}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                      <p className="text-sm text-white/40 uppercase tracking-wider">Total Revenue</p>
                      <p className="text-3xl font-bold text-green-400 mt-1">Rs. {(data?.financials?.current_collected || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                      <p className="text-sm text-white/40 uppercase tracking-wider">Total Expenses</p>
                      <p className="text-3xl font-bold text-red-400 mt-1">Rs. {(data?.financials?.current_expenses || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-500/10 p-6 rounded-xl border border-blue-500/30">
                      <p className="text-sm text-blue-300 uppercase tracking-wider">Net Profit</p>
                      <p className="text-3xl font-bold text-blue-100 mt-1">Rs. {(data?.financials?.net_cash || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Expense Table */}
                <div className="mt-12 overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-white">Detailed Expense Summary</h3>
                    <div className="flex bg-white/5 p-1 rounded-lg">
                      {['All', 'Business', 'Personal'].map(f => (
                        <button
                          key={f}
                          onClick={() => setExpenseTypeFilter(f)}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${expenseTypeFilter === f ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                        >
                          {f === 'Personal' ? 'Owner' : f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-white/10 text-white/40 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="pb-4 font-medium">Type</th>
                          <th className="pb-4 font-medium text-left">Date</th>
                          <th className="pb-4 font-medium text-left">Description</th>
                          <th className="pb-4 font-medium text-left">Category</th>
                          <th className="pb-4 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/80 divide-y divide-white/5">
                        {data?.financials?.recent_expenses?.filter(e => expenseTypeFilter === 'All' || e.type === expenseTypeFilter).length > 0 ? (
                          data.financials.recent_expenses.filter(e => expenseTypeFilter === 'All' || e.type === expenseTypeFilter).map((exp, i) => (
                            <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                              <td className="py-4">
                                <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${exp.type === 'Business' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                  {exp.type === 'Personal' ? 'Owner' : exp.type}
                                </span>
                              </td>
                              <td className="py-4 text-xs text-white/50">{exp.date}</td>
                              <td className="py-4 text-sm font-medium">{exp.description}</td>
                              <td className="py-4 text-white/40 text-xs">{exp.category}</td>
                              <td className="py-4 text-right font-mono font-bold text-red-400">Rs. {Number(exp.amount).toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-white/20 italic">No recent expenses found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
              )}

          {activeTab === 'occupancy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white">Occupancy Breakdown</h3>
                <div className="space-y-4">
                  {[
                    { type: 'Active Tenants', count: data?.occupancy?.active_tenants || 0, color: '#3B82F6' },
                    { type: 'Available Capacity', count: (data?.occupancy?.total_capacity || 0) - (data?.occupancy?.active_tenants || 0), color: '#10B981' },
                  ].map(row => (
                    <div key={row.type} className="space-y-1">
                      <div className="flex justify-between text-xs text-white/50 uppercase">
                        <span>{row.type}</span>
                        <span>{row.count}</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(row.count / (data?.occupancy?.total_capacity || 1)) * 100}%` }}
                          className="h-full"
                          style={{ backgroundColor: row.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-6xl font-bold text-white">{data?.occupancy?.rate || 0}%</p>
                  <p className="text-sm text-white/40 uppercase tracking-widest mt-2">Overall Occupancy</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white">Agreement Expiry & Police Verification Aging</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="pb-4 font-medium">Tenant</th>
                      <th className="pb-4 font-medium">Room</th>
                      <th className="pb-4 font-medium">Expiry Date</th>
                      <th className="pb-4 font-medium">Status</th>
                      <th className="pb-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/80 divide-y divide-white/5">
                    {mockComplianceData.map(row => (
                      <tr key={row.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 font-medium">{row.name}</td>
                        <td className="py-4 text-white/50">{row.room}</td>
                        <td className="py-4 text-white/50">{row.expiry}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${row.status === 'Safe' ? 'bg-green-500/20 text-green-400' :
                              row.status === 'Warning' ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                            }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-4">
                          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">Notify</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-white mb-6">Issue Severity</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(data.maintenance.breakdown).map(([k,v]) => ({severity: k, count: v}))}>
                      <XAxis dataKey="severity" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {Object.entries(data.maintenance.breakdown).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry[0]]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">System Statistics</h3>
                <div className="glass-card p-4 border-white/5 bg-white/[0.02]">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-white/40 uppercase">Open Maintenance</p>
                      <p className="text-2xl font-bold text-white mt-1">{data.maintenance.total_open} Issues</p>
                    </div>
                  </div>
                </div>
                <div className="glass-card p-4 border-white/5 bg-white/[0.02]">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-white/40 uppercase">Safe Compliance</p>
                      <p className="text-2xl font-bold text-white mt-1">{data.compliance.NORMAL || 0} Tenants</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>

      </div>
    </div>
  );
};

export default Reports;
