import { useState } from 'react';
import { Sparkles, Send, Save, Image, X } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const CATEGORIES = ['Sarees', 'Jewellery', 'Clothing', 'Pottery', 'Handicrafts', 'Accessories', 'Home Decor', 'Other'];
const COLORS = ['Red', 'Blue', 'Green', 'Gold', 'Silver', 'Pink', 'Purple', 'White', 'Black', 'Multicolor'];
const MATERIALS = ['Silk', 'Cotton', 'Wool', 'Gold', 'Silver', 'Clay', 'Wood', 'Leather', 'Brass', 'Gemstones'];
const STYLES = ['Traditional', 'Modern', 'Fusion', 'Minimalist', 'Bohemian', 'Royal', 'Rustic'];

export default function DreamStudio() {
  const [form, setForm] = useState({
    title: '', description: '', category: '', budget_min: '', budget_max: '',
    colors: [], materials: [], style: '', pattern: '',
  });
  const [saving, setSaving] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState(null);
  const [refImages, setRefImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const toggle = (field, val) => setForm(p => ({
    ...p, [field]: p[field].includes(val) ? p[field].filter(x => x !== val) : [...p[field], val]
  }));

  const saveDesign = async () => {
    if (!form.title || !form.description) return toast.error('Add a title and description first');
    setSaving(true);
    try {
      const design = {
        ...form,
        budget_min: form.budget_min || null,
        budget_max: form.budget_max || null,
        reference_images: refImages,
        status: 'draft',
      };
      const { data } = savedDesignId
        ? await api.put(`/designs/${savedDesignId}`, design)
        : await api.post('/designs', design);
      setSavedDesignId(data.id);
      toast.success('Design saved!');
      return data.id;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleRefImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (refImages.length + files.length > 10) {
      toast.error('You can upload up to 10 design images');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const { data } = await api.post('/uploads/multiple', fd);
      setRefImages(p => [...p, ...data.map(f => f.url)]);
      toast.success('Images uploaded');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const sendToArtisans = async () => {
    const id = await saveDesign();
    if (!id) return;
    try {
      await api.put(`/designs/${id}`, { status: 'open' });
      toast.success('Design sent to artisans! Check quotations soon.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send design to artisans');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="text-burgundy-500" size={24} /> Dream Studio
        </h1>
        <p className="text-gray-500 text-sm mt-1">Describe your dream product and share your design idea with artisans</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="label">Design Title</label>
              <input className="input" placeholder="e.g. Bridal Silk Saree with Gold Zari" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Describe Your Dream Product *</label>
              <textarea className="input min-h-[100px] resize-none" placeholder="Describe in detail — the look, feel, occasion, and any specific requirements..."
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Min Budget (₹)</label>
                <input className="input" type="number" placeholder="500" value={form.budget_min}
                  onChange={e => setForm(p => ({ ...p, budget_min: e.target.value }))} />
              </div>
              <div>
                <label className="label">Max Budget (₹)</label>
                <input className="input" type="number" placeholder="5000" value={form.budget_max}
                  onChange={e => setForm(p => ({ ...p, budget_max: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="label">Colors</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => toggle('colors', c)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${form.colors.includes(c) ? 'bg-burgundy-500 text-white border-burgundy-500' : 'border-cream-300 text-gray-600 hover:border-burgundy-300'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Materials</label>
              <div className="flex flex-wrap gap-2">
                {MATERIALS.map(m => (
                  <button key={m} type="button" onClick={() => toggle('materials', m)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${form.materials.includes(m) ? 'bg-plum-500 text-white border-plum-500' : 'border-cream-300 text-gray-600 hover:border-plum-300'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Style</label>
                <select className="input" value={form.style} onChange={e => setForm(p => ({ ...p, style: e.target.value }))}>
                  <option value="">Select style</option>
                  {STYLES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Pattern</label>
                <input className="input" placeholder="e.g. Floral, Geometric" value={form.pattern}
                  onChange={e => setForm(p => ({ ...p, pattern: e.target.value }))} />
              </div>
            </div>
          </div>

        </div>

        {/* Right: Dream Image */}
        <div className="space-y-4">
          <div className="card min-h-[400px]">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Image size={16} className="text-burgundy-500" /> Upload Your Dream Image
            </h3>
            <label className="min-h-64 flex flex-col items-center justify-center gap-3 cursor-pointer border-2 border-dashed border-cream-300 rounded-xl p-6 hover:border-burgundy-300 transition-colors">
              <Image size={32} className="text-cream-400" />
              <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Choose an image to upload'}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleRefImageUpload} disabled={uploading} />
            </label>
            <p className="text-xs text-gray-500 mt-3">
              Upload images of the design you imagine, including your own sketches or paintings, to help artisans bring your idea to life.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Demo uploads stay in this browser; each image must be 750 KB or smaller.
            </p>
            {refImages.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {refImages.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative">
                    <img src={url} alt={`Dream design upload ${i + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                    <button type="button" aria-label="Remove uploaded image" onClick={() => setRefImages(p => p.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={saveDesign} disabled={saving}
              className="btn-secondary flex items-center gap-2 flex-1 justify-center">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Design'}
            </button>
            <button onClick={sendToArtisans} disabled={saving || uploading}
              className="btn-primary flex items-center gap-2 flex-1 justify-center">
              <Send size={16} /> Send to Artisans
            </button>
          </div>

          {savedDesignId && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
              ✅ Design saved! You can send it to artisans for quotations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
