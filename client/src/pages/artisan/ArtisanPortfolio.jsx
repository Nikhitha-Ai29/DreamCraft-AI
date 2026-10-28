import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ArtisanPortfolio() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', category: '' });
  const [file, setFile] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadPortfolio = async () => {
    try {
      const { data } = await api.get('/auth/me');
      // Fetch artisan profile with portfolio
      const artisan = await api.get(`/artisans/${data.id}`);
      setItems(artisan.data.portfolio || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPortfolio(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a media file');
    setAdding(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('media', file);
      const { data } = await api.post('/artisans/portfolio', fd);
      setItems(p => [data, ...p]);
      setForm({ title: '', description: '', category: '' });
      setFile(null);
      setShowForm(false);
      toast.success('Portfolio item added!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add item');
    } finally { setAdding(false); }
  };

  const deleteItem = async (id) => {
    try {
      await api.delete(`/artisans/portfolio/${id}`);
      setItems(p => p.filter(i => i.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-gray-800">My Portfolio</h1>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Add Portfolio Item</h2>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Title *</label>
              <input className="input" required placeholder="e.g. Handwoven Banarasi Saree"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="">Select category</option>
                {['Sarees', 'Jewellery', 'Pottery', 'Clothing', 'Handicrafts', 'Accessories'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} placeholder="Describe this piece..."
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Photo or Video *</label>
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-cream-300 rounded-xl p-4 hover:border-burgundy-300 transition-colors">
                <Upload size={18} className="text-gray-400" />
                <span className="text-sm text-gray-500">{file ? file.name : 'Choose image or video'}</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={e => setFile(e.target.files[0])} />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={adding} className="btn-primary flex-1 justify-center flex">
                {adding ? 'Adding...' : 'Add to Portfolio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-cream-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 mb-4">No portfolio items yet</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Item</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="group relative rounded-2xl overflow-hidden bg-cream-100 aspect-square">
              {item.media_type === 'video'
                ? <video src={item.media_url} className="w-full h-full object-cover" />
                : <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
              }
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <p className="text-white font-semibold text-sm">{item.title}</p>
                {item.category && <p className="text-white/70 text-xs">{item.category}</p>}
              </div>
              <button onClick={() => deleteItem(item.id)}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
