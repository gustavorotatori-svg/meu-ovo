import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Bot, Phone, CheckCircle2, Clock, ArrowRight, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { WhatsAppConversation } from '../../types/whatsapp';
import AdminLayout from './AdminLayout';
import SEO from '../../components/SEO';

const STATE_LABELS: Record<string, string> = {
  greeting: 'Saudação',
  browsing: 'Navegando',
  ordering: 'Pedindo',
  confirming: 'Confirmando',
  completed: 'Concluído',
};

const STATE_COLORS: Record<string, string> = {
  greeting: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  browsing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  ordering: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  confirming: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

export default function AdminWhatsAppAI() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem('meuovo_restaurant');
    let restaurantId: string | null = null;
    if (cached) {
      try { restaurantId = JSON.parse(cached).id; } catch {}
    }

    if (!restaurantId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'whatsapp_conversations'),
      where('restaurantId', '==', restaurantId),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: WhatsAppConversation[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as WhatsAppConversation);
      });
      setConversations(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const activeToday = conversations.filter((c) => {
    if (!c.updatedAt) return false;
    const updated = (c.updatedAt as unknown as Timestamp)?.toDate?.() ?? new Date(c.updatedAt);
    const today = new Date();
    return updated.toDateString() === today.toDateString();
  }).length;

  const pending = conversations.filter((c) => c.state !== 'completed').length;
  const completed = conversations.filter((c) => c.state === 'completed').length;

  const formatTime = (ts: string | Timestamp | undefined) => {
    if (!ts) return '';
    const d = (ts instanceof Timestamp) ? ts.toDate() : new Date(ts as string);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const lastMessage = (c: WhatsAppConversation) => {
    if (!c.messages || c.messages.length === 0) return '';
    const last = c.messages[c.messages.length - 1];
    return last.text.length > 80 ? last.text.slice(0, 80) + '...' : last.text;
  };

  return (
    <AdminLayout>
      <SEO title="WhatsApp AI - Admin" description="Monitoramento de conversas WhatsApp com IA" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">WhatsApp AI</h1>
            <p className="text-sm text-gray-400">Monitoramento de conversas com Dona Ova</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><MessageSquare size={16} className="text-[#FFC928]" /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-black text-white">{conversations.length}</p>
            <p className="text-[10px] text-gray-500 mt-1">conversas no total</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><Clock size={16} className="text-blue-400" /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Hoje</span>
            </div>
            <p className="text-2xl font-black text-white">{activeToday}</p>
            <p className="text-[10px] text-gray-500 mt-1">ativas hoje</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><Bot size={16} className="text-orange-400" /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Pendentes</span>
            </div>
            <p className="text-2xl font-black text-white">{pending}</p>
            <p className="text-[10px] text-gray-500 mt-1">aguardando conclusão</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-400" /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Concluídas</span>
            </div>
            <p className="text-2xl font-black text-white">{completed}</p>
            <p className="text-[10px] text-gray-500 mt-1">com pedido fechado</p>
          </motion.div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <MessageSquare size={14} /> Conversas Recentes
            </h3>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-zinc-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm font-bold">Nenhuma conversa ainda</p>
              <p className="text-gray-600 text-[10px] mt-1">As conversas aparecerão aqui quando clientes interagirem com a Dona Ova</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <motion.div key={conv.id} layout className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-zinc-800/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                      <Phone size={16} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-white truncate">{conv.customerName || conv.customerPhone}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${STATE_COLORS[conv.state] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                          {STATE_LABELS[conv.state] || conv.state}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{lastMessage(conv)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-600">{formatTime(conv.updatedAt)}</p>
                      <p className="text-[9px] text-gray-700 mt-0.5">{conv.customerPhone}</p>
                    </div>
                    <div className="text-gray-600 shrink-0">
                      {expandedId === conv.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedId === conv.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-zinc-800">
                        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                          {conv.messages?.length === 0 ? (
                            <p className="text-gray-600 text-xs text-center py-4">Nenhuma mensagem registrada</p>
                          ) : (
                            conv.messages?.map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === 'customer' ? 'bg-zinc-800 border border-zinc-700' : 'bg-[#FFC928]/10 border border-[#FFC928]/20'}`}>
                                  <p className="text-[10px] font-black text-gray-500 mb-1 uppercase tracking-widest">{msg.role === 'customer' ? 'Cliente' : msg.role === 'assistant' ? 'Dona Ova' : 'Sistema'}</p>
                                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{msg.text}</p>
                                  <p className="text-[9px] text-gray-600 mt-1">{formatTime(msg.timestamp)}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {conv.cart && conv.cart.length > 0 && (
                          <div className="border-t border-zinc-800 p-4 bg-zinc-800/20">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">🛒 Carrinho</p>
                            <div className="space-y-1.5">
                              {conv.cart.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs text-gray-400">
                                  <span>{item.quantity}x {item.productName}</span>
                                  {item.notes && <span className="text-[10px] text-gray-600">({item.notes})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {conv.orderId && (
                          <div className="border-t border-zinc-800 p-4 bg-zinc-800/20 flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pedido #{conv.orderId.slice(0, 8)}</span>
                            <a href={`/admin/pedidos`} className="text-[10px] font-black text-[#FFC928] flex items-center gap-1 hover:opacity-80">
                              Ver pedido <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-[#FFC928]/10 via-[#FFC928]/5 to-transparent border border-[#FFC928]/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFC928]/20 flex items-center justify-center shrink-0">
              <Bot size={18} className="text-[#FFC928]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white mb-1">Dona Ova — IA do WhatsApp</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                A Dona Ova atende seus clientes automaticamente pelo WhatsApp, tira dúvidas do cardápio, 
                anota pedidos e confirma antes de enviar para a cozinha. As conversas aparecem em tempo real aqui.
              </p>
              <p className="text-[10px] text-gray-500 mt-2">
                Para conectar, configure o provedor WhatsApp nas Configurações da loja.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}