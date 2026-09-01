import React, { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Shield, 
  Users, 
  AlertTriangle, 
  Settings, 
  HelpCircle,
  Search,
  LogOut,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface AdminLayoutProps {
  children: ReactNode;
  role: 'superadmin' | 'admin' | 'founder';
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, role }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const superAdminNav: SidebarItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin' },
    { icon: Shield, label: 'Onboard Super Admin', path: '/superadmin/onboard-super' },
    { icon: Users, label: 'Onboard Admin', path: '/superadmin/onboard-admin' },
  ];

  const adminNav: SidebarItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: AlertTriangle, label: 'Local Emergencies', path: '/admin/emergencies' },
    { icon: UserPlus, label: 'Onboard Authority', path: '/admin/onboard-responder' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const founderNav: SidebarItem[] = [
    { icon: LayoutDashboard, label: 'Founders Dashboard', path: '/founder' },
  ];

  const navItems = role === 'founder' ? founderNav : role === 'superadmin' ? superAdminNav : adminNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-black text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-[#1f1f1f] flex flex-col z-20">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-[#1f1f1f]">
          <ShieldAlert className="w-6 h-6 text-white mr-3" />
          <span className="text-lg font-bold tracking-wide text-white">
            ACHIV <span className="text-gray-300">{role === 'founder' ? 'Founder' : role === 'superadmin' ? 'HQ' : 'Admin'}</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="text-xs font-semibold text-gray-500 mb-4 px-3 uppercase tracking-wider">
            Main Menu
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path + '/') && item.path !== '/superadmin' && item.path !== '/admin');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={
                  `flex items-center px-4 py-3 rounded-full transition-all duration-300 group ${
                    isActive
                      ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      : 'text-gray-400 hover:bg-[#1f1f1f] hover:text-gray-200'
                  }`
                }
              >
                <item.icon
                  className={`w-5 h-5 mr-3 ${
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                />
                <span className="font-medium text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#1f1f1f]">
          <button className="flex items-center px-4 py-2.5 text-gray-400 hover:text-gray-200 hover:bg-[#1f1f1f] rounded-full w-full transition-colors mb-1">
            <HelpCircle className="w-5 h-5 mr-3" />
            <span className="text-sm font-medium">Support</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full w-full transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-black">
        {/* Subtle neutral glow behind main content */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white/5 blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-[120px] pointer-events-none z-0"></div>

        {/* Topbar */}
        <header className="h-16 bg-black/70 backdrop-blur-md border-b border-[#1f1f1f] flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-[#111111] border border-[#1f1f1f] text-sm rounded-full pl-11 pr-4 py-2 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/50 transition-all placeholder:text-gray-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <NotificationBell />
            <div className="flex items-center space-x-3 pl-6 border-l border-[#1f1f1f] cursor-pointer group">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-600 to-zinc-800 flex items-center justify-center text-white font-medium group-hover:scale-105 transition-transform">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{user?.name || 'Administrator'}</p>
                <p className="text-[11px] text-gray-500 capitalize">{role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
