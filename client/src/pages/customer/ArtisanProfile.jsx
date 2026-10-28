import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, MessageSquare, Star } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ArtisanProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artisan, setArtisan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    api.get(`/artisans/${id}`)
      .then(({ data }) => setArtisan(data))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load artisan profile'))
      .finally(() => setLoading(false));
  }, [id]);

  const messageArtisan = async () => {
    setStartingChat(true);
    try {
      const { data } = await api.post('/chat/conversations', { artisan_id: id });
      navigate(`/messages?conversation=${encodeURIComponent(data.id)}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not start a conversation');
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-burgundy-200 border-t-burgundy-500 rounded-full animate-spin" /></div>;
  if (!artisan) return <div className="card text-center py-16 text-gray-500">Artisan profile not found</div>;

  const portfolio = Array.isArray(artisan.portfolio) ? artisan.portfolio : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <Link to="/artisans" className="btn-ghost inline-flex items-center gap-2">
        <ArrowLeft size={16} /> Back to artisans
      </Link>

      <section className="card">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-burgundy-100 flex items-center justify-center text-burgundy-600 font-bold text-3xl overflow-hidden flex-shrink-0">
            {artisan.avatar_url
              ? <img src={artisan.avatar_url} alt="" className="w-full h-full object-cover" />
              : artisan.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-serif font-bold text-gray-800">{artisan.name}</h1>
              <span className={`badge ${artisan.is_available ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {artisan.is_available ? 'Available for requests' : 'Currently busy'}
              </span>
            </div>
            {artisan.location && <p className="text-sm text-gray-500 mt-2 flex items-center gap-1"><MapPin size={14} />{artisan.location}</p>}
            <div className="flex items-center gap-1 text-amber-500 mt-2 text-sm">
              <Star size={15} fill="currentColor" />
              <span>{artisan.rating || 'No ratings yet'}</span>
              <span className="text-gray-400">· {artisan.total_orders || 0} orders</span>
            </div>
            {artisan.portfolio_description && <p className="text-gray-600 mt-4">{artisan.portfolio_description}</p>}
            {artisan.bio && <p className="text-sm text-gray-500 mt-3">{artisan.bio}</p>}
          </div>
          <button onClick={messageArtisan} disabled={startingChat} className="btn-primary flex items-center justify-center gap-2">
            <MessageSquare size={16} /> {startingChat ? 'Opening chat...' : 'Message artisan'}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-cream-200">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Specializations</p>
            <div className="flex flex-wrap gap-2">
              {(artisan.specializations || []).length
                ? artisan.specializations.map((item) => <span key={item} className="badge bg-burgundy-50 text-burgundy-600">{item}</span>)
                : <span className="text-sm text-gray-400">Not specified</span>}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Skills</p>
            <div className="flex flex-wrap gap-2">
              {(artisan.skills || []).length
                ? artisan.skills.map((item) => <span key={item} className="badge bg-cream-100 text-gray-600">{item}</span>)
                : <span className="text-sm text-gray-400">Not specified</span>}
            </div>
          </div>
          <div className="text-sm text-gray-600">Experience: {artisan.experience_years || 0} years</div>
          <div className="text-sm text-gray-600">
            Typical range: {artisan.price_range_min || artisan.price_range_max
              ? `₹${artisan.price_range_min || 0}–${artisan.price_range_max || '—'}`
              : 'Contact artisan for pricing'}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-serif font-bold text-gray-800 mb-4">Portfolio</h2>
        {portfolio.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">This artisan has not added portfolio items yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolio.map((item) => (
              <article key={item.id} className="card p-3">
                {item.media_type === 'video'
                  ? <video src={item.media_url} controls className="w-full aspect-square object-cover rounded-xl" />
                  : <img src={item.media_url} alt={item.title || 'Artisan portfolio item'} className="w-full aspect-square object-cover rounded-xl" />}
                <h3 className="font-semibold mt-3">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
