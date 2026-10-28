import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import { Eye, EyeOff, User, Palette, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';
import BrandLogo from '../../components/BrandLogo';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = getCountries()
  .map((region) => ({
    region,
    callingCode: getCountryCallingCode(region),
    name: regionNames.of(region) || region,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function Register() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: params.get('role') || 'customer' });
  const [country, setCountry] = useState('IN');
  const [mobileNumber, setMobileNumber] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const parsedPhone = parsePhoneNumberFromString(mobileNumber, country);
  const phone = parsedPhone?.isValid() ? parsedPhone.number : '';

  const submit = async (e) => {
    e.preventDefault();
    if (!phone) return toast.error('Enter a valid mobile number for the selected country');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, phone });
      login(data.token, data.user);
      toast.success(`Welcome to DreamCraft, ${data.user.name}!`);
      navigate(data.user.role === 'artisan' ? '/artisan/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <BrandLogo />
          </Link>
          <h1 className="text-2xl font-serif font-bold text-gray-800">Create your account</h1>
        </div>

        <div className="card">
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { value: 'customer', icon: User, label: 'Customer', desc: 'Design & order products' },
              { value: 'artisan', icon: Palette, label: 'Artisan', desc: 'Create & sell crafts' },
            ].map(r => (
              <button key={r.value} type="button" onClick={() => set('role', r.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${form.role === r.value ? 'border-burgundy-400 bg-burgundy-50' : 'border-cream-200 hover:border-cream-300'}`}>
                <r.icon size={18} className={form.role === r.value ? 'text-burgundy-500' : 'text-gray-400'} />
                <p className="font-semibold text-sm mt-1">{r.label}</p>
                <p className="text-xs text-gray-400">{r.desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="Your name" required
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" required
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="mobile-number">Mobile Number</label>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2">
                <select
                  className="input"
                  aria-label="Country and calling code"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {countries.map((item) => (
                    <option key={item.region} value={item.region}>
                      +{item.callingCode} {item.name}
                    </option>
                  ))}
                </select>
                <input
                  id="mobile-number"
                  className="input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="Mobile number"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Select your country, then enter your mobile number.</p>
              {phone && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Phone size={12} /> Number with country code: {phone}
                </p>
              )}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={show ? 'text' : 'password'} placeholder="Min 6 characters" required
                  value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-burgundy-500 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
