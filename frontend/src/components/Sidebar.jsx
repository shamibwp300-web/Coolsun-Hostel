import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Wrench,
  BarChart2,
  Settings,
  Video,
  LogOut,
  Zap,
  Shield,
  Home,
  UserPlus,
  ListChecks,
  LogIn,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';

const Sidebar = ({ mode = 'desktop' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const rawRole = localStorage.getItem('userRole');
  const userRole = rawRole ? rawRole.replace(/"/g, '') : 'Admin';

  const rawPerms = localStorage.getItem('userPermissions');
  const userPermissions = rawPerms ? JSON.parse(rawPerms) : {};

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPermissions');
    navigate('/login');
  };

  const hasPermission = (moduleName) => {
    if (userRole === 'Owner') return true; // Super admins see everything
    return !!userPermissions[moduleName];
  };

  const NavItem = ({ icon, label, to, active }) => (
    <NavLink
      to={to}
      className={`flex items-center px-4 py-3 mb-1 rounded-xl transition-all duration-300 group ${active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
        : 'text-[#8892b0] hover:bg-white/5 hover:text-white'
        }`}
    >
      <div className={`${active ? 'text-white' : 'text-[#8892b0] group-hover:text-blue-400'}`}>
        {icon}
      </div>
      <span className="ml-3 font-medium text-sm tracking-wide">{label}</span>
    </NavLink>
  );

  return (
    <div className="h-full w-full bg-[#0a0a1a] border-r border-[#1e293b] flex flex-col text-[#ccd6f6] shadow-2xl">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-[#1e293b] bg-black/20">
        <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="text-xl font-bold text-white tracking-tighter">C</span>
        </div>
        <div className="ml-4">
          <h1 className="text-lg font-bold text-white tracking-tight leading-tight">Coolsun</h1>
          <p className="text-[10px] text-blue-400 font-medium tracking-widest uppercase">Hostel Management</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#1e293b] py-6 px-3 space-y-8">

        <div className="space-y-1">
          {hasPermission('dashboard') && (
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard Hub" to="/dashboard" active={location.pathname === '/dashboard'} />
          )}
        </div>

        <div>
           {(hasPermission('wizard') || hasPermission('tenants') || hasPermission('rooms') || hasPermission('bulk_rent') || hasPermission('police') || hasPermission('tasks')) && (
            <p className="px-4 text-[10px] font-bold tracking-widest text-[#8892b0] mb-3 uppercase">Operations</p>
           )}
          {hasPermission('wizard') && <NavItem icon={<UserPlus size={18} />} label="New Tenant (Wizard)" to="/wizard" active={location.pathname === '/wizard'} />}
          {hasPermission('tenants') && <NavItem icon={<Users size={18} />} label="Tenant Registry" to="/tenants" active={location.pathname === '/tenants'} />}
          {hasPermission('rooms') && <NavItem icon={<Home size={18} />} label="Room Inventory" to="/rooms" active={location.pathname === '/rooms'} />}
          {hasPermission('bulk_rent') && <NavItem icon={<Building2 size={18} />} label="Bulk Rental" to="/bulk-rent" active={location.pathname === '/bulk-rent'} />}
          {hasPermission('police') && <NavItem icon={<Shield size={18} />} label="Police Verification" to="/police" active={location.pathname === '/police'} />}
          {hasPermission('tasks') && <NavItem icon={<ListChecks size={18} />} label="Tasks & Staff" to="/tasks" active={location.pathname === '/tasks'} />}
        </div>

        <div>
          {hasPermission('electricity') || hasPermission('finance') && (
            <p className="px-4 text-[10px] font-bold tracking-widest text-[#8892b0] mb-3 uppercase">Financial Edge</p>
          )}
          {hasPermission('electricity') && <NavItem icon={<Zap size={18} />} label="Utility Billing" to="/electricity" active={location.pathname === '/electricity'} />}
          {hasPermission('finance') && (
            <>
              <NavItem icon={<Calendar size={18} />} label="Generate Rent" to="/finance/generate" active={location.pathname === '/finance/generate'} />
              <NavItem icon={<DollarSign size={18} />} label="Receive Rent" to="/finance/receive" active={location.pathname === '/finance/receive'} />
              <NavItem icon={<Wallet size={18} />} label="Finance Engine" to="/finance" active={location.pathname === '/finance'} />
            </>
          )}
        </div>

        <div>
          {(hasPermission('maintenance') || hasPermission('cctv')) && (
            <p className="px-4 text-[10px] font-bold tracking-widest text-[#8892b0] mb-3 uppercase">Maintenance & Comms</p>
          )}
          {hasPermission('maintenance') && <NavItem icon={<Wrench size={18} />} label="Issue Inbox" to="/maintenance" active={location.pathname === '/maintenance'} />}
          {hasPermission('cctv') && <NavItem icon={<Video size={18} />} label="CCTV Surveillance" to="/cctv" active={location.pathname === '/cctv'} />}
        </div>

        <div>
          {(hasPermission('reports') || hasPermission('audit') || hasPermission('settings')) && (
            <p className="px-4 text-[10px] font-bold tracking-widest text-[#8892b0] mb-3 uppercase">System</p>
          )}
          {hasPermission('reports') && <NavItem icon={<BarChart2 size={18} />} label="Reports" to="/reports" active={location.pathname === '/reports'} />}
          {hasPermission('audit') && <NavItem icon={<Shield size={18} />} label="Audit Log Vault" to="/audit" active={location.pathname === '/audit'} />}
          {hasPermission('settings') && <NavItem icon={<Settings size={18} />} label="Settings & Rules" to="/settings" active={location.pathname === '/settings'} />}
        </div>

      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-[#1e293b] bg-black/20">
        <div className="flex items-center p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
            AM
          </div>
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-bold text-white truncate">Admin User</p>
            <p className="text-xs text-[#8892b0] font-medium">{userRole || 'Admin'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Secure Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

    </div>
  );
};

export default Sidebar;
