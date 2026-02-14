
import { Logradouro, SimulationParams, CalculoResult } from './types';
import { CR_VALOR } from './constants';

/**
 * Cálculos baseados na Planta de Valores Genéricos (PVG) de Nova Serrana/MG
 */
export const calculateIPTU = (params: SimulationParams): CalculoResult => {
  const { at, acb, testada, app, logradouro, fsq, ftop, fpd, fpav, fmp, fto, fat, fpc, fec, fcv, favi } = params;
  
  if (!logradouro) {
    return { vvt: 0, vc: 0, vvi: 0, fatoresTerreno: {}, fatoresConstrucao: {} };
  }

  // F1 = FATOR DE TESTADA (Ft) - Raiz Quarta conforme norma técnica
  const testadaPadrao = 12.00;
  let ft = testada > 0 ? Math.pow(testada / testadaPadrao, 0.25) : 1.0;
  ft = Math.max(0.50, Math.min(1.50, ft));
  
  // F2 = FATOR DE ÁREA (Fa) - Regressão Logarítmica (Padrão ABNT adaptado)
  let fa = 1.0;
  if (at <= 1800) {
    fa = 1.434 - 0.076 * Math.log(at > 0 ? at : 1);
  } else if (at <= 100000) {
    fa = 2.046 - 0.157 * Math.log(at);
  } else {
    fa = 0.238;
  }
  fa = Math.max(0.238, Math.min(1.50, fa));

  // Rapp = Redutor APP (Limitação de uso)
  const rapp = (at > 0 && app > 0) ? Math.max(0.20, 1 - ((app * 0.8) / at)) : 1.0;

  // Vmq = Valor do metro quadrado do logradouro (VU_PVG)
  const vmq = logradouro.vu_pvg;

  // Vvt = At x Vmq x (Ft x Fa x fsq x ftop x fpd x fpav x fmp x fto) * fat * rapp
  const f_prod = ft * fa * fsq * ftop * fpd * fpav * fmp * fto;
  const vvt = (at * vmq * f_prod) * (fat || 1.0) * rapp;

  // Vc = Acb x Cr x Fpc x Fec x Fcv
  const vc = acb * CR_VALOR * fpc * fec * fcv;

  // Vvi = (Vvt + Vc) * Favi
  const vvi = (vvt + vc) * (favi || 1.0);

  return {
    vvt,
    vc,
    vvi,
    fatoresTerreno: { ft, fa, fsq, ftop, fpd, fpav, fmp, fto, fat, rapp },
    fatoresConstrucao: { fpc, fec, fcv, favi }
  };
};

/**
 * Filtro de logradouros otimizado para grandes volumes
 */
export const searchLogradouros = (term: string, list: Logradouro[]): Logradouro[] => {
  if (!term || term.length < 2) return [];
  
  const searchTerms = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(t => t.length > 0);
  
  return list.filter(log => {
    const combined = `${log.nome} ${log.codigo}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return searchTerms.every(t => combined.includes(t));
  });
};

/**
 * Planta de Valores Genéricos - Dados Iniciais
 */
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
