import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    
    if (username === 'admin@coolsun.pk' && password === 'Coolsun@23*+') {
        setLoading(true);
        // Simulate Auth Delay
        setTimeout(() => {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', 'Admin');
            setLoading(false);
            navigate('/dashboard');
        }, 1000);
    } else {
        setError('Invalid username or password');
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-void">
      {/* Mesh Gradient Background */}
      <motion.div 
        className="absolute -top-[20%] -left-[20%] h-[150%] w-[150%] opacity-40"
        animate={{ 
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "linear" 
        }}
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
        {/* Glow Effect */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        
        <div className="relative z-20">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8 text-center"
          >
            <h1 className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
              Hostel ERP
            </h1>
            <p className="mt-2 text-sm text-white/50 font-light tracking-wide">
              v1.0.0 &bull; Secure Access
            </p>
          </motion.div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500 text-center">
                    {error}
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
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-white/40">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-blue-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-12 pr-4 text-white placeholder-white/20 transition-all focus:border-blue-500/50 focus:bg-black/30 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(37, 99, 235, 0.9)' }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="mt-8 flex h-14 w-full items-center justify-center rounded-xl bg-blue-600/80 text-lg font-medium text-white shadow-lg shadow-blue-500/20 backdrop-blur-md transition-all"
            >
              {loading ? 'Authenticating...' : 'Enter System'}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-white/20">
              Authorized Personnel Only &bull; 2026
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
