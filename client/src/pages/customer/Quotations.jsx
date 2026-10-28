import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, FileText } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const ORDER_STATUS_LABELS = {
  awaiting_artisan_confirmation: 'Waiting for artisan confirmation',
  order_confirmed: 'Order confirmed',
  in_production: 'In production',
  quality_check: 'Quality check',
  ready_for_dispatch: 'Ready for dispatch',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const navigate = useNavigate();

  const loadQuotations = () => api.get('/quotations')
    .then(({ data }) => setQuotations(data))
    .catch((err) => toast.error(err.response?.data?.error || 'Failed to load artisan quotes'))
    .finally(() => setLoading(false));

  useEffect(() => {
    loadQuotations();
  }, []);

  const requestOrder = async (quotation) => {
    setAcceptingId(quotation.id);
    try {
      const { data } = await api.put(`/quotations/${quotation.id}/accept`);
      toast.success('Order request sent to the selected artisan');
      navigate(`/orders/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not request this order');
      loadQuotations();
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-burgundy-200 border-t-burgundy-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-serif font-bold text-gray-800">Artisan Quotes</h1>
        <p className="text-sm text-gray-500 mt-1">Choose a quote to request an order from that artisan.</p>
      </div>

      {quotations.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={36} className="text-cream-300 mx-auto mb-3" />
          <p className="text-gray-500">No quotes yet. Artisans will send quotes for your open designs.</p>
          <Link to="/dream-studio" className="btn-primary inline-flex mt-4">Create a design</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {quotations.map((quote) => {
            const orderStatus = quote.order_status && ORDER_STATUS_LABELS[quote.order_status];
            const canRequest = quote.status === 'pending' && !quote.order_id;
            return (
              <article key={quote.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-800">{quote.design_title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Quote from <span className="font-medium text-gray-700">{quote.artisan_name}</span>
                      {quote.category ? ` · ${quote.category}` : ''}
                    </p>
                  </div>
                  <span className={`badge ${
                    quote.status === 'accepted' ? 'bg-green-50 text-green-700'
                      : quote.status === 'pending' ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {quote.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <span><span className="text-gray-400">Price:</span> ₹{quote.amount}</span>
                  <span><span className="text-gray-400">Estimated delivery:</span> {quote.estimated_days} days</span>
                </div>
                {quote.notes && <p className="text-sm text-gray-600">{quote.notes}</p>}
                {canRequest ? (
                  <button
                    type="button"
                    onClick={() => requestOrder(quote)}
                    disabled={acceptingId !== null}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    {acceptingId === quote.id ? 'Sending request...' : 'Select this artisan'}
                  </button>
                ) : quote.order_id ? (
                  <Link to={`/orders/${quote.order_id}`} className="btn-secondary inline-flex items-center gap-2">
                    <Clock size={16} /> {orderStatus || 'View order'}
                  </Link>
                ) : (
                  <p className="text-xs text-gray-400 capitalize">{quote.status}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
