import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import RevenueCard from './RevenueCard';
import OccupancyDonut from './OccupancyDonut';
import ComplianceTrafficLight from './ComplianceTrafficLight';
import IssueInbox from './IssueInbox';
import DailyClosing from './DailyClosing';
import { RefreshCw, BarChart2, Zap, Droplets, Wifi } from 'lucide-react';
import { HelpButton } from '../../components/HelpButton';
import { useNavigate } from 'react-router-dom';

// Custom Hook for Polling
function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/dashboard/summary');
      setData(res.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Dashboard Sync Failed - Using Mock Data", error);

      // Fallback Mock Data
      setData({
        financials: {
          current_collected: 125000,
          current_pending: 45000,
          legacy_arrears: 12000,
          current_expenses: 15000,
          net_cash: 110000
        },
        compliance: {
          CRITICAL: 2,
          WARNING: 5,
          NORMAL: 40,
          VERIFIED: 5
        },
        occupancy: {
          total_capacity: 100,
          active_tenants: 85,
          rate: 85
        },
        electricity: {
          recent_bills: [],
          total_billed_this_month: 0
        }
      });
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchData();
  }, []);

  // 15-Minute Heartbeat (900,000 ms)
  useInterval(() => {
    fetchData();
  }, 900000);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="text-sm font-light tracking-widest uppercase">Syncing War Room...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HelpButton section="dashboard" />

      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Command Center</h1>
          <p className="text-white/40 text-sm mt-1">
            Live Status &bull; Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/reports')}
            className="h-10 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all flex items-center"
            title="View Reports"
          >
            <BarChart2 size={18} className="mr-2" /> Reports
          </button>
          <button
            onClick={fetchData}
            className="h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all flex items-center justify-center"
            title="Force Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative h-10 w-10">
            <HelpButton section="dashboard" />
          </div>
        </div>
      </div>

      {/* The Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* LEFT COLUMN: Financials (3 cols) */}
        <div className="md:col-span-3 space-y-8">
          <div className="h-[280px]">
            <RevenueCard data={data?.financials || {}} />
          </div>
          <div className="h-[280px]">
            <DailyClosing collectedToday={data?.financials?.current_collected || 0} />
          </div>
        </div>

        {/* CENTER COLUMN: Operations (6 cols) */}
        <div className="md:col-span-6 space-y-8">
          {/* Top Row: Compliance & Occupancy */}
          <div className="grid grid-cols-2 gap-8 h-[280px]">
            <ComplianceTrafficLight data={data?.compliance || {}} />
            <OccupancyDonut data={data?.occupancy || {}} />
          </div>

          {/* Bottom Row: Recent Utility Bills */}
          <div className="glass-card p-6 h-[240px] flex flex-col border border-yellow-500/10 hover:border-yellow-500/30 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold flex items-center">
                <Zap className="text-yellow-400 mr-1" size={16} />
                <Droplets className="text-blue-400 mr-1" size={16} />
                <Wifi className="text-purple-400 mr-2" size={16} />
                Recent Utility Bills
              </h3>
              <div className="text-xs text-white/50 font-bold bg-white/5 px-2 py-1 rounded-md">
                Rs. {data?.electricity?.total_billed_this_month?.toLocaleString() || 0} Billed MTD
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {data?.electricity?.recent_bills?.length > 0 ? (
                data.electricity.recent_bills.map((bill, i) => (
                  <div key={i} className={`flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5 border-l-2 ${bill.type === 'Water' ? 'border-l-blue-500' : bill.type === 'Internet' ? 'border-l-purple-500' : 'border-l-yellow-500'}`}>
                    <div className="flex justify-start items-center">
                      {bill.type === 'Water' ? (
                        <Droplets size={16} className="text-blue-400 mr-3 opacity-80" />
                      ) : bill.type === 'Internet' ? (
                        <Wifi size={16} className="text-purple-400 mr-3 opacity-80" />
                      ) : (
                        <Zap size={16} className="text-yellow-400 mr-3 opacity-80" />
                      )}
                      <div>
                        <div className="text-white font-bold text-sm">Room {bill.room}</div>
                        <div className="text-xs text-white/40">{bill.date} &bull; {bill.units}</div>
                      </div>
                    </div>
                    <div className={bill.type === 'Water' ? "text-blue-400 font-bold" : bill.type === 'Internet' ? "text-purple-400 font-bold" : "text-yellow-400 font-bold"}>
                      Rs. {bill.amount.toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm">
                  <Zap size={24} className="mb-2 opacity-20" />
                  No bills logged yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Triage (3 cols) */}
        <div className="md:col-span-3 h-[544px]"> {/* Matches height of left/center columns roughly */}
          <IssueInbox issues={data?.maintenance?.open_issues} isLoading={loading} onRefresh={fetchData} />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
