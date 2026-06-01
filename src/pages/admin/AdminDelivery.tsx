import { useState, useEffect } from 'react';
import { Truck, MapPin, Plus, Trash2, Clock, DollarSign, Save, Loader2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';

export default function AdminDelivery() {
  const { currentRestaurant, deliverySettings } = useRestaurant();
  const [settings, setSettings] = useState(deliverySettings);
  const [loading, setLoading] = useState(false);
  const [newNeighborhood, setNewNeighborhood] = useState({ neighborhood: '', fee: 0 });

  useEffect(() => {
    if (deliverySettings) {
      setSettings(deliverySettings);
    }
  }, [deliverySettings]);

  const update = (field: string, value: any) => setSettings(s => ({ ...s, [field]: value }));

  const addNeighborhood = () => {
    if (!newNeighborhood.neighborhood) {
      toast.error('Informe o nome do bairro');
      return;
    }
    
    const updatedFees = [...(settings.feeByNeighborhood || []), { ...newNeighborhood }];
    update('feeByNeighborhood', updatedFees);
    setNewNeighborhood({ neighborhood: '', fee: 0 });
    toast.success('Bairro adicionado!');
  };

  const removeNeighborhood = (index: number) => {
    const updatedFees = settings.feeByNeighborhood.filter((_, i) => i !== index);
    update('feeByNeighborhood', updatedFees);
  };

  const handleSave = async () => {
    if (!currentRestaurant) return;
    
    setLoading(true);
    try {
      const restaurantRef = doc(db, 'restaurants', currentRestaurant.id);
      await updateDoc(restaurantRef, {
        deliverySettings: settings
      });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving delivery settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-black text-2xl text-[#111]">Configurações de Delivery</h2>
          <p className="text-gray-500">Gerencie Zero Taxa, áreas e tempos de entrega.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-[#111111] text-white font-black px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-[#222] transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Salvar alterações
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* General settings */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-bold text-[#111] mb-6 flex items-center gap-2">
              <Truck size={20} className="text-[#FFC928]" />
              Configurações gerais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-[#FFC928]">
                  <span className="text-sm font-medium text-[#111]">Delivery ativado</span>
                  <div
                    onClick={() => update('enabled', !settings.enabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${settings.enabled ? 'bg-[#FFC928]' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Zero Taxa fixa padrão (R$)</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={settings.fee}
                      onChange={e => update('fee', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Esta Zero Taxa será aplicada se o bairro não estiver configurado abaixo.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Pedido mínimo (R$)</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={settings.minimumOrder}
                      onChange={e => update('minimumOrder', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]"
                      placeholder="30.00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Tempo estimado (minutos)</label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={settings.estimatedTime}
                      onChange={e => update('estimatedTime', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]"
                      placeholder="45"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Raio de atendimento (km)</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={settings.radiusKm}
                      onChange={e => update('radiusKm', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Observações de entrega</label>
                  <input
                    type="text"
                    value={settings.observation}
                    onChange={e => update('observation', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]"
                    placeholder="Ex: Entregamos em condomínios apenas até a portaria"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fee by neighborhood */}
          <div className="bg-white rounded-2xl p-6">
            <div className="mb-6">
              <h3 className="font-bold text-[#111] flex items-center gap-2 mb-2">
                <MapPin size={20} className="text-[#FFC928]" />
                Zero Taxa por bairro
              </h3>
              <p className="text-xs text-gray-500 italic">Configure Zero Taxa específicas para bairros próximos ou distantes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
               <div className="md:col-span-7">
                  <input 
                    type="text" 
                    placeholder="Nome do bairro"
                    value={newNeighborhood.neighborhood}
                    onChange={e => setNewNeighborhood(prev => ({ ...prev, neighborhood: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFC928]"
                  />
               </div>
               <div className="md:col-span-3">
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="number" 
                      placeholder="Zero Taxa"
                      value={newNeighborhood.fee || ''}
                      onChange={e => setNewNeighborhood(prev => ({ ...prev, fee: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FFC928]"
                    />
                  </div>
               </div>
               <div className="md:col-span-2">
                  <button 
                    onClick={addNeighborhood}
                    className="w-full h-full bg-[#FFC928] text-[#111] font-black rounded-xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                  >
                    Add
                  </button>
               </div>
            </div>

            <div className="space-y-2">
              {settings.feeByNeighborhood && settings.feeByNeighborhood.length > 0 ? (
                settings.feeByNeighborhood.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#F5F5F5] rounded-xl group">
                    <div>
                      <p className="font-bold text-[#111] text-sm">{item.neighborhood}</p>
                      <p className="text-xs text-gray-400">Zero Taxa de entrega personalizada</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-[#111]">R$ {item.fee.toFixed(2)}</span>
                      <button 
                        onClick={() => removeNeighborhood(i)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 grayscale opacity-30">
                  <MapPin size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhum bairro configurado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#111111] rounded-2xl p-6 text-white shadow-xl border border-gray-800">
            <h3 className="font-bold text-[#FFC928] mb-4">Destaque sua entrega</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Restaurantes com Zero Taxa grátis para o bairro local ou pedidos acima de um valor X costumam vender até 40% mais.
            </p>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h4 className="text-xs font-black uppercase text-gray-500 mb-2">Dica do Meu Ovo</h4>
              <p className="text-xs text-gray-300 italic">"Combine uma Zero Taxa fixa baixa com um valor de pedido mínimo que garanta sua margem."</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-[#111] mb-4">Logística inteligente</h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">Em breve você poderá contratar entregadores via Meu Ovo através de parceiros como Lalamove e Loggi.</p>
            <div className="space-y-3">
              {['Loggi', 'Lalamove', 'Uber Direct'].map(p => (
                <div key={p} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 opacity-50">
                  <span className="text-sm font-bold text-gray-400">{p}</span>
                  <span className="text-[10px] font-black bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full uppercase">Indisponível</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
