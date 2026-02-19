
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  SimulationParams, 
  Logradouro, 
  CalculoResult,
  AppConfig,
  FactorOption
} from './types';
import { 
  SITUACAO_QUADRA, 
  TOPOGRAFIA, 
  PEDOLOGIA, 
  PAVIMENTACAO, 
  MELHORAMENTOS, 
  TIPO_OCUPACAO, 
  PADRAO_CONSTRUTIVO, 
  ELEMENTO_CONSTRUTIVO, 
  CONDOMINIO_VERTICAL,
  CR_VALOR,
  FACTOR_EXPLANATIONS
} from './constants';
import { calculateIPTU, searchLogradouros, MOCK_LOGRADOUROS } from './dataService';

declare const XLSX: any;

const ADMIN_USER = "admin";
const ADMIN_PASS = "ns2025admin";

const normalizeHeader = (s: string) => 
  String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const parseFlexibleNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let s = String(val).replace('R$', '').trim();
  if (s.includes(',') && s.includes('.')) {
    return parseFloat(s.split('.').join('').replace(',', '.'));
  }
  if (s.includes(',')) {
    return parseFloat(s.replace(',', '.'));
  }
  return parseFloat(s);
};

const COLUMN_ALIASES = {
  codigo: ['codlog', 'codigologradouro', 'codigo', 'cod', 'id'],
  nome: ['nomelogradouro', 'nome', 'logradouro', 'rua', 'avenida', 'via'],
  sequencia: ['seq', 'sequencia', 'item', 'ordem'],
  vu_pvg: ['vupvg', 'vupvg2024', 'valorunitario', 'valorm2', 'vmq', 'valor']
};

const InfoIcon: React.FC<{ tooltip: string }> = ({ tooltip }) => (
  <div className="group relative inline-block ml-1">
    <svg className="w-4 h-4 text-gray-400 cursor-help hover:text-blue-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2 bg-gray-800 text-white text-[10px] rounded shadow-xl z-50 leading-relaxed pointer-events-none text-center">
      {tooltip}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800"></div>
    </div>
  </div>
);

const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void; crValor: number }> = ({ isOpen, onClose, crValor }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
        <div className="sticky top-0 bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
          <h2 className="text-2xl font-black text-gray-900">Metodologia de Cálculo</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-8 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h3 className="text-lg font-bold text-blue-600 mb-2 flex items-center"><span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">01</span>Terreno (VVT)</h3>
            <p className="text-sm mb-4">O cálculo do terreno é ajustado por fatores físicos:</p>
            <div className="bg-gray-50 p-4 rounded-xl font-mono text-xs border border-gray-100 leading-loose">
              VVT = At x Vmq x (Ft x Fa x Fsq x Ftop x Fpd x Fpav x Fmp x Fto) x Fat x Rapp
            </div>
          </section>
          <section>
            <h3 className="text-lg font-bold text-green-600 mb-2 flex items-center"><span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mr-3 text-sm">02</span>Construção (VC)</h3>
            <p className="text-sm">VC = Acb x Cr x Fpc x Fec x Fcv</p>
            <p className="text-xs mt-2 italic text-gray-400">* Custo de Referência (Cr) configurado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(crValor)}/m².</p>
          </section>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">Entendi</button>
        </div>
      </div>
    </div>
  );
};

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-50">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </div>
);

const InputField: React.FC<{ label: string; name: string; type?: string; value: any; onChange: (e: any) => void; placeholder?: string; tooltip?: string }> = ({ label, name, type = "number", value, onChange, placeholder, tooltip }) => (
  <div>
    <div className="flex items-center mb-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {tooltip && <InfoIcon tooltip={tooltip} />}
    </div>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white transition-colors" />
  </div>
);

const SelectField: React.FC<{ label: string; name: string; options: FactorOption[]; value: string; onChange: (e: any) => void; tooltip?: string }> = ({ label, name, options, value, onChange, tooltip }) => (
  <div>
    <div className="flex items-center mb-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {tooltip && <InfoIcon tooltip={tooltip} />}
    </div>
    <select name={name} value={value} onChange={onChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 transition-colors cursor-pointer">
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>{opt.label} ({Number(opt.multiplier).toFixed(4)})</option>
      ))}
    </select>
  </div>
);

const FactorDisplay: React.FC<{ label: string; value: any; subtitle?: string; tooltip?: string; colorClass?: string }> = ({ label, value, subtitle, tooltip, colorClass = "text-gray-900" }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors px-1 rounded">
    <div className="flex flex-col">
      <div className="flex items-center">
        <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">{label}</span>
        {tooltip && <InfoIcon tooltip={tooltip} />}
      </div>
      {subtitle && <span className="text-[10px] text-gray-400 -mt-0.5">{subtitle}</span>}
    </div>
    <span className={`font-mono text-sm font-black ${colorClass}`}>{Number(value || 0).toFixed(4)}</span>
  </div>
);

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>({
    crValor: CR_VALOR,
    situacaoQuadra: SITUACAO_QUADRA,
    topografia: TOPOGRAFIA,
    pedologia: PEDOLOGIA,
    pavimentacao: PAVIMENTACAO,
    melhoramentos: MELHORAMENTOS,
    tipoOcupacao: TIPO_OCUPACAO,
    padraoConstrutivo: PADRAO_CONSTRUTIVO,
    elementoConstrutivo: ELEMENTO_CONSTRUTIVO,
    condominioVertical: CONDOMINIO_VERTICAL,
    aiEnabled: false,
  });

  const [params, setParams] = useState<SimulationParams>({
    at: 300, acb: 150, testada: 12, app: 0,
    fsq: 'Meio de quadra (1 frente)', ftop: 'Plano', fpd: 'Firme', fpav: 'Asfáltica', fmp: 'Com Iluminação Pública', fto: 'Comum', fat: 1.0,
    fpc: '1B - Casa - Normal', fec: 'Alvenaria / Concreto', fcv: 'Não se aplica', favi: 1.0, logradouro: undefined
  });

  const [view, setView] = useState<'simulator' | 'admin'>('simulator');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [logradouros, setLogradouros] = useState<Logradouro[]>(MOCK_LOGRADOUROS);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsSearching(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setParams(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
  }, []);

  const handleLogradouroSelect = (log: Logradouro) => {
    setParams(prev => ({ ...prev, logradouro: log }));
    setSearchTerm(log.nome);
    setIsSearching(false);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocoding usando Nominatim (OpenStreetMap)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await response.json();
          
          if (data && data.address) {
            const road = data.address.road || data.address.pedestrian || data.address.suburb;
            if (road) {
              setSearchTerm(road.toUpperCase());
              setIsSearching(true);
              
              // Tenta encontrar uma correspondência exata ou aproximada na lista
              const bestMatch = searchLogradouros(road, logradouros)[0];
              if (bestMatch) {
                handleLogradouroSelect(bestMatch);
              } else {
                alert(`Localizado: "${road}", mas este logradouro não foi encontrado na Planta de Valores atual.`);
              }
            } else {
              alert("Não foi possível determinar o nome da rua para sua localização.");
            }
          }
        } catch (error) {
          console.error("Erro na geolocalização:", error);
          alert("Ocorreu um erro ao tentar identificar sua rua.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            alert("Permissão de localização negada pelo usuário.");
            break;
          case error.POSITION_UNAVAILABLE:
            alert("Informações de localização indisponíveis.");
            break;
          case error.TIMEOUT:
            alert("Tempo limite atingido ao tentar obter localização.");
            break;
          default:
            alert("Erro desconhecido na geolocalização.");
            break;
        }
      },
      { timeout: 10000 }
    );
  };

  const findKeyByAlias = (rowKeys: string[], targetAliases: string[]): string | undefined => {
    return rowKeys.find(key => {
      const normalizedKey = normalizeHeader(key);
      return targetAliases.some(alias => normalizeHeader(alias) === normalizedKey);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataStr = evt.target?.result;
        const workbook = XLSX.read(dataStr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        if (rawRows.length === 0) throw new Error("Planilha vazia.");
        const firstRowKeys = Object.keys(rawRows[0]);
        const keyMapping = {
          codigo: findKeyByAlias(firstRowKeys, COLUMN_ALIASES.codigo),
          nome: findKeyByAlias(firstRowKeys, COLUMN_ALIASES.nome),
          sequencia: findKeyByAlias(firstRowKeys, COLUMN_ALIASES.sequencia),
          vu_pvg: findKeyByAlias(firstRowKeys, COLUMN_ALIASES.vu_pvg)
        };
        if (!keyMapping.nome || !keyMapping.vu_pvg) throw new Error("Colunas necessárias não encontradas.");
        const newList: Logradouro[] = rawRows.map((row: any) => ({
          codigo: String(keyMapping.codigo ? row[keyMapping.codigo] : ""),
          nome: String(row[keyMapping.nome!] || "").toUpperCase().trim(),
          sequencia: String(keyMapping.sequencia ? row[keyMapping.sequencia] : "1"),
          vu_pvg: parseFlexibleNumber(row[keyMapping.vu_pvg!])
        })).filter(l => l.nome && !isNaN(l.vu_pvg) && l.vu_pvg > 0);
        setLogradouros(newList);
        setImportStatus({ type: 'success', message: `${newList.length} logradouros importados com sucesso.` });
      } catch (err: any) { setImportStatus({ type: 'error', message: err.message }); }
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsBinaryString(file);
  };

  const results = useMemo(() => calculateIPTU(params, config), [params, config]);
  const filteredLogradouros = useMemo(() => searchLogradouros(debouncedSearchTerm, logradouros), [debouncedSearchTerm, logradouros]);
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.user === ADMIN_USER && loginForm.pass === ADMIN_PASS) {
      setIsAdminLoggedIn(true);
      setView('admin');
    } else {
      alert("Usuário ou senha inválidos.");
    }
  };

  const runAiAnalysis = async () => {
    if (!config.aiEnabled || !params.logradouro) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const prompt = `Analise os dados deste imóvel para cálculo de IPTU/Valor Venal: 
      Logradouro: ${params.logradouro.nome} (VU: ${params.logradouro.vu_pvg}),
      Área Terreno: ${params.at}m², Área Construída: ${params.acb}m², 
      Fatores Físicos: ${params.fsq}, ${params.ftop}, ${params.fpc}. 
      Valor Venal Estimado: ${formatCurrency(results.vvi)}.
      Forneça um breve resumo explicativo em português sobre a composição desse valor e possíveis discrepâncias baseadas em boas práticas tributárias. Seja conciso.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text || "Sem resposta da IA.");
    } catch (e) {
      setAiAnalysis("Erro ao consultar o assistente de IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // DASHBOARD ADMIN
  if (view === 'admin' && isAdminLoggedIn) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Dashboard Administrativa</h2>
            <p className="text-sm text-gray-500">Gestão de Variáveis e Configurações</p>
          </div>
          <button onClick={() => setView('simulator')} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-bold transition-all">Voltar ao Simulador</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
              Variáveis Base
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Custo Referência m² (Cr)</label>
                <input type="number" step="0.01" value={config.crValor} onChange={(e) => setConfig({...config, crValor: parseFloat(e.target.value)})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <p className="text-sm font-bold text-blue-900">IA - Inteligência Artificial</p>
                  <p className="text-[10px] text-blue-700">Ativar assistente de análise nos resultados</p>
                </div>
                <button 
                  onClick={() => setConfig({...config, aiEnabled: !config.aiEnabled})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.aiEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.aiEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              Importação PVG (.xlsx)
            </h3>
            <p className="text-xs text-gray-500 mb-4">Atualize os logradouros via planilha.</p>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md">Carregar Planilha</button>
            {importStatus && <p className={`mt-2 text-xs font-bold ${importStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{importStatus.message}</p>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">F3 - Multiplicadores de Situação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.situacaoQuadra.map((opt, i) => (
              <div key={i} className="p-3 border rounded-xl flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">{opt.label}</span>
                <input type="number" step="0.01" value={opt.multiplier} onChange={(e) => {
                  const newFactors = [...config.situacaoQuadra];
                  newFactors[i].multiplier = parseFloat(e.target.value);
                  setConfig({...config, situacaoQuadra: newFactors});
                }} className="text-sm font-bold border-none p-0 focus:ring-0 outline-none" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // LOGIN ADMIN
  if (view === 'admin' && !isAdminLoggedIn) {
    return (
      <div className="fixed inset-0 bg-gray-900/90 flex items-center justify-center p-6 z-[200]">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900">Acesso Restrito</h2>
            <p className="text-xs text-gray-500">Configurações do Sistema</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input type="text" placeholder="Usuário" value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
            <input type="password" placeholder="Senha" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">Entrar</button>
            <button type="button" onClick={() => setView('simulator')} className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2">Voltar ao Simulador</button>
          </form>
        </div>
      </div>
    );
  }

  // SIMULADOR (LAYOUT ORIGINAL RESTAURADO)
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} crValor={config.crValor} />
      
      <header className="mb-12 text-center relative">
        <div className="flex justify-between items-start mb-4">
           <div className="w-10 h-10" />
           <div className="text-center flex-1">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Simulador de Valor Venal</h1>
              <p className="text-gray-600 max-w-2xl mx-auto">Consulte valores por logradouro ou simule dados técnicos do imóvel.</p>
           </div>
           <button onClick={() => setView('admin')} className="p-2 text-gray-300 hover:text-blue-500 transition-colors" title="Administração">
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path></svg>
           </button>
        </div>
        
        <button 
          onClick={() => setIsHelpOpen(true)}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-semibold text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm group"
        >
          <svg className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Metodologia de Cálculo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100" ref={searchRef}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Localização e Planta de Valores
              </h3>
            </div>
            
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onFocus={() => setIsSearching(true)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Busque por rua ou código (ex: Dimas Guimarães)..."
                  className="block w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                />
                <button 
                  onClick={handleUseLocation}
                  disabled={isLocating}
                  title="Usar minha localização atual"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                >
                  {isLocating ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  )}
                </button>
              </div>

              {isSearching && debouncedSearchTerm.length >= 2 && (
                <div className="absolute z-50 w-full mt-12 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-80 overflow-y-auto ring-1 ring-black ring-opacity-5">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 border-b border-gray-100 z-10 flex justify-between">
                    <span>{filteredLogradouros.length} encontrados</span>
                    <span>Planta {logradouros.length} registros</span>
                  </div>
                  {filteredLogradouros.length > 0 ? (
                    filteredLogradouros.map((log, i) => (
                      <button
                        key={i}
                        onClick={() => handleLogradouroSelect(log)}
                        className="w-full text-left px-4 py-4 hover:bg-blue-50 flex justify-between items-center group transition-colors border-b last:border-b-0 border-gray-50"
                      >
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-blue-700 uppercase">{log.nome}</p>
                          <p className="text-xs text-gray-500">Cód: {log.codigo || 'S/N'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-blue-600">{formatCurrency(log.vu_pvg)}/m²</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400">Não localizado.</div>
                  )}
                </div>
              )}
            </div>

            {params.logradouro ? (
              <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-blue-500 uppercase block mb-1">Logradouro Selecionado</span>
                  <h4 className="text-lg font-extrabold text-blue-900 leading-tight uppercase">{params.logradouro.nome}</h4>
                </div>
                <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-blue-200 text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">VU Logradouro</span>
                  <p className="text-2xl font-black text-blue-600 tracking-tight">{formatCurrency(params.logradouro.vu_pvg)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-8 border-2 border-dashed border-gray-100 rounded-2xl text-center text-gray-300 italic">Pesquise uma rua para iniciar.</div>
            )}
          </div>

          <FormSection title="Características do Terreno">
            <InputField label="Área Total (At) m²" name="at" value={params.at} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f2} />
            <InputField label="Testada Principal (m)" name="testada" value={params.testada} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f1} />
            <InputField label="Área de APP (m²)" name="app" value={params.app} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.rapp} />
            <SelectField label="Situação na Quadra" name="fsq" options={config.situacaoQuadra} value={params.fsq} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f3} />
            <SelectField label="Topografia" name="ftop" options={config.topografia} value={params.ftop} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f4} />
            <SelectField label="Pedologia" name="fpd" options={config.pedologia} value={params.fpd} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f5} />
            <SelectField label="Pavimentação" name="fpav" options={config.pavimentacao} value={params.fpav} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f6} />
            <SelectField label="Melhoramentos" name="fmp" options={config.melhoramentos} value={params.fmp} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f7} />
            <SelectField label="Tipo de Ocupação" name="fto" options={config.tipoOcupacao} value={params.fto} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f8} />
          </FormSection>

          <FormSection title="Dados da Edificação">
            <SelectField label="Padrão Construtivo" name="fpc" options={config.padraoConstrutivo} value={params.fpc} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fpc} />
            <SelectField label="Estrutura Dominante" name="fec" options={config.elementoConstrutivo} value={params.fec} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fec} />
            <SelectField label="Coef. Verticalização" name="fcv" options={config.condominioVertical} value={params.fcv} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fcv} />
            <InputField label="Área Construída (Acb) m²" name="acb" value={params.acb} onChange={handleInputChange} />
            <InputField label="Fator Ajuste Terreno (Fat)" name="fat" value={params.fat} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fat} />
            <InputField label="Fator Ajuste Imóvel (Favi)" name="favi" value={params.favi} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.favi} />
          </FormSection>
        </div>

        <div className="space-y-6 lg:sticky lg:top-8 self-start">
          <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
            </div>
            <h3 className="text-blue-400 text-xs font-black uppercase tracking-widest mb-2">Simulação Final</h3>
            <div className="mb-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Valor Venal do Imóvel (VVI)</span>
              <div className="text-4xl font-black tracking-tighter text-white">{formatCurrency(results.vvi)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between">
              <span className="text-[10px] text-blue-500 font-black uppercase mb-2">Terreno (VVT)</span>
              <div className="text-lg font-black text-gray-900 leading-tight">{formatCurrency(results.vvt)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 flex flex-col justify-between">
              <span className="text-[10px] text-green-600 font-black uppercase mb-2">Edificação (VC)</span>
              <div className="text-lg font-black text-gray-900 leading-tight">{formatCurrency(results.vc)}</div>
            </div>
          </div>

          {config.aiEnabled && (
             <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                   <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path></svg>
                </div>
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-200" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM16.243 16.243a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0z"></path></svg>
                  Assistente de IA
                </h4>
                {aiAnalysis ? (
                  <div className="text-xs bg-black/20 p-4 rounded-xl leading-relaxed animate-in fade-in">
                    {aiAnalysis}
                    <button onClick={() => setAiAnalysis(null)} className="mt-3 text-[10px] underline block opacity-50 hover:opacity-100">Limpar análise</button>
                  </div>
                ) : (
                  <button onClick={runAiAnalysis} disabled={!params.logradouro || isAiLoading} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50 border border-white/10">
                    {isAiLoading ? 'Analisando...' : 'Analisar Composição de Valor'}
                  </button>
                )}
             </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest">Memória de Cálculo</h4>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 pb-1 border-b border-blue-50">Terreno</h5>
                <FactorDisplay label="F1 - Testada (Ft)" value={results.fatoresTerreno.ft} colorClass="text-blue-700" />
                <FactorDisplay label="F2 - Área (Fa)" value={results.fatoresTerreno.fa} colorClass="text-blue-700" />
                <FactorDisplay label="Situação (Fsq)" value={results.fatoresTerreno.fsq} />
                <FactorDisplay label="Topografia (Ftop)" value={results.fatoresTerreno.ftop} />
                <FactorDisplay label="APP (Rapp)" value={results.fatoresTerreno.rapp} colorClass="text-red-600" />
              </div>
              <div>
                <h5 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 pb-1 border-b border-green-50">Construção</h5>
                <FactorDisplay label="Padrão (Fpc)" value={results.fatoresConstrucao.fpc} colorClass="text-green-700" />
                <FactorDisplay label="Estrutura (Fec)" value={results.fatoresConstrucao.fec} />
                <FactorDisplay label="Vertical (Fcv)" value={results.fatoresConstrucao.fcv} />
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 text-[9px] text-gray-400 font-medium italic text-center leading-tight border-t border-gray-100">
              Valores calculados em conformidade com a legislação e PVG.
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-gray-100 text-center text-gray-400 text-xs">
        <p>© {new Date().getFullYear()} Calculadora Tributária - Simulador Técnico</p>
      </footer>
    </div>
  );
};

export default App;
