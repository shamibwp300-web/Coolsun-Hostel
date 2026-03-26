import React, { useState } from 'react';
import { Send, Wallet } from 'lucide-react';

const DailyClosing = ({ collectedToday = 0 }) => {
    const [openingBalance, setOpeningBalance] = useState('');
    const [expenses, setExpenses] = useState(0); // Mocked for now

    const closingBalance = (parseFloat(openingBalance) || 0) + (collectedToday || 0) - expenses;

    const handleHandover = () => {
        alert(`Handover Sent!\nClosing Balance: Rs. ${closingBalance}`);
    };

    return (
        <div className="glass-card p-4 h-full flex flex-col justify-between bg-gradient-to-br from-white/5 to-blue-900/10">
            <h3 className="text-xs font-medium uppercase tracking-wider text-white/50 flex items-center">
                <Wallet size={12} className="mr-2" /> Daily Closing
            </h3>

            <div className="space-y-3 my-2">
                <div>
                    <label className="text-xs text-white/40">Opening Balance</label>
                    <input
                        type="number"
                        value={openingBalance}
                        onChange={e => setOpeningBalance(e.target.value)}
                        placeholder="0"
                        className="glass-input w-full h-10 px-3 rounded-lg text-right font-mono"
                    />
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-green-400">+ Collected Today</span>
                    <span className="font-mono">Rs. {collectedToday.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-red-400">- Cash Expenses</span>
                    <span className="font-mono">Rs. {expenses.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-lg">
                    <span>Cash In Hand</span>
                    <span className="text-blue-300">Rs. {closingBalance.toLocaleString()}</span>
                </div>
            </div>

            <button
                onClick={handleHandover}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all group"
            >
                <Send size={16} className="mr-2 group-hover:translate-x-1 transition-transform" />
                Submit Handover
            </button>
        </div>
    );
};

export default DailyClosing;
