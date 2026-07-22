import React, { useState, useRef, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '../../components/Button';
import { toast } from 'react-hot-toast';
import { QrCode as QrIcon, Copy, Settings, Store, Truck, MapPin, Phone, Plus, Trash2, Clock, Download, Volume2, Printer, Zap, Smartphone, XCircle, FileText, Upload, Shield, Key, Star, AlertTriangle, Check, FileSpreadsheet, Search, ChevronDown, ChevronUp, Eye, CreditCard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Skeleton } from '../../components/Skeleton';
import { cn, sanitizeCSVCell, escapeHtml } from '../../lib/utils';
import AdminLayout from './AdminLayout';
import { validateFiscalXML, generateDemoValidFiscalXML, isValidCNPJ } from '../../services/fiscalValidationService';

export default function StoreSettings() {
  const { currentRestaurant: restaurant, setCurrentRestaurant } = useRestaurant();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [testXml, setTestXml] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationLogs, setValidationLogs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('meuovo_xml_validation_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [logFilter, setLogFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const getPatternAnalysis = () => {
    const invalidLogs = validationLogs.filter(l => !l.isValid);
    if (invalidLogs.length === 0) return { totalInvalid: 0, commonFails: [] };

    const errorCounts: Record<string, { count: number; category: string; code: string; suggestion: string }> = {};

    invalidLogs.forEach(log => {
      const result = validateFiscalXML(log.xmlSnippet);
      result.errors.forEach(err => {
        let category = "Falha no XML / Schema";
        let code = "Rejeição 225 - Falha no Schema XML";
        let suggestion = "Verifique o fechamento de tags estruturais e a formatação básica do XML fiscal.";

        const lowerErr = err.toLowerCase();
        if (lowerErr.includes("infnfe") || lowerErr.includes("raiz")) {
          category = "Estrutura Root Fiscal";
          code = "Rejeição 225 - Falha de Schema Estrutural";
          suggestion = "Tag raiz <NFe> ou <nfeProc> não encontrada, ou tag <infNFe> mal posicionada. Certifique-se de carregar um documento compatível.";
        } else if (lowerErr.includes("modelo fiscal") || lowerErr.includes("mod")) {
          category = "Modelo Técnico da Nota";
          code = "Rejeição 225 / 454 - Modelo Fiscal Não Suportado";
          suggestion = "A tag <mod> deve conter '55' para NF-e padrão ou '65' para NFC-e (Cupom de Venda).";
        } else if (lowerErr.includes("cnpj") || lowerErr.includes("emitente")) {
          category = "CNPJ Emitente Inválido";
          code = "Rejeição 203 - CNPJ Emitente Inválido ou Não Autorizado";
          suggestion = "A tag <emit><CNPJ> precisa conter 14 caracteres numéricos e passar no cálculo de dígitos da SEFAZ.";
        } else if (lowerErr.includes("numero fiscal") || lowerErr.includes("nnf")) {
          category = "Sequência de Emissão";
          code = "Rejeição 502 / 503 - Série ou Número de Nota Inválido";
          suggestion = "A tag <nNF> deve ser preenchida com valores inteiros estritamente positivos (entre 1 e 999999999).";
        } else if (lowerErr.includes("cfop")) {
          category = "Classificação da Atividade";
          code = "Rejeição 225 / 525 - CFOP Inexistente ou Divergente";
          suggestion = "A tag <CFOP> do item deve ter 4 caracteres numéricos em conformidade com o código fiscal de operações.";
        } else if (lowerErr.includes("item") || lowerErr.includes("det")) {
          category = "Grade de Produtos";
          code = "Rejeição 225 - Falha de Schema estrutural";
          suggestion = "É necessário incluir pelo menos 1 grupo de produto <det nItem=\"1\"> preenchido com produto e valores.";
        }

        const key = `${category}::${code}`;
        if (!errorCounts[key]) {
          errorCounts[key] = { count: 0, category, code, suggestion };
        }
        errorCounts[key].count++;
      });
    });

    const sorted = Object.values(errorCounts).sort((a, b) => b.count - a.count);
    return {
      totalInvalid: invalidLogs.length,
      commonFails: sorted
    };
  };
  
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

  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    description: restaurant?.description || '',
    isOpen: restaurant?.isOpen ?? true,
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
    blockProblematicCustomers: restaurant?.orderSettings?.blockProblematicCustomers ?? false,
    minAcceptableRating: restaurant?.orderSettings?.minAcceptableRating ?? 3.0,
    pixKey: restaurant?.pixKey || '',
    // Payment Settings
    acceptCreditCard: restaurant?.paymentSettings?.acceptCreditCard ?? false,
    creditCardLink: restaurant?.paymentSettings?.creditCardLink || '',
    acceptDebit: restaurant?.paymentSettings?.acceptDebit ?? false,
    debitLink: restaurant?.paymentSettings?.debitLink || '',
    acceptVoucher: restaurant?.paymentSettings?.acceptVoucher ?? false,
    voucherLink: restaurant?.paymentSettings?.voucherLink || '',
    // Fiscal settings
    nfeEnabled: restaurant?.fiscalSettings?.nfeEnabled ?? false,
    nfeCnpj: restaurant?.fiscalSettings?.nfeCnpj || '',
    nfeInscricaoEstadual: restaurant?.fiscalSettings?.nfeInscricaoEstadual || '',
    nfeCertificateName: restaurant?.fiscalSettings?.nfeCertificateName || '',
    nfePassword: restaurant?.fiscalSettings?.nfePassword || '',
    nfeEnvironment: (restaurant?.fiscalSettings?.nfeEnvironment || 'homologacao') as 'homologacao' | 'producao',
    nfeCscId: restaurant?.fiscalSettings?.nfeCscId || '',
    nfeCscToken: restaurant?.fiscalSettings?.nfeCscToken || '',
    satEnabled: restaurant?.fiscalSettings?.satEnabled ?? false,
    satSerialNumber: restaurant?.fiscalSettings?.satSerialNumber || '',
    regimeTributario: (restaurant?.fiscalSettings?.regimeTributario || 'simples') as 'simples' | 'regime_normal' | 'mei',
    nfeSerie: restaurant?.fiscalSettings?.nfeSerie || '1',
    nfeNumber: restaurant?.fiscalSettings?.nfeNumber || '1',
    satActivationCode: restaurant?.fiscalSettings?.satActivationCode || '',
    satAssinaturaAC: restaurant?.fiscalSettings?.satAssinaturaAC || '',
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
            ${settings.customHeader ? `<h3 style="margin: 0; font-size: 1.1em;">${escapeHtml(settings.customHeader)}</h3>` : ''}
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
          ${settings.customFooter ? `<p style="text-align: center; font-size: 0.9em; margin-top: 10px; border-top: 1px dotted #000; padding-top: 5px;">${escapeHtml(settings.customFooter)}</p>` : ''}
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
      setFormData(prev => ({
        ...prev,
        name: restaurant.name || '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        whatsapp: restaurant.whatsapp || '',
        cuisineType: restaurant.cuisineType || '',
        priceRange: restaurant.priceRange || 'low',
        deliveryEnabled: restaurant.deliveryEnabled ?? true,
        pickupEnabled: restaurant.pickupEnabled ?? true,
        dineInEnabled: restaurant.dineInEnabled ?? true,
        deliveryFee: restaurant.deliverySettings?.fee || 0,
        estimatedTime: restaurant.deliverySettings?.estimatedTime || '',
        minOrder: restaurant.deliverySettings?.minOrder || 0,
        feeByNeighborhood: restaurant.deliverySettings?.feeByNeighborhood || [],
        autoAccept: restaurant.orderSettings?.autoAccept ?? false,
        soundAlert: restaurant.orderSettings?.soundAlert ?? true,
        thermalPrinterEnabled: restaurant.orderSettings?.thermalPrinterEnabled ?? false,
        whatsappNotificationsEnabled: restaurant.orderSettings?.whatsappNotificationsEnabled ?? false,
        whatsappWebhookUrl: restaurant.orderSettings?.whatsappWebhookUrl || '',
        blockProblematicCustomers: restaurant.orderSettings?.blockProblematicCustomers ?? false,
        minAcceptableRating: restaurant.orderSettings?.minAcceptableRating ?? 3.0,
        pixKey: restaurant.pixKey || '',
        acceptCreditCard: restaurant.paymentSettings?.acceptCreditCard ?? false,
        creditCardLink: restaurant.paymentSettings?.creditCardLink || '',
        acceptDebit: restaurant.paymentSettings?.acceptDebit ?? false,
        debitLink: restaurant.paymentSettings?.debitLink || '',
        acceptVoucher: restaurant.paymentSettings?.acceptVoucher ?? false,
        voucherLink: restaurant.paymentSettings?.voucherLink || '',
        nfeEnabled: restaurant.fiscalSettings?.nfeEnabled ?? false,
        nfeCnpj: restaurant.fiscalSettings?.nfeCnpj || '',
        nfeInscricaoEstadual: restaurant.fiscalSettings?.nfeInscricaoEstadual || '',
        nfeCertificateName: restaurant.fiscalSettings?.nfeCertificateName || '',
        nfePassword: restaurant.fiscalSettings?.nfePassword || '',
        nfeEnvironment: restaurant.fiscalSettings?.nfeEnvironment || 'homologacao',
        nfeCscId: restaurant.fiscalSettings?.nfeCscId || '',
        nfeCscToken: restaurant.fiscalSettings?.nfeCscToken || '',
        satEnabled: restaurant.fiscalSettings?.satEnabled ?? false,
        satSerialNumber: restaurant.fiscalSettings?.satSerialNumber || '',
        regimeTributario: restaurant.fiscalSettings?.regimeTributario || 'simples',
        nfeSerie: restaurant.fiscalSettings?.nfeSerie || '1',
        nfeNumber: restaurant.fiscalSettings?.nfeNumber || '1',
        satActivationCode: restaurant.fiscalSettings?.satActivationCode || '',
        satAssinaturaAC: restaurant.fiscalSettings?.satAssinaturaAC || '',
      }));
    }
  }, [restaurant]);

  const formatCNPJ = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 14);
    if (clean.length <= 2) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
    if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
    if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData({...formData, nfeCnpj: formatted});
  };

  const downloadValidationLogsCSV = () => {
    if (validationLogs.length === 0) {
      toast.error("Nenhum registro no histórico para exportar.");
      return;
    }

    try {
      const headers = [
        "ID",
        "Data/Hora de Auditoria",
        "Compativel Sefaz 4.00",
        "Erros Criticos",
        "Advertencias/Avisos",
        "Modelo Fiscal",
        "Serie",
        "Numero Nota",
        "Valor Total da Nota (RS)",
        "Ambiente Sefaz",
        "CNPJ Emitente",
        "CNPJ Destinatario",
        "Chave de Acesso"
      ];

      const csvRows = [
        headers.join(";")
      ];

      for (const log of validationLogs) {
        const row = [
          log.id,
          new Date(log.timestamp).toLocaleString('pt-BR'),
          log.isValid ? "SIM" : "NAO",
          log.errorsCount || 0,
          log.warningsCount || 0,
          log.metadata?.modelo || "N/A",
          log.metadata?.serie || "N/A",
          log.metadata?.numeroNota || "N/A",
          (log.metadata?.valorTotalNota || 0).toFixed(2),
          log.metadata?.ambiente || "Homologacao",
          log.metadata?.cnpjEmitente || "N/A",
          log.metadata?.cnpjDestinatario || "N/A",
          log.metadata?.chaveAcesso || "Gerada Dinamicamente"
        ];

        const escapedRow = row.map(val => sanitizeCSVCell(String(val)));

        csvRows.push(escapedRow.join(";"));
      }

      // prepend BOM so Excel parses UTF-8 correctly
      const csvContent = "\ufeff" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `auditoria_fiscal_parceiro_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Log histórico exportado em CSV com sucesso!");
    } catch (err) {
      console.error("Erro exportando CSV:", err);
      toast.error("Falha ao exportar log histórico em CSV.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);

    try {
      const deliveryFeeNum = parseFloat(formData.deliveryFee.toString());
      const minOrderNum = parseFloat(formData.minOrder.toString());
      const updatedFields = {
        name: formData.name,
        description: formData.description,
        isOpen: formData.isOpen,
        address: formData.address,
        whatsapp: formData.whatsapp,
        cuisineType: formData.cuisineType,
        priceRange: formData.priceRange,
        deliveryEnabled: formData.deliveryEnabled,
        pickupEnabled: formData.pickupEnabled,
        dineInEnabled: formData.dineInEnabled,
        pixKey: formData.pixKey,
        deliveryFee: deliveryFeeNum,
        minimumOrder: isNaN(minOrderNum) ? 0 : minOrderNum,
        paymentSettings: {
          acceptCreditCard: formData.acceptCreditCard,
          creditCardLink: formData.creditCardLink,
          acceptDebit: formData.acceptDebit,
          debitLink: formData.debitLink,
          acceptVoucher: formData.acceptVoucher,
          voucherLink: formData.voucherLink,
        },
        deliverySettings: {
          fee: deliveryFeeNum,
          estimatedTime: formData.estimatedTime,
          minOrder: minOrderNum,
          feeByNeighborhood: formData.feeByNeighborhood
        },
        orderSettings: {
          autoAccept: formData.autoAccept,
          soundAlert: formData.soundAlert,
          thermalPrinterEnabled: formData.thermalPrinterEnabled,
          whatsappNotificationsEnabled: formData.whatsappNotificationsEnabled,
          whatsappWebhookUrl: formData.whatsappWebhookUrl,
          blockProblematicCustomers: formData.blockProblematicCustomers,
          minAcceptableRating: parseFloat(formData.minAcceptableRating?.toString() || '3.0'),
        },
        fiscalSettings: {
          nfeEnabled: formData.nfeEnabled,
          nfeCnpj: formData.nfeCnpj,
          nfeInscricaoEstadual: formData.nfeInscricaoEstadual,
          nfeCertificateName: formData.nfeCertificateName,
          nfePassword: formData.nfePassword,
          nfeEnvironment: formData.nfeEnvironment,
          nfeCscId: formData.nfeCscId,
          nfeCscToken: formData.nfeCscToken,
          satEnabled: formData.satEnabled,
          satSerialNumber: formData.satSerialNumber,
          regimeTributario: formData.regimeTributario,
          nfeSerie: formData.nfeSerie,
          nfeNumber: formData.nfeNumber,
          satActivationCode: formData.satActivationCode,
          satAssinaturaAC: formData.satAssinaturaAC,
        }
      };

      await updateDoc(doc(db, 'restaurants', restaurant.id), updatedFields);
      
      setCurrentRestaurant({
        ...restaurant,
        ...updatedFields
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
    const url = `${window.location.origin}/r/${restaurant?.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const menuUrl = `${window.location.origin}/r/${restaurant?.slug}`;

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
      </AdminLayout>
    );
  }

  const filteredValidationLogs = validationLogs.filter(log => {
    const matchSearch = !logSearch || 
      (log.metadata?.numeroNota && String(log.metadata.numeroNota).toLowerCase().includes(logSearch.toLowerCase())) ||
      (log.metadata?.chaveAcesso && String(log.metadata.chaveAcesso).toLowerCase().includes(logSearch.toLowerCase())) ||
      (log.metadata?.cnpjEmitente && String(log.metadata.cnpjEmitente).replace(/\D/g, '').includes(logSearch.replace(/\D/g, ''))) ||
      (log.xmlSnippet && log.xmlSnippet.toLowerCase().includes(logSearch.toLowerCase()));

    if (logFilter === 'valid') {
       return matchSearch && log.isValid;
    }
    if (logFilter === 'invalid') {
       return matchSearch && !log.isValid;
    }
    return matchSearch;
  });

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
                <div className="space-y-1.5 font-sans">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">WhatsApp de Vendas</label>
                   <input 
                     type="text" 
                     value={formData.whatsapp}
                     onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                     className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-slate-300 font-sans"
                     placeholder="(00) 00000-0000"
                   />
                </div>
              </div>

              <div className="grid sm:grid-cols-1 gap-4 font-sans">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                     <span>Chave Pix de Recebimento</span>
                     <span className="text-[9px] text-orange-600 font-semibold uppercase italic tracking-normal">Ativa QR Code Dinâmico</span>
                   </label>
                   <input 
                     type="text" 
                     value={formData.pixKey}
                     onChange={e => setFormData({...formData, pixKey: e.target.value})}
                     className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-slate-300 font-mono"
                     placeholder="Celular, CPF/CNPJ, E-mail ou Chave Aleatória"
                   />
                   <p className="text-[9px] text-slate-400 font-medium italic">Insira sua chave Pix para habilitar o pagamento automático por Pix Copia e Cola no checkout dos clientes.</p>
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
                      onChange={e => setFormData({...formData, priceRange: e.target.value as 'low' | 'medium' | 'high'})}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                <h3 className="text-[11px] font-black text-brand-black uppercase tracking-[0.2em]">Funcionamento</h3>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">Restaurante Aberto</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Aceitar novos pedidos agora</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => setFormData({...formData, isOpen: !formData.isOpen})}
                   className={cn(
                     "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                     formData.isOpen ? "bg-green-500" : "bg-slate-300"
                   )}
                 >
                   <div className={cn(
                     "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                     formData.isOpen ? "left-6" : "left-1"
                   )} />
                 </button>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                          aria-label="Excluir"
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

                      {/* Payment Settings */}
            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
               <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3 italic">
                 <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600 shadow-sm">
                   <CreditCard size={16} />
                 </div>
                 <h3 className="text-[11px] font-black text-brand-black uppercase tracking-[0.2em]">Recebimento & Link de Pagamento</h3>
               </div>

               <p className="text-xs text-slate-500 font-medium font-sans">
                 Configure como seus clientes poderão pagar após a confirmação do pedido. O PIX já está configurado com sua chave acima. Adicione também um link de cartão de crédito se desejar.
               </p>

               <div className="grid sm:grid-cols-2 gap-4 pt-2">
                 <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2.5 flex-1 text-left">
                       <CreditCard size={16} className="text-emerald-500 shrink-0" />
                       <div className="text-left">
                          <p className="text-[10px] font-black text-slate-700 uppercase">Aceitar Cartão</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">Exibir link de pagamento via cartão</p>
                       </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, acceptCreditCard: !formData.acceptCreditCard})}
                      className={cn(
                        "h-5 w-10 min-w-[2.5rem] rounded-full relative transition-colors duration-200 focus:outline-none",
                        formData.acceptCreditCard ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                        formData.acceptCreditCard ? "left-6" : "left-0.5"
                      )} />
                    </button>
                 </div>
               </div>

               {formData.acceptCreditCard && (
                 <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Link de Pagamento (Cartão de Crédito)</label>
                       <input 
                         type="url" 
                         value={formData.creditCardLink}
                         onChange={e => setFormData({...formData, creditCardLink: e.target.value})}
                         className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                         placeholder="https://seu-link-pagamento.com/pagar/"
                       />
                       <p className="text-[9px] text-slate-400 font-medium italic">
                         Insira a URL de checkout do seu gateway de pagamento (Mercado Pago, Stripe, etc.). O cliente será redirecionado após a confirmação do pedido.
                       </p>
                    </div>
                 </div>
                )}

                {/* Débito */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2.5 flex-1 text-left">
                     <CreditCard size={16} className="text-blue-500 shrink-0" />
                     <div className="text-left">
                        <p className="text-[10px] font-black text-slate-700 uppercase">Aceitar Débito</p>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">Exibir link de pagamento via débito</p>
                     </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, acceptDebit: !formData.acceptDebit})}
                    className={cn(
                      "h-5 w-10 min-w-[2.5rem] rounded-full relative transition-colors duration-200 focus:outline-none",
                      formData.acceptDebit ? "bg-blue-500" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                      formData.acceptDebit ? "left-6" : "left-0.5"
                    )} />
                  </button>
                </div>

                {formData.acceptDebit && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Link de Pagamento (Cartão de Débito)</label>
                       <input 
                         type="url" 
                         value={formData.debitLink}
                         onChange={e => setFormData({...formData, debitLink: e.target.value})}
                         className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                         placeholder="https://seu-link-pagamento.com/debito/"
                       />
                       <p className="text-[9px] text-slate-400 font-medium italic">
                         Link para página de checkout de cartão de débito.
                       </p>
                    </div>
                  </div>
                )}

                {/* Voucher refeição */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2.5 flex-1 text-left">
                     <CreditCard size={16} className="text-purple-500 shrink-0" />
                     <div className="text-left">
                        <p className="text-[10px] font-black text-slate-700 uppercase">Aceitar Vale-Refeição</p>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">Ticket, VR, Sodexo, Alelo etc.</p>
                     </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, acceptVoucher: !formData.acceptVoucher})}
                    className={cn(
                      "h-5 w-10 min-w-[2.5rem] rounded-full relative transition-colors duration-200 focus:outline-none",
                      formData.acceptVoucher ? "bg-purple-500" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                      formData.acceptVoucher ? "left-6" : "left-0.5"
                    )} />
                  </button>
                </div>

                {formData.acceptVoucher && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Link de Pagamento (Vale-Refeição)</label>
                       <input 
                         type="url" 
                         value={formData.voucherLink}
                         onChange={e => setFormData({...formData, voucherLink: e.target.value})}
                         className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-slate-300"
                         placeholder="https://seu-link-pagamento.com/voucher/"
                       />
                       <p className="text-[9px] text-slate-400 font-medium italic">
                         Link para página de checkout de vale-refeição/alimentação.
                       </p>
                    </div>
                  </div>
                )}
             </section>

             {/* Módulo de Integração Fiscal (NFC-e / SAT) */}
            {/* Módulo de Segurança, Avaliações e Bloqueio de Clientes (Anti-Trote/Anti-fraude) */}
            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 font-sans text-left">
               <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3 italic">
                 <div className="p-1.5 bg-red-100 rounded-lg text-red-600 shadow-sm">
                   <Shield size={16} />
                 </div>
                 <h3 className="text-[11px] font-black text-brand-black uppercase tracking-[0.2em]">Reputação dos Clientes & Anti-Trote</h3>
               </div>

               <p className="text-xs text-slate-500 font-medium font-sans">
                 Evite trotes, grosserias e prejuízos definindo limites de aceitação para clientes baseados nas notas dadas por outros restaurantes da plataforma.
               </p>

               <div className="grid sm:grid-cols-2 gap-4 pt-2">
                 <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2.5 flex-1 text-left">
                       <Shield size={16} className="text-red-500 shrink-0" />
                       <div className="text-left">
                          <p className="text-[10px] font-black text-slate-700 uppercase">Bloquear no Checkout</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">Recusar pedidos de clientes problemáticos na finalização</p>
                       </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, blockProblematicCustomers: !formData.blockProblematicCustomers})}
                      className={cn(
                        "h-5 w-10 min-w-[2.5rem] rounded-full relative transition-colors duration-200 focus:outline-none",
                        formData.blockProblematicCustomers ? "bg-red-500" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                        formData.blockProblematicCustomers ? "left-6" : "left-0.5"
                      )} />
                    </button>
                 </div>

                 <div className="space-y-1.5 py-2 px-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col justify-center">
                    <div className="flex justify-between items-center">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                         <Star size={12} className="text-yellow-500 fill-yellow-500 duration-200" /> Nota Mínima Tolerada
                       </label>
                       <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">{(formData.minAcceptableRating ?? 3.0).toFixed(1)} ★</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.0" 
                      max="5.0" 
                      step="0.1"
                      value={formData.minAcceptableRating}
                      onChange={e => setFormData({...formData, minAcceptableRating: parseFloat(e.target.value)})}
                      className="w-full h-1 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <p className="text-[8px] text-slate-400 font-semibold uppercase leading-none text-left">
                      Clientes com média individual inferior a este valor serão {formData.blockProblematicCustomers ? "impedidos de fazer pedido" : "sinalizados no painel operacional"}.
                    </p>
                 </div>
               </div>
            </section>

            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 font-sans text-left">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3 italic">
                  <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600 shadow-sm">
                    <FileText size={16} />
                  </div>
                  <h3 className="text-[11px] font-black text-brand-black uppercase tracking-[0.2em]">Configurações Fiscais (NFC-e / SAT)</h3>
                </div>

                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                  Configure o certificado digital (A1), credenciais da SEFAZ para emissão automática de NFC-e, ou os parâmetros de integração com o hardware SAT.
                </p>

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                   <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-100 font-sans">
                      <div className="flex items-center gap-2 text-left">
                         <FileText size={14} className="text-orange-500" />
                         <div>
                            <p className="text-[10px] font-bold text-slate-700 uppercase">Emissão NFC-e</p>
                            <p className="text-[8px] text-slate-400 font-black uppercase leading-none">Nota Fiscal Eletrônica</p>
                         </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, nfeEnabled: !formData.nfeEnabled})}
                        className={cn(
                          "h-4 w-8 rounded-full relative transition-colors duration-200 focus:outline-none",
                          formData.nfeEnabled ? "bg-orange-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                          formData.nfeEnabled ? "left-4.5" : "left-0.5"
                        )} />
                      </button>
                   </div>

                   <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-100 font-sans">
                      <div className="flex items-center gap-2 text-left">
                         <Settings size={14} className="text-orange-500" />
                         <div>
                            <p className="text-[10px] font-bold text-slate-705 uppercase font-sans">Emissão via SAT</p>
                            <p className="text-[8px] text-slate-400 font-black uppercase leading-none">Cupom Fiscal (SP)</p>
                         </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, satEnabled: !formData.satEnabled})}
                        className={cn(
                          "h-4 w-8 rounded-full relative transition-colors duration-200 focus:outline-none",
                          formData.satEnabled ? "bg-orange-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                          formData.satEnabled ? "left-4.5" : "left-0.5"
                        )} />
                      </button>
                   </div>
                </div>

                {/* NFC-e configuration details */}
                {formData.nfeEnabled && (
                  <div className="space-y-4 border-t border-slate-100 pt-4 animate-in slide-in-from-top-2 duration-200 font-sans text-left">
                     <p className="text-[10px] font-black text-orange-600 uppercase tracking-wide">Parâmetros de Emissão NFC-e</p>
                     
                     <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">CNPJ emitente</label>
                           <div className="relative flex items-center">
                             <input 
                               type="text"
                               placeholder="00.000.000/0000-00"
                               value={formData.nfeCnpj}
                               onChange={handleCnpjChange}
                               className={cn(
                                 "w-full border rounded-md p-2 pr-8 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none transition-colors",
                                 isValidCNPJ(formData.nfeCnpj) 
                                   ? "border-green-500 focus:border-green-500 focus:ring-green-500 text-green-700 bg-green-50/10" 
                                   : (formData.nfeCnpj && formData.nfeCnpj.replace(/\D/g, '').length === 14) 
                                     ? "border-red-500 focus:border-red-500 focus:ring-red-500 text-red-700 bg-red-50/5" 
                                     : "border-slate-200"
                               )}
                             />
                             {isValidCNPJ(formData.nfeCnpj) && (
                               <span className="absolute right-2.5 text-green-500 flex items-center justify-center animate-in zoom-in-50 duration-200">
                                 <Check size={14} className="stroke-[3]" strokeWidth={3} />
                                </span>
                             )}
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Inscrição Estadual (I.E.)</label>
                           <input 
                             type="text"
                             placeholder="Ex: 123.456.789.110"
                             value={formData.nfeInscricaoEstadual}
                             onChange={e => setFormData({...formData, nfeInscricaoEstadual: e.target.value})}
                             className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Regime Tributário</label>
                           <select
                             value={formData.regimeTributario}
                             onChange={e => setFormData({...formData, regimeTributario: e.target.value as 'simples' | 'regime_normal' | 'mei'})}
                             className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 bg-white outline-none"
                           >
                              <option value="simples">Simples Nacional</option>
                              <option value="mei">MEI (Microempreendedor)</option>
                              <option value="regime_normal">Regime Normal (Lucro Presumido/Real)</option>
                           </select>
                        </div>
                     </div>

                     <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Série NFC-e</label>
                           <input 
                             type="text"
                             placeholder="Ex: 1"
                             value={formData.nfeSerie}
                             onChange={e => setFormData({...formData, nfeSerie: e.target.value})}
                             className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Próximo Número de Nota</label>
                           <input 
                             type="number"
                             min="1"
                             placeholder="Ex: 101"
                             value={formData.nfeNumber}
                             onChange={e => setFormData({...formData, nfeNumber: e.target.value})}
                             className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                           />
                        </div>
                     </div>

                     {/* Certificado Digital upload simulator */}
                     <div className="p-4 border-2 border-dashed border-slate-200 hover:border-orange-300 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-center transition-all">
                        <Upload size={24} className="text-slate-400 mb-2" />
                        <p className="text-xs font-bold text-slate-700 uppercase">Certificado Digital (A1 / .pfx / .p12)</p>
                        <p className="text-[9px] text-slate-400 font-bold mb-3 uppercase tracking-wide">Selecione o arquivo do certificado para assinatura eletrônica</p>
                        
                        <div className="relative">
                           <input 
                             type="file" 
                             accept=".pfx,.p12"
                             onChange={e => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 setFormData(prev => ({ ...prev, nfeCertificateName: file.name }));
                                 toast.success(`Certificado "${file.name}" carregado com sucesso!`);
                               }
                             }}
                             className="absolute inset-0 opacity-0 cursor-pointer w-full"
                           />
                           <button 
                             type="button"
                             className="px-4 py-2 bg-[#111] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-sm focus:outline-none"
                           >
                             Selecionar Arquivo Certificado
                           </button>
                        </div>

                        {formData.nfeCertificateName && (
                           <div className="mt-3 flex flex-col items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-100 animate-in fade-in duration-200">
                              <div className="flex items-center gap-1.5">
                                 <Shield size={12} />
                                 <span className="text-[10px] font-black uppercase tracking-wider font-sans">Ativo: {formData.nfeCertificateName}</span>
                              </div>
                              <span className="text-[8px] font-black uppercase text-emerald-600">Simulação: CERTIFICADO AUTENTICADO COM SUCESSO ✅</span>
                           </div>
                        )}
                     </div>

                     <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Senha do Certificado</label>
                           <div className="relative">
                              <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                type="password"
                                placeholder="Senha do arquivo .PFX"
                                value={formData.nfePassword}
                                onChange={e => setFormData({...formData, nfePassword: e.target.value})}
                                className="w-full border border-slate-200 rounded-md py-2 pl-8 pr-3 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                              />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Ambiente Sefaz</label>
                           <select
                             value={formData.nfeEnvironment}
                             onChange={e => setFormData({...formData, nfeEnvironment: e.target.value as 'homologacao' | 'producao'})}
                             className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 bg-white outline-none"
                           >
                              <option value="homologacao">Homologação (Ambiente de Testes)</option>
                              <option value="producao">Produção (Documento Fiscal Real)</option>
                           </select>
                        </div>
                     </div>

                     <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">ID do Token CSC (Ex: 000001)</label>
                           <input 
                             type="text"
                             placeholder="Identificador CSC no portal SEFAZ"
                             value={formData.nfeCscId}
                             onChange={e => setFormData({...formData, nfeCscId: e.target.value})}
                             className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Código de Segurança CSC (Token)</label>
                           <input 
                             type="text"
                             placeholder="Código CSC obtido na SEFAZ"
                             value={formData.nfeCscToken}
                             onChange={e => setFormData({...formData, nfeCscToken: e.target.value})}
                             className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                           />
                        </div>
                     </div>
                  </div>
                )}

                {/* SAT Configuration details */}
                {formData.satEnabled && (
                  <div className="space-y-4 border-t border-slate-100 pt-4 animate-in slide-in-from-top-2 duration-200 font-sans text-left">
                     <p className="text-[10px] font-black text-orange-600 uppercase tracking-wide">Mapeamento e Parâmetros SAT-CF-e</p>
                     
                     <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Número de Série do Equipamento SAT</label>
                           <input 
                             type="text"
                             placeholder="Ex: 000.123.456-78"
                             value={formData.satSerialNumber}
                             onChange={e => setFormData({...formData, satSerialNumber: e.target.value})}
                             className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-550 uppercase tracking-wider">Código de Ativação SAT</label>
                           <input 
                             type="password"
                             placeholder="Senha dita na ativação do SAT"
                             value={formData.satActivationCode}
                             onChange={e => setFormData({...formData, satActivationCode: e.target.value})}
                             className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                           />
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Assinatura Digital AC (Assinatura de Vinculação)</label>
                        <textarea 
                          rows={2}
                          placeholder="Assinatura digital base64 gerada pela software house para comunicação com o SAT"
                          value={formData.satAssinaturaAC}
                          onChange={e => setFormData({...formData, satAssinaturaAC: e.target.value})}
                          className="w-full border border-slate-200 rounded-md p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                        />
                        <p className="text-[9px] text-slate-400 font-bold italic uppercase leading-relaxed pt-1">
                           O equipamento físico deve estar conectado na rede local e pareado via integração de driver DLL de comunicação SAT.
                        </p>
                     </div>
                  </div>
                )}
             </section>

{/* Validador de Schema e Consistência XML SEFAZ */}
            <div id="fiscal-validator-section" className="mt-6 pt-5 border-t border-slate-100 font-sans">
               <div className="flex items-center gap-1.5 mb-2.5 text-left">
                  <Shield size={14} className="text-orange-500 animate-pulse" />
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">Validador de XML Fiscal (SEFAZ - Layout 4.00)</p>
               </div>
               <p className="text-[9px] text-slate-400 font-bold uppercase mb-3 text-left">
                  Garanta a integridade, sintaxe XML, dígito verificador da Chave de Acesso, validade de CNPJ e consistência matemática dos totais antes do envio para a SEFAZ.
               </p>

               <div className="space-y-3">
                  <textarea 
                     rows={6}
                     placeholder="Cole o XML gerado pela integração fiscal aqui..."
                     value={testXml}
                     onChange={e => setTestXml(e.target.value)}
                     className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-mono bg-slate-900 text-slate-100 leading-relaxed outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-600"
                  />
                  
                  <div className="flex gap-2">
                     <button
                       type="button"
                       onClick={() => {
                         const result = validateFiscalXML(testXml);
                         setValidationResult(result);

                         // Salvar nos logs históricos
                         const newLog = {
                           id: Date.now().toString(),
                           timestamp: new Date().toISOString(),
                           xmlSnippet: testXml,
                           isValid: result.isValid,
                           errorsCount: result.errors.length,
                           warningsCount: result.warnings.length,
                           metadata: result.metadata
                         };
                         const updatedLogs = [newLog, ...validationLogs];
                         setValidationLogs(updatedLogs);
                         localStorage.setItem('meuovo_xml_validation_logs', JSON.stringify(updatedLogs));

                         if (result.isValid) {
                           toast.success("XML fiscal validado com sucesso! Nenhuma inconsistência encontrada.");
                         } else {
                           toast.error(`Inconsistência encontrada! ${result.errors.length} erro(s) de validação.`);
                         }
                       }}
                       className="flex-1 py-2 px-3 bg-slate-900 border border-slate-950 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-sm cursor-pointer"
                     >
                       Validar XML da Nota
                     </button>
                     
                     <button
                       type="button"
                       onClick={() => {
                         const demoXml = generateDemoValidFiscalXML({
                           cnpjEmitente: formData.nfeCnpj || '00.000.000/0001-91',
                           cnpjDestinatario: '',
                           serie: formData.nfeSerie || '1',
                           numeroNota: formData.nfeNumber || '101',
                           valorTotal: 78.50,
                           environment: formData.nfeEnvironment === 'producao' ? '1' : '2'
                         });
                         setTestXml(demoXml);
                         setValidationResult(null);
                         toast.success("Rascunho de demonstração de XML gerado!");
                       }}
                       className="py-2 px-3 bg-white text-slate-700 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                     >
                       Preencher XML Demonstrativo
                     </button>
                  </div>

                  {validationResult && (
                     <div className={cn(
                        "p-4 rounded-xl border-2 transition-all duration-300 animate-in fade-in duration-200 text-left",
                        validationResult.isValid 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                          : "bg-red-50 border-red-200 text-red-950"
                     )}>
                        <div className="flex items-center gap-2 mb-2 font-black uppercase text-[10px] tracking-widest font-sans">
                           {validationResult.isValid ? (
                              <span className="text-emerald-600 flex items-center gap-1 font-sans font-black">✔ XML COMPATÍVEL COM REQUISITOS SEFAZ 4.00</span>
                           ) : (
                              <span className="text-red-600 flex items-center gap-1 font-sans font-black">✘ REJEIÇÃO / FALHA DE SCHEMA TÉCNICO</span>
                           )}
                        </div>

                        {validationResult.errors.length > 0 && (
                           <div className="mb-3 font-sans">
                              <p className="text-[9px] font-black text-red-700 uppercase tracking-wide mb-1 font-sans">Erros Críticos de Validação (Sefaz Rejeitaria):</p>
                              <ul className="list-disc pl-4 space-y-1 font-sans">
                                 {validationResult.errors.map((err: string, idx: number) => (
                                    <li key={idx} className="text-xs font-semibold leading-relaxed font-sans text-red-800">{err}</li>
                                 ))}
                              </ul>
                           </div>
                        )}

                        {validationResult.warnings.length > 0 && (
                           <div className="mb-3 border-t border-yellow-250/20 pt-2 font-sans">
                              <p className="text-[9px] font-black text-amber-700 uppercase tracking-wide mb-1 font-sans">Advertências de Negócio / Alertas:</p>
                              <ul className="list-disc pl-4 space-y-1 font-sans">
                                 {validationResult.warnings.map((warn: string, idx: number) => (
                                    <li key={idx} className="text-xs font-semibold text-amber-800 leading-relaxed font-sans">{warn}</li>
                                 ))}
                              </ul>
                           </div>
                        )}

                        {validationResult.metadata && (
                           <div className="border-t border-slate-200/50 pt-3 mt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-left font-sans">
                              <div>
                                 <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1 font-sans">Chave de Acesso</span>
                                 <span className="text-[10px] font-mono font-bold tracking-tight break-all">{validationResult.metadata.chaveAcesso || 'Gerada Dinamicamente'}</span>
                              </div>
                              <div>
                                 <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1 font-sans">Modelo / Série / Número</span>
                                 <span className="text-xs font-black text-slate-700 uppercase font-sans font-semibold">
                                    Mod {validationResult.metadata.modelo || '--'} &bull; Série {validationResult.metadata.serie || '--'} &bull; Nº {validationResult.metadata.numeroNota || '--'}
                                 </span>
                              </div>
                              <div>
                                 <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1 font-sans">Ambiente SEFAZ</span>
                                 <span className={cn(
                                    "text-[9px] font-black uppercase px-1.5 py-0.5 rounded font-sans",
                                    validationResult.metadata.ambiente === 'Producao' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                 )}>
                                    {validationResult.metadata.ambiente || 'Homologação'}
                                 </span>
                              </div>
                              <div>
                                 <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1 font-sans">Valor Declarado</span>
                                 <span className="text-xs font-black text-slate-700 font-sans font-black">R$ {(validationResult.metadata.valorTotalNota || 0).toFixed(2)}</span>
                              </div>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Intelligent Fiscal Diagnostics Analyzer */}
                  {validationLogs.length > 0 && (
                    (() => {
                      const analysis = getPatternAnalysis();
                      return (
                        <div className="mt-4 p-5 rounded-xl border border-orange-200/50 bg-[#FFFDF5]/40 text-left font-sans space-y-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={15} className="text-amber-500 animate-pulse" />
                            <div>
                              <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">Análise de IA & Padrões de Rejeição</h4>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Erros reincidentes mapeados e propostas para atualização de schema</p>
                            </div>
                          </div>

                          {analysis.totalInvalid === 0 ? (
                            <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5 py-1">
                              ✔ Ótima notícia! Nenhuma rejeição fiscal detectada no histórico recente de análises.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-[11px] text-slate-600 font-medium">
                                Encontramos <strong className="text-red-650">{analysis.totalInvalid} ocorrência(s) de inconformidade</strong>. Veja os padrões mapeados para os códigos oficiais SEFAZ e as devidas correções recomendadas de schema:
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                 {analysis.commonFails.slice(0, 4).map((fail: { count: number; category: string; code: string; suggestion: string }, idx: number) => (
                                  <div key={idx} className="p-3 bg-white border border-slate-150 rounded-lg shadow-sm space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[8px] font-black uppercase text-rose-500 tracking-wider font-sans bg-rose-50/50 px-1.5 py-0.5 rounded">
                                        {fail.category}
                                      </span>
                                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                                        Reincidência: {fail.count}x
                                      </span>
                                    </div>
                                    <h5 className="text-[10px] font-black text-slate-800 font-mono tracking-tight">{fail.code}</h5>
                                    <div className="pt-1.5 border-t border-slate-100/50">
                                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                        <strong className="text-slate-700 font-bold">Solução & Schema:</strong> {fail.suggestion}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}

                  {validationLogs.length > 0 && (
                     <div className="mt-4 p-4 bg-slate-50 border border-slate-250/60 rounded-xl text-left font-sans space-y-3.5 animate-in fade-in duration-200">
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
                           <div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Histórico & Logs de Auditoria</span>
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Histórico de validações fiscais locais ({validationLogs.length})</p>
                           </div>
                           <div className="flex items-center gap-2 shrink-0">
                              <button
                                 type="button"
                                 onClick={downloadValidationLogsCSV}
                                 className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 bg-emerald-50 border border-emerald-250/50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
                              >
                                 <FileSpreadsheet size={12} className="text-emerald-550 shrink-0" /> Exportar CSV
                              </button>
                              
                              <button
                                 type="button"
                                 onClick={() => {
                                    setValidationLogs([]);
                                    localStorage.removeItem('meuovo_xml_validation_logs');
                                    setExpandedLogId(null);
                                    toast.success("Histórico de validações limpo com sucesso!");
                                 }}
                                 className="flex items-center gap-1.5 text-[9px] font-black text-red-650 hover:text-red-850 hover:bg-red-100 bg-red-50 border border-red-200/50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                              >
                                 <Trash2 size={12} className="text-red-500 shrink-0" /> Limpar Histórico
                              </button>
                           </div>
                        </div>

                        {/* Search and Filters Toolbar */}
                        <div className="grid sm:grid-cols-12 gap-2 items-center">
                           <div className="relative sm:col-span-6">
                              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                 type="text"
                                 placeholder="Buscar por NF, chave, CNPJ ou trecho..."
                                 value={logSearch}
                                 onChange={e => setLogSearch(e.target.value)}
                                 className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-[10px] font-semibold text-slate-705 outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-400 shadow-xs"
                              />
                           </div>
                           
                           <div className="flex items-center gap-1 sm:col-span-6 sm:justify-end overflow-x-auto py-0.5">
                              <button
                                 type="button"
                                 onClick={() => setLogFilter('all')}
                                 className={cn(
                                    "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 border",
                                    logFilter === 'all' 
                                       ? "bg-slate-800 text-white border-slate-800" 
                                       : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                                 )}
                              >
                                 Todos ({validationLogs.length})
                              </button>
                              <button
                                 type="button"
                                 onClick={() => setLogFilter('valid')}
                                 className={cn(
                                    "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 border",
                                    logFilter === 'valid' 
                                       ? "bg-emerald-600 text-white border-emerald-600" 
                                       : "bg-white text-emerald-600 border-emerald-200/60 hover:bg-emerald-50/50"
                                 )}
                              >
                                 Válidos ({validationLogs.filter(l => l.isValid).length})
                              </button>
                              <button
                                 type="button"
                                 onClick={() => setLogFilter('invalid')}
                                 className={cn(
                                    "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 border",
                                    logFilter === 'invalid' 
                                       ? "bg-red-650 text-white border-red-650" 
                                       : "bg-white text-red-650 border-red-200/65 hover:bg-red-50/50"
                                 )}
                              >
                                 Rejeitados ({validationLogs.filter(l => !l.isValid).length})
                              </button>
                           </div>
                        </div>

                        {/* Logs List View */}
                        <div className="space-y-2 max-h-68 overflow-y-auto pr-1">
                           {filteredValidationLogs.length === 0 ? (
                              <div className="text-center py-6 bg-white border border-slate-150 rounded-lg">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma validação correspondente encontrada</p>
                              </div>
                           ) : (
                              filteredValidationLogs.map((log) => {
                                 const isExpanded = expandedLogId === log.id;
                                 return (
                                    <div 
                                       key={log.id}
                                       className={cn(
                                          "rounded-lg border transition-all overflow-hidden",
                                          log.isValid ? "bg-emerald-50/5 border-slate-200" : "bg-red-50/5 border-slate-200",
                                          isExpanded && (log.isValid ? "border-emerald-300 ring-1 ring-emerald-350/20" : "border-red-300 ring-1 ring-red-350/20")
                                       )}
                                    >
                                       {/* Header clickable row */}
                                       <div 
                                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                          className="p-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/40 select-none transition-colors"
                                       >
                                          <div className="space-y-1 text-left">
                                             <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={cn(
                                                   "text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0 tracking-widest",
                                                   log.isValid 
                                                      ? "bg-emerald-100 text-emerald-800" 
                                                      : "bg-red-100 text-red-800"
                                                )}>
                                                   {log.isValid ? "Válido" : "Rejeitado"}
                                                </span>
                                                <p className="text-[10px] font-bold text-slate-700 leading-none">
                                                   {log.metadata?.numeroNota ? `NF-e nº ${log.metadata.numeroNota}` : 'Nota sem Número'}
                                                   {log.metadata?.modelo && ` (Mod ${log.metadata.modelo})`}
                                                </p>
                                             </div>
                                             
                                             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide leading-none">
                                                {new Date(log.timestamp).toLocaleDateString('pt-BR')} às {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                                                {log.metadata?.valorTotalNota ? ` &bull; R$ ${parseFloat(log.metadata.valorTotalNota).toFixed(2)}` : ''}
                                                {log.errorsCount > 0 ? ` &bull; Erros: ${log.errorsCount}` : ''}
                                                {log.warningsCount > 0 ? ` &bull; Avisos: ${log.warningsCount}` : ''}
                                             </p>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                             <button
                                                type="button"
                                                title="Carregar no Editor"
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   setTestXml(log.xmlSnippet || '');
                                                   const res = validateFiscalXML(log.xmlSnippet || '');
                                                   setValidationResult(res);
                                                   toast.success(`Nota nº ${log.metadata?.numeroNota || 'S/N'} carregada no editor de validação.`);
                                                   // Scroll to top of validator nicely
                                                   const elem = document.getElementById('fiscal-validator-section');
                                                   if (elem) {
                                                      elem.scrollIntoView({ behavior: 'smooth' });
                                                   }
                                                }}
                                                className="p-1 text-slate-500 hover:text-orange-605 hover:bg-slate-150 rounded transition-all cursor-pointer"
                                                aria-label="Visualizar"
                                             >
                                                <Eye size={12} />
                                             </button>
                                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                                                {isExpanded ? "Fechar" : "Histórico"}
                                                {isExpanded ? <ChevronUp size={10} className="stroke-[3]" /> : <ChevronDown size={10} className="stroke-[3]" />}
                                             </span>
                                          </div>
                                       </div>

                                       {/* Expandable Panel */}
                                       {isExpanded && (
                                          <div className="border-t border-slate-200/50 bg-white/70 p-3 text-[10px] space-y-2.5 animate-in slide-in-from-top-1 duration-200 select-text">
                                             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-100 pb-2.5">
                                                <div>
                                                   <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor da Nota</span>
                                                   <span className="font-sans font-bold text-slate-700">R$ {parseFloat(log.metadata?.valorTotalNota || 0).toFixed(2)}</span>
                                                </div>
                                                <div>
                                                   <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Modelo / Série / Nº</span>
                                                   <span className="font-bold text-slate-700 uppercase">{log.metadata?.modelo || '--'} / {log.metadata?.serie || '--'} / {log.metadata?.numeroNota || '--'}</span>
                                                </div>
                                                <div>
                                                   <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">CNPJ Emitente</span>
                                                   <span className="font-mono text-[9px] font-semibold text-slate-600">{log.metadata?.cnpjEmitente || 'Não Identificado'}</span>
                                                </div>
                                                <div>
                                                   <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest font-sans">Ambiente</span>
                                                   <span className={cn(
                                                      "text-[8px] font-black uppercase px-1 py-0.5 rounded font-sans inline-block leading-none mt-0.5",
                                                      log.metadata?.ambiente === 'Producao' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                                   )}>
                                                      {log.metadata?.ambiente || 'Homologação'}
                                                   </span>
                                                </div>
                                             </div>

                                             <div>
                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Chave de Acesso Sefaz</span>
                                                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-150 font-mono text-[9px] font-semibold break-all text-slate-600 justify-between select-all leading-tight">
                                                   <span>{log.metadata?.chaveAcesso || 'Gerada pelo validador'}</span>
                                                   {log.metadata?.chaveAcesso && (
                                                      <button
                                                         type="button"
                                                         onClick={() => {
                                                            navigator.clipboard.writeText(log.metadata.chaveAcesso);
                                                            toast.success("Chave de acesso copiada!");
                                                         }}
                                                         className="text-[8px] font-black text-orange-600 hover:text-orange-700 uppercase shrink-0 px-1 py-0.5 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 cursor-pointer"
                                                      >
                                                         Copiar
                                                      </button>
                                                   )}
                                                </div>
                                             </div>

                                             {/* Snippet Viewer */}
                                             <div>
                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">XML Validado (Primeiras 10 linhas)</span>
                                                <pre className="p-2 bg-slate-900 text-slate-100 rounded border border-slate-950 text-[9px] font-mono leading-relaxed overflow-x-auto max-h-24 whitespace-pre-wrap select-all">
                                                   {log.xmlSnippet ? log.xmlSnippet.split('\n').slice(0, 10).join('\n') + (log.xmlSnippet.split('\n').length > 10 ? '\n...' : '') : 'Nenhum snippet XML'}
                                                </pre>
                                             </div>

                                             {/* Errors list inside log if any */}
                                             {!log.isValid && log.errorsCount > 0 && (
                                                <div className="bg-red-50/50 p-2 rounded border border-red-150 space-y-1">
                                                   <span className="block text-[8px] font-black text-red-700 uppercase tracking-widest mb-0.5">Erros Identificados:</span>
                                                   <div className="text-[9px] leading-relaxed text-red-900 font-semibold space-y-0.5">
                                                      &bull; Esta validação possuía {log.errorsCount} inconsistência(s) fiscal(is). Carregue no editor principal (ícone de olho) para recuperar o diagnóstico completo de rejeições de tags SEFAZ.
                                                   </div>
                                                </div>
                                             )}
                                          </div>
                                       )}
                                    </div>
                                 );
                              })
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>

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
                   <QRCodeSVG value={menuUrl} size={140} />
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
