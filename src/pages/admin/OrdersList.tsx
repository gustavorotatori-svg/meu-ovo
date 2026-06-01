import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order } from '../../types';
import { toast } from 'react-hot-toast';
import { cn, formatCurrency } from '../../lib/utils';
import { Button } from '../../components/Button';
import { Clock, MapPin, Phone, ChefHat, Bike, CheckCircle, Smartphone, Package, XCircle, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '../../components/Skeleton';

export default function OrdersList() {
  const { currentRestaurant: restaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'preparing' | 'delivery' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;

    setLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', restaurant.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [restaurant]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status,
        updatedAt: new Date().toISOString()
      });
      toast.success('Status atualizado!');
    } catch (e) {
      toast.error('Erro ao atualizar status');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return o.status === 'received';
    if (activeTab === 'preparing') return o.status === 'preparing' || o.status === 'ready';
    if (activeTab === 'delivery') return o.status === 'out-for-delivery' || o.status === 'out_for_delivery';
    if (activeTab === 'completed') return o.status === 'finished' || o.status === 'completed' || o.status === 'cancelled';
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="w-48 h-8" />
            <Skeleton className="w-32 h-3" />
          </div>
          <Skeleton className="w-full sm:w-64 h-10 rounded-lg" />
        </div>
        <div className="grid gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-full h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received': return <Clock size={12} />;
      case 'preparing': return <ChefHat size={12} />;
      case 'ready': return <Package size={12} />;
      case 'out-for-delivery':
      case 'out_for_delivery': return <Bike size={12} />;
      case 'finished':
      case 'completed': return <CheckCircle size={12} />;
      case 'cancelled': return <XCircle size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-700';
      case 'preparing': return 'bg-yellow-100 text-yellow-700';
      case 'ready': return 'bg-emerald-100 text-emerald-700';
      case 'out-for-delivery':
      case 'out_for_delivery': return 'bg-purple-100 text-purple-700';
      case 'finished':
      case 'completed': return 'bg-gray-100 text-gray-600';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'received': return 'Recebido';
      case 'preparing': return 'Em Preparo';
      case 'ready': return 'Pronto';
      case 'out-for-delivery':
      case 'out_for_delivery': return 'Saiu p/ Entrega';
      case 'finished':
      case 'completed': return 'Finalizado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">Gestão de Pedidos</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acompanhe e despache suas vendas</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
           {(['all', 'pending', 'preparing', 'delivery', 'completed'] as const).map(tab => (
             <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5",
                activeTab === tab ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
              )}
             >
                {tab === 'all' ? 'Todos' : tab === 'pending' ? 'Recebido' : tab === 'preparing' ? 'Em Preparo' : tab === 'delivery' ? 'Em Entrega' : 'Finalizado'}
               
               {orders.filter(o => {
                  if (tab === 'all') return true;
                  if (tab === 'pending') return o.status === 'received';
                  if (tab === 'preparing') return o.status === 'preparing' || o.status === 'ready';
                  if (tab === 'delivery') return o.status === 'out-for-delivery' || o.status === 'out_for_delivery';
                  if (tab === 'completed') return o.status === 'finished' || o.status === 'completed';
                  return false;
               }).length > 0 && (
                 <span className={cn(
                   "px-1.5 py-0.5 rounded-md text-[9px]",
                   activeTab === tab ? "bg-white text-slate-900" : "bg-orange-500 text-white"
                 )}>
                   {orders.filter(o => {
                      if (tab === 'all') return true;
                      if (tab === 'pending') return o.status === 'received';
                      if (tab === 'preparing') return o.status === 'preparing' || o.status === 'ready';
                      if (tab === 'delivery') return o.status === 'out-for-delivery' || o.status === 'out_for_delivery';
                      if (tab === 'completed') return o.status === 'finished' || o.status === 'completed';
                      return false;
                   }).length}
                 </span>
               )}
             </button>
           ))}
        </div>
      </div>

      <div className="grid gap-3">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row group transition-all duration-200 hover:border-slate-300">
            {/* Order Info */}
            <div className="p-4 flex-1 space-y-3">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full",
                     order.status === 'received' ? "bg-blue-500 animate-pulse" :
                     order.status === 'preparing' ? "bg-orange-500" :
                     order.status === 'ready' ? "bg-blue-600" :
                     (order.status === 'out-for-delivery' || order.status === 'out_for_delivery') ? "bg-purple-500" : "bg-green-500"
                   )} />
                   <div>
                     <div className="flex flex-wrap items-center gap-2">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">PEDIDO #{order.id.slice(-6).toUpperCase()}</p>
                       <span className={cn(
                         "text-[9px] px-2 py-0.5 rounded-lg font-black uppercase flex items-center gap-1",
                         getStatusColor(order.status)
                       )}>
                         {getStatusIcon(order.status)}
                         {getStatusLabel(order.status)}
                       </span>
                       <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-500 uppercase">{order.type}</span>
                     </div>
                     <p className="font-extrabold text-slate-900 tracking-tight leading-tight mt-1">{order.customerName}</p>
                   </div>
                 </div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {order.createdAt ? format(new Date(order.createdAt), "HH:mm", { locale: ptBR }) : '-'}
                 </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pb-3 border-b border-slate-50">
                 <div className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                    <Smartphone size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <p>{order.customerPhone}</p>
                 </div>
                 <div className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <p className="truncate">{order.type === 'table' ? `Mesa ${order.tableNumber}` : order.address || 'Retirada no Balcão'}</p>
                 </div>
              </div>

              <div className="space-y-1.5">
                 {order.items.map((item, i) => (
                   <div key={i} className="space-y-0.5">
                     <div className="flex justify-between items-center text-xs">
                        <p className="text-slate-800 font-medium">
                          <span className="font-black text-orange-600 mr-2">{item.quantity}x</span>
                          {item.productName || item.name}
                        </p>
                        <p className="text-slate-400 font-bold tracking-tighter">{formatCurrency(item.unitPrice * item.quantity)}</p>
                     </div>
                     {item.observations && (
                       <div className={cn(
                         "ml-6 px-2 py-1 rounded-md text-[10px] font-bold border",
                         (item.observations.toLowerCase().includes('alerg') || item.observations.toLowerCase().includes('restric') || item.observations.toLowerCase().includes('sem'))
                           ? "bg-red-50 border-red-100 text-red-600"
                           : "bg-orange-50 border-orange-100 text-orange-600"
                       )}>
                         <span className="opacity-70 uppercase mr-1">Obs:</span> {item.observations}
                       </div>
                     )}
                   </div>
                 ))}
              </div>

              {order.observations && (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mt-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações do Pedido</p>
                  <p className="text-xs text-slate-700 font-medium">{order.observations}</p>
                </div>
              )}
            </div>

            {/* Actions & Total */}
            <div className="bg-slate-50 p-4 flex flex-row md:flex-col items-center justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 w-full md:w-48">
               <div className="text-right md:text-center w-full">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Total Pago</p>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(order.total)}</p>
               </div>
               
               <div className="flex md:flex-col gap-2 shrink-0 md:w-full">
                 {order.status === 'received' && (
                   <Button onClick={() => updateStatus(order.id, 'preparing')} size="sm" className="w-full">
                      Aceitar
                   </Button>
                 )}
                 
                 {order.status === 'preparing' && (
                   <Button onClick={() => updateStatus(order.id, 'ready')} size="sm" className="w-full">
                      Pronto
                   </Button>
                 )}
                 
                 {order.status === 'ready' && (
                   <Button onClick={() => updateStatus(order.id, order.type === 'delivery' ? 'out-for-delivery' : 'finished')} size="sm" className="w-full">
                      {order.type === 'delivery' ? 'Expedir' : 'Finalizar'}
                   </Button>
                 )}
                 
                 {(order.status === 'out-for-delivery' || order.status === 'out_for_delivery') && (
                   <Button onClick={() => updateStatus(order.id, 'finished')} size="sm" className="w-full">
                      Entregue
                   </Button>
                 )}

                 {order.status !== 'finished' && order.status !== 'completed' && order.status !== 'cancelled' && (
                   <Button variant="ghost" onClick={() => updateStatus(order.id, 'cancelled')} size="sm" className="text-red-500 hover:bg-red-50 text-[10px]">
                      RECUSAR
                   </Button>
                 )}
                 
                 {(order.status === 'finished' || order.status === 'completed') && (
                   <div className="bg-green-100 text-green-700 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle size={12} /> CONCLUÍDO
                   </div>
                 )}
               </div>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-100 shadow-inner">
             <div className="bg-slate-50 p-4 rounded-full inline-block mb-3">
               <ClipboardList className="h-8 w-8 text-slate-200" />
             </div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fila de pedidos vazia</p>
          </div>
        )}
      </div>
    </div>
  );
}
