import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Package, MessageSquare, Users, ArrowRight, Plus, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import AIPopup from '../../components/AIPopup';

const STATUS_COLORS = {
  design_submitted: 'bg-blue-100 text-blue-700',
  awaiting_quotation: 'bg-yellow-100 text-yellow-700',
  awaiting_artisan_confirmation: 'bg-yellow-100 text-yellow-700',
  order_confirmed: 'bg-green-100 text-green-700',
  in_production: 'bg-purple-100 text-purple-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/orders').catch(() => ({ data: [] })),
      api.get('/designs').catch(() => ({ data: [] })),
      api.get('/notifications').catch(() => ({ data: [] })),
    ]).then(([o, d, n]) => {
      setOrders(o.data.slice(0, 3));
      setDesigns(d.data.slice(0, 3));
      setNotifications(n.data.filter(n => !n.is_read).slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-burgundy-200 border-t-burgundy-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-burgundy-500 to-plum-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-serif font-bold mb-1">Welcome back, {user?.name?.split(' ')[0]}! ✨</h1>
        <p className="text-burgundy-100 text-sm">What will you create today?</p>
        <Link to="/dream-studio" className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <Sparkles size={16} /> Open Dream Studio
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Orders', value: orders.length, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Saved Designs', value: designs.length, icon: Sparkles, color: 'text-burgundy-500', bg: 'bg-burgundy-50' },
          { label: 'Notifications', value: notifications.length, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Messages', value: 0, icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Designs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-gray-800">Recent Designs</h2>
            <Link to="/dream-studio" className="text-xs text-burgundy-500 hover:underline flex items-center gap-1">
              <Plus size={12} /> New Design
            </Link>
          </div>
          {designs.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles size={32} className="text-cream-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No designs yet</p>
              <Link to="/dream-studio" className="btn-primary text-xs mt-3 inline-block">Create Your First Design</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {designs.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl">
                  <div className="w-10 h-10 bg-burgundy-100 rounded-lg flex items-center justify-center text-lg">
                    {d.category === 'Sarees' ? '🥻' : d.category === 'Jewellery' ? '💍' : '🎨'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-gray-400">{d.category || 'Uncategorized'}</p>
                  </div>
                  <span className={`badge ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-gray-800">Active Orders</h2>
            <Link to="/orders" className="text-xs text-burgundy-500 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <Package size={32} className="text-cream-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No orders yet</p>
              <Link to="/artisans" className="btn-secondary text-xs mt-3 inline-block">Find Artisans</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors">
                  <div className="w-10 h-10 bg-plum-100 rounded-lg flex items-center justify-center">
                    <Package size={18} className="text-plum-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.design_title}</p>
                    <p className="text-xs text-gray-400">by {o.artisan_name}</p>
                  </div>
                  <span className={`badge ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'} text-xs`}>
                    {o.status?.replace(/_/g, ' ')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="font-serif font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/dream-studio', icon: Sparkles, label: 'Dream Studio', color: 'bg-burgundy-50 text-burgundy-600' },
            { to: '/ai-chat', icon: MessageSquare, label: 'AI Assistant', color: 'bg-plum-50 text-plum-600' },
            { to: '/artisans', icon: Users, label: 'Find Artisans', color: 'bg-blue-50 text-blue-600' },
            { to: '/orders', icon: Package, label: 'Track Orders', color: 'bg-green-50 text-green-600' },
          ].map(a => (
            <Link key={a.to} to={a.to} className={`${a.color} p-4 rounded-xl flex flex-col items-center gap-2 hover:opacity-80 transition-opacity`}>
              <a.icon size={22} />
              <span className="text-xs font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <AIPopup />
    </div>
  );
}
