import { Link } from 'react-router-dom';
import { Sparkles, Palette, MessageSquare, Package, ArrowRight, Wand2 } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const categories = [
  { name: 'Sarees', emoji: '🥻', desc: 'Handwoven silk & cotton' },
  { name: 'Jewellery', emoji: '💍', desc: 'Gold, silver & gemstones' },
  { name: 'Pottery', emoji: '🏺', desc: 'Terracotta & ceramic art' },
  { name: 'Clothing', emoji: '👗', desc: 'Custom embroidered wear' },
  { name: 'Handicrafts', emoji: '🎨', desc: 'Handmade home décor' },
  { name: 'Accessories', emoji: '👜', desc: 'Bags, scarves & more' },
];

const steps = [
  { icon: MessageSquare, title: 'Describe Your Dream', desc: 'Share the colors, materials, style, and details you have in mind.' },
  { icon: Sparkles, title: 'Share Your Inspiration', desc: 'Upload your own sketches, paintings, or reference images.' },
  { icon: Palette, title: 'Connect with Artisans', desc: 'Skilled artisans review your design and send personalized quotations.' },
  { icon: Package, title: 'Watch It Come Alive', desc: 'Track every step of the making process with photos and updates.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-cream-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" aria-label="DreamCraft home"><BrandLogo /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-gray-500">Interactive browser demo</span>
            <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/80 text-burgundy-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-rose-300 shadow-sm">
          <Wand2 size={14} /> Your imagination, made by hand
        </div>
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 mb-5 leading-tight">
          Imagine It. Design It.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-burgundy-500 to-plum-500">Create It.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
          Describe your dream product, share your own images or sketches, and meet skilled artisans who can bring your vision to life.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Demo data is saved only in this browser; sample customer and artisan accounts are ready to try.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register" className="btn-primary flex items-center gap-2 justify-center text-base px-7 py-3">
            Start Creating <ArrowRight size={18} />
          </Link>
          <Link to="/register?role=artisan" className="btn-secondary flex items-center gap-2 justify-center text-base px-7 py-3">
            Join as Artisan
          </Link>
        </div>
        <div className="mt-12 flex justify-center gap-3" aria-hidden="true">
          <span className="h-2 w-14 rounded-full bg-saffron-300" />
          <span className="h-2 w-8 rounded-full bg-rose-400" />
          <span className="h-2 w-14 rounded-full bg-lagoon-300" />
          <span className="h-2 w-8 rounded-full bg-plum-400" />
        </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-serif font-bold text-center text-gray-800 mb-8">What Can You Create?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(c => (
            <div key={c.name} className="card text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer hover:border-rose-300">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-saffron-100 via-rose-300 to-plum-400 text-3xl shadow-sm">{c.emoji}</div>
              <p className="font-semibold text-sm text-gray-800">{c.name}</p>
              <p className="text-xs text-gray-400 mt-1">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-serif font-bold text-center text-gray-800 mb-10">How DreamCraft Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="card text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${['bg-saffron-100 text-saffron-500', 'bg-rose-300 text-burgundy-700', 'bg-lagoon-100 text-lagoon-500', 'bg-plum-400 text-white'][i]}`}>
                  <s.icon size={24} />
                </div>
                <div className="text-xs font-bold text-burgundy-400 mb-1">STEP {i + 1}</div>
                <h3 className="font-semibold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-br from-burgundy-500 via-plum-500 to-lagoon-500 rounded-3xl p-12 text-white shadow-xl">
          <h2 className="text-3xl font-serif font-bold mb-4">Ready to Explore the DreamCraft Demo?</h2>
          <p className="text-burgundy-100 mb-8 text-lg">Try the customer and artisan flows in your browser. No backend account is needed.</p>
          <Link to="/register" className="bg-white text-burgundy-600 hover:bg-cream-100 px-8 py-3 rounded-xl font-semibold transition-colors inline-flex items-center gap-2">
            Start for Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-cream-200 py-6 text-center text-sm text-gray-400">
        © 2024 DreamCraft AI — Imagine It. Design It. Create It.
      </footer>
    </div>
  );
}
