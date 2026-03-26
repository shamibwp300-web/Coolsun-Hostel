import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!username) {
      setError('Please provide your username.');
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(data.message || 'Recovery instruction generated.');
      } else {
        setError(data.error || 'Failed to request password reset');
      }
    } catch (err) {
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-void">
      {/* Mesh Gradient Background */}
      <motion.div 
        className="absolute -top-[20%] -left-[20%] h-[150%] w-[150%] opacity-40"
        animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_50%_50%,_rgba(79,70,229,0.4),_transparent_50%)] blur-3xl" />
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-600/30 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-600/30 blur-[100px]" />
      </motion.div>

      {/* Glass Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl"
      >
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        
        <div className="relative z-20">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8 text-center"
          >
            <h1 className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Forgot Password
            </h1>
            <p className="mt-2 text-sm text-white/50 font-light tracking-wide">
              Enter username to recover account
            </p>
          </motion.div>

          <form className="space-y-6" onSubmit={handleRequestReset}>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-2 rounded-xl text-sm text-center">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-white/40">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-blue-400" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-12 pr-4 text-white placeholder-white/20 transition-all focus:border-blue-500/50 focus:bg-black/30 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  placeholder="admin@coolsun.pk"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(37, 99, 235, 0.9)' }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || success}
              className="mt-8 flex h-14 w-full items-center justify-center rounded-xl bg-blue-600/80 text-lg font-medium text-white shadow-lg shadow-blue-500/20 backdrop-blur-md transition-all disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Request Reset Link'}
            </motion.button>
          </form>

          <div className="mt-6 flex items-center justify-center pt-4 border-t border-white/10">
            <Link to="/login" className="flex items-center text-sm text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
