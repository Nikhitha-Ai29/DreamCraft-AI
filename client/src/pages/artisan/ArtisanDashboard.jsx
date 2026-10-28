import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, BookOpen, Star, TrendingUp, ArrowRight, Plus, ChevronRight, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import AIPopup from '../../components/AIPopup';

export default function ArtisanDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/orders').catch(() => ({ data: [] })),
      api.get('/designs/explore').catch(() => ({ data: [] })),
      api.get('/quotations').catch(() => ({ data: [] })),
    ]).then(([o, r, q]) => {
      setOrders(o.data.slice(0, 5));
      setRequests(r.data.slice(0, 5));
      setQuotations(q.data.slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-burgundy-200 border-t-burgundy-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-gradient-to-r from-plum-600 to-burgundy-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-serif font-bold mb-1">Welcome, {user?.name?.split(' ')[0]}! 🎨</h1>
        <p className="text-plum-100 text-sm">Manage your craft business</p>
        <Link to="/artisan/portfolio" className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Add Portfolio Item
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Orders', value: orders.filter(o => !['delivered','cancelled'].includes(o.status)).length, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Open Requests', value: requests.length, icon: BookOpen, color: 'text-burgundy-500', bg: 'bg-burgundy-50' },
          { label: 'Quotations Sent', value: quotations.length, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Total Orders', value: orders.length, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
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
        {/* Open Design Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-gray-800">Open Design Requests</h2>
            <Link to="/artisan/requests" className="text-xs text-burgundy-500 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No open requests right now</p>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <Link key={r.id} to={`/artisan/requests/${r.id}`} className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors">
                  <div className="w-10 h-10 bg-burgundy-100 rounded-lg flex items-center justify-center text-lg">
                    {r.category === 'Sarees' ? '🥻' : r.category === 'Jewellery' ? '💍' : '🎨'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.category} · Budget: ₹{r.budget_min}–{r.budget_max}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-gray-800">Active Orders</h2>
            <Link to="/artisan/orders" className="text-xs text-burgundy-500 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No active orders</p>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <Link key={o.id} to={`/artisan/orders/${o.id}`} className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors">
                  <div className="w-10 h-10 bg-plum-100 rounded-lg flex items-center justify-center">
                    <Package size={18} className="text-plum-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.design_title}</p>
                    <p className="text-xs text-gray-400">by {o.customer_name} · ₹{o.total_amount}</p>
                  </div>
                  <span className="badge bg-purple-100 text-purple-700 text-xs">{o.status?.replace(/_/g,' ')}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-semibold text-gray-800">AI Assistant</h2>
          <Link to="/ai-chat" className="text-xs text-burgundy-500 hover:underline flex items-center gap-1">
            Open chat <ArrowRight size={12} />
          </Link>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-cream-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-burgundy-500 to-plum-500 rounded-xl flex items-center justify-center text-white">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Ask the DreamCraft AI assistant</p>
              <p className="text-xs text-gray-500">Get design suggestions, pricing advice, and crafting tips.</p>
            </div>
          </div>
          <button type="button" onClick={() => document.dispatchEvent(new CustomEvent('open-ai-popup'))} className="btn-primary text-xs px-3 py-2">
            Launch
          </button>
        </div>
      </div>

      <AIPopup />
    </div>
  );
}


