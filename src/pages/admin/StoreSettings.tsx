import React, { useState, useRef, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '../../components/Button';
import { toast } from 'react-hot-toast';
import { QrCode as QrIcon, Copy, Settings, Store, Truck, MapPin, Phone, Plus, Trash2, Clock, Download, Volume2, Printer, Zap, Smartphone, XCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Skeleton } from '../../components/Skeleton';
import { cn } from '../../lib/utils';
import AdminLayout from './AdminLayout';

export default function StoreSettings() {
  const { currentRestaurant: restaurant } = useRestaurant();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);
  
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [printerSettings, setPrinterSettings] = useState({
    paperWidth: '80mm',
    fontSize: 'medium',
    numCopies: 1,
    autoPrintNew: false,
    showAddress: true,
    showComments: true,
    customHeader: '',
    customFooter: 'Obrigado pela preferência!',
  });

  useEffect(() => {
    const saved = localStorage.getItem('meuovo_printer_settings');
    if (saved) {
      try {
        setPrinterSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing printer settings:', e);
      }
    }
  }, []);

  const savePrinterSettings = (newSettings: typeof printerSettings) => {
    localStorage.setItem('meuovo_printer_settings', JSON.stringify(newSettings));
    setPrinterSettings(newSettings);
    toast.success('Configurações da impressora salvas localmente!');
    setIsPrinterModalOpen(false);
  };

  const printTestReceipt = (settings: typeof printerSettings) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast.error('Ative as permissões de popups para esta página para poder imprimir o teste!');
      return;
    }

    const testHtml = `
      <html>
        <head>
          <title>TESTE DE IMPRESSÃO</title>
          <style>
            @page { size: auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: ${settings.fontSize === 'small' ? '9px' : settings.fontSize === 'large' ? '13px' : '11px'}; 
              line-height: 1.3; 
              padding: 2mm; 
              text-transform: uppercase; 
              width: ${settings.paperWidth === '58mm' ? '48mm' : '72mm'};
              margin: 0 auto;
              background: #fff;
              color: #000;
            }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .section { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
            .total { font-weight: bold; font-size: 1.25em; margin-top: 8px; border-top: 1px double #000; padding-top: 4px; }
            .watermark { opacity: 0.5; font-size: 8px; text-align: center; margin-top: 15px; border-top: 1px dotted #000; padding-top: 5px; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            ${settings.customHeader ? `<h3 style="margin: 0; font-size: 1.1em;">${settings.customHeader}</h3>` : ''}
            <h2 style="margin: 3px 0;">${restaurant?.name || 'TESTE DE LOJA'}</h2>
            <p style="margin: 3px 0;">*** TESTE DE IMPRESSORA TÉRMICA ***</p>
            <p style="margin: 3px 0;">LARGURA BOBINA: ${settings.paperWidth}</p>
            <p style="margin: 0;">${new Date().toLocaleString('pt-BR')}</p>
          </div>
          <div class="section">
            <p style="font-weight: bold; margin: 3px 0 5px 0;">ITENS DE TESTE</p>
            <div class="item-row">
              <span>1x COCA-COLA LATA</span>
              <span>R$ 6.00</span>
            </div>
            ${settings.showComments ? '<div style="font-size: 0.9em; margin-left: 8px; margin-bottom: 5px;">* OBS: GELADA, COM LIMÃO</div>' : ''}
            <div class="item-row">
              <span>2x HAMBÚRGUER DUPLO DA CASA</span>
              <span>R$ 58.00</span>
            </div>
            <div style="font-size: 0.9em; margin-left: 8px; margin-bottom: 5px;">+ ADICIONAL BACON, QUEIJO PRATO</div>
          </div>
          ${settings.showAddress ? `
            <div class="section" style="font-size: 0.95em;">
              <strong>ENDEREÇO DE ENTREGA:</strong><br/>
              RUA DOS ANUNCIANTES, 123 - VISTA MARAVILHA
            </div>
          ` : ''}
          <div style="text-align: right; margin-top: 5px; font-size: 0.95em;">
            SUBTOTAL: R$ 64.00<br/>
            TAXA: R$ 5.00
          </div>
          <div class="total">
            TOTAL: R$ 69.00
          </div>
          <div style="text-align: center; margin-top: 8px; font-size: 0.95em;">
            VIAS (COPIAS): ${settings.numCopies}x<br/>
            AUTO-PRINT: ${settings.autoPrintNew ? 'ATIVADO' : 'DESATIVADO'}
          </div>
          ${settings.customFooter ? `<p style="text-align: center; font-size: 0.9em; margin-top: 10px; border-top: 1px dotted #000; padding-top: 5px;">${settings.customFooter}</p>` : ''}
          <div class="watermark">MEU OVO IMPRESSÃO TÉRMICA</div>
        </body>
      </html>
    `;

    printWindow.document.write(testHtml);
    printWindow.document.close();
  };

  useEffect(() => {
    if (restaurant) {
      setInitialLoading(false);
    }
  }, [restaurant]);

  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    description: restaurant?.description || '',
    address: restaurant?.address || '',
    whatsapp: restaurant?.whatsapp || '',
    cuisineType: restaurant?.cuisineType || '',
    priceRange: restaurant?.priceRange || 'low',
    deliveryEnabled: restaurant?.deliveryEnabled ?? true,
    pickupEnabled: restaurant?.pickupEnabled ?? true,
    dineInEnabled: restaurant?.dineInEnabled ?? true,
    deliveryFee: restaurant?.deliverySettings?.fee || 0,
    estimatedTime: restaurant?.deliverySettings?.estimatedTime || '',
    minOrder: restaurant?.deliverySettings?.minOrder || 0,
    feeByNeighborhood: restaurant?.deliverySettings?.feeByNeighborhood || [] as { neighborhood: string, fee: number }[],
    // New Order Settings
    autoAccept: restaurant?.orderSettings?.autoAccept ?? false,
    soundAlert: restaurant?.orderSettings?.soundAlert ?? true,
    thermalPrinterEnabled: restaurant?.orderSettings?.thermalPrinterEnabled ?? false,
    whatsappNotificationsEnabled: restaurant?.orderSettings?.whatsappNotificationsEnabled ?? false,
    whatsappWebhookUrl: restaurant?.orderSettings?.whatsappWebhookUrl || '',
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);

    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        whatsapp: formData.whatsapp,
        cuisineType: formData.cuisineType,
        priceRange: formData.priceRange,
        deliveryEnabled: formData.deliveryEnabled,
        pickupEnabled: formData.pickupEnabled,
        dineInEnabled: formData.dineInEnabled,
        deliverySettings: {
          fee: parseFloat(formData.deliveryFee.toString()),
          estimatedTime: formData.estimatedTime,
          minOrder: parseFloat(formData.minOrder.toString()),
          feeByNeighborhood: formData.feeByNeighborhood
        },
        orderSettings: {
          autoAccept: formData.autoAccept,
          soundAlert: formData.soundAlert,
          thermalPrinterEnabled: formData.thermalPrinterEnabled,
          whatsappNotificationsEnabled: formData.whatsappNotificationsEnabled,
          whatsappWebhookUrl: formData.whatsappWebhookUrl,
        }
      });
      toast.success('Configurações atualizadas!');
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const downloadQrCode = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qrcode-${restaurant?.slug}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    toast.success('Baixando QR Code...');
  };

  const copyMenuLink = () => {
    const url = `${window.location.origin}/m/${restaurant?.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const menuUrl = `${window.location.origin}/m/${restaurant?.slug}`;

  if (initialLoading) {
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="w-48 h-8" />
              <Skeleton className="w-32 h-3" />
            </div>
            <Skeleton className="w-32 h-8 rounded-lg" />
          </div>
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <Skeleton className="w-full h-96 rounded-xl" />
              <Skeleton className="w-full h-64 rounded-xl" />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <Skeleton className="w-full h-80 rounded-xl" />
              <Skeleton className="w-full h-40 rounded-xl" />
            </div>
          </div>
        </div>
        {/* Thermal Printer Settings Modal */}
     {isPrinterModalOpen && (
       <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
         <div className="bg-white rounded-3xl border-2 border-slate-100 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
           <div className="flex items-center justify-between pb-3 border-b border-slate-100">
             <div className="flex items-center gap-2">
               <Printer className="text-orange-500" size={24} />
               <div>
                 <h3 className="text-lg font-black text-brand-black tracking-tight uppercase italic text-orange-600">Configurar Impressora</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ajuste seu layout térmico</p>
               </div>
             </div>
             <button 
               type="button" 
               onClick={() => setIsPrinterModalOpen(false)}
               className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
             >
               <XCircle size={20} />
             </button>
           </div>

           <div className="space-y-4 text-left">
             {/* Paper Width */}
             <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Largura da Bobina</label>
               <div className="grid grid-cols-2 gap-3">
                 <button
                   type="button"
                   onClick={() => setPrinterSettings({...printerSettings, paperWidth: '80mm'})}
                   className={cn(
                     "p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider text-center transition-all",
                     printerSettings.paperWidth === '80mm' 
                       ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10" 
                       : "border-slate-100 bg-slate-50 text-slate-600"
                   )}
                 >
                   80mm (Cozinha Padrão)
                 </button>
                 <button
                   type="button"
                   onClick={() => setPrinterSettings({...printerSettings, paperWidth: '58mm'})}
                   className={cn(
                     "p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider text-center transition-all",
                     printerSettings.paperWidth === '58mm' 
                       ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10" 
                       : "border-slate-100 bg-slate-50 text-slate-600"
                   )}
                 >
                   58mm (Bobina Estreita)
                 </button>
               </div>
             </div>

             {/* Font Size & Copies */}
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tamanho da Fonte</label>
                 <select
                   value={printerSettings.fontSize}
                   onChange={(e) => setPrinterSettings({...printerSettings, fontSize: e.target.value as any})}
                   className="w-full border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none bg-slate-50 focus:border-orange-500 transition-colors"
                 >
                   <option value="small">Pequeno (Ideal p/ 58mm)</option>
                   <option value="medium">Médio (Padrão)</option>
                   <option value="large">Grande (Legível)</option>
                 </select>
               </div>
               <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vias de Impressão</label>
                 <input
                   type="number"
                   min="1"
                   max="5"
                   value={printerSettings.numCopies}
                   onChange={(e) => setPrinterSettings({...printerSettings, numCopies: Math.max(1, parseInt(e.target.value) || 1)})}
                   className="w-full border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none bg-slate-50 focus:border-orange-500 transition-colors"
                 />
               </div>
             </div>

             {/* Auto print toggle & detail toggles */}
             <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Impressão Direta Automática</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase">Imprimir ao receber novo pedido</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => setPrinterSettings({...printerSettings, autoPrintNew: !printerSettings.autoPrintNew})}
                   className={cn(
                     "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                     printerSettings.autoPrintNew ? "bg-orange-500" : "bg-slate-300"
                   )}
                 >
                   <div className={cn(
                     "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                     printerSettings.autoPrintNew ? "left-6" : "left-1"
                   )} />
                 </button>
               </div>

               <div className="h-px bg-slate-100 my-2" />

               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Exibir Endereço</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase">Ocultar/exibir em pedidos delivery</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => setPrinterSettings({...printerSettings, showAddress: !printerSettings.showAddress})}
                   className={cn(
                     "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                     printerSettings.showAddress ? "bg-orange-500" : "bg-slate-300"
                   )}
                 >
                   <div className={cn(
                     "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                     printerSettings.showAddress ? "left-6" : "left-1"
                   )} />
                 </button>
               </div>

               <div className="h-px bg-slate-100 my-2" />

               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Exibir Observações</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase">Incluir comentários dos itens</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => setPrinterSettings({...printerSettings, showComments: !printerSettings.showComments})}
                   className={cn(
                     "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                     printerSettings.showComments ? "bg-orange-500" : "bg-slate-300"
                   )}
                 >
                   <div className={cn(
                     "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                     printerSettings.showComments ? "left-6" : "left-1"
                   )} />
                 </button>
               </div>
             </div>

             {/* Custom Header & Footer */}
             <div className="space-y-3 font-sans">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left block">Cabeçalho Personalizado (Opcional)</label>
                 <input
                   type="text"
                   placeholder="Ex: MEU OVO - PIZZA BAR"
                   value={printerSettings.customHeader}
                   onChange={(e) => setPrinterSettings({...printerSettings, customHeader: e.target.value})}
                   className="w-full border-2 border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none bg-slate-50 focus:border-orange-500 transition-colors placeholder:text-slate-300"
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left block">Rodapé Personalizado (Opcional)</label>
                 <input
                   type="text"
                   placeholder="Ex: Obrigado pela preferência!"
                   value={printerSettings.customFooter}
                   onChange={(e) => setPrinterSettings({...printerSettings, customFooter: e.target.value})}
                   className="w-full border-2 border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none bg-slate-50 focus:border-orange-500 transition-colors placeholder:text-slate-300"
                 />
               </div>
             </div>
           </div>

           <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
             <button
               type="button"
               onClick={() => printTestReceipt(printerSettings)}
               className="flex-1 py-3 px-4 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
             >
               <Printer size={14} /> Imprimir Teste
             </button>
             <button
               type="button"
               onClick={() => savePrinterSettings(printerSettings)}
               className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
             >
               Salvar Configurações
             </button>
           </div>
         </div>
       </div>
     )}
   </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-black text-brand-black tracking-tighter uppercase italic">Configurações</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Gerencie seu império digital</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery</span>
               <button
                 type="button"
                 onClick={() => setFormData({...formData, deliveryEnabled: !formData.deliveryEnabled})}
                 className={cn(
                   "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                   formData.deliveryEnabled ? "bg-orange-500" : "bg-slate-300"
                 )}
               >
                 <div className={cn(
                   "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                   formData.deliveryEnabled ? "left-6" : "left-1"
                 )} />
               </button>
             </div>
             <div className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 italic", formData.deliveryEnabled ? "bg-brand-egg text-brand-black border-yellow-200 shadow-sm" : "bg-red-50 text-red-700 border-red-200")}>
               {formData.deliveryEnabled ? 'MEU OVO ONLINE' : 'MEU OVO OFFLINE'}
             </div>
          </div>
        </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <form onSubmit={handleUpdate} className="lg:col-span-8 space-y-4">
          {/* Basic Info */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
             <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3 italic">
               <div className="p-1.5 bg-brand-egg rounded-lg text-brand-black shadow-sm">
                 <Store size={16} />
               </div>
               <h3 className="text-[11px] font-black text-brand-black uppercase tracking-[0.2em]">Perfil MEU OVO</h3>
             </div>
             
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome Comercial</label>
                   <input 
                     type="text" 
                     value={formData.name}
                     onChange={e => setFormData({...formData, name: e.target.value})}
                     className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">WhatsApp de Vendas</label>
                   <input 
                     type="text" 
                     value={formData.whatsapp}
                     onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                     className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-slate-300"
                     placeholder="(00) 00000-0000"
                   />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tipo de Cozinha</label>
                   <select 
                     value={formData.cuisineType}
                     onChange={e => setFormData({...formData, cuisineType: e.target.value})}
                     className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                   >
                     <option value="">Selecione...</option>
                     <option value="Pizza">Pizza</option>
                     <option value="Hambúrguer">Hambúrguer</option>
                     <option value="Marmita">Marmita</option>
                     <option value="Brasileira">Brasileira</option>
                     <option value="Japonesa">Japonesa</option>
                     <option value="Chinesa">Chinesa</option>
                     <option value="Árabe">Árabe</option>
                     <option value="Mexicana">Mexicana</option>
                     <option value="Açaí">Açaí</option>
                     <option value="Padaria">Padaria</option>
                     <option value="Doceria">Doceria</option>
                     <option value="Saudável">Saudável</option>
                     <option value="Vegana">Vegana</option>
                     <option value="Churrasco">Churrasco</option>
                     <option value="Pastel">Pastel</option>
                     <option value="Sorvete">Sorvete</option>
                     <option value="Café">Café</option>
                   </select>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Faixa de Preço</label>
                   <select 
                     value={formData.priceRange}
                     onChange={e => setFormData({...formData, priceRange: e.target.value as any})}
                     className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                   >
                     <option value="low">Econômico (R$)</option>
                     <option value="medium">Moderado (R$$)</option>
                     <option value="high">Premium (R$$$)</option>
                   </select>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Guia de Preços Recomendado:</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-600">Econômico</p>
                    <p className="text-[8px] text-slate-400 leading-tight">Açaí, Pastel, Marmitas. Áreas residenciais.</p>
                  </div>
                  <div className="space-y-1 border-x border-slate-200 px-2">
                    <p className="text-[9px] font-bold text-slate-600">Moderado</p>
                    <p className="text-[8px] text-slate-400 leading-tight">Pizzas, Burger, Casual. Centros comerciais.</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-600">Premium</p>
                    <p className="text-[8px] text-slate-400 leading-tight">Japonês, Steak, Gourmet. Áreas nobres.</p>
                  </div>
                </div>
              </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bio / Descrição Curta</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-slate-200 rounded-md p-2 text-sm h-16 resize-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  placeholder="Ex: Pizzaria artesanal com forno à lenha..."
                />
             </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Endereço Físico</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full border border-slate-200 rounded-md p-2 pl-8 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  />
                </div>
             </div>
          </section>

          {/* Delivery Settings */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
             <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3 italic">
               <div className="p-1.5 bg-brand-black rounded-lg text-brand-egg shadow-sm">
                 <Truck size={16} />
               </div>
               <h3 className="text-[11px] font-black text-brand-black uppercase tracking-[0.2em]">Logística Própria</h3>
             </div>

             <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                   <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">Status do Delivery</p>
                   <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Permitir pedidos online agora</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, deliveryEnabled: !formData.deliveryEnabled})}
                  className={cn(
                    "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                    formData.deliveryEnabled ? "bg-orange-500" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                    formData.deliveryEnabled ? "left-6" : "left-1"
                  )} />
                </button>
             </div>

             <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                   <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">Status do Salão (Mesas)</p>
                   <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Permitir pedidos nas mesas via QR Code</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, dineInEnabled: !formData.dineInEnabled})}
                  className={cn(
                    "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                    formData.dineInEnabled ? "bg-orange-500" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                    formData.dineInEnabled ? "left-6" : "left-1"
                  )} />
                </button>
             </div>

             <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                   <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">Status Retirada</p>
                   <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Permitir retirada no balcão</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, pickupEnabled: !formData.pickupEnabled})}
                  className={cn(
                    "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                    formData.pickupEnabled ? "bg-orange-500" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                    formData.pickupEnabled ? "left-6" : "left-1"
                  )} />
                </button>
             </div>

             <div className="grid sm:grid-cols-3 gap-4 pt-2">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Zero Taxa Padrão (R$)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-slate-400">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.deliveryFee}
                      onChange={e => setFormData({...formData, deliveryFee: e.target.value})}
                      className="w-full border border-slate-200 rounded-md p-2 pl-8 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-bold"
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pedido Mínimo (R$)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-slate-400">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.minOrder}
                      onChange={e => setFormData({...formData, minOrder: e.target.value})}
                      className="w-full border border-slate-200 rounded-md p-2 pl-8 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-bold"
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tempo de Espera</label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Ex: 30-45 min"
                      value={formData.estimatedTime}
                      onChange={e => setFormData({...formData, estimatedTime: e.target.value})}
                      className="w-full border border-slate-200 rounded-md p-2 pl-8 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    />
                  </div>
               </div>
             </div>

             <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Zero Taxa por Bairro (Exceções)</h4>
                   <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[9px] px-2"
                    onClick={() => setFormData({
                      ...formData, 
                      feeByNeighborhood: [...formData.feeByNeighborhood, { neighborhood: '', fee: 0 }]
                    })}
                   >
                     <Plus size={12} className="mr-1" /> ADICIONAR BAIRRO
                   </Button>
                </div>
                
                {formData.feeByNeighborhood.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center group hover:bg-white hover:border-orange-200 transition-all cursor-pointer"
                   onClick={() => setFormData({
                     ...formData, 
                     feeByNeighborhood: [...formData.feeByNeighborhood, { neighborhood: '', fee: 0 }]
                   })}
                  >
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                      <Plus size={16} className="text-slate-400 group-hover:text-orange-500" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Nenhuma Zero Taxa regional configurada</p>
                    <p className="text-[9px] text-slate-300 font-bold uppercase mt-1">Clique para começar a adicionar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.feeByNeighborhood.map((item, index) => (
                      <div key={index} className="flex gap-3 items-end bg-slate-50/50 p-3 rounded-xl border border-slate-100 group hover:border-slate-200 transition-all">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={10} className="text-slate-400" />
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nome do Bairro</label>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Ex: Pinheiros, Centro..."
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white font-medium"
                            value={item.neighborhood}
                            onChange={(e) => {
                              const newList = [...formData.feeByNeighborhood];
                              newList[index].neighborhood = e.target.value;
                              setFormData({...formData, feeByNeighborhood: newList});
                            }}
                          />
                        </div>
                        <div className="w-28 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Truck size={10} className="text-slate-400" />
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Zero Taxa Entrega</label>
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-slate-400">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full border border-slate-200 rounded-lg p-2 pl-8 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white font-bold"
                              value={item.fee}
                              onChange={(e) => {
                                const newList = [...formData.feeByNeighborhood];
                                newList[index].fee = parseFloat(e.target.value) || 0;
                                setFormData({...formData, feeByNeighborhood: newList});
                              }}
                            />
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const newList = formData.feeByNeighborhood.filter((_, i) => i !== index);
                            setFormData({...formData, feeByNeighborhood: newList});
                          }}
                          className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-100 transition-all shrink-0 bg-white shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </section>

           <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3 italic">
                <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600 shadow-sm">
                  <Zap size={16} />
                </div>
                <h3 className="text-[11px] font-black text-brand-black uppercase tracking-[0.2em]">Automação e Alertas</h3>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                 <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                       <Zap size={14} className="text-orange-500" />
                       <div>
                          <p className="text-[10px] font-bold text-slate-700 uppercase">Auto-Aceitar</p>
                       </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, autoAccept: !formData.autoAccept})}
                      className={cn(
                        "h-4 w-8 rounded-full relative transition-colors duration-200 focus:outline-none",
                        formData.autoAccept ? "bg-orange-500" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                        formData.autoAccept ? "left-4.5" : "left-0.5"
                      )} />
                    </button>
                 </div>

                 <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                       <Volume2 size={14} className="text-orange-500" />
                       <div>
                          <p className="text-[10px] font-bold text-slate-700 uppercase">Som de Alerta</p>
                       </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, soundAlert: !formData.soundAlert})}
                      className={cn(
                        "h-4 w-8 rounded-full relative transition-colors duration-200 focus:outline-none",
                        formData.soundAlert ? "bg-orange-500" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                        formData.soundAlert ? "left-4.5" : "left-0.5"
                      )} />
                    </button>
                 </div>

                 <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                       <Printer size={14} className="text-orange-500" />
                       <div>
                          <p className="text-[10px] font-bold text-slate-700 uppercase">Impressora Térmica</p>
                       </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, thermalPrinterEnabled: !formData.thermalPrinterEnabled})}
                      className={cn(
                        "h-4 w-8 rounded-full relative transition-colors duration-200 focus:outline-none",
                        formData.thermalPrinterEnabled ? "bg-orange-500" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                        formData.thermalPrinterEnabled ? "left-4.5" : "left-0.5"
                      )} />
                    </button>
                 </div>
              </div>

              {formData.thermalPrinterEnabled && (
                <div className="flex justify-end pb-4 animate-in fade-in duration-200">
                  <button
                    type="button"
                    onClick={() => setIsPrinterModalOpen(true)}
                    className="px-4 py-2 border-2 border-dashed border-orange-200 hover:border-orange-500 text-orange-600 bg-orange-50/20 hover:bg-orange-50 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                  >
                    <Settings size={12} /> Configurar Impressora
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-slate-50 space-y-4">
                 <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2">
                       <Smartphone size={14} className="text-green-600" />
                       <div>
                          <p className="text-[10px] font-bold text-green-700 uppercase tracking-tight">WhatsApp Automático</p>
                          <p className="text-[9px] text-green-600 font-semibold uppercase">Notificar cliente a cada mudança de status</p>
                       </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, whatsappNotificationsEnabled: !formData.whatsappNotificationsEnabled})}
                      className={cn(
                        "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                        formData.whatsappNotificationsEnabled ? "bg-green-500" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                        formData.whatsappNotificationsEnabled ? "left-6" : "left-0.5"
                      )} />
                    </button>
                 </div>

                 {formData.whatsappNotificationsEnabled && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Webhook da API WhatsApp (Opcional)</label>
                       <input 
                         type="url" 
                         value={formData.whatsappWebhookUrl}
                         onChange={e => setFormData({...formData, whatsappWebhookUrl: e.target.value})}
                         className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder:text-slate-300"
                         placeholder="https://sua-api-whatsapp.com/webhook"
                       />
                       <p className="text-[9px] text-slate-400 font-medium italic">
                         Se fornecido, o sistema enviará um POST com os dados do pedido para esta URL.
                       </p>
                    </div>
                 )}
              </div>
           </section>

          <Button type="submit" isLoading={loading} className="w-full font-bold h-11 uppercase tracking-widest text-xs">Atualizar Configurações</Button>

        </form>

        {/* Links and QR Code */}
        <div className="lg:col-span-4 space-y-4">
           <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
               <QrIcon size={16} className="text-orange-500" /> Cardápio Público
             </h3>
             
             <div className="p-4 bg-slate-50 rounded-lg mb-4 text-center border border-slate-100 shadow-inner group/qr">
                <div ref={qrRef} className="bg-white p-3 rounded shadow-sm inline-block border border-slate-100 mb-3 group-hover/qr:scale-105 transition-transform duration-500">
                   <QRCode value={menuUrl} size={140} />
                </div>
                <div className="flex items-center justify-center gap-2">
                   <button 
                     type="button"
                     onClick={downloadQrCode}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-egg text-brand-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-colors shadow-sm"
                   >
                     <Download size={12} /> Baixar PNG
                   </button>
                   <button 
                     type="button"
                     onClick={() => window.print()}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm"
                   >
                     <Printer size={12} /> Imprimir
                   </button>
                </div>
             </div>

             <div className="space-y-2">
               <button 
                 type="button"
                 onClick={copyMenuLink}
                 className="w-full h-10 border border-slate-200 rounded-md flex items-center justify-between px-3 hover:bg-slate-50 transition-all text-left group"
               >
                  <p className="truncate text-[10px] font-mono font-bold text-slate-500 uppercase tracking-tighter w-full mr-2">{menuUrl}</p>
                  <Copy size={14} className="shrink-0 text-slate-400 group-hover:text-orange-500 transition-colors" />
               </button>
               <a href={menuUrl} target="_blank" rel="noreferrer" className="block w-full">
                 <Button variant="secondary" className="w-full h-10 text-[10px] font-black tracking-widest uppercase" size="sm">Abrir Cardápio</Button>
               </a>
             </div>
           </section>

           <div className="bg-brand-black p-5 rounded-2xl text-brand-white shadow-xl shadow-slate-200 relative overflow-hidden group border-b-4 border-brand-egg">
              <div className="absolute top-0 right-0 p-4 opacity-10 translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                <Settings size={80} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-egg mb-2 italic">Suporte Meu Ovo</h3>
              <p className="text-xs text-slate-300 mb-4 font-bold leading-relaxed italic">Precisa de ajuda para turbinar suas vendas? Estamos aqui.</p>
              <Button size="sm" className="w-full bg-brand-egg text-brand-black border-none hover:bg-white font-black text-[10px] tracking-widest uppercase italic">
                Chamar no WhatsApp
              </Button>
           </div>
        </div>
      </div>
    </div>
  </AdminLayout>
  );
}
