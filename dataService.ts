
import { Logradouro, SimulationParams, CalculoResult, AppConfig } from './types';
import { ALIQUOTAS_IPTU } from './constants';

const getMultiplier = (list: { value: string, multiplier: number }[], selectedValue: string, defaultVal: number): number => {
  const item = list.find(i => i.value === selectedValue);
  return item ? item.multiplier : defaultVal;
};

/**
 * Cálculos baseados na Planta de Valores Genéricos (PVG)
 * Agora aceita o objeto 'config' dinâmico
 */
export const calculateIPTU = (params: SimulationParams, config: AppConfig): CalculoResult => {
  const { at, acb, testada, app, logradouro, fsq, ftop, fpd, fpav, fmp, fto, fat, fpc, fec, fcv, favi } = params;
  
  if (!logradouro) {
    return { vvt: 0, vc: 0, vvi: 0, iptu: 0, aliquota: 0, categoria: 'TERRITORIAL', fatoresTerreno: {}, fatoresConstrucao: {} };
  }

  // Resolução dos multiplicadores numéricos a partir das configurações dinâmicas
  const mFsq = getMultiplier(config.situacaoQuadra, fsq, 1.0);
  const mFtop = getMultiplier(config.topografia, ftop, 1.0);
  const mFpd = getMultiplier(config.pedologia, fpd, 1.0);
  const mFpav = getMultiplier(config.pavimentacao, fpav, 1.0);
  const mFmp = getMultiplier(config.melhoramentos, fmp, 1.0);
  const mFto = getMultiplier(config.tipoOcupacao, fto, 1.0);
  const mFpc = getMultiplier(config.padraoConstrutivo, fpc, 1.0);
  const mFec = getMultiplier(config.elementoConstrutivo, fec, 1.0);
  const mFcv = getMultiplier(config.condominioVertical, fcv, 1.0);

  // F1 = FATOR DE TESTADA (Ft)
  const testadaPadrao = 12.00;
  let ft = testada > 0 ? Math.pow(testada / testadaPadrao, 0.25) : 1.0;
  ft = Math.max(0.50, Math.min(1.50, ft));
  
  // F2 = FATOR DE ÁREA (Fa)
  let fa = 1.0;
  if (at <= 1800) {
    fa = 1.434 - 0.076 * Math.log(at > 0 ? at : 1);
  } else if (at <= 100000) {
    fa = 2.046 - 0.157 * Math.log(at);
  } else {
    fa = 0.238;
  }
  fa = Math.max(0.238, Math.min(1.50, fa));

  const rapp = (at > 0 && app > 0) ? Math.max(0.20, 1 - ((app * 0.8) / at)) : 1.0;
  const vmq = logradouro.vu_pvg;

  const f_prod = ft * fa * mFsq * mFtop * mFpd * mFpav * mFmp * mFto;
  const vvt = (at * vmq * f_prod) * (fat || 1.0) * rapp;

  // Vc = Acb x Cr x Fpc x Fec x Fcv
  const vc = acb * config.crValor * mFpc * mFec * mFcv;

  // Vvi = (Vvt + Vc) * Favi
  const vvi = (vvt + vc) * (favi || 1.0);

  // CÁLCULO DO IPTU
  const categoria = acb > 0 ? 'PREDIAL' : 'TERRITORIAL';
  const tabela = ALIQUOTAS_IPTU[categoria];
  const faixa = tabela.find(f => vvi >= f.min && vvi <= f.max) || tabela[tabela.length - 1];
  const aliquota = faixa.rate;
  const iptu = vvi * aliquota;

  return {
    vvt,
    vc,
    vvi,
    iptu,
    aliquota,
    categoria,
    fatoresTerreno: { ft, fa, fsq: mFsq, ftop: mFtop, fpd: mFpd, fpav: mFpav, fmp: mFmp, fto: mFto, fat, rapp },
    fatoresConstrucao: { fpc: mFpc, fec: mFec, fcv: mFcv, favi }
  };
};

export const searchLogradouros = (term: string, list: Logradouro[]): Logradouro[] => {
  if (!term || term.length < 2) return [];
  const searchTerms = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(t => t.length > 0);
  return list.filter(log => {
    const combined = `${log.nome} ${log.codigo}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return searchTerms.every(t => combined.includes(t));
  });
};

export const MOCK_LOGRADOUROS: Logradouro[] = [
  { codigo: "10.0", nome: "RUA DIMAS GUIMARÃES", sequencia: "10.1", vu_pvg: 3150.50 },
  { codigo: "15.0", nome: "RUA PADRE LIBÉRIO", sequencia: "15.1", vu_pvg: 1845.20 },
  { codigo: "20.0", nome: "AVENIDA DOM CABRAL", sequencia: "20.1", vu_pvg: 2100.00 },
  { codigo: "1597.0", nome: "RUA TUPIS", sequencia: "1597.1", vu_pvg: 2940.93 },
  { codigo: "1000.0", nome: "RUA MARIA ANA DUARTE", sequencia: "1000.1", vu_pvg: 1780.29 },
  { codigo: "2925.0", nome: "AVENIDA CORONEL PACÍFICO PINTO", sequencia: "2925.1", vu_pvg: 2515.87 },
  { codigo: "108.0", nome: "AVENIDA SÃO PAULO", sequencia: "108.1", vu_pvg: 714.97 },
  { codigo: "310.0", nome: "AVENIDA BRASIL", sequencia: "310.1", vu_pvg: 1450.00 },
  { codigo: "20111.0", nome: "RUA DO COMÉRCIO", sequencia: "20111.1", vu_pvg: 2200.00 },
  { codigo: "17000.0", nome: "PRAÇA DA ESTAÇÃO", sequencia: "17000.1", vu_pvg: 1250.00 },
  { codigo: "280.0", nome: "AVENIDA MINAS GERAIS", sequencia: "280.1", vu_pvg: 366.17 },
  { codigo: "299.0", nome: "AVENIDA PARÁ", sequencia: "299.1", vu_pvg: 399.49 },
];
