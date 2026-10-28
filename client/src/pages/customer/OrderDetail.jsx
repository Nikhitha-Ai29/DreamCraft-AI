import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Image } from 'lucide-react';
import api from '../../api/client';

const STAGES = [
  'design_submitted','awaiting_quotation','quotation_received',
  'awaiting_artisan_confirmation','order_confirmed','in_production',
  'quality_check','ready_for_dispatch','shipped','delivered',
];

const STATUS_CONFIG = {
  awaiting_artisan_confirmation: 'Awaiting Artisan Confirmation',
  design_submitted: 'Design Submitted', awaiting_quotation: 'Awaiting Quotation',
  quotation_received: 'Quotation Received',
  order_confirmed: 'Order Confirmed', in_production: 'In Production',
  quality_check: 'Quality Check', ready_for_dispatch: 'Ready for Dispatch',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`).then(r => setOrder(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-burgundy-200 border-t-burgundy-500 rounded-full animate-spin" /></div>;
  if (!order) return <div className="card text-center py-16 text-gray-500">Order not found</div>;

  const currentIdx = STAGES.indexOf(order.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link to="/orders" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-serif font-bold text-gray-800">{order.design_title}</h1>
      </div>

      {/* Status Timeline */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Order Progress</h2>
        <div className="space-y-3">
          {STAGES.map((stage, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={stage} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${done ? 'bg-burgundy-500 text-white' : 'bg-cream-200 text-gray-400'} ${active ? 'ring-4 ring-burgundy-100' : ''}`}>
                  {done ? '✓' : i + 1}
                </div>
                <div className={`flex-1 text-sm ${active ? 'font-semibold text-burgundy-600' : done ? 'text-gray-600' : 'text-gray-300'}`}>
                  {STATUS_CONFIG[stage]}
                </div>
                {active && <span className="badge bg-burgundy-50 text-burgundy-600 text-xs animate-pulse-soft">Current</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="font-semibold">₹{order.total_amount}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Artisan</span><span>{order.artisan_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Category</span><span>{order.category || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Ordered</span><span>{new Date(order.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">Design Details</h3>
          <p className="text-sm text-gray-600 line-clamp-4">{order.design_description}</p>
          {order.reference_images?.length > 0 && (
            <div className="flex gap-2 mt-3">
              {order.reference_images.slice(0, 3).map((url, i) => (
                <img key={i} src={url} alt="" className="w-14 h-14 object-cover rounded-lg" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Production Updates / Making Stories */}
      {order.production_updates?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Image size={16} className="text-burgundy-500" /> Making Stories
          </h2>
          <div className="space-y-4">
            {order.production_updates.map(u => (
              <div key={u.id} className="border-l-2 border-burgundy-200 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge bg-burgundy-50 text-burgundy-600 text-xs">{u.stage.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</span>
                </div>
                {u.caption && <p className="text-sm text-gray-600 mb-2">{u.caption}</p>}
                {u.media_urls?.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {u.media_urls.map((url, i) => (
                      u.media_type === 'video'
                        ? <video key={i} src={url} controls className="w-40 h-28 object-cover rounded-lg" />
                        : <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        to={order.conversation_id ? `/messages?conversation=${encodeURIComponent(order.conversation_id)}` : '/messages'}
        className="btn-secondary flex items-center gap-2 justify-center"
      >
        <MessageSquare size={16} /> Message Artisan
      </Link>
    </div>
  );
}
