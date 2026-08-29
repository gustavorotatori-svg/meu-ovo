import { useState } from 'react';
import { QrCode, Smartphone, Users, ChevronRight, Printer, Share2, Plus, X, Edit2, Trash2, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { Table } from '../../types';

export default function AdminWaiter() {
  const { currentRestaurant, tables, addTable, updateTable, deleteTable } = useRestaurant();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showQrModal, setShowQrModal] = useState<Table | null>(null);
  const [isEditing, setIsEditing] = useState<Table | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [tableForm, setTableForm] = useState({ number: '', active: true });

  const openAdd = () => {
    setTableForm({ number: '', active: true });
    setIsAdding(true);
  };

  const openEdit = (table: Table) => {
    setTableForm({ number: table.number, active: table.active });
    setIsEditing(table);
  };

  const handleSave = () => {
    if (!tableForm.number) return;

    // Check if table number is unique
    const isDuplicate = tables.some(t => 
      t.number.toLowerCase() === tableForm.number.toLowerCase() && 
      (!isEditing || t.id !== isEditing.id)
    );

    if (isDuplicate) {
      alert('Já existe uma mesa com este número!');
      return;
    }

    if (isAdding) {
      addTable({
        id: `t${Date.now()}`,
        restaurantId: currentRestaurant!.id,
        number: tableForm.number,
        active: tableForm.active,
        status: tableForm.active ? 'free' : 'occupied',
        qrCodeUrl: `${window.location.origin}/r/${currentRestaurant?.slug}?mesa=${tableForm.number}`,
      });
      setIsAdding(false);
    } else if (isEditing) {
      updateTable({
        ...isEditing,
        number: tableForm.number,
        active: tableForm.active,
        status: tableForm.active ? 'free' : 'occupied',
        qrCodeUrl: `${window.location.origin}/r/${currentRestaurant?.slug}?mesa=${tableForm.number}`,
      });
      setIsEditing(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta mesa?')) {
      deleteTable(id);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="font-black text-2xl text-[#111]">Modo Garçom</h2>
        <p className="text-gray-500">Gerencie mesas e pedidos presenciais via QR Code.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-white rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-[#111] flex items-center gap-2">
              <Users size={20} className="text-[#FFC928]" />
              Gestão de Mesas
            </h3>
            <button 
              onClick={openAdd}
              className="text-[#FFC928] font-bold text-sm flex items-center gap-1 hover:underline"
            >
              <Plus size={16} /> Adicionar mesa
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tables.map(table => (
              <div
                key={table.id}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${table.active ? 'border-[#FFC928] bg-[#FFF8E1]' : 'border-red-200 bg-red-50'}`}
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-black text-[#111] shadow-sm flex-shrink-0">
                  {table.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#111]">Mesa {table.number}</p>
                  <p className="text-xs text-gray-500">{table.active ? 'Livre' : 'Ocupada'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => updateTable({ ...table, active: !table.active, status: !table.active ? 'free' : 'occupied' })}
                    className={`p-2 transition-colors ${table.active ? 'text-green-500' : 'text-gray-400'}`}
                    aria-label="Alternar disponibilidade"
                  >
                    {table.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button 
                    onClick={() => setShowQrModal(table)}
                    className="p-2 text-gray-400 hover:text-[#111] transition-colors"
                    aria-label="Exibir QR Code"
                  >
                    <QrCode size={18} />
                  </button>
                  <button 
                    onClick={() => openEdit(table)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    aria-label="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(table.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#111111] rounded-2xl p-6 text-white">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <QrCode size={20} className="text-[#FFC928]" />
              Vantagens do QR Code
            </h3>
            <ul className="space-y-3">
              {[
                'Garçom foca no atendimento, não em anotar pedido',
                'Zero erros de comunicação com a cozinha',
                'Cliente pede e paga sem esperar',
                'Cardápio atualizado em tempo real',
              ].map((txt, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300 leading-tight">
                  <div className="w-1.5 h-1.5 bg-[#FFC928] rounded-full mt-1.5 flex-shrink-0" />
                  {txt}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#FF7A00] rounded-2xl p-6 text-white text-center">
            < Smartphone size={32} className="mx-auto mb-3" />
            <h3 className="font-black text-xl mb-2">Meu Ovo Admin App</h3>
            <p className="text-white/80 text-sm mb-6">Acompanhe pedidos, feche contas e chame o garçom pelo celular.</p>
            <button className="w-full bg-white text-[#FF7A00] font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
              Instalar Web App <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="QR Code da mesa">
          <div role="presentation" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQrModal(null)} />
          <div className={`relative rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl ${isDark ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white'}`}>
            <button onClick={() => setShowQrModal(null)} aria-label="Fechar" className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}><X size={20} /></button>
            <h3 className={`font-black text-2xl mb-2 ${isDark ? 'text-white' : 'text-[#111]'}`}>Mesa {showQrModal.number}</h3>
            <p className="text-gray-500 text-sm mb-6">Imprima este QR Code e coloque na mesa para os clientes fazerem pedidos diretos.</p>
            <div className={`rounded-3xl mx-auto mb-8 p-4 flex items-center justify-center ${isDark ? 'bg-white' : 'bg-white border-4 border-[#F5F5F5]'}`}>
              <QRCodeCanvas
                id={`waiter-qr-${showQrModal.number}`}
                value={showQrModal.qrCodeUrl || `${window.location.origin}/r/${currentRestaurant?.slug}?mesa=${showQrModal.number}`}
                size={180}
                bgColor="#FFFFFF"
                fgColor="#111111"
                level="M"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 bg-[#111111] text-white font-bold py-3 rounded-xl hover:bg-[#222] border border-gray-700"
              >
                <Printer size={18} /> Imprimir
              </button>
              <button className={`flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-colors ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-[#F5F5F5] text-[#111] hover:bg-gray-200'}`}>
                <Share2 size={18} /> Compartilhar
              </button>
            </div>
            <p className="mt-6 text-xs text-blue-500 break-all">{showQrModal.qrCodeUrl}</p>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || isEditing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Adicionar ou editar item">
          <div role="presentation" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsAdding(false); setIsEditing(null); }} />
          <div className={`relative rounded-3xl w-full max-w-md p-8 shadow-2xl ${isDark ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white'}`}>
            <h3 className={`font-black text-2xl mb-6 ${isDark ? 'text-white' : 'text-[#111]'}`}>{isAdding ? 'Nova Mesa' : 'Editar Mesa'}</h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-gray-500 block mb-2 uppercase tracking-wider">Número da Mesa</label>
                <input 
                  type="text" 
                  value={tableForm.number}
                  onChange={e => setTableForm(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="Ex: 01, VIP-A, etc"
                  className={`w-full border-2 border-transparent focus:border-[#FFC928] rounded-2xl px-5 py-4 font-bold outline-none transition-all ${isDark ? 'bg-gray-800 text-white' : 'bg-[#F5F5F5] text-[#111]'}`}
                  autoFocus
                />
              </div>

              <div className={`flex items-center justify-between p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-[#F5F5F5]'}`}>
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-[#111]'}`}>Status da Mesa</p>
                  <p className="text-xs text-gray-400">{tableForm.active ? 'Livre (Disponível)' : 'Ocupada (Indisponível)'}</p>
                </div>
                <button 
                  onClick={() => setTableForm(prev => ({ ...prev, active: !prev.active }))}
                  className={`transition-colors h-8 w-14 rounded-full relative flex items-center px-1 ${tableForm.active ? 'bg-[#FFC928]' : 'bg-gray-600'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform ${tableForm.active ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => { setIsAdding(false); setIsEditing(null); }}
                  className={`flex-1 font-bold py-4 rounded-2xl transition-colors ${isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-[#111111] text-white font-bold py-4 rounded-2xl hover:bg-[#222] transition-colors flex items-center justify-center gap-2 border border-gray-700"
                >
                  <Check size={20} />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
