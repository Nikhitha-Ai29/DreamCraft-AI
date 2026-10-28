import { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';

function RequestCard({ r, onQuote }) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState({ amount: '', estimated_days: '', notes: '' });
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/quotations', { design_request_id: r.id, ...quote });
      toast.success('Quotation sent!');
      setOpen(false);
      onQuote(r.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send quotation');
    } finally { setSending(false); }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-burgundy-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
          {r.category === 'Sarees' ? '🥻' : r.category === 'Jewellery' ? '💍' : '🎨'}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{r.title}</h3>
          <p className="text-xs text-gray-400">{r.category} · Budget: ₹{r.budget_min}–{r.budget_max}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2">{r.description}</p>
      {r.colors?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {r.colors.map(c => <span key={c} className="badge bg-cream-100 text-gray-600">{c}</span>)}
        </div>
      )}
      {r.reference_images?.length > 0 && (
        <div className="flex gap-2">
          {r.reference_images.slice(0, 3).map((url, i) => (
            <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
          ))}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="btn-secondary flex items-center gap-2 text-sm">
        <Send size={14} /> {open ? 'Cancel' : 'Send Quotation'}
      </button>
      {open && (
        <form onSubmit={submit} className="space-y-3 pt-3 border-t border-cream-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" required placeholder="2500"
                value={quote.amount} onChange={e => setQuote(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Delivery Days</label>
              <input className="input" type="number" required placeholder="14"
                value={quote.estimated_days} onChange={e => setQuote(p => ({ ...p, estimated_days: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Describe what's included..."
              value={quote.notes} onChange={e => setQuote(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full justify-center flex">
            {sending ? 'Sending...' : 'Send Quotation'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ArtisanRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quoted, setQuoted] = useState(new Set());

  useEffect(() => {
    api.get('/designs/explore').then(r => setRequests(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-burgundy-200 border-t-burgundy-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-serif font-bold text-gray-800">Open Design Requests</h1>
      {requests.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">No open requests at the moment</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {requests.filter(r => !quoted.has(r.id)).map(r => (
            <RequestCard key={r.id} r={r} onQuote={id => setQuoted(p => new Set([...p, id]))} />
          ))}
        </div>
      )}
    </div>
  );
}
