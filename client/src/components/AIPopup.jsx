import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import AIChat from '../pages/customer/AIChat';

export default function AIPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    document.addEventListener('open-ai-popup', handleOpen);
    return () => document.removeEventListener('open-ai-popup', handleOpen);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-burgundy-500 to-plum-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-burgundy-200 transition hover:scale-[1.02]"
      >
        <Sparkles size={16} />
        AI Assistant
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="relative h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-cream-100 text-gray-600 transition hover:bg-cream-200"
              aria-label="Close AI assistant"
            >
              <X size={18} />
            </button>
            <AIChat />
          </div>
        </div>
      )}
    </>
  );
}
