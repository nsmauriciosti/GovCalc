
export const CR_VALOR = 1218.52; // Valor de Referência do Metro Quadrado de Construção

export const FACTOR_EXPLANATIONS: Record<string, string> = {
  f1: "Ajusta o valor com base na largura da frente do lote em relação ao padrão de 12m (Fórmula de Raiz Quarta).",
  f2: "Aplica uma regressão logarítmica baseada no tamanho do terreno; lotes muito grandes têm valor unitário reduzido.",
  f3: "Diferencia o valor entre lotes de meio de quadra, esquinas (mais valorizados) ou encravados.",
  f4: "Ajusta o valor conforme a inclinação do terreno (Plano, Aclive ou Declive).",
  f5: "Considera as condições geológicas do solo (Firme, Inundável ou Alagado).",
  f6: "Valoriza terrenos com acesso pavimentado (Asfalto/Bloquete) em relação a vias de terra.",
  f7: "Considera a presença de infraestrutura pública, como iluminação de rua.",
  f8: "Aplica um multiplicador para lotes situados em condomínios horizontais fechados.",
  fat: "Fator de ajuste específico para correções pontuais no valor venal do terreno.",
  rapp: "Redutor de Área de Preservação Permanente: abate até 80% do valor da área protegida.",
  fpc: "Define o custo do m² com base na qualidade, acabamento e luxo da construção.",
  fec: "Ajusta o valor pelo tipo de material estrutural (Alvenaria, Madeira, Adobe, etc).",
  fcv: "Coeficiente de Verticalização: aplicado especificamente a unidades em prédios/condomínios verticais.",
  favi: "Fator de ajuste final aplicado sobre o Valor Venal Total do Imóvel."
};

export const SITUACAO_QUADRA = [
  { label: 'Meio de quadra (1 frente)', value: 1.00 },
  { label: 'Meio de quadra (mais de 1 frente)', value: 1.03 },
  { label: 'Esquina', value: 1.09 },
  { label: 'Encravado', value: 0.90 },
  { label: 'Aglomerado', value: 0.80 },
];

export const TOPOGRAFIA = [
  { label: 'Plano', value: 1.00 },
  { label: 'Aclive', value: 0.95 },
  { label: 'Declive', value: 0.90 },
  { label: 'Irregular', value: 0.90 },
];

export const PEDOLOGIA = [
  { label: 'Firme', value: 1.00 },
  { label: 'Inundável', value: 0.90 },
  { label: 'Alagado', value: 0.85 },
];

export const PAVIMENTACAO = [
  { label: 'Asfáltica', value: 1.00 },
  { label: 'Bloquete', value: 1.00 },
  { label: 'Paralelepípedo', value: 1.00 },
  { label: 'Inexistente', value: 0.85 },
];

export const MELHORAMENTOS = [
  { label: 'Com Iluminação Pública', value: 1.00 },
  { label: 'Sem Iluminação Pública', value: 0.93 },
];

export const TIPO_OCUPACAO = [
  { label: 'Comum', value: 1.00 },
  { label: 'Condomínio Horizontal', value: 1.40 },
];

export const PADRAO_CONSTRUTIVO = [
  { label: '1A - Casa - Luxo', value: 1.3596 },
  { label: '1B - Casa - Normal', value: 0.8969 },
  { label: '1C - Casa - Baixo', value: 0.6766 },
  { label: '1D - Casa - Popular', value: 0.3854 },
  { label: '2A - Barraco - Luxo', value: 0.4090 },
  { label: '2B - Barraco - Normal', value: 0.3135 },
  { label: '3C - Barraco - Baixo', value: 0.1910 },
  { label: '3D - Barraco - Popular', value: 0.1840 },
  { label: '4A - Apartamento - Luxo', value: 1.3596 },
  { label: '4B - Apartamento - Normal', value: 0.8969 },
  { label: '4C - Apartamento - Baixo', value: 0.6766 },
  { label: '4D - Apartamento - Popular', value: 0.3854 },
  { label: '5A - Sala - Luxo', value: 1.3596 },
  { label: '5B - Sala - Normal', value: 0.8969 },
  { label: '6A - Loja - Luxo', value: 1.3596 },
  { label: '7A - Galpão - Luxo', value: 0.8179 },
];

export const ELEMENTO_CONSTRUTIVO = [
  { label: 'Alvenaria / Concreto', value: 1.00 },
  { label: 'Sem Paredes', value: 0.90 },
  { label: 'Adobe/Taipa', value: 0.60 },
  { label: 'Madeira Simples', value: 0.80 },
  { label: 'Madeira Luxo', value: 0.95 },
];

export const CONDOMINIO_VERTICAL = [
  { label: 'Não se aplica', value: 1.00 },
  { label: 'Apartamento - Luxo', value: 2.5 },
  { label: 'Apartamento - Normal', value: 1.8 },
  { label: 'Apartamento - Baixo', value: 1.5 },
  { label: 'Apartamento - Popular', value: 1.2 },
  { label: 'Loja - Luxo', value: 2.2 },
  { label: 'Garagem - Luxo', value: 1.5 },
];
