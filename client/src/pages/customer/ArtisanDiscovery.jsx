import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, MapPin, Briefcase } from 'lucide-react';
import api from '../../api/client';

export default function ArtisanDiscovery() {
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ skill: '', category: '', available: '' });
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.skill) params.set('skill', filters.skill);
      if (filters.category) params.set('category', filters.category);
      if (filters.available) params.set('available', filters.available);
      const { data } = await api.get(`/artisans?${params}`);
      setArtisans(data);
    } catch { setArtisans([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const filtered = artisans.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.specializations?.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-serif font-bold text-gray-800">Find Artisans</h1>
        <p className="text-gray-500 text-sm mt-1">Discover skilled craftspeople for your custom products</p>
      </div>

      {/* Search & Filters */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search artisans, skills..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={filters.category}
          onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}>
          <option value="">All Categories</option>
          {['Sarees', 'Jewellery', 'Pottery', 'Clothing', 'Handicrafts'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input sm:w-36" value={filters.available}
          onChange={e => setFilters(p => ({ ...p, available: e.target.value }))}>
          <option value="">All</option>
          <option value="true">Available Now</option>
        </select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="card h-48 animate-pulse bg-cream-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase size={40} className="text-cream-300 mx-auto mb-3" />
          <p className="text-gray-500">No artisans found. Try different filters.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <Link key={a.id} to={`/artisans/${a.id}`} className="card hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-burgundy-100 flex items-center justify-center text-burgundy-600 font-bold text-lg flex-shrink-0">
                  {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" /> : a.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 group-hover:text-burgundy-600 transition-colors">{a.name}</h3>
                  {a.location && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{a.location}</p>}
                </div>
                <div className={`w-2.5 h-2.5 rounded-full mt-1 ${a.is_available ? 'bg-green-400' : 'bg-gray-300'}`} title={a.is_available ? 'Available' : 'Busy'} />
              </div>

              {a.specializations?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {a.specializations.slice(0, 3).map(s => (
                    <span key={s} className="badge bg-burgundy-50 text-burgundy-600">{s}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={14} fill="currentColor" />
                  <span className="font-medium">{a.rating || '—'}</span>
                  <span className="text-gray-400 text-xs">({a.total_orders} orders)</span>
                </div>
                {a.price_range_min && (
                  <span className="text-xs text-gray-500">
                    ₹{a.price_range_min}–{a.price_range_max}
                  </span>
                )}
              </div>

              {a.portfolio_preview?.length > 0 && (
                <div className="flex gap-1.5 mt-3">
                  {a.portfolio_preview.slice(0, 3).map((p, i) => (
                    <img key={i} src={p.media_url} alt="" className="w-14 h-14 object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
