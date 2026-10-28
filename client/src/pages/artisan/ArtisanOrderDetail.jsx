import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Camera, CheckCircle } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const STATUSES = ['in_production','quality_check','ready_for_dispatch','shipped','delivered'];
const STAGES = ['design_confirmation','material_selection','crafting','finishing','final_reveal','ready_for_delivery'];

export default function ArtisanOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [story, setStory] = useState({ stage: '', caption: '' });
  const [files, setFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api.get(`/orders/${id}`).then(r => {
      setOrder(r.data);
      setNewStatus(r.data.status === 'order_confirmed' ? 'in_production' : r.data.status);
    })
      .catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async () => {
    try {
      const { data } = await api.put(`/orders/${id}/status`, { status: newStatus });
      setOrder(p => ({ ...p, status: data.status }));
      toast.success('Status updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const confirmOrder = async () => {
    setConfirming(true);
    try {
      const { data } = await api.put(`/orders/${id}/confirm`);
      setOrder(p => ({ ...p, status: data.status }));
      setNewStatus('in_production');
      toast.success('Order confirmed. The customer has been notified.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not confirm order');
    } finally {
      setConfirming(false);
    }
  };

  const postStory = async (e) => {
    e.preventDefault();
    if (!story.stage) return toast.error('Select a stage');
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('stage', story.stage);
      fd.append('caption', story.caption);
      files.forEach(f => fd.append('media', f));
      const { data } = await api.post(`/orders/${id}/production-update`, fd);
      setOrder(p => ({ ...p, production_updates: [...(p.production_updates || []), data] }));
      setStory({ stage: '', caption: '' });
      setFiles([]);
      toast.success('Making story posted!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post story');
    }
    finally { setPosting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-burgundy-200 border-t-burgundy-500 rounded-full animate-spin" /></div>;
  if (!order) return <div className="card text-center py-16 text-gray-500">Order not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link to="/artisan/orders" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-serif font-bold text-gray-800">{order.design_title}</h1>
      </div>

      {order.status === 'awaiting_artisan_confirmation' ? (
        <div className="card space-y-3">
          <div>
            <h2 className="font-semibold text-gray-700">Order Confirmation Requested</h2>
            <p className="text-sm text-gray-500 mt-1">
              The customer selected your quotation. Confirm this order before production can begin.
            </p>
          </div>
          <button onClick={confirmOrder} disabled={confirming}
            className="btn-primary inline-flex items-center gap-2">
            <CheckCircle size={16} /> {confirming ? 'Confirming...' : 'Confirm Order'}
          </button>
        </div>
      ) : (
        <>
          {/* Update Status */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-3">Update Order Status</h2>
            <div className="flex gap-3">
              <select className="input flex-1" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <button onClick={updateStatus} className="btn-primary">Update</button>
            </div>
          </div>

          {/* Post Making Story */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Camera size={16} className="text-burgundy-500" /> Post Making Story
            </h2>
            <form onSubmit={postStory} className="space-y-3">
              <select className="input" value={story.stage} onChange={e => setStory(p => ({ ...p, stage: e.target.value }))}>
                <option value="">Select production stage</option>
                {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <textarea className="input resize-none" rows={2} placeholder="Caption for this update..."
                value={story.caption} onChange={e => setStory(p => ({ ...p, caption: e.target.value }))} />
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-cream-300 rounded-xl p-3 hover:border-burgundy-300 transition-colors">
                <Upload size={16} className="text-gray-400" />
                <span className="text-sm text-gray-500">{files.length > 0 ? `${files.length} file(s) selected` : 'Upload photos or videos'}</span>
                <input type="file" multiple accept="image/*,video/*" className="hidden"
                  onChange={e => setFiles(Array.from(e.target.files))} />
              </label>
              <button type="submit" disabled={posting} className="btn-primary w-full justify-center flex">
                {posting ? 'Posting...' : 'Post Update'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Existing Stories */}
      {order.production_updates?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Posted Updates</h2>
          <div className="space-y-4">
            {order.production_updates.map(u => (
              <div key={u.id} className="border-l-2 border-burgundy-200 pl-4">
                <span className="badge bg-burgundy-50 text-burgundy-600 text-xs mb-1">{u.stage.replace(/_/g, ' ')}</span>
                {u.caption && <p className="text-sm text-gray-600 mt-1">{u.caption}</p>}
                {u.media_urls?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {u.media_urls.map((url, i) => (
                      u.media_type === 'video'
                        ? <video key={i} src={url} controls className="w-40 h-28 rounded-lg" />
                        : <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
