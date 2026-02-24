
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
  nome: string;
  logradouro_cod: string;
  logradouro_nome: string;
  numero: string;
  complemento: string;
  bairro: string;
  area_terreno: number;
  area_construida: number;
  testada: number;
  situacao: string;
  topografia: string;
  pedologia: string;
  tipo_padrao: string;
  estrutura: string;
  cond_vert: number;
  vu_pvg: number;
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
