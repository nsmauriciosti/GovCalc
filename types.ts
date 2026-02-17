
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
  
  // Fatores de Terreno (agora strings para IDs únicos)
  fsq: string;     // Situação na quadra (F3)
  ftop: string;    // Topografia (F4)
  fpd: string;     // Pedologia (F5)
  fpav: string;    // Pavimentação (F6)
  fmp: string;     // Melhoramentos públicos (F7)
  fto: string;     // Tipo de ocupação (F8)
  fat: number;     // Ajuste valor cadastral terreno (Permanece número pois é input direto)
  
  // Fatores de Construção
  fpc: string;     // Padrão construtivo
  fec: string;     // Elemento construtivo
  fcv: string;     // Condomínio vertical
  favi: number;    // Ajuste cadastral imóvel (Permanece número pois é input direto)
}
