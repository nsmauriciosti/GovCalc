
export interface Logradouro {
  codigo: string;
  nome: string;
  sequencia: string;
  vu_pvg: number;
}

export interface CalculoResult {
  vvt: number; // Valor venal do terreno
  vc: number;  // Valor venal da construção
  vvi: number; // Valor venal do imóvel
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
  fsq: number;     // Situação na quadra (F3)
  ftop: number;    // Topografia (F4)
  fpd: number;     // Pedologia (F5)
  fpav: number;    // Pavimentação (F6)
  fmp: number;     // Melhoramentos públicos (F7)
  fto: number;     // Tipo de ocupação (F8)
  fat: number;     // Ajuste valor cadastral terreno
  
  // Fatores de Construção
  fpc: number;     // Padrão construtivo
  fec: number;     // Elemento construtivo
  fcv: number;     // Condomínio vertical
  favi: number;    // Ajuste cadastral imóvel
}
