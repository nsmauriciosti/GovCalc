
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
const SelectField: React.FC<{ label: string; name: string; options: { label: string; value: number }[]; value: number; onChange: (e: any) => void; tooltip?: string }> = ({ label, name, options, value, onChange, tooltip }) => (
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
          {opt.label} ({opt.value.toFixed(4)})
        </option>
      ))}
    </select>
  </div>
);

// Exibição de valores de fatores calculados
const FactorDisplay: React.FC<{ label: string; value: number; className?: string; subtitle?: string; tooltip?: string }> = ({ label, value, className = "", subtitle, tooltip }) => (
  <div className={`flex justify-between items-center py-2 border-b border-gray-50 last:border-0 ${className}`}>
    <div className="flex flex-col">
      <div className="flex items-center">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-tight">{label}</span>
        {tooltip && <InfoIcon tooltip={tooltip} />}
      </div>
      {subtitle && <span className="text-[10px] text-gray-400 -mt-0.5">{subtitle}</span>}
    </div>
    <span className="font-mono text-gray-900 text-sm font-bold">{(value || 0).toFixed(4)}</span>
  </div>
);

const App: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>({
    at: 300,
    acb: 150,
    testada: 12,
    app: 0,
    fsq: 1.0,
    ftop: 1.0,
    fpd: 1.0,
    fpav: 1.0,
    fmp: 1.0,
    fto: 1.0,
    fat: 1.0,
    fpc: 0.8969, // Normal
    fec: 1.0,
    fcv: 1.0,
    favi: 1.0,
    logradouro: undefined
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
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
    setParams(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  }, []);

  const handleLogradouroSelect = (log: Logradouro) => {
    setParams(prev => ({ ...prev, logradouro: log }));
    setSearchTerm(log.nome);
    setIsSearching(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newList: Logradouro[] = data.map((row: any) => ({
          codigo: String(row.Cod_Log || row.COD_LOG || row.codigo || ""),
          nome: String(row.Nome_Logradouro || row.NOME_LOGRADOURO || row.nome || ""),
          sequencia: String(row.Seq || row.SEQ || row.sequencia || ""),
          vu_pvg: parseFloat(String(row.VU_PVG || row.vu_pvg || 0).replace(',', '.'))
        })).filter(l => l.nome && !isNaN(l.vu_pvg));

        if (newList.length > 0) {
          setLogradouros(newList);
          setImportStatus({ type: 'success', message: `${newList.length} logradouros importados com sucesso!` });
        } else {
          setImportStatus({ type: 'error', message: "Nenhum dado válido encontrado. Verifique os nomes das colunas (Cod_Log, Nome_Logradouro, Seq, VU_PVG)." });
        }
      } catch (err) {
        setImportStatus({ type: 'error', message: "Erro ao processar o arquivo. Verifique o formato .xlsx" });
      }
      setTimeout(() => setImportStatus(null), 5000);
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
      <header className="mb-12 text-center">
        <div className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
          Fiscal & Tributário • Nova Serrana/MG
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Simulador de Valor Venal</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">Importação completa da Planta de Valores Genéricos (PVG). Consulte logradouros por nome ou código fiscal.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Coluna Esquerda: Formulário de Entrada */}
        <div className="lg:col-span-2 space-y-8">
          {/* Seção de Busca de Logradouro e Importação */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100" ref={searchRef}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Localização e Vmq (Valor p/ m²)
              </h3>
              
              <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  Importar Excel
                </button>
              </div>
            </div>

            {importStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${importStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {importStatus.type === 'success' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                )}
                {importStatus.message}
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
                    placeholder="Busque por nome da rua ou código (ex: Dimas Guimarães)..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => { setSearchTerm(''); setParams(p => ({...p, logradouro: undefined})); }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                    </button>
                  )}
                </div>
              </div>

              {isSearching && searchTerm.length >= 2 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-80 overflow-y-auto ring-1 ring-black ring-opacity-5">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                    <span>{filteredLogradouros.length} logradouros encontrados</span>
                    <span>Planta Ativa ({logradouros.length} registros)</span>
                  </div>
                  {filteredLogradouros.length > 0 ? (
                    filteredLogradouros.map((log, i) => (
                      <button
                        key={`${log.codigo}-${log.sequencia}-${i}`}
                        onClick={() => handleLogradouroSelect(log)}
                        className="w-full text-left px-4 py-4 hover:bg-blue-50 flex justify-between items-center group transition-colors border-b last:border-b-0 border-gray-50"
                      >
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-blue-700">{log.nome}</p>
                          <p className="text-xs text-gray-500">Cod_Log: {log.codigo} • Seq: {log.sequencia}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-blue-600">{formatCurrency(log.vu_pvg)}/m²</p>
                          <p className="text-[10px] text-gray-400 font-medium">VU_PVG</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-gray-500 font-medium">Logradouro não localizado.</p>
                      <p className="text-xs text-gray-400 mt-1">Tente importar a planilha completa usando o botão acima.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {params.logradouro ? (
              <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Logradouro Ativo</span>
                  <h4 className="text-lg font-extrabold text-blue-900 leading-tight">{params.logradouro.nome}</h4>
                  <p className="text-sm text-blue-700">Cod: {params.logradouro.codigo} (Sequência {params.logradouro.sequencia})</p>
                </div>
                <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-blue-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Valor Unitário PVG (m²)</span>
                  <p className="text-2xl font-black text-blue-600 tracking-tight">{formatCurrency(params.logradouro.vu_pvg)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center">
                <p className="text-gray-400 font-medium italic">Inicie a simulação buscando um logradouro acima.</p>
              </div>
            )}
          </div>

          <FormSection title="Características do Terreno">
            <InputField label="Área Total (At) m²" name="at" value={params.at} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f2} />
            <InputField label="Testada (Ft) m" name="testada" value={params.testada} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f1} />
            <InputField label="Área Preservada (App) m²" name="app" value={params.app} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.rapp} />
            <SelectField label="F3 - Situação na Quadra" name="fsq" options={SITUACAO_QUADRA} value={params.fsq} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f3} />
            <SelectField label="F4 - Topografia" name="ftop" options={TOPOGRAFIA} value={params.ftop} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f4} />
            <SelectField label="F5 - Pedologia" name="fpd" options={PEDOLOGIA} value={params.fpd} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f5} />
            <SelectField label="F6 - Pavimentação" name="fpav" options={PAVIMENTACAO} value={params.fpav} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f6} />
            <SelectField label="F7 - Melhoramentos" name="fmp" options={MELHORAMENTOS} value={params.fmp} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f7} />
            <SelectField label="F8 - Tipo de Ocupação" name="fto" options={TIPO_OCUPACAO} value={params.fto} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.f8} />
          </FormSection>

          <FormSection title="Fatores de Construção">
            <SelectField label="Padrão Construtivo" name="fpc" options={PADRAO_CONSTRUTIVO} value={params.fpc} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fpc} />
            <SelectField label="Elemento Construtivo" name="fec" options={ELEMENTO_CONSTRUTIVO} value={params.fec} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fec} />
            <SelectField label="Condomínio Vertical" name="fcv" options={CONDOMINIO_VERTICAL} value={params.fcv} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fcv} />
            <InputField label="Área Construída (Acb) m²" name="acb" value={params.acb} onChange={handleInputChange} />
            <InputField label="Ajuste Terreno (Fat)" name="fat" value={params.fat} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.fat} />
            <InputField label="Ajuste Imóvel (Favi)" name="favi" value={params.favi} onChange={handleInputChange} tooltip={FACTOR_EXPLANATIONS.favi} />
          </FormSection>
        </div>

        {/* Coluna Direita: Resultados e Detalhamento */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
            </div>
            
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">Valor Venal Estimado</h3>
            
            <div className="mb-8">
              <span className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Total do Imóvel (Vvi)</span>
              <div className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                {formatCurrency(results.vvi)}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-800">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Do Terreno (Vvt)</span>
                  <span className="text-lg font-bold text-gray-200">{formatCurrency(results.vvt)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Da Construção (Vc)</span>
                  <span className="text-lg font-bold text-gray-200">{formatCurrency(results.vc)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Detalhamento dos Fatores
            </h4>
            
            <div className="space-y-1">
              <FactorDisplay label="Ft (Testada)" value={results.fatoresTerreno.ft} tooltip={FACTOR_EXPLANATIONS.f1} />
              <FactorDisplay label="Fa (Área)" value={results.fatoresTerreno.fa} tooltip={FACTOR_EXPLANATIONS.f2} />
              <FactorDisplay label="Fsq (Situação)" value={results.fatoresTerreno.fsq} tooltip={FACTOR_EXPLANATIONS.f3} />
              <FactorDisplay label="Ftop (Topografia)" value={results.fatoresTerreno.ftop} tooltip={FACTOR_EXPLANATIONS.f4} />
              <FactorDisplay label="Fpd (Pedologia)" value={results.fatoresTerreno.fpd} tooltip={FACTOR_EXPLANATIONS.f5} />
              <FactorDisplay label="Fpav (Pavimentação)" value={results.fatoresTerreno.fpav} tooltip={FACTOR_EXPLANATIONS.f6} />
              <FactorDisplay label="Fmp (Melhoramentos)" value={results.fatoresTerreno.fmp} tooltip={FACTOR_EXPLANATIONS.f7} />
              <FactorDisplay label="Fto (Ocupação)" value={results.fatoresTerreno.fto} tooltip={FACTOR_EXPLANATIONS.fto || FACTOR_EXPLANATIONS.f8} />
              <FactorDisplay label="Fat (Ajuste Terr.)" value={results.fatoresTerreno.fat} tooltip={FACTOR_EXPLANATIONS.fat} />
              <FactorDisplay label="Rapp (Redutor APP)" value={results.fatoresTerreno.rapp} tooltip={FACTOR_EXPLANATIONS.rapp} />
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-gray-100 text-center text-gray-400 text-xs">
        <p>© {new Date().getFullYear()} Simulador de Valor Venal - Nova Serrana/MG</p>
        <p className="mt-1">Importe sua planilha .xlsx com as colunas: <b>Cod_Log, Nome_Logradouro, Seq, VU_PVG</b>.</p>
      </footer>
    </div>
  );
};

export default App;
