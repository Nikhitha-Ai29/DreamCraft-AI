import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Camera, Save } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', bio: '', location: '' });
  const [artisanForm, setArtisanForm] = useState({
    specializations: [], skills: [], experience_years: '', price_range_min: '', price_range_max: '', is_available: true, portfolio_description: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(r => {
      const d = r.data;
      setForm({ name: d.name || '', phone: d.phone || '', bio: d.bio || '', location: d.location || '' });
      if (d.role === 'artisan') {
        setArtisanForm({
          specializations: d.specializations || [],
          skills: d.skills || [],
          experience_years: d.experience_years || '',
          price_range_min: d.price_range_min || '',
          price_range_max: d.price_range_max || '',
          is_available: d.is_available ?? true,
          portfolio_description: d.portfolio_description || '',
        });
      }
    }).catch(() => {});
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/profile', form);
      if (user?.role === 'artisan') {
        await api.put('/artisans/profile', artisanForm);
      }
      toast.success('Profile updated!');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads/single', fd);
      await api.put('/auth/profile', { avatar_url: data.url });
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    }
    finally { setUploading(false); }
  };

  const toggleTag = (field, val, setter) => setter(p => ({
    ...p, [field]: p[field].includes(val) ? p[field].filter(x => x !== val) : [...p[field], val]
  }));

  const SPECIALIZATIONS = ['Sarees', 'Jewellery', 'Pottery', 'Clothing', 'Handicrafts', 'Accessories', 'Home Decor'];
  const SKILLS = ['Weaving', 'Embroidery', 'Goldsmithing', 'Pottery', 'Woodwork', 'Leatherwork', 'Beadwork', 'Dyeing'];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <h1 className="text-2xl font-serif font-bold text-gray-800">Profile & Settings</h1>

      <form onSubmit={saveProfile} className="space-y-4">
        {/* Avatar */}
        <div className="card flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-burgundy-100 flex items-center justify-center text-burgundy-600 font-bold text-2xl overflow-hidden">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user?.name?.[0]?.toUpperCase()}
            </div>
            <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-burgundy-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-burgundy-600">
              <Camera size={12} />
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
            </label>
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.name}</p>
            <p className="text-sm text-gray-400 capitalize">{user?.role} · {user?.email}</p>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Basic Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+91 9876543210" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" placeholder="City, State" value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input resize-none" rows={3} placeholder="Tell us about yourself..."
              value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
          </div>
        </div>

        {user?.role === 'artisan' && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-700">Artisan Profile</h2>
            <div>
              <label className="label">Specializations</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map(s => (
                  <button key={s} type="button" onClick={() => toggleTag('specializations', s, setArtisanForm)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${artisanForm.specializations.includes(s) ? 'bg-burgundy-500 text-white border-burgundy-500' : 'border-cream-300 text-gray-600'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Skills</label>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(s => (
                  <button key={s} type="button" onClick={() => toggleTag('skills', s, setArtisanForm)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${artisanForm.skills.includes(s) ? 'bg-plum-500 text-white border-plum-500' : 'border-cream-300 text-gray-600'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Experience (years)</label>
                <input className="input" type="number" value={artisanForm.experience_years}
                  onChange={e => setArtisanForm(p => ({ ...p, experience_years: e.target.value }))} />
              </div>
              <div>
                <label className="label">Min Price (₹)</label>
                <input className="input" type="number" value={artisanForm.price_range_min}
                  onChange={e => setArtisanForm(p => ({ ...p, price_range_min: e.target.value }))} />
              </div>
              <div>
                <label className="label">Max Price (₹)</label>
                <input className="input" type="number" value={artisanForm.price_range_max}
                  onChange={e => setArtisanForm(p => ({ ...p, price_range_max: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="available" checked={artisanForm.is_available}
                onChange={e => setArtisanForm(p => ({ ...p, is_available: e.target.checked }))}
                className="w-4 h-4 accent-burgundy-500" />
              <label htmlFor="available" className="text-sm text-gray-700">Available for new orders</label>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center flex gap-2">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
