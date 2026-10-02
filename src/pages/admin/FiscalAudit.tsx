import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  Shield, 
  FileSpreadsheet, 
  Search, 
  Trash2, 
  Check, 
  X, 
  ArrowUpRight, 
  Clock, 
  Filter, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Sparkles,
  AlertTriangle,
  Play,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, sanitizeCSVCell, formatCurrency, currencyLocale } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import i18n from '../../lib/i18n';

interface MockLog {
  id: string;
  timestamp: string;
  isValid: boolean;
  errorsCount: number;
  warningsCount: number;
  xmlSnippet: string;
  metadata?: {
    modelo?: string;
    serie?: string;
    numeroNota?: string;
    valorTotalNota?: number;
    ambiente?: string;
    cnpjEmitente?: string;
    cnpjDestinatario?: string;
    chaveAcesso?: string;
  };
}

const DEFAULT_MOCK_LOGS: MockLog[] = [
  {
    id: "flog_1",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    isValid: true,
    errorsCount: 0,
    warningsCount: 0,
    xmlSnippet: `<?xml version="1.0" encoding="UTF-8"?>\n<infNFe Id="NFe35260599999999000191550010000041251998547211" versao="4.00">\n  <ide>\n    <cUF>35</cUF>\n    <mod>55</mod>\n    <serie>1</serie>\n    <nNF>4125</nNF>\n    <dhEmi>2026-05-28T14:30:00-03:00</dhEmi>\n  </ide>\n  <emit>\n    <CNPJ>99.999.999/0001-91</CNPJ>\n    <xNome>MEU OVO ALIMENTOS LTDA</xNome>\n    <IE>111222333444</IE>\n    <CRT>3</CRT>\n  </emit>\n  <dest>\n    <CNPJ>12.345.678/0001-00</CNPJ>\n    <xNome>CLIENTE VIP S/A</xNome>\n  </dest>\n  <total>\n    <ICMSTot>\n      <vNF>150.00</vNF>\n    </ICMSTot>\n  </total>\n</infNFe>`,
    metadata: {
      modelo: "55",
      serie: "1",
      numeroNota: "4125",
      valorTotalNota: 150.00,
      ambiente: "Homologacao",
      cnpjEmitente: "99.999.999/0001-91",
      cnpjDestinatario: "12.345.678/0001-00",
      chaveAcesso: "35260599999999000191550010000041251998547211"
    }
  },
  {
    id: "flog_2",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    isValid: false,
    errorsCount: 2,
    warningsCount: 1,
    xmlSnippet: `<?xml version="1.0" encoding="UTF-8"?>\n<infNFe Id="NFe35260599999999000191550010000041241998547209" versao="4.00">\n  <ide>\n    <cUF>35</cUF>\n    <mod>99</mod> <!-- ERRO: Modelo incorreto -->\n    <serie>1</serie>\n    <nNF></nNF> <!-- ERRO: Numero de nota ausente -->\n  </ide>\n  <emit>\n    <CNPJ>99.999.999/0001-91</CNPJ>\n    <xNome>MEU OVO ALIMENTOS LTDA</xNome>\n  </emit>\n</infNFe>`,
    metadata: {
      modelo: "99",
      serie: "1",
      numeroNota: "",
      valorTotalNota: 0,
      ambiente: "Homologacao",
      cnpjEmitente: "99.999.999/0001-91",
      cnpjDestinatario: "",
      chaveAcesso: "35260599999999000191550010000041241998547209"
    }
  },
  {
    id: "flog_3",
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5 hours ago
    isValid: true,
    errorsCount: 0,
    warningsCount: 1,
    xmlSnippet: `<?xml version="1.0" encoding="UTF-8"?>\n<infNFe Id="NFe35260599999999000191650010000028901998547225" versao="4.00">\n  <ide>\n    <cUF>35</cUF>\n    <mod>65</mod>\n    <serie>1</serie>\n    <nNF>2890</nNF>\n    <dhEmi>2026-05-28T10:15:00-03:00</dhEmi>\n  </ide>\n  <emit>\n    <CNPJ>99.999.999/0001-91</CNPJ>\n    <xNome>MEU OVO ALIMENTOS LTDA</xNome>\n    <IE>111222333444</IE>\n    <CRT>1</CRT>\n  </emit>\n  <total>\n    <ICMSTot>\n      <vNF>45.90</vNF>\n    </ICMSTot>\n  </total>\n</infNFe>`,
    metadata: {
      modelo: "65",
      serie: "1",
      numeroNota: "2890",
      valorTotalNota: 45.90,
      ambiente: "Homologacao",
      cnpjEmitente: "99.999.999/0001-91",
      cnpjDestinatario: "Consumidor Final",
      chaveAcesso: "35260599999999000191650010000028901998547225"
    }
  }
];

export default function FiscalAudit() {
  const { t } = useTranslation();
  const { currentRestaurant: restaurant } = useRestaurant();
  const [validationLogs, setValidationLogs] = useState<MockLog[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Load from local storage, fallback to mocked items so user has data immediately
  useEffect(() => {
    try {
      const saved = localStorage.getItem('meuovo_xml_validation_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setValidationLogs(parsed);
          return;
        }
      }
      // If we got here, no logs are saved, so seed defaults but don't save to LS immediately to prevent pollution
      setValidationLogs(DEFAULT_MOCK_LOGS);
    } catch {
      setValidationLogs(DEFAULT_MOCK_LOGS);
    }
  }, []);

  const saveLogs = (updatedLogs: MockLog[]) => {
    setValidationLogs(updatedLogs);
    localStorage.setItem('meuovo_xml_validation_logs', JSON.stringify(updatedLogs));
  };

  const clearHistory = () => {
    if (window.confirm(t('fiscal.confirmClear'))) {
      saveLogs([]);
      setExpandedLogId(null);
      toast.success("Histórico de Auditoria Fiscal limpo!");
    }
  };

  const deleteSingleLog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = validationLogs.filter(log => log.id !== id);
    saveLogs(updated);
    if (expandedLogId === id) setExpandedLogId(null);
    toast.success("Log removido com sucesso.");
  };

  const simulateNewLog = (type: 'success' | 'failure') => {
    const nextNum = validationLogs.length > 0 
      ? Math.max(...validationLogs.map(l => parseInt(l.metadata?.numeroNota || '0')).filter(n => !isNaN(n))) + 1 
      : 3000;

    const accessKeySeed = Array.from({length: 44}, () => Math.floor(Math.random() * 10)).join('');

    const newLog: MockLog = type === 'success' ? {
      id: `sim_${Date.now()}`,
      timestamp: new Date().toISOString(),
      isValid: true,
      errorsCount: 0,
      warningsCount: 0,
      xmlSnippet: `<?xml version="1.0" encoding="UTF-8"?>\n<infNFe Id="NFe${accessKeySeed}" versao="4.00">\n  <ide>\n    <cUF>35</cUF>\n    <mod>55</mod>\n    <serie>1</serie>\n    <nNF>${nextNum}</nNF>\n    <dhEmi>${new Date().toISOString()}</dhEmi>\n  </ide>\n  <emit>\n    <CNPJ>${restaurant?.fiscalSettings?.nfeCnpj || '99.999.999/0001-91'}</CNPJ>\n    <xNome>${restaurant?.name?.toUpperCase() || 'MEU OVO ALIMENTOS'}</xNome>\n    <IE>111222333444</IE>\n    <CRT>3</CRT>\n  </emit>\n  <dest>\n    <CNPJ>88.888.888/0001-22</CNPJ>\n    <xNome>RESTAURANTE SIMULADO LTDA</xNome>\n  </dest>\n  <total>\n    <ICMSTot>\n      <vNF>${(40 + Math.random() * 200).toFixed(2)}</vNF>\n    </ICMSTot>\n  </total>\n</infNFe>`,
      metadata: {
        modelo: "55",
        serie: "1",
        numeroNota: String(nextNum),
        valorTotalNota: Number((40 + Math.random() * 200).toFixed(2)),
        ambiente: "Homologacao",
        cnpjEmitente: restaurant?.fiscalSettings?.nfeCnpj || "99.999.999/0001-91",
        cnpjDestinatario: "88.888.888/0001-22",
        chaveAcesso: accessKeySeed
      }
    } : {
      id: `sim_${Date.now()}`,
      timestamp: new Date().toISOString(),
      isValid: false,
      errorsCount: 3,
      warningsCount: 1,
      xmlSnippet: `<?xml version="1.0" encoding="UTF-8"?>\n<infNFe Id="NFe${accessKeySeed}" versao="4.00">\n  <ide>\n    <cUF>999</cUF> <!-- ERRO: UF Invalida -->\n    <mod>20</mod> <!-- ERRO: Codigo Modelo Invalido para SEFAZ -->\n    <serie></serie> <!-- ERRO: Serie vazia -->\n  </ide>\n  <emit>\n    <CNPJ>0000000000</CNPJ> <!-- ERRO: Digito verificador CNPJ invalido -->\n  </emit>\n</infNFe>`,
      metadata: {
        modelo: "20",
        serie: "",
        numeroNota: "ErrNfe",
        valorTotalNota: 0,
        ambiente: "Homologacao",
        cnpjEmitente: "0000000000",
        cnpjDestinatario: "",
        chaveAcesso: accessKeySeed
      }
    };

    const updated = [newLog, ...validationLogs];
    saveLogs(updated);
    toast.success(type === 'success' ? t('fiscal.toastSimulacaoValido') : t('fiscal.toastSimulacaoInvalido'));
  };

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(t('fiscal.toastChaveCopiada'));
  };

  const exportCSV = () => {
    if (validationLogs.length === 0) {
      toast.error(t('fiscal.toastNoLogs'));
      return;
    }

    try {
      const headers = t('fiscal.csvHeaders', { returnObjects: true }) as string[];

      const csvRows = [headers.join(";")];

      for (const log of validationLogs) {
        const row = [
          log.id,
          new Date(log.timestamp).toLocaleString('pt-BR'),
          log.isValid ? t('fiscal.csvCompativel') : t('fiscal.csvRejeitado'),
          log.errorsCount || 0,
          log.warningsCount || 0,
          log.metadata?.modelo || "N/A",
          log.metadata?.serie || "N/A",
          log.metadata?.numeroNota || "N/A",
          (log.metadata?.valorTotalNota || 0).toFixed(2),
          log.metadata?.ambiente || t('fiscal.csvHomologacao'),
          log.metadata?.cnpjEmitente || "N/A",
          log.metadata?.cnpjDestinatario || "N/A",
          log.metadata?.chaveAcesso || t('fiscal.csvGeradaDinamicamente')
        ];

        const escaped = row.map(val => sanitizeCSVCell(String(val)));

        csvRows.push(escaped.join(";"));
      }

      // Add UTF-8 BOM representation so Excel parses accented strings and symbols nicely
      const csvStr = "\ufeff" + csvRows.join("\n");
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `auditoria_fiscal_geral_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('fiscal.toastExportOk'));
    } catch {
      toast.error(t('fiscal.toastExportFail'));
    }
  };

  const filteredLogs = validationLogs.filter(log => {
    const matchSearch = !logSearch || 
      (log.metadata?.numeroNota && String(log.metadata.numeroNota).toLowerCase().includes(logSearch.toLowerCase())) ||
      (log.metadata?.chaveAcesso && String(log.metadata.chaveAcesso).toLowerCase().includes(logSearch.toLowerCase())) ||
      (log.metadata?.cnpjEmitente && String(log.metadata.cnpjEmitente).replace(/\D/g, '').includes(logSearch.replace(/\D/g, ''))) ||
      (log.xmlSnippet && log.xmlSnippet.toLowerCase().includes(logSearch.toLowerCase()));

    if (logFilter === 'valid') return matchSearch && log.isValid;
    if (logFilter === 'invalid') return matchSearch && !log.isValid;
    return matchSearch;
  });

  // KPI calculations
  const totalNotes = validationLogs.length;
  const validNotesCount = validationLogs.filter(l => l.isValid).length;
  const complianceRate = totalNotes > 0 ? (validNotesCount / totalNotes) * 100 : 100;
  const totalRevenue = validationLogs
    .filter(l => l.isValid)
    .reduce((acc, curr) => acc + (curr.metadata?.valorTotalNota || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 rounded-lg text-orange-650">
              <Shield size={20} className="stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
              {t('fiscal.title')}
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            {t('fiscal.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-350 px-3.5 py-2 rounded-xl uppercase tracking-wider transition-all"
          >
            <FileSpreadsheet size={13} className="text-emerald-600 shrink-0" /> {t('fiscal.exportCsv')}
          </button>

          <button
            type="button"
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-[10px] font-black text-red-650 bg-red-50 border border-red-150 hover:bg-red-100 px-3.5 py-2 rounded-xl uppercase tracking-wider transition-all"
          >
            <Trash2 size={13} className="text-red-500 shrink-0" /> {t('fiscal.clearRecords')}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-slate-100/40 pointer-events-none">
            <Shield size={50} className="stroke-[1]" />
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('fiscal.complianceRate')}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black italic text-slate-900 tracking-tighter">
                {complianceRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={cn(
                "h-2 w-2 rounded-full",
                complianceRate >= 90 ? "bg-green-500" : complianceRate >= 70 ? "bg-amber-500" : "bg-red-500"
              )} />
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                {complianceRate >= 90 ? t('fiscal.complianceExcellent') : t('fiscal.complianceNeedsFix')}
              </p>
            </div>
          </div>
        </div>

        {/* Total Processed Revenue and Verified Invoice */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-emerald-100/30 pointer-events-none">
            <ArrowUpRight size={50} className="stroke-[1]" />
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">{t('fiscal.totalConform')}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black italic text-slate-900 tracking-tighter">
                R$ {totalRevenue.toFixed(2)}
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
              {t('fiscal.totalConformHint')}
            </p>
          </div>
        </div>

        {/* Valid Notes processed count */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-slate-105 pointer-events-none text-emerald-500/10">
            <Check size={50} className="stroke-[1]" />
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('fiscal.authorizedXmls')}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black italic text-emerald-700 tracking-tighter">
                {validNotesCount}
              </span>
              <span className="text-xs font-bold text-slate-400 font-sans">/ {totalNotes}</span>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
              {t('fiscal.authorizedHint')}
            </p>
          </div>
        </div>

        {/* Invalid with visual alert indicators */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-red-500/10 pointer-events-none">
            <AlertTriangle size={50} className="stroke-[1]" />
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">{t('fiscal.rejectedXmls')}</p>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-3xl font-black italic tracking-tighter",
                (totalNotes - validNotesCount) > 0 ? "text-red-700 animate-pulse" : "text-slate-900"
              )}>
                {totalNotes - validNotesCount}
              </span>
              <span className="text-xs font-bold text-slate-400 font-sans">{t('fiscal.rejected')}</span>
            </div>
            <p className="text-[9px] font-bold text-red-600/85 uppercase tracking-wide">
              {(totalNotes - validNotesCount) > 0 ? t('fiscal.rejectedAlert') : t('fiscal.accountingOk')}
            </p>
          </div>
        </div>
      </div>

      {/* Simulator Tools (For ease of demonstration of flow) */}
      <div className="bg-slate-900 text-slate-50 p-4 rounded-2xl border border-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-black text-orange-450 uppercase tracking-widest">
            <Sparkles size={12} className="text-orange-400" /> {t('fiscal.simulatedEnv')}
          </div>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            {t('fiscal.simulatedEnvHint')}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => simulateNewLog('success')}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-white border border-emerald-500Cursor shadow-sm cursor-pointer"
          >
            <Play size={10} className="fill-white" /> {t('fiscal.simulateValid')}
          </button>
          <button
            type="button"
            onClick={() => simulateNewLog('failure')}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-650 hover:bg-red-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-white border border-red-550 shadow-sm cursor-pointer"
          >
            <AlertTriangle size={10} /> {t('fiscal.simulateInvalid')}
          </button>
          <button
            type="button"
            onClick={() => saveLogs(DEFAULT_MOCK_LOGS)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-slate-300 border border-slate-700 shadow-sm cursor-pointer"
            title={t('fiscal.resetMockupsTitle')}
          >
            <RotateCcw size={10} /> {t('fiscal.resetMockups')}
          </button>
        </div>
      </div>

      {/* Main logs display database list */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Filters and search box panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Real-time search */}
          <div className="relative w-full md:max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('fiscal.searchPlaceholder')}
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-805 outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Quick status filter tabs */}
          <div className="flex items-center gap-1 scroll-smooth overflow-x-auto py-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setLogFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                logFilter === 'all' 
                   ? "bg-slate-900 text-white border-slate-900" 
                   : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              )}
            >
              {t('fiscal.filterAll')} ({validationLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilter('valid')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                logFilter === 'valid' 
                   ? "bg-emerald-600 text-white border-emerald-600" 
                   : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              )}
            >
              {t('fiscal.filterValid')} ({validationLogs.filter(l => l.isValid).length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilter('invalid')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                logFilter === 'invalid' 
                   ? "bg-red-650 text-white border-red-650" 
                   : "bg-white text-red-650 border-red-150 hover:bg-red-50"
              )}
            >
              {t('fiscal.filterInvalid')} ({validationLogs.filter(l => !l.isValid).length})
            </button>
          </div>
        </div>

        {/* List of elements view */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <Shield size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {t('fiscal.emptyTitle')}
              </p>
              <p className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase mt-1">
                {t('fiscal.emptyHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "border rounded-2xl transition-all overflow-hidden bg-white shadow-xs",
                      log.isValid ? "border-slate-200" : "border-slate-200",
                      isExpanded && (log.isValid ? "border-emerald-350 ring-1 ring-emerald-500/10" : "border-red-350 ring-1 ring-red-500/10")
                    )}
                  >
                    {/* Header trigger bar */}
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                    >
                      <div className="flex gap-3 items-start flex-1">
                        <div className={cn(
                          "p-2 rounded-xl shrink-0 mt-0.5",
                          log.isValid ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-650"
                        )}>
                          {log.isValid ? <Check size={16} className="stroke-[3]" /> : <X size={16} className="stroke-[3]" />}
                        </div>

                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest leading-none shrink-0",
                              log.isValid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            )}>
                              {log.isValid ? t('fiscal.conformeSefaz') : t('fiscal.rejeitado')}
                            </span>
                            <span className={cn(
                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0 tracking-widest",
                              log.metadata?.ambiente === 'Producao' ? "bg-red-100/60 text-red-700" : "bg-blue-100/60 text-blue-800"
                            )}>
                              {log.metadata?.ambiente || t('fiscal.homologacao')}
                            </span>
                            
                            <p className="text-xs font-bold text-slate-805 leading-none">
                              {log.metadata?.numeroNota ? t('fiscal.notaFiscalNum', { num: log.metadata.numeroNota }) : t('fiscal.notaSemNumero')}
                              {log.metadata?.modelo && ` ${t('fiscal.versaoMod', { model: log.metadata.modelo })}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-1 shrink-0">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock size={11} /> {new Date(log.timestamp).toLocaleDateString(currencyLocale(i18n.language))} {t('fiscal.as')} {new Date(log.timestamp).toLocaleTimeString(currencyLocale(i18n.language))}
                            </span>
                            {log.metadata?.valorTotalNota ? (
                              <span className="text-slate-600 font-black">
                                &bull; R$ {log.metadata.valorTotalNota.toFixed(2)}
                              </span>
                            ) : null}
                            {log.errorsCount > 0 && (
                              <span className="text-red-650 font-black flex items-center gap-0.5">
                                &bull; <AlertTriangle size={10} /> {t('fiscal.errosEstruturais', { count: log.errorsCount })}
                              </span>
                            )}
                            {log.warningsCount > 0 && (
                              <span className="text-amber-600 font-black">
                                &bull; {t('fiscal.avisos', { count: log.warningsCount })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right indicator & copy button */}
                      <div className="flex items-center gap-3 self-end md:self-auto shrink-0 select-none">
                        <button
                          type="button"
                          onClick={(e) => deleteSingleLog(log.id, e)}
                          title={t('fiscal.removerRegistro')}
                          className="p-1 px-1.5 hover:text-red-650 text-slate-400 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer"
                          aria-label={t('fiscal.excluir')}
                        >
                          <Trash2 size={13} />
                        </button>

                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-0.5 whitespace-nowrap bg-slate-100/80 px-2.5 py-1 rounded-lg">
                          {isExpanded ? t('fiscal.fecharDetalhes') : t('fiscal.verAuditoria')}
                          {isExpanded ? <ChevronUp size={11} className="stroke-[2.5]" /> : <ChevronDown size={11} className="stroke-[2.5]" />}
                        </span>
                      </div>
                    </div>

                    {/* Detailed expandable section */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-100 bg-slate-50/40 divide-y divide-slate-150 overflow-hidden font-sans select-text text-left"
                        >
                          {/* Metadata values Grid */}
                          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/50 text-xs">
                            <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">{t('fiscal.chaveAcessoXml')}</span>
                              <div className="font-mono text-[10px] bg-slate-100 font-bold border border-slate-150 px-2 py-1.5 rounded-lg text-slate-600 flex items-center justify-between gap-1 select-all">
                                <span className="truncate">{log.metadata?.chaveAcesso || t('fiscal.ausenteNoIde')}</span>
                                {log.metadata?.chaveAcesso && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(log.metadata?.chaveAcesso || '')}
                                    className="p-0.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-orange-550 transition-colors shrink-0"
                                    title={t('fiscal.copiarChave')}
                                    aria-label={t('fiscal.copiar')}
                                  >
                                    <Copy size={11} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">{t('fiscal.cnpjEmitente')}</span>
                              <span className="font-mono text-slate-700 font-bold text-[11px]">
                                {log.metadata?.cnpjEmitente || t('fiscal.naoDeclarado')}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">{t('fiscal.cnpjDestinatario')}</span>
                              <span className="font-mono text-slate-700 font-semibold text-[11px]">
                                {log.metadata?.cnpjDestinatario || t('fiscal.ausenteConsumidor')}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">{t('fiscal.validacaoSefaz')}</span>
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2 py-0.5 rounded inline-block leading-none mt-0.5",
                                log.isValid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              )}>
                                {log.isValid ? t('fiscal.layoutValidado') : t('fiscal.rejeitadoSefaz')}
                              </span>
                            </div>
                          </div>

                          {/* XML content and Diagnoses row */}
                          <div className="p-4 grid md:grid-cols-12 gap-4 text-xs">
                            {/* Validation issues lists */}
                            <div className="md:col-span-4 space-y-3">
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('fiscal.diagnosticoContabil')}</span>
                                <div className={cn(
                                  "p-3 rounded-xl border space-y-2",
                                  log.isValid 
                                    ? "bg-emerald-50/50 border-emerald-150 text-emerald-900" 
                                    : "bg-red-50/50 border-red-150 text-red-950"
                                )}>
                                  <div className="flex gap-1.5 items-start">
                                    <Shield size={14} className={cn("shrink-0 mt-0.5", log.isValid ? "text-emerald-600" : "text-red-505")} />
                                    <div>
                                      <p className="font-bold uppercase tracking-wide text-[9px] leading-tight">
                                        {log.isValid ? t('fiscal.conformidadeConfirmada') : t('fiscal.criteriosViolados')}
                                      </p>
                                      <p className="text-[10px] text-slate-600/90 leading-relaxed font-medium mt-0.5">
                                        {log.isValid 
                                          ? t('fiscal.diagnosticoValido')
                                          : t('fiscal.diagnosticoInvalido', { count: log.errorsCount })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Rule details list */}
                              <div className="bg-white p-3 rounded-xl border border-slate-205 space-y-1.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('fiscal.dadosResumidos')}</span>
                                <div className="space-y-1 text-[10px] font-bold text-slate-650 uppercase">
                                  <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span>{t('fiscal.modeloFiscal')}:</span>
                                    <span className="text-slate-800 font-mono">{log.metadata?.modelo || t('fiscal.simulado')}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span>{t('fiscal.serieNumero')}:</span>
                                    <span className="text-slate-800 font-mono">{log.metadata?.serie || "1"} / {log.metadata?.numeroNota || "--"}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span>{t('fiscal.valorBruto')}:</span>
                                    <span className="text-slate-805 font-mono">R$ {(log.metadata?.valorTotalNota || 0).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{t('fiscal.protocoloLocal')}:</span>
                                    <span className="text-slate-500 font-mono text-[9px]">{log.id}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Raw XML Preview snippet (10 lines with syntax highlights styling) */}
                            <div className="md:col-span-8 space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                {t('fiscal.trechoXml')}
                              </span>
                              <div className="relative rounded-xl overflow-hidden border border-slate-950 font-mono text-[10px]">
                                <pre className="p-4 bg-slate-950 text-slate-100 leading-relaxed overflow-x-auto whitespace-pre select-all max-h-56">
                                  <code>{log.xmlSnippet}</code>
                                </pre>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manual & Reference Guidelines Block */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs text-left">
        <div className="flex items-center gap-1.5 mb-3 text-slate-900 border-b border-slate-100 pb-2.5">
          <BookOpen size={16} className="text-orange-550" />
          <h2 className="text-xs font-black uppercase tracking-wider leading-none">{t('fiscal.docsApoio')}</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 text-[11px] leading-relaxed text-slate-505 font-medium">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-705 uppercase tracking-wide">{t('fiscal.layoutSefaz')}</h4>
            <p className="text-slate-500">
              {t('fiscal.layoutSefazHint')}
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-750 uppercase tracking-wide">{t('fiscal.digitoVerificador')}</h4>
            <p className="text-slate-500">
              {t('fiscal.digitoVerificadorHint')}
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-750 uppercase tracking-wide">{t('fiscal.exportandoRelatorios')}</h4>
            <p className="text-slate-500">
              {t('fiscal.exportandoRelatoriosHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
