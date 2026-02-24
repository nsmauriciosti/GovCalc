
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
  autonoma?: string;
  pavim?: string;
  fmp?: string;
  pvg_vu_pvg?: number;
  m_nro_cuc?: string;
  m_cnpj_cpf?: string;
  m_nome?: string;
  m_cod_logr?: string;
  m_tipo_log?: string;
  m_des_logr?: string;
  m_num_pr_1?: string;
  m_comple_1?: string;
  m_cod_bair?: string;
  m_des_bair?: string;
  m_secao?: string;
  m_face?: string;
  m_area_lot?: number;
  m_area_con?: number;
  m_qtd_unid?: number;
  m_area_tot_con?: number;
  fi_lote?: number;
  m_testadap?: number;
  m_cod_test?: string;
  m_ocupacao?: string;
  m_utilizac?: string;
  m_patrimon?: string;
  m_muro_cer?: string;
  m_passeio?: string;
  m_limpezal?: string;
  m_isencao_?: string;
  m_situacao?: string;
  m_topograf?: string;
  m_pedologi?: string;
  tipo_ocuop?: string;
  m_tipo?: string;
  m_alinhame?: string;
  m_posicao?: string;
  m_localiza?: string;
  m_estrutur?: string;
  m_cobertur?: string;
  m_paredes?: string;
  m_forro?: string;
  m_revestim?: string;
  m_instalac?: string;
  m_instal_1?: string;
  m_piso?: string;
  m_padrao?: string;
  m_regulari?: string;
  cond_vert?: number;
  fora?: number;
  mediana?: number;
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
