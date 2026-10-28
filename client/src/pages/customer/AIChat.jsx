import { useState, useEffect, useRef } from 'react';
import { Send, Plus, MessageSquare, Bot, User, Loader } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function AIChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/ai/conversations').then(r => setConversations(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const newConversation = async () => {
    try {
      const { data } = await api.post('/ai/conversations', { title: 'New Chat' });
      setConversations(p => [data, ...p]);
      setActiveConv(data);
      setMessages([]);
    } catch { toast.error('Failed to create conversation'); }
  };

  const loadConversation = async (conv) => {
    setActiveConv(conv);
    setLoading(true);
    try {
      const { data } = await api.get(`/ai/conversations/${conv.id}/messages`);
      setMessages(data);
    } catch { toast.error('Failed to load messages'); }
    finally { setLoading(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConv || sending) return;
    const content = input.trim();
    setInput('');
    setMessages(p => [...p, { id: Date.now(), role: 'user', content, created_at: new Date() }]);
    setSending(true);
    try {
      const { data } = await api.post(`/ai/conversations/${activeConv.id}/messages`, { content });
      setMessages(p => [...p, data]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to get response';
      const hint = err.response?.data?.hint;
      toast.error(hint ? `${msg}\n${hint}` : msg);
      setMessages(p => [...p, {
        id: Date.now(), role: 'assistant',
        content: hint ? `⚠️ ${msg}\n\n💡 ${hint}` : `⚠️ ${msg}`,
        created_at: new Date()
      }]);
    } finally {
      setSending(false);
    }
  };

  const suggestions = [
    'I want a handmade silk saree for my wedding',
    'Help me design custom gold jewellery',
    'I need a unique pottery set for gifting',
    'What materials are best for embroidered clothing?',
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-fade-in">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        <button onClick={newConversation} className="btn-primary flex items-center gap-2 justify-center">
          <Plus size={16} /> New Chat
        </button>
        <div className="card flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No conversations yet</p>
          )}
          {conversations.map(c => (
            <button key={c.id} onClick={() => loadConversation(c)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeConv?.id === c.id ? 'bg-burgundy-50 text-burgundy-600' : 'hover:bg-cream-100 text-gray-600'}`}>
              <div className="flex items-center gap-2">
                <MessageSquare size={14} />
                <span className="truncate">{c.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 card flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cream-200 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-burgundy-500 to-plum-500 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">DreamCraft AI Assistant</p>
            <p className="text-xs text-gray-400">Local demo assistant · replies are simulated</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConv && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot size={48} className="text-cream-300 mb-4" />
              <h3 className="font-serif font-semibold text-gray-700 mb-2">DreamCraft AI Assistant</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-sm">I help you design custom products, choose materials, and connect with the right artisans.</p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {suggestions.map(s => (
                  <button key={s} onClick={async () => {
                    const conv = await api.post('/ai/conversations', { title: s.slice(0, 40) });
                    setConversations(p => [conv.data, ...p]);
                    setActiveConv(conv.data);
                    setMessages([]);
                    setInput(s);
                  }} className="text-left text-sm bg-cream-50 hover:bg-cream-100 border border-cream-200 rounded-xl px-4 py-2.5 text-gray-600 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && <div className="flex justify-center"><Loader size={20} className="animate-spin text-burgundy-400" /></div>}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-burgundy-100' : 'bg-gradient-to-br from-burgundy-500 to-plum-500'}`}>
                {m.role === 'user' ? <User size={14} className="text-burgundy-600" /> : <Bot size={14} className="text-white" />}
              </div>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-burgundy-500 text-white rounded-tr-sm' : 'bg-cream-100 text-gray-800 rounded-tl-sm'}`}>
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-burgundy-500 to-plum-500 flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-cream-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {activeConv && (
          <form onSubmit={sendMessage} className="p-4 border-t border-cream-200 flex gap-2">
            <input className="input flex-1" placeholder="Describe your dream product..." value={input}
              onChange={e => setInput(e.target.value)} disabled={sending} />
            <button type="submit" disabled={sending || !input.trim()} className="btn-primary px-4">
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
