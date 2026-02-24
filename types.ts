
export interface Logradouro {
  codigo: string;
  nome: string;
  sequencia: string;
  vu_pvg: number;
}

export interface FactorOption {
  label: string;
  value: string;
  multiplier: number;
}

export interface Imovel {
  inscricao: string;
  m_nome: string;
  m_cod_logr: string;
  m_des_logr: string;
  m_num_pr_1: string;
  m_comple_1: string;
  m_des_bair: string;
  m_area_lot: number;
  m_area_con: number;
  m_testadap: number;
  m_situacao: string;
  m_topograf: string;
  m_pedologi: string;
  m_tipo: string;
  m_estrutur: string;
  cond_vert: number;
  pvg_vu_pvg: number;
}

export interface AppConfig {
  crValor: number;
  situacaoQuadra: FactorOption[];
  topografia: FactorOption[];
  pedologia: FactorOption[];
  pavimentacao: FactorOption[];
  melhoramentos: FactorOption[];
  tipoOcupacao: FactorOption[];
  padraoConstrutivo: FactorOption[];
  elementoConstrutivo: FactorOption[];
  condominioVertical: FactorOption[];
  aiEnabled: boolean;
  faviconUrl?: string;
}

export interface CalculoResult {
  vvt: number; // Valor venal do terreno
  vc: number;  // Valor venal da construção
  vvi: number; // Valor venal do imóvel
  iptu: number; // Valor do IPTU
  aliquota: number; // Alíquota aplicada
  categoria: 'PREDIAL' | 'TERRITORIAL';
  fatoresTerreno: Record<string, number>;
  fatoresConstrucao: Record<string, number>;
}

export interface SimulationParams {
  at: number;      // Área total do terreno
  acb: number;     // Área construída bruta
  testada: number; // Testada do lote
  app: number;     // Área de preservação permanente
  logradouro?: Logradouro;
  
  // Fatores de Terreno
  fsq: string;     
  ftop: string;    
  fpd: string;     
  fpav: string;    
  fmp: string;     
  fto: string;     
  fat: number;     
  
  // Fatores de Construção
  fpc: string;     
  fec: string;     
  fcv: string;     
  favi: number;    
}
