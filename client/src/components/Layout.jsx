import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import {
  Home, Sparkles, MessageSquare, Users, Package,
  Settings, LogOut, Menu, Bell, Palette, BookOpen, FileText
} from 'lucide-react';

const customerNav = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/dream-studio', icon: Sparkles, label: 'Dream Studio' },
  { to: '/ai-chat', icon: MessageSquare, label: 'AI Assistant' },
  { to: '/artisans', icon: Users, label: 'Find Artisans' },
  { to: '/orders', icon: Package, label: 'My Orders' },
  { to: '/quotations', icon: FileText, label: 'Artisan Quotes' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/profile', icon: Settings, label: 'Profile' },
];

const artisanNav = [
  { to: '/artisan/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/artisan/requests', icon: BookOpen, label: 'Design Requests' },
  { to: '/artisan/orders', icon: Package, label: 'My Orders' },
  { to: '/artisan/portfolio', icon: Palette, label: 'Portfolio' },
  { to: '/artisan/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/artisan/profile', icon: Settings, label: 'Profile' },
];

export default function Layout({ children }) {
  const { user, logout, isArtisan } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const nav = isArtisan ? artisanNav : customerNav;

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="flex h-screen bg-cream-50 overflow-hidden">
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-cream-200 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-cream-200 relative">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo compact />
          </Link>
          <div className="absolute inset-x-5 bottom-0 h-px brand-gradient" />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}
              className={`sidebar-link ${location.pathname === to ? 'active' : ''}`}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-cream-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-burgundy-100 flex items-center justify-center text-burgundy-600 font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-cream-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={22} className="text-gray-600" />
          </button>
          <Link to="/" className="lg:hidden">
            <BrandLogo compact />
          </Link>
          <div className="hidden lg:block h-1 w-20 rounded-full brand-gradient" />
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-cream-100 transition-colors">
              <Bell size={20} className="text-gray-600" />
            </button>
            <div className="w-8 h-8 rounded-full bg-burgundy-100 flex items-center justify-center text-burgundy-600 font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            Browser demo · Data stays on this device and is not shared with other users.
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
