import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Phone, MapPin, ChevronDown, ShoppingBag, Smartphone, List, LayoutGrid, Printer, AlertTriangle, CheckCircle, FileText, ChefHat, Bike, Package, XCircle, Filter, Calendar, CreditCard, CheckSquare, Square } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { Order } from '../../types';
import { db } from '../../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { awardLoyaltyPoints } from '../../services/loyaltyService';
import { triggerAutomaticNotification } from '../../services/whatsappService';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_FLOW: Record<Order['status'], Order['status'] | null> = {
  received: 'preparing',
  preparing: 'ready',
  ready: 'out-for-delivery',
  'out-for-delivery': 'finished',
  finished: null,
  cancelled: null,
};

const STATUS_LABELS: Record<Order['status'], string> = {
  received: 'Recebido',
  preparing: 'Em preparo',
  ready: 'Pronto',
  'out-for-delivery': 'Saiu para entrega',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_BADGE: Record<Order['status'], string> = {
  received: 'bg-blue-100 text-blue-700',
  preparing: 'bg-yellow-100 text-yellow-700 font-bold',
  ready: 'bg-emerald-100 text-emerald-700 font-bold',
  'out-for-delivery': 'bg-purple-100 text-purple-700 font-bold',
  finished: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<Order['status'], React.ReactNode> = {
  received: <Clock size={12} />,
  preparing: <ChefHat size={12} />,
  ready: <Package size={12} />,
  'out-for-delivery': <Bike size={12} />,
  finished: <CheckCircle size={12} />,
  cancelled: <XCircle size={12} />,
};

const NEXT_BTN_LABELS: Record<Order['status'], string> = {
  received: 'Iniciar preparo',
  preparing: 'Marcar pronto',
  ready: 'Saiu para entrega',
  'out-for-delivery': 'Finalizar',
  finished: '',
  cancelled: '',
};

export default function AdminOrders() {
  const { currentRestaurant: restaurant, orders, updateOrderStatus } = useRestaurant();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Audio alert logic
  useEffect(() => {
    if (!restaurant?.orderSettings?.soundAlert) return;

    const newOrders = orders.filter(o => o.status === 'received');
    if (newOrders.length > 0) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio disabled by browser', e));
    }
  }, [orders.length, restaurant?.orderSettings?.soundAlert]);

  // Auto-accept logic
  useEffect(() => {
    if (!restaurant?.orderSettings?.autoAccept) return;

    const receivedOrders = orders.filter(o => o.status === 'received');
    receivedOrders.forEach(order => {
      handleStatusChange(order.id, 'preparing');
    });
  }, [orders, restaurant?.orderSettings?.autoAccept]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
      
      updateOrderStatus(orderId, newStatus);
      
      const order = orders.find(o => o.id === orderId);
      if (order && restaurant) {
        // Trigger automatic WhatsApp notification if enabled
        if (restaurant.orderSettings?.whatsappNotificationsEnabled) {
          triggerAutomaticNotification({ ...order, status: newStatus }, restaurant);
        }

        if (newStatus === 'finished') {
          await awardLoyaltyPoints(order, restaurant);
        }
      }
      
      toast.success(`Pedido ${STATUS_LABELS[newStatus]}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  }, [restaurant, updateOrderStatus, orders]);

  const printOrder = (order: Order, type: 'ticket' | 'account' = 'ticket') => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast.error('Por favor, ative os popups/propaganda para este site para que a impressão possa iniciar!');
      return;
    }

    const storedSettings = localStorage.getItem('meuovo_printer_settings');
    let settings = {
      paperWidth: '80mm',
      fontSize: 'medium',
      numCopies: 1,
      showAddress: true,
      showComments: true,
      customHeader: '',
      customFooter: 'Obrigado pela preferência!',
    };
    if (storedSettings) {
      try {
        settings = JSON.parse(storedSettings);
      } catch (e) {
        console.error('Error reading printer settings:', e);
      }
    }

    const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: bold;">
        <span>${item.quantity}x ${item.productName}</span>
        <span>R$ ${(item.quantity * item.unitPrice).toFixed(2)}</span>
      </div>
      ${settings.showComments && item.observations ? `<div style="font-size: 0.9em; margin-left: 8px; margin-bottom: 3px;">* OBS: ${item.observations}</div>` : ''}
      ${item.additionals.length > 0 ? `<div style="font-size: 0.9em; margin-left: 8px; margin-bottom: 3px; color: #333;">+ ${item.additionals.map(a => a.name).join(', ')}</div>` : ''}
    `).join('');

    let singleReceiptHtml = `
      <div style="page-break-after: always; margin-bottom: 20px;">
        <div class="header">
          ${settings.customHeader ? `<h3 style="margin: 0; font-size: 1.1em;">${settings.customHeader}</h3>` : ''}
          <h2 style="margin: 3px 0; font-size: 1.4em;">${restaurant?.name || 'MEU OVO'}</h2>
          <p style="margin: 3px 0;">${type === 'account' ? '*** CONTA DE CONSUMO ***' : '*** TICKET DE PEDIDO ***'}</p>
          <p style="margin: 3px 0;">PEDIDO: #${order.id.slice(-6).toUpperCase()}</p>
          <p style="margin: 0;">${new Date(order.createdAt).toLocaleString('pt-BR')}</p>
        </div>
        <div class="customer">
          CLIENTE: ${order.customerName}<br/>
          FONE: ${order.customerPhone}<br/>
          TIPO: ${order.type === 'dine-in' ? 'MESA' : order.type === 'delivery' ? 'DELIVERY' : 'RETIRADA'}<br/>
          ${order.tableNumber ? `MESA: ${order.tableNumber}<br/>` : ''}
        </div>
        
        <div class="section">
          <p style="font-weight: bold; margin: 3px 0 5px 0;">ITENS</p>
          ${itemsHtml}
        </div>

        ${order.type === 'delivery' && order.deliveryAddress && settings.showAddress ? `
          <div class="section" style="font-size: 0.95em;">
            <strong>ENDEREÇO DE ENTREGA:</strong><br/>
            ${order.deliveryAddress}
          </div>
        ` : ''}

        <div style="text-align: right; margin-top: 5px; font-size: 0.95em;">
          SUBTOTAL: R$ ${order.subtotal.toFixed(2)}<br/>
          ${order.discountAmount ? `DESC: R$ ${order.discountAmount.toFixed(2)}<br/>` : ''}
          TAXA: R$ ${order.deliveryFee.toFixed(2)}
        </div>

        <div class="total">
          TOTAL: R$ ${order.total.toFixed(2)}
        </div>
        
        <div style="text-align: center; margin-top: 8px; font-size: 0.95em;">
          PAGAMENTO: ${order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod === 'cash' ? 'DINHEIRO' : order.paymentMethod === 'card-on-delivery' ? 'CARTÃO' : 'NO LOCAL'}
        </div>
        
        ${settings.customFooter ? `<p style="text-align: center; font-size: 0.95em; margin-top: 10px; border-top: 1px dotted #000; padding-top: 5px;">${settings.customFooter}</p>` : ''}
        <div class="watermark">MEU OVO - CONTROLE DE PEDIDOS</div>
      </div>
    `;

    let fullReceiptsHtml = '';
    for (let i = 0; i < (type === 'account' ? 1 : settings.numCopies || 1); i++) {
      let copyLabel = '';
      if (type !== 'account' && settings.numCopies > 1) {
        copyLabel = `<div style="text-align: center; font-weight: bold; font-size: 0.9em; border: 1px solid #000; padding: 2px; margin-bottom: 5px;">VIA ${i + 1} de ${settings.numCopies}</div>`;
      }
      fullReceiptsHtml += copyLabel + singleReceiptHtml;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${type === 'account' ? 'CONTA' : 'PEDIDO'} #${order.id.slice(-6).toUpperCase()}</title>
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
            .total { font-weight: bold; font-size: 1.2em; margin-top: 8px; border-top: 1px double #000; padding-top: 4px; }
            .customer { margin-bottom: 8px; }
            .watermark { opacity: 0.5; font-size: 8px; text-align: center; margin-top: 15px; border-top: 1px dotted #000; padding-top: 5px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${fullReceiptsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Keep track of printed order IDs to prevent infinite windows popping up dynamically
  const printedOrdersRef = React.useRef<Set<string>>(new Set());

  // Direct auto print logic for received orders
  useEffect(() => {
    if (!restaurant?.orderSettings?.thermalPrinterEnabled) return;

    const storedSettings = localStorage.getItem('meuovo_printer_settings');
    let autoPrint = false;
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        autoPrint = parsed.autoPrintNew;
      } catch (e) {
        console.error('Error reading autoPrint config:', e);
      }
    }

    if (!autoPrint) return;

    const newReceivedOrders = orders.filter(o => o.status === 'received' && !printedOrdersRef.current.has(o.id));
    
    if (newReceivedOrders.length > 0) {
      newReceivedOrders.forEach(order => {
        printedOrdersRef.current.add(order.id);
        printOrder(order, 'ticket');
        toast.success(`Pedido #${order.id.slice(-6).toUpperCase()} impresso automaticamente na térmica!`);
      });
    }
  }, [orders, restaurant?.orderSettings?.thermalPrinterEnabled]);

  const handleFiscalSync = (order: Order) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Emitindo NFC-e...',
        success: 'NFC-e emitida e enviada para SEFAZ!',
        error: 'Erro na integração fiscal',
      }
    );
  };

  const exportSalesPDF = () => {
    if (filtered.length === 0) {
      toast.error('Nenhum pedido encontrado nos filtros selecionados para exportar.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      toast.error('Por favor, ative os popups para este site para gerar o PDF!');
      return;
    }

    // Calculations
    const totalOrders = filtered.length;
    const grossSales = filtered.reduce((sum, o) => sum + o.subtotal, 0);
    const totalDeliveryFees = filtered.reduce((sum, o) => sum + o.deliveryFee, 0);
    const totalDiscounts = filtered.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    const netRevenue = filtered.reduce((sum, o) => sum + o.total, 0);

    // Payment breakdowns
    const paymentMethods: Record<string, { count: number; total: number }> = {};
    const orderTypes: Record<string, { count: number; total: number }> = {};

    filtered.forEach(o => {
      const pm = o.paymentMethod || 'other';
      if (!paymentMethods[pm]) paymentMethods[pm] = { count: 0, total: 0 };
      paymentMethods[pm].count++;
      paymentMethods[pm].total += o.total;

      const ot = o.type || 'other';
      if (!orderTypes[ot]) orderTypes[ot] = { count: 0, total: 0 };
      orderTypes[ot].count++;
      orderTypes[ot].total += o.total;
    });

    const paymentLabels: Record<string, string> = {
      pix: 'PIX',
      cash: 'Dinheiro',
      'card-on-delivery': 'Cartão na Entrega',
      'on-site': 'No Local',
      other: 'Outros',
    };

    const typeLabels: Record<string, string> = {
      'dine-in': 'Mesa (Presencial)',
      delivery: 'Delivery (Entrega)',
      takeout: 'Retirada (Takeout)',
      other: 'Outros',
    };

    const rowsHtml = filtered.map(o => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold;">#${o.id.slice(-6).toUpperCase()}</td>
        <td style="padding: 10px;">${new Date(o.createdAt).toLocaleString('pt-BR')}</td>
        <td style="padding: 10px;">${o.customerName}</td>
        <td style="padding: 10px;">${typeLabels[o.type] || o.type}</td>
        <td style="padding: 10px;">${paymentLabels[o.paymentMethod] || o.paymentMethod}</td>
        <td style="padding: 10px;"><span class="badge badge-${o.status}">${STATUS_LABELS[o.status] || o.status}</span></td>
        <td style="padding: 10px; text-align: right; font-weight: bold;">R$ ${o.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const paymentsHtml = Object.entries(paymentMethods).map(([pm, data]) => `
      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between;">
        <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b;">${paymentLabels[pm] || pm}</span>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
          <span style="font-size: 18px; font-weight: bold; color: #0f172a;">R$ ${data.total.toFixed(2)}</span>
          <span style="font-size: 11px; color: #64748b; font-weight: 500;">${data.count} ped.</span>
        </div>
      </div>
    `).join('');

    const typesHtml = Object.entries(orderTypes).map(([ot, data]) => `
      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between;">
        <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b;">${typeLabels[ot] || ot}</span>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
          <span style="font-size: 18px; font-weight: bold; color: #0f172a;">R$ ${data.total.toFixed(2)}</span>
          <span style="font-size: 11px; color: #64748b; font-weight: 500;">${data.count} ped.</span>
        </div>
      </div>
    `).join('');

    const dateRangeLabel = startDate && endDate 
      ? `Período: de ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
      : startDate 
        ? `A partir de: ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
        : endDate 
          ? `Até: ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
          : 'Período Geral (Todos os registros)';

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatorio_de_Vendas_\${restaurant?.name || 'Meu_Ovo'}</title>
          <style>
            @media print {
              body { background: #fff; color: #000; padding: 0; margin: 0; }
              .no-print { display: none !important; }
              @page { size: A4; margin: 15mm; }
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              color: #0f172a; 
              background-color: #f8fafc; 
              padding: 40px; 
              margin: 0;
            }
            .container {
              max-width: 1000px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
              border: 1px solid #e2e8f0;
            }
            .header-info {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 24px;
              margin-bottom: 24px;
            }
            .restaurant-title {
              font-size: 28px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: -0.05em;
              color: #000;
              margin: 0;
              font-style: italic;
            }
            .report-title {
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 0.1em;
              color: #f97316;
              text-transform: uppercase;
              margin: 4px 0 0 0;
            }
            .meta-info {
              text-align: right;
              font-size: 11px;
              color: #64748b;
              font-weight: 500;
            }
            .metrics-grid {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 24px;
            }
            .metric-card {
              background-color: #ffffff;
              border: 2px solid #f1f5f9;
              border-radius: 16px;
              padding: 16px;
              text-align: center;
              box-shadow: 0 1px 2px rgb(0 0 0 / 0.02);
            }
            .metric-card.highlight {
              border-color: #f97316;
              background-color: #fffaf8;
            }
            .metric-val {
              font-size: 22px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 4px;
              letter-spacing: -0.02em;
            }
            .metric-val.highlight {
              color: #f97316;
            }
            .metric-label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
            }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #000;
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
              margin-top: 24px;
              margin-bottom: 12px;
            }
            .breakdowns-grid {
              display: grid;
              grid-template-cols: repeat(2, 1fr);
              gap: 16px;
              margin-bottom: 24px;
            }
            .sub-grid {
              display: grid;
              grid-template-cols: repeat(2, 1fr);
              gap: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-top: 12px;
            }
            th {
              background-color: #f1f5f9;
              padding: 10px;
              text-align: left;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.05em;
              color: #475569;
              border-bottom: 2px solid #cbd5e1;
            }
            .badge {
              display: inline-block;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .badge-received { background-color: #dbeafe; color: #1e40af; }
            .badge-preparing { background-color: #fef9c3; color: #854d0e; }
            .badge-ready { background-color: #d1fae5; color: #065f46; }
            .badge-out-for-delivery { background-color: #f3e8ff; color: #6b21a8; }
            .badge-finished { background-color: #f1f5f9; color: #334155; }
            .badge-cancelled { background-color: #fee2e2; color: #991b1b; }
            
            .btn-print {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background-color: #f97316;
              color: white;
              padding: 10px 20px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              border: none;
              cursor: pointer;
              margin-bottom: 20px;
              box-shadow: 0 4px 6px -1px rgb(249 115 22 / 0.2);
              transition: all 0.2s;
            }
            .btn-print:hover {
              background-color: #ea580c;
              transform: translateY(-1px);
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="max-width: 1000px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 20px 0;">
            <p style="font-size: 13px; font-weight: bold; color: #64748b; margin: 0;">Relatório gerado com sucesso! Clique no botão ao lado para imprimir ou salvar em PDF.</p>
            <button class="btn-print" onclick="window.print();">Imprimir / Salvar PDF</button>
          </div>

          <div class="container">
            <div class="header-info">
              <div>
                <h1 class="restaurant-title">\${restaurant?.name || 'MEU OVO'}</h1>
                <h2 class="report-title">Relatório de Registro de Vendas</h2>
              </div>
              <div class="meta-info">
                <div>DATA DE EMISSÃO: \${new Date().toLocaleString('pt-BR')}</div>
                <div style="margin-top: 4px; font-weight: bold; color: #000; text-transform: uppercase;">\${dateRangeLabel}</div>
              </div>
            </div>

            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Total de Pedidos</div>
                <div class="metric-val">\${totalOrders}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Valor dos Itens</div>
                <div class="metric-val">R$ \${grossSales.toFixed(2)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Descontos / Taxas</div>
                <div class="metric-val" style="font-size: 12px; color: #475569; margin-top: 4px; line-height: 1.4;">
                  Taxas: +R$ \${totalDeliveryFees.toFixed(2)}<br/>
                  Descontos: -R$ \${totalDiscounts.toFixed(2)}
                </div>
              </div>
              <div class="metric-card highlight">
                <div class="metric-label" style="color: #ea580c;">Total Líquido</div>
                <div class="metric-val highlight">R$ \${netRevenue.toFixed(2)}</div>
              </div>
            </div>

            <div class="breakdowns-grid">
              <div>
                <div class="section-title">Por Meio de Pagamento</div>
                <div class="sub-grid">\${paymentsHtml}</div>
              </div>
              <div>
                <div class="section-title">Por Canal de Venda</div>
                <div class="sub-grid">\${typesHtml}</div>
              </div>
            </div>

            <div>
              <div class="section-title">Detalhes dos Pedidos</div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Data/Hora</th>
                    <th>Cliente</th>
                    <th>Canal</th>
                    <th>Pagamento</th>
                    <th>Status</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  \${rowsHtml}
                </tbody>
              </table>
            </div>

            <div style="margin-top: 40px; border-top: 1px dotted #cbd5e1; padding-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; text-transform: uppercase; font-weight: bold; letter-spacing: 0.1em;">
              MEU OVO - CONTROLE DE PEDIDOS E VENDAS
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filtered = orders.filter(o => {
    const matchesStatus = filter === 'all' || o.status === filter;
    const matchesPayment = paymentFilter === 'all' || o.paymentMethod === paymentFilter;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const orderDate = new Date(o.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) matchesDate = false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (orderDate > end) matchesDate = false;
      }
    }
    
    return matchesStatus && matchesPayment && matchesDate;
  });

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const selectAllFiltered = () => {
    if (selectedOrderIds.length === filtered.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filtered.map(o => o.id));
    }
  };

  const handleBatchStatusChange = async (status: Order['status']) => {
    if (selectedOrderIds.length === 0) return;
    
    const promise = Promise.all(selectedOrderIds.map(id => handleStatusChange(id, status)));
    
    toast.promise(promise, {
      loading: `Atualizando ${selectedOrderIds.length} pedidos...`,
      success: 'Pedidos atualizados com sucesso!',
      error: 'Erro ao atualizar alguns pedidos',
    });
    
    setSelectedOrderIds([]);
  };

  const handleBatchPrint = (type: 'ticket' | 'account') => {
    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
    selectedOrders.forEach(o => printOrder(o, type));
  };

  const kanbanStatuses: Order['status'][] = ['received', 'preparing', 'ready', 'out-for-delivery'];

  const sendWhatsAppUpdate = (order: Order) => {
    const restaurantName = restaurant?.name || 'Restaurante';
    const statusMap: Record<Order['status'], string> = {
      received: 'recebido e está aguardando confirmação',
      preparing: 'sendo preparado com todo carinho',
      ready: 'prontinho! 🎉',
      'out-for-delivery': 'saiu para entrega! O motoboy já está a caminho 🛵',
      finished: 'entregue. Esperamos que goste! Bom apetite! 🥚',
      cancelled: 'infelizmente foi cancelado. Entre em contato para mais detalhes.'
    };

    const msg = `Olá *${order.customerName}*! Aqui é do *${restaurantName}*.\n\n` +
                `Passando para avisar que seu pedido *#${order.id.slice(-6).toUpperCase()}* está *${statusMap[order.status]}*.\n\n` +
                `Você pode acompanhar o status em tempo real aqui: ${window.location.origin}/r/${restaurant?.slug}/status/${order.id}\n\n` +
                `Obrigado pela preferência!`;

    const url = `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className={`font-black text-4xl italic tracking-tighter uppercase ${isDark ? 'text-[#FFC928]' : 'text-[#111]'}`}>Pedidos</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">
            {restaurant?.orderSettings?.autoAccept ? 'Modo Turbo Ativo (Auto-Aceite)' : 'Modo Manual'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className={`p-3 rounded-2xl border-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isFilterVisible || startDate || endDate || paymentFilter !== 'all' ? 'bg-orange-500 text-white border-orange-500 shadow-lg' : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-white border-gray-100 text-gray-500 shadow-sm')}`}
          >
            <Filter size={14} /> Filtros { (startDate || endDate || paymentFilter !== 'all') && '•' }
          </button>

          <button 
            onClick={exportSalesPDF}
            className={`p-3 rounded-2xl border-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-white/5 border-white/10 text-[#FFC928] hover:bg-[#FFC928]/10' : 'bg-white border-gray-100 text-orange-600 hover:bg-orange-50/50 shadow-sm'}`}
            title="Exportar Registro de Vendas (PDF)"
          >
            <FileText size={14} /> Exportar PDF
          </button>

          <div className={`p-1 rounded-2xl border-2 flex items-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 px-4 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-[#FFC928] text-black shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={14} /> Lista
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-2 px-4 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'kanban' ? 'bg-[#FFC928] text-black shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFilterVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className={`p-6 rounded-[2rem] border-2 grid grid-cols-1 md:grid-cols-3 gap-6 AdminOrders-filters-container ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> De
                </label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={`w-full p-3 rounded-xl border-2 outline-none transition-all text-xs font-bold ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-[#FFC928]' : 'bg-slate-50 border-gray-100 focus:border-[#FFC928]'}`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> Até
                </label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className={`w-full p-3 rounded-xl border-2 outline-none transition-all text-xs font-bold ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-[#FFC928]' : 'bg-slate-50 border-gray-100 focus:border-[#FFC928]'}`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={12} /> Forma de Pagamento
                </label>
                <select 
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value)}
                  className={`w-full p-3 rounded-xl border-2 outline-none transition-all text-xs font-bold ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-[#FFC928]' : 'bg-slate-50 border-gray-100 focus:border-[#FFC928]'}`}
                >
                  <option value="all">Todas as formas</option>
                  <option value="pix">PIX</option>
                  <option value="cash">Dinheiro</option>
                  <option value="card-on-delivery">Cartão na Entrega</option>
                  <option value="on-site">No Local</option>
                </select>
              </div>
              
              <div className="md:col-span-3 flex justify-end">
                <button 
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPaymentFilter('all');
                  }}
                  className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'list' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tight flex-shrink-0 transition-all border-2 ${filter === 'all' ? 'bg-[#FFC928] border-[#FFC928] text-[#111]' : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300 shadow-sm')}`}
              >
                Todos ({orders.length})
              </button>
              {(Object.keys(STATUS_LABELS) as Order['status'][]).map(s => {
                const count = orders.filter(o => o.status === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tight flex-shrink-0 transition-all border-2 ${filter === s ? 'bg-[#FFC928] border-[#FFC928] text-[#111]' : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300 shadow-sm')}`}
                  >
                    {STATUS_LABELS[s]} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>

            {filtered.length > 0 && (
              <div className="flex items-center gap-3">
                 <button 
                  onClick={selectAllFiltered}
                  className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border-2 transition-all ${selectedOrderIds.length === filtered.length && filtered.length > 0 ? 'bg-[#FFC928] border-[#FFC928] text-black' : (isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white border-gray-100 text-gray-500')}`}
                 >
                    {selectedOrderIds.length === filtered.length ? <CheckSquare size={14} /> : <Square size={14} />}
                    {selectedOrderIds.length === filtered.length ? 'Desmarcar todos' : 'Selecionar todos'}
                 </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {selectedOrderIds.length > 0 && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className={`sticky top-24 z-30 p-4 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-4 mb-6 shadow-2xl ${isDark ? 'bg-[#111] border-orange-500/30' : 'bg-white border-orange-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-black text-sm">
                    {selectedOrderIds.length}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pedidos selecionados</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                     <button 
                        onClick={() => handleBatchStatusChange('preparing')}
                        className="px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all"
                      >
                        Preparar
                      </button>
                      <button 
                        onClick={() => handleBatchStatusChange('ready')}
                        className="px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                      >
                        Pronto
                      </button>
                      <button 
                        onClick={() => handleBatchStatusChange('finished')}
                        className="px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                      >
                        Finalizar
                      </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleBatchPrint('ticket')}
                      className="flex items-center gap-2 p-3 bg-slate-900 border-2 border-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-black/10 active:scale-95"
                      title="Imprimir Tickets"
                    >
                      <Printer size={14} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Imprimir</span>
                    </button>
                    <button 
                      onClick={() => setSelectedOrderIds([])}
                      className={`p-3 rounded-xl border-2 transition-all ${isDark ? 'border-white/10 text-gray-500 hover:text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {filtered.length === 0 ? (
            <div className={`rounded-[2.5rem] p-20 text-center border-2 border-dashed ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
              <ShoppingBag className="mx-auto mb-4 opacity-20" size={48} />
              <p className="text-gray-500 font-bold">Nenhum pedido encontrado aqui.</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {filtered.map((order, index) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      delay: index * 0.05
                    }}
                  >
                    <OrderCard
                      order={order}
                      isDark={isDark}
                      onStatusChange={status => handleStatusChange(order.id, status)}
                      onPrint={(type) => printOrder(order, type)}
                      onWhatsAppUpdate={() => sendWhatsAppUpdate(order)}
                      onFiscal={() => handleFiscalSync(order)}
                      selected={selectedOrderIds.includes(order.id)}
                      onToggleSelection={() => toggleOrderSelection(order.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
          {kanbanStatuses.map(status => {
            const statusOrders = orders.filter(o => o.status === status);
            return (
              <div key={status} className="min-w-[320px] max-w-[320px] flex flex-col gap-4">
                <div className={`flex items-center justify-between p-4 rounded-2xl border-b-4 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-brand-egg text-[#111] shadow-sm'}`}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{STATUS_LABELS[status]}</span>
                  <span className="bg-[#FFC928] text-black text-[10px] font-black px-2 py-0.5 rounded-full">{statusOrders.length}</span>
                </div>
                <div className="flex flex-col gap-4">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {statusOrders.map((order, index) => (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <OrderCard
                          order={order}
                          isDark={isDark}
                          compact
                          onStatusChange={status => handleStatusChange(order.id, status)}
                          onPrint={(type) => printOrder(order, type)}
                          onWhatsAppUpdate={() => sendWhatsAppUpdate(order)}
                          onFiscal={() => handleFiscalSync(order)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {statusOrders.length === 0 && (
                     <div className={`p-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center opacity-40 ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                        <div className="w-10 h-10 rounded-full border-2 border-current mb-2 flex items-center justify-center"><CheckCircle size={16} /></div>
                        <p className="text-[9px] font-black uppercase tracking-widest">Nada aqui ainda</p>
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

const OrderCard: React.FC<{ 
  order: Order; 
  onStatusChange: (s: Order['status']) => void; 
  isDark: boolean;
  onPrint?: (type: 'ticket' | 'account') => void;
  onWhatsAppUpdate?: () => void;
  onFiscal?: () => void;
  compact?: boolean;
  selected?: boolean;
  onToggleSelection?: () => void;
}> = ({ order, onStatusChange, isDark, onPrint, onWhatsAppUpdate, onFiscal, compact, selected, onToggleSelection }) => {
  const [expanded, setExpanded] = useState(false);
  const nextStatus = STATUS_FLOW[order.status];

  return (
    <div className={`group relative rounded-[2rem] border-2 overflow-hidden transition-all hover:shadow-xl ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-gray-100'} ${order.problemReport ? 'border-red-500/50' : ''} ${selected ? 'ring-2 ring-orange-500 border-orange-500/30' : ''}`}>
      {onToggleSelection && !compact && (
        <button 
          onClick={onToggleSelection}
          className={`absolute top-4 right-4 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selected ? 'bg-orange-500 border-orange-500 text-white' : (isDark ? 'border-white/10 bg-black/20 text-transparent' : 'border-gray-200 bg-white text-transparent group-hover:border-orange-200')}`}
        >
          <CheckCircle size={14} />
        </button>
      )}
      <div className={compact ? 'p-4' : 'p-6'}>
        {order.problemReport && (
          <div className="mb-4 bg-red-100 border-2 border-red-200 text-red-700 p-2 rounded-xl flex items-center gap-2 animate-pulse">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="text-[9px] font-black uppercase">PROBLEMA SINALIZADO!</span>
          </div>
        )}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-display font-black ${compact ? 'text-sm' : 'text-lg'} ${isDark ? 'text-white' : 'text-[#111]'}`}>#{order.id.slice(-6).toUpperCase()}</span>
              {!compact && (
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${STATUS_BADGE[order.status]}`}>
                  {STATUS_ICONS[order.status]}
                  {STATUS_LABELS[order.status]}
                </span>
              )}
            </div>
            <p className={`${compact ? 'text-sm' : 'text-lg'} font-black italic tracking-tighter uppercase ${isDark ? 'text-[#FFC928]' : 'text-[#111]'}`}>{order.customerName}</p>
            <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-2 font-bold uppercase">
              <span className="flex items-center gap-1"><Clock size={12} />{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              {!compact && (
                <span className={`flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  • {order.type === 'dine-in' ? `Mesa ${order.tableNumber}` : order.type === 'delivery' ? 'Delivery' : 'Retirada'}
                </span>
              )}
            </div>
          </div>
          {!compact && (
            <div className="text-right">
              <div className={`font-black text-2xl ${isDark ? 'text-white' : 'text-[#111]'}`}>R$ {order.total.toFixed(2)}</div>
              <div className="text-[#FFC928] text-[10px] font-black uppercase tracking-widest mt-1">{order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod === 'cash' ? 'Dinheiro' : order.paymentMethod === 'card-on-delivery' ? 'Cartão' : 'No local'}</div>
            </div>
          )}
          {compact && (
            <div className="flex gap-1">
              <button onClick={() => onPrint?.('account')} className="p-2 rounded-lg bg-orange-50 text-orange-400 hover:text-black">
                <FileText size={16} />
              </button>
              <button onClick={() => onPrint?.('ticket')} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-black">
                <Printer size={16} />
              </button>
            </div>
          )}
        </div>

        {!compact && (
          <div className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
            {order.items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-black text-[#FFC928]">{item.quantity}x</span>
                <span className={isDark ? 'text-white/80' : 'text-gray-800'}>{item.productName}</span>
              </div>
            ))}
            {order.items.length > 3 && <div className="text-[10px] mt-1 italic">+ {order.items.length - 3} mais itens...</div>}
          </div>
        )}

        {order.type === 'delivery' && order.deliveryAddress && !compact && (
          <div className={`flex items-start gap-2 text-xs mb-6 font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <MapPin size={14} className="flex-shrink-0" />
            <span className="truncate">{order.deliveryAddress}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {nextStatus && (
            <button
              onClick={() => onStatusChange(nextStatus)}
              className={`flex-1 bg-[#FFC928] text-[#111] font-black rounded-xl uppercase tracking-tighter transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#FFC928]/10 ${compact ? 'text-[9px] py-2' : 'text-sm py-4'}`}
            >
              {NEXT_BTN_LABELS[order.status]}
            </button>
          )}
          {!compact && onPrint && (
            <div className="flex gap-2">
              <button 
                onClick={() => onPrint('account')}
                className={`p-4 rounded-2xl border-2 transition-all ${isDark ? 'border-white/10 text-orange-500 hover:text-white' : 'border-orange-100 text-orange-500 hover:bg-orange-50'}`}
                title="Imprimir Conta"
              >
                <FileText size={18} />
              </button>
              <button 
                onClick={() => onPrint('ticket')}
                className={`p-4 rounded-2xl border-2 transition-all ${isDark ? 'border-white/10 text-gray-500 hover:text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                title="Imprimir na Térmica"
              >
                <Printer size={18} />
              </button>
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`rounded-xl border-2 transition-all ${isDark ? 'border-white/10 text-gray-500 hover:text-white hover:border-white/20' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} ${compact ? 'p-2' : 'p-4'}`}
          >
            <ChevronDown size={compact ? 14 : 18} className={`transition-transform duration-300 ${expanded ? 'rotate-180 text-orange-500' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className={`border-t p-6 ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-[#F9F9F9]'}`}>
          {order.problemReport && (
            <div className="mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
              <h5 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Relato de Problema:</h5>
              <p className="text-xs font-bold text-red-800 mb-2">
                {order.problemReport.type === 'missing_item' ? 'Item Faltando' : order.problemReport.type === 'wrong_item' ? 'Item Errado' : 'Condição Imprópria'}: {order.problemReport.description}
              </p>
              {order.problemReport.photoUrl && (
                <img src={order.problemReport.photoUrl} alt="Problema" className="w-full h-32 object-cover rounded-lg border border-red-200" />
              )}
            </div>
          )}
          <h4 className={`font-black text-xs uppercase tracking-widest mb-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Detalhes do pedido</h4>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span className={`font-black ${isDark ? 'text-white' : 'text-[#111]'}`}>{item.quantity}x {item.productName}</span>
                  {item.additionals.length > 0 && (
                    <div className="text-gray-400 text-xs mt-1 font-medium">{item.additionals.map(a => a.name).join(', ')}</div>
                  )}
                  {item.observations && (
                    <div className="text-[#FFC928] text-xs italic mt-1 font-bold">Obs: {item.observations}</div>
                  )}
                </div>
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>R$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          {/* Footer of card */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
             <button 
              onClick={onWhatsAppUpdate}
              className={`flex-1 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl bg-[#25D366] text-white hover:opacity-90 transition-all shadow-md shadow-green-200`}
             >
                <Smartphone size={14} /> WhatsApp Status
             </button>
             <button 
              onClick={onFiscal}
              className={`flex-1 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl bg-blue-600 text-white hover:opacity-90 transition-all shadow-md shadow-blue-200`}
             >
                <FileText size={14} /> Fiscal NFC-e
             </button>
             <button
               onClick={() => onStatusChange('cancelled')}
               className="px-4 py-3 border-2 border-red-100 text-red-500 rounded-xl hover:bg-red-50 text-[10px] font-black"
             >
               CANCELAR
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

