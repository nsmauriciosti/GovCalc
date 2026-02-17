
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  SimulationParams, 
  Logradouro, 
  CalculoResult 
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

// Helper para normalizar strings (remover acentos e espaços extras)
const normalizeHeader = (s: string) => 
  String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

// Helper robusto para converter strings de diversos formatos para número
const parseFlexibleNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  let s = String(val).replace('R$', '').trim();
  
  // Se houver vírgula e ponto (ex: 1.234,56), assumimos formato brasileiro de milhar
  if (s.includes(',') && s.includes('.')) {
    // Removemos todos os pontos (milhares) e trocamos a vírgula por ponto (decimal)
    return parseFloat(s.split('.').join('').replace(',', '.'));
  }
  
  // Se houver apenas vírgula (ex: 265,02), trocamos por ponto
  if (s.includes(',')) {
    return parseFloat(s.replace(',', '.'));
  }
  
  // Caso contrário (ex: 265.02 ou 26502), parse direto
  return parseFloat(s);
};

// Mapeamento de possíveis nomes de colunas (aliases)
const COLUMN_ALIASES = {
  codigo: ['codlog', 'codigologradouro', 'codigo', 'cod', 'id'],
  nome: ['nomelogradouro', 'nome', 'logradouro', 'rua', 'avenida', 'via'],
  sequencia: ['seq', 'sequencia', 'item', 'ordem'],
  vu_pvg: ['vupvg', 'vupvg2024', 'valorunitario', 'valorm2', 'vmq', 'valor']
};

// Componente para exibir ícone de ajuda com tooltip explicativo
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

// Componente Modal de Ajuda
const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
        <div className="sticky top-0 bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
          <h2 className="text-2xl font-black text-gray-900">Metodologia de Cálculo</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-8 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h3 className="text-lg font-bold text-blue-600 mb-2 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">01</span>
              Valor Venal do Terreno (VVT)
            </h3>
            <p className="text-sm mb-4">O cálculo do terreno é o produto da área pela valorização do logradouro, ajustado por fatores físicos:</p>
            <div className="bg-gray-50 p-4 rounded-xl font-mono text-xs border border-gray-100">
              VVT = At x Vmq x (Ft x Fa x Fsq x Ftop x Fpd x Fpav x Fmp x Fto) x Fat x Rapp
            </div>
            <ul className="mt-4 space-y-2 text-xs list-disc pl-5">
              <li><strong>Vmq:</strong> Valor do m² definido na Planta de Valores Genéricos.</li>
              <li><strong>Ft (Fator Testada):</strong> Raiz quarta de (Testada real / 12m). Limites: 0.50 a 1.50.</li>
              <li><strong>Fa (Fator Área):</strong> Regressão logarítmica. Lotes maiores possuem valor unitário menor.</li>
              <li><strong>Rapp:</strong> Redutor de até 80% para áreas de preservação permanente comprovadas.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-green-600 mb-2 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mr-3 text-sm">02</span>
              Valor Venal da Construção (VC)
            </h3>
            <p className="text-sm mb-4">Calculado com base no custo de reprodução e padrão construtivo:</p>
            <div className="bg-gray-50 p-4 rounded-xl font-mono text-xs border border-gray-100">
              VC = Acb x Cr x Fpc x Fec x Fcv
            </div>
            <ul className="mt-4 space-y-2 text-xs list-disc pl-5">
              <li><strong>Cr (Custo de Referência):</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(CR_VALOR)}/m².</li>
              <li><strong>Fpc (Padrão):</strong> Multiplicador conforme a qualidade da obra (Luxo, Normal, Baixo, Popular).</li>
              <li><strong>Fcv (Verticalização):</strong> Aplicado apenas em apartamentos e unidades em prédios.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-indigo-600 mb-2 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 text-sm">03</span>
              Dicas de Importação
            </h3>
            <p className="text-sm mb-2">Para evitar erros de valores em milhar, certifique-se de que sua planilha:</p>
            <ul className="mt-4 space-y-2 text-xs list-disc pl-5">
              <li>Usa vírgula para decimais (ex: 265,02).</li>
              <li>Não usa pontos para milhares (preferencialmente).</li>
              <li>O sistema limpa automaticamente o prefixo "R$".</li>
            </ul>
          </section>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};

// Wrapper para seções do formulário
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-50">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
  </div>
);

// Campo de entrada de texto ou número customizado
const InputField: React.FC<{ label: string; name: string; type?: string; value: any; onChange: (e: any) => void; placeholder?: string; tooltip?: string }> = ({ label, name, type = "number", value, onChange, placeholder, tooltip }) => (
  <div>
    <div className="flex items-center mb-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {tooltip && <InfoIcon tooltip={tooltip} />}
    </div>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white transition-colors placeholder-gray-400"
    />
  </div>
);

// Campo de seleção customizado
const SelectField: React.FC<{ label: string; name: string; options: { label: string; value: string; multiplier: number }[]; value: string; onChange: (e: any) => void; tooltip?: string }> = ({ label, name, options, value, onChange, tooltip }) => (
  <div>
    <div className="flex items-center mb-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {tooltip && <InfoIcon tooltip={tooltip} />}
    </div>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors cursor-pointer"
    >
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value} className="text-gray-900 bg-white py-2">
          {opt.label} ({Number(opt.multiplier).toFixed(4)})
        </option>
      ))}
    </select>
  </div>
);

// Exibição de valores de fatores calculados
const FactorDisplay: React.FC<{ label: string; value: any; subtitle?: string; tooltip?: string; colorClass?: string }> = ({ label, value, subtitle, tooltip, colorClass = "text-gray-900" }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors px-1 rounded">
    <div className="flex flex-col">
      <div className="flex items-center">
        <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">{label}</span>
        {tooltip && <InfoIcon tooltip={tooltip} />}
      </div>
      {subtitle && <span className="text-[10px] text-gray-400 -mt-0.5">{subtitle}</span>}
    </div>
    <span className={`font-mono text-sm font-black ${colorClass}`}>
      {Number(value || 0).toFixed(4)}
    </span>
  </div>
);

const App: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>({
    at: 300,
    acb: 150,
    testada: 12,
    app: 0,
    fsq: 'Meio de quadra (1 frente)',
    ftop: 'Plano',
    fpd: 'Firme',
    fpav: 'Asfáltica',
    fmp: 'Com Iluminação Pública',
    fto: 'Comum',
    fat: 1.0,
    fpc: '1B - Casa - Normal',
    fec: 'Alvenaria / Concreto',
    fcv: 'Não se aplica',
    favi: 1.0,
    logradouro: undefined
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [logradouros, setLogradouros] = useState<Logradouro[]>(MOCK_LOGRADOUROS);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isNumericInput = type === 'number';
    
    setParams(prev => ({
      ...prev,
      [name]: isNumericInput ? parseFloat(value) : value
    }));
  }, []);

  const handleLogradouroSelect = (log: Logradouro) => {
    setParams(prev => ({ ...prev, logradouro: log }));
    setSearchTerm(log.nome);
    setIsSearching(false);
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
        
        if (rawRows.length === 0) {
          throw new Error("A planilha está vazia.");
        }

        const firstRowKeys = Object.keys(rawRows[0]);
        
        const keyMapping = {
          codigo: findKeyByAlias(firstRowKeys, COLUMN_ALIASES.codigo),
          nome: findKeyByAlias(firstRowKeys, COLUMN_ALIASES.nome),
          sequencia: findKeyByAlias(firstRowKeys, COLUMN_ALIASES.sequencia),
          vu_pvg: findKeyByAlias(firstRowKeys, COLUMN_ALIASES.vu_pvg)
        };

        if (!keyMapping.nome || !keyMapping.vu_pvg) {
          throw new Error(`Colunas 'Nome' e 'Valor' não identificadas automaticamente.`);
        }

        const totalRows = rawRows.length;
        const newList: Logradouro[] = rawRows.map((row: any) => {
          const vuVal = parseFlexibleNumber(row[keyMapping.vu_pvg!]);
          return {
            codigo: String(keyMapping.codigo ? row[keyMapping.codigo] : ""),
            nome: String(row[keyMapping.nome!] || "").toUpperCase().trim(),
            sequencia: String(keyMapping.sequencia ? row[keyMapping.sequencia] : "1"),
            vu_pvg: vuVal
          };
        }).filter(l => l.nome && !isNaN(l.vu_pvg) && l.vu_pvg > 0);

        const successCount = newList.length;
        const ignoredCount = totalRows - successCount;

        if (successCount > 0) {
          setLogradouros(newList);
          setImportStatus({ 
            type: 'success', 
            message: `${successCount} logradouros importados com sucesso. ${ignoredCount > 0 ? `${ignoredCount} ignorados por dados inválidos.` : 'Todos os registros foram carregados.'}` 
          });
        } else {
          throw new Error("Nenhum registro válido foi encontrado na planilha. Verifique os nomes das colunas e os valores.");
        }
      } catch (err: any) {
        setImportStatus({ type: 'error', message: err.message || "Erro desconhecido ao ler o arquivo." });
      }
      setTimeout(() => setImportStatus(null), 10000);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const results = useMemo(() => calculateIPTU(params), [params]);

  const filteredLogradouros = useMemo(() => {
    return searchLogradouros(searchTerm, logradouros);
  }, [searchTerm, logradouros]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      
      <header className="mb-12 text-center relative">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Simulador de Valor Venal</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">Consulte valores por logradouro ou importe a Planta de Valores Genéricos (PVG) oficial.</p>
        
        <button 
          onClick={() => setIsHelpOpen(true)}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-semibold text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm group"
        >
          <svg className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Metodologia de Cálculo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LADO ESQUERDO: INPUTS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100" ref={searchRef}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Localização e Planta de Valores
              </h3>
              
              <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  Importar Planilha
                </button>
              </div>
            </div>

            {importStatus && (
              <div className={`mb-4 p-4 rounded-xl text-sm font-medium flex items-start gap-3 animate-in slide-in-from-top duration-300 ${importStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                {importStatus.type === 'success' ? (
                  <svg className="w-5 h-5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                ) : (
                  <svg className="w-5 h-5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                )}
                <span>{importStatus.message}</span>
              </div>
            )}
            
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onFocus={() => setIsSearching(true)}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsSearching(true);
                    }}
                    placeholder="Busque por rua ou código (ex: Dimas Guimarães)..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => { setSearchTerm(''); setParams(p => ({...p, logradouro: undefined})); }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                    </button>
                  )}
                </div>
              </div>

              {isSearching && searchTerm.length >= 2 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-80 overflow-y-auto ring-1 ring-black ring-opacity-5">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between sticky top-0 border-b border-gray-100 z-10">
                    <span>{filteredLogradouros.length} encontrados</span>
                    <span>{logradouros.length} registros</span>
                  </div>
                  {filteredLogradouros.length > 0 ? (
                    filteredLogradouros.map((log, i) => (
                      <button
                        key={`${log.codigo}-${log.sequencia}-${i}`}
                        onClick={() => handleLogradouroSelect(log)}
                        className="w-full text-left px-4 py-4 hover:bg-blue-50 flex justify-between items-center group transition-colors border-b last:border-b-0 border-gray-50"
                      >
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-blue-700 uppercase">{log.nome}</p>
                          <p className="text-xs text-gray-500">Cód: {log.codigo || 'S/N'} • Seq: {log.sequencia || '0'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-blue-600">{formatCurrency(log.vu_pvg)}/m²</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">VU_PVG</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-gray-500 font-medium">Não localizado.</p>
                      <p className="text-xs text-gray-400 mt-1">Verifique os nomes e tente importar novamente.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {params.logradouro ? (
              <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Selecionado</span>
                  <h4 className="text-lg font-extrabold text-blue-900 leading-tight uppercase">{params.logradouro.nome}</h4>
                  <p className="text-sm text-blue-700 opacity-75">Cód: {params.logradouro.codigo || 'N/A'} (Seq: {params.logradouro.sequencia || '0'})</p>
                </div>
                <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-blue-200 text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">VU Logradouro</span>
                  <p className="text-2xl font-black text-blue-600 tracking-tight">{formatCurrency(params.logradouro.vu_pvg)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center bg-gray-50/50">
                <p className="text-gray-400 font-medium italic">Pesquise uma rua acima para iniciar o cálculo.</p>
              </div>
            )}
          </div>

          <FormSection title="Características do Terreno">
            <InputField label="Área Total (At) m²" name="at" value={params.at} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f2} />
            <InputField label="Testada Principal (m)" name="testada" value={params.testada} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f1} />
            <InputField label="Área de APP (m²)" name="app" value={params.app} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.rapp} />
            <SelectField label="F3 - Situação na Quadra" name="fsq" options={SITUACAO_QUADRA} value={params.fsq} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f3} />
            <SelectField label="F4 - Topografia" name="ftop" options={TOPOGRAFIA} value={params.ftop} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.ftop} />
            <SelectField label="F5 - Pedologia" name="fpd" options={PEDOLOGIA} value={params.fpd} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fpd} />
            <SelectField label="F6 - Pavimentação" name="fpav" options={PAVIMENTACAO} value={params.fpav} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fpav} />
            <SelectField label="F7 - Melhoramentos" name="fmp" options={MELHORAMENTOS} value={params.fmp} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fmp} />
            <SelectField label="F8 - Tipo de Ocupação" name="fto" options={TIPO_OCUPACAO} value={params.fto} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fto} />
          </FormSection>

          <FormSection title="Dados da Edificação">
            <SelectField label="Padrão Construtivo" name="fpc" options={PADRAO_CONSTRUTIVO} value={params.fpc} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fpc} />
            <SelectField label="Estrutura Dominante" name="fec" options={ELEMENTO_CONSTRUTIVO} value={params.fec} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fec} />
            <SelectField label="Coef. Verticalização" name="fcv" options={CONDOMINIO_VERTICAL} value={params.fcv} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fcv} />
            <InputField label="Área Construída (Acb) m²" name="acb" value={params.acb} onChange={handleInputChange} />
            <InputField label="Fator Ajuste Terreno (Fat)" name="fat" value={params.fat} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fat} />
            <InputField label="Fator Ajuste Imóvel (Favi)" name="favi" value={params.favi} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.favi} />
          </FormSection>
        </div>

        {/* LADO DIREITO: RESULTADOS (DASHBOARD) */}
        <div className="space-y-6 lg:sticky lg:top-8 self-start">
          
          {/* CARD PRINCIPAL - VALOR TOTAL */}
          <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
            </div>
            <h3 className="text-blue-400 text-xs font-black uppercase tracking-widest mb-2">Simulação Final</h3>
            <div className="mb-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Valor Venal do Imóvel (VVI)</span>
              <div className="text-4xl font-black tracking-tighter text-white">
                {formatCurrency(results.vvi)}
              </div>
            </div>
          </div>

          {/* CARDS SECUNDÁRIOS - VVT E VC */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between">
              <span className="text-[10px] text-blue-500 font-black uppercase tracking-wider mb-2">Terreno (VVT)</span>
              <div className="text-lg font-black text-gray-900 leading-tight">
                {formatCurrency(results.vvt)}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-medium">Base p/ ITBI</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 flex flex-col justify-between">
              <span className="text-[10px] text-green-600 font-black uppercase tracking-wider mb-2">Edificação (VC)</span>
              <div className="text-lg font-black text-gray-900 leading-tight">
                {formatCurrency(results.vc)}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-medium">Custo Reprod.</p>
            </div>
          </div>

          {/* DETALHAMENTO TÉCNICO - FATORES */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-100">
              <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Memória de Cálculo
              </h4>
            </div>

            <div className="p-5 space-y-6">
              {/* GRUPO TERRENO */}
              <div>
                <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 pb-1 border-b border-blue-50">Fatores do Terreno</h5>
                <div className="space-y-0.5">
                  <FactorDisplay label="F1 - Testada (Ft)" value={results.fatoresTerreno.ft} tooltip={FACTOR_EXPLANATIONS.f1} colorClass="text-blue-700" />
                  <FactorDisplay label="F2 - Área (Fa)" value={results.fatoresTerreno.fa} tooltip={FACTOR_EXPLANATIONS.f2} colorClass="text-blue-700" />
                  <FactorDisplay label="F3 - Situação" value={results.fatoresTerreno.fsq} tooltip={FACTOR_EXPLANATIONS.fsq} />
                  <FactorDisplay label="F4 - Topografia" value={results.fatoresTerreno.ftop} tooltip={FACTOR_EXPLANATIONS.ftop} />
                  <FactorDisplay label="F5 - Pedologia" value={results.fatoresTerreno.fpd} tooltip={FACTOR_EXPLANATIONS.fpd} />
                  <FactorDisplay label="F6 - Pavimento" value={results.fatoresTerreno.fpav} tooltip={FACTOR_EXPLANATIONS.fpav} />
                  <FactorDisplay label="F7 - Melhoram." value={results.fatoresTerreno.fmp} tooltip={FACTOR_EXPLANATIONS.fmp} />
                  <FactorDisplay label="F8 - Ocupação" value={results.fatoresTerreno.fto} tooltip={FACTOR_EXPLANATIONS.fto} />
                  <FactorDisplay label="Rapp - Redutor APP" value={results.fatoresTerreno.rapp} tooltip={FACTOR_EXPLANATIONS.rapp} />
                </div>
              </div>

              {/* GRUPO CONSTRUÇÃO */}
              <div>
                <h5 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 pb-1 border-b border-green-50">Fatores da Construção</h5>
                <div className="space-y-0.5">
                  <FactorDisplay label="Padrão (Fpc)" value={results.fatoresConstrucao.fpc} tooltip={FACTOR_EXPLANATIONS.fpc} colorClass="text-green-700" />
                  <FactorDisplay label="Estrutura (Fec)" value={results.fatoresConstrucao.fec} tooltip={FACTOR_EXPLANATIONS.fec} />
                  <FactorDisplay label="Verticaliz. (Fcv)" value={results.fatoresConstrucao.fcv} tooltip={FACTOR_EXPLANATIONS.fcv} />
                </div>
              </div>

              {/* AJUSTES FINAIS */}
              <div className="pt-2">
                <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 pb-1 border-b border-gray-100">Ajustes Finais</h5>
                <div className="space-y-0.5">
                  <FactorDisplay label="Ajuste Terr. (Fat)" value={results.fatoresTerreno.fat} tooltip={FACTOR_EXPLANATIONS.fat} />
                  <FactorDisplay label="Ajuste Imóvel (Favi)" value={results.fatoresConstrucao.favi} tooltip={FACTOR_EXPLANATIONS.favi} />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-5 py-3 text-[9px] text-gray-400 font-medium italic text-center leading-tight">
              Cálculos realizados em conformidade com a Legislação Municipal e a Planta de Valores Genéricos vigente.
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-gray-100 text-center text-gray-400 text-xs">
        <p>© {new Date().getFullYear()} Calculadora Tributária - Nova Serrana/MG</p>
      </footer>
    </div>
  );
};

export default App;
