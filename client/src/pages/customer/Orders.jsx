import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
  design_submitted: { label: 'Design Submitted', color: 'bg-blue-100 text-blue-700', icon: '📝' },
  awaiting_quotation: { label: 'Awaiting Quotation', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  quotation_received: { label: 'Quotation Received', color: 'bg-orange-100 text-orange-700', icon: '💬' },
  awaiting_artisan_confirmation: { label: 'Awaiting Artisan Confirmation', color: 'bg-yellow-100 text-yellow-700', icon: '⌛' },
  order_confirmed: { label: 'Order Confirmed', color: 'bg-green-100 text-green-700', icon: '✅' },
  in_production: { label: 'In Production', color: 'bg-purple-100 text-purple-700', icon: '🔨' },
  quality_check: { label: 'Quality Check', color: 'bg-indigo-100 text-indigo-700', icon: '🔍' },
  ready_for_dispatch: { label: 'Ready for Dispatch', color: 'bg-teal-100 text-teal-700', icon: '📦' },
  shipped: { label: 'Shipped', color: 'bg-cyan-100 text-cyan-700', icon: '🚚' },
  delivered: { label: 'Delivered', color: 'bg-gray-100 text-gray-600', icon: '🎉' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600', icon: '❌' },
};

export default function Orders() {
  const { isArtisan } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-serif font-bold text-gray-800">My Orders</h1>

      <div className="flex gap-2 flex-wrap">
        {['all', 'awaiting_artisan_confirmation', 'in_production', 'order_confirmed', 'shipped', 'delivered'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === s ? 'bg-burgundy-500 text-white' : 'bg-white border border-cream-200 text-gray-600 hover:border-burgundy-200'}`}>
            {s === 'all' ? 'All Orders' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-cream-100" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Package size={40} className="text-cream-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No orders found</p>
          <Link to="/dream-studio" className="btn-primary text-sm">Create Your First Design</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const cfg = STATUS_CONFIG[o.status] || { label: o.status, color: 'bg-gray-100 text-gray-600', icon: '📦' };
            return (
              <Link key={o.id} to={`${isArtisan ? '/artisan/orders' : '/orders'}/${o.id}`} className="card flex items-center gap-4 hover:shadow-md transition-shadow group">
                <div className="text-2xl">{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 group-hover:text-burgundy-600 transition-colors truncate">{o.design_title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">by {o.artisan_name} · ₹{o.total_amount}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${cfg.color} hidden sm:inline-flex`}>{cfg.label}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
