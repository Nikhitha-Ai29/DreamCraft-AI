import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, Send } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const activeConvRef = useRef(null);
  const requestedConversationRef = useRef(searchParams.get('conversation'));

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data } = await api.get('/chat/conversations');
        if (active) setConversations(data);
        const selected = activeConvRef.current;
        if (active && selected) {
          const result = await api.get(`/chat/conversations/${selected.id}/messages`);
          if (active) setMessages(result.data);
        }
      } catch {
        if (active) toast.error('Failed to refresh conversations');
      }
    };
    refresh();
    const interval = window.setInterval(refresh, 2500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (conv) => {
    setActiveConv(conv);
    setMessages([]);
    try {
      const { data } = await api.get(`/chat/conversations/${conv.id}/messages`);
      setMessages(data);
      setConversations((current) => current.map((item) => item.id === conv.id ? { ...item, unread_count: 0 } : item));
    } catch { toast.error('Failed to load messages'); }
  };

  useEffect(() => {
    const requestedId = requestedConversationRef.current;
    if (!requestedId || !conversations.length) return;
    const requested = conversations.find((conversation) => String(conversation.id) === requestedId);
    if (requested) {
      requestedConversationRef.current = null;
      openConversation(requested);
    }
  }, [conversations]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConv || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const { data } = await api.post(`/chat/conversations/${activeConv.id}/messages`, { content });
      setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data]);
      setConversations((current) => current.map((conversation) => conversation.id === activeConv.id
        ? { ...conversation, last_message: data.content, last_message_at: data.created_at }
        : conversation));
    } catch (err) {
      setInput(content);
      toast.error(err.response?.data?.error || 'Failed to send message');
    }
    finally { setSending(false); }
  };

  const otherName = (conv) => user?.role === 'artisan' ? conv.customer_name : conv.artisan_name;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-fade-in">
      {/* Conversations list */}
      <div className="w-72 flex-shrink-0 card p-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-cream-200">
          <h2 className="font-serif font-semibold text-gray-800">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No conversations yet</p>
          ) : conversations.map(c => (
            <button key={c.id} onClick={() => openConversation(c)}
              className={`w-full text-left p-4 border-b border-cream-100 hover:bg-cream-50 transition-colors ${activeConv?.id === c.id ? 'bg-burgundy-50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-burgundy-100 flex items-center justify-center text-burgundy-600 font-semibold flex-shrink-0">
                  {otherName(c)?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{otherName(c)}</p>
                  <p className="text-xs text-gray-400 truncate">{c.last_message || 'No messages yet'}</p>
                  {c.latest_order_id && (
                    <p className="text-xs text-burgundy-500 truncate mt-1">
                      Order: {c.latest_order_title || c.latest_order_status?.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                {c.unread_count > 0 && (
                  <span className="w-5 h-5 bg-burgundy-500 text-white text-xs rounded-full flex items-center justify-center">
                    {c.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 card p-0 overflow-hidden flex flex-col">
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Send size={24} className="text-cream-300" />
              </div>
              <p className="text-gray-400 text-sm">Select a conversation to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-cream-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-burgundy-100 flex items-center justify-center text-burgundy-600 font-semibold">
                {(user?.role === 'artisan' ? activeConv.customer_name : activeConv.artisan_name)?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{user?.role === 'artisan' ? activeConv.customer_name : activeConv.artisan_name}</p>
                {activeConv.order_status && <p className="text-xs text-gray-400">Order: {activeConv.order_status?.replace(/_/g, ' ')}</p>}
                {activeConv.latest_order_id && (
                  <Link
                    to={`${user?.role === 'artisan' ? '/artisan/orders' : '/orders'}/${activeConv.latest_order_id}`}
                    className="text-xs text-burgundy-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    <Package size={12} />
                    {activeConv.latest_order_title || 'View latest order'} · {activeConv.latest_order_status?.replace(/_/g, ' ')}
                  </Link>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {m.media_url && (
                        m.media_type === 'image'
                          ? <img src={m.media_url} alt="" className="max-w-xs rounded-xl" />
                          : m.media_type === 'video'
                          ? <video src={m.media_url} controls className="max-w-xs rounded-xl" />
                          : <a href={m.media_url} className="text-blue-500 text-sm underline">Attachment</a>
                      )}
                      {m.content && (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-burgundy-500 text-white rounded-tr-sm' : 'bg-cream-100 text-gray-800 rounded-tl-sm'}`}>
                          {m.content}
                        </div>
                      )}
                      <span className="text-xs text-gray-300">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-cream-200 flex gap-2">
              <input className="input flex-1" placeholder="Type a message..." value={input}
                onChange={e => setInput(e.target.value)} disabled={sending} />
              <button type="submit" disabled={sending || !input.trim()} className="btn-primary px-4">
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
