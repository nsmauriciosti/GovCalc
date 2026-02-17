
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
  { label: 'Meio de quadra (1 frente)', value: 'Meio de quadra (1 frente)', multiplier: 1.00 },
  { label: 'Meio de quadra (mais de 1 frente)', value: 'Meio de quadra (mais de 1 frente)', multiplier: 1.03 },
  { label: 'Esquina', value: 'Esquina', multiplier: 1.09 },
  { label: 'Encravado', value: 'Encravado', multiplier: 0.90 },
  { label: 'Aglomerado', value: 'Aglomerado', multiplier: 0.80 },
];

export const TOPOGRAFIA = [
  { label: 'Plano', value: 'Plano', multiplier: 1.00 },
  { label: 'Aclive', value: 'Aclive', multiplier: 0.95 },
  { label: 'Declive', value: 'Declive', multiplier: 0.90 },
  { label: 'Irregular', value: 'Irregular', multiplier: 0.90 },
];

export const PEDOLOGIA = [
  { label: 'Firme', value: 'Firme', multiplier: 1.00 },
  { label: 'Inundável', value: 'Inundável', multiplier: 0.90 },
  { label: 'Alagado', value: 'Alagado', multiplier: 0.85 },
];

export const PAVIMENTACAO = [
  { label: 'Asfáltica', value: 'Asfáltica', multiplier: 1.00 },
  { label: 'Bloquete', value: 'Bloquete', multiplier: 1.00 },
  { label: 'Paralelepípedo', value: 'Paralelepípedo', multiplier: 1.00 },
  { label: 'Inexistente', value: 'Inexistente', multiplier: 0.85 },
];

export const MELHORAMENTOS = [
  { label: 'Com Iluminação Pública', value: 'Com Iluminação Pública', multiplier: 1.00 },
  { label: 'Sem Iluminação Pública', value: 'Sem Iluminação Pública', multiplier: 0.93 },
];

export const TIPO_OCUPACAO = [
  { label: 'Comum', value: 'Comum', multiplier: 1.00 },
  { label: 'Condomínio Horizontal', value: 'Condomínio Horizontal', multiplier: 1.40 },
];

export const PADRAO_CONSTRUTIVO = [
  { label: '1A - Casa - Luxo', value: '1A - Casa - Luxo', multiplier: 1.3596 },
  { label: '1B - Casa - Normal', value: '1B - Casa - Normal', multiplier: 0.8969 },
  { label: '1C - Casa - Baixo', value: '1C - Casa - Baixo', multiplier: 0.6766 },
  { label: '1D - Casa - Popular', value: '1D - Casa - Popular', multiplier: 0.3854 },
  { label: '2A - Barraco - Luxo', value: '2A - Barraco - Luxo', multiplier: 0.4090 },
  { label: '2B - Barraco - Normal', value: '2B - Barraco - Normal', multiplier: 0.3135 },
  { label: '3C - Barraco - Baixo', value: '3C - Barraco - Baixo', multiplier: 0.1910 },
  { label: '3D - Barraco - Popular', value: '3D - Barraco - Popular', multiplier: 0.1840 },
  { label: '4A - Apartamento - Luxo', value: '4A - Apartamento - Luxo', multiplier: 1.3596 },
  { label: '4B - Apartamento - Normal', value: '4B - Apartamento - Normal', multiplier: 0.8969 },
  { label: '4C - Apartamento - Baixo', value: '4C - Apartamento - Baixo', multiplier: 0.6766 },
  { label: '4D - Apartamento - Popular', value: '4D - Apartamento - Popular', multiplier: 0.3854 },
  { label: '5A - Sala - Luxo', value: '5A - Sala - Luxo', multiplier: 1.3596 },
  { label: '5B - Sala - Normal', value: '5B - Sala - Normal', multiplier: 0.8969 },
  { label: '5C - Sala - Baixo', value: '5C - Sala - Baixo', multiplier: 0.6766 },
  { label: '5D - Sala - Popular', value: '5D - Sala - Popular', multiplier: 0.3854 },
  { label: '6A - Loja - Luxo', value: '6A - Loja - Luxo', multiplier: 1.3596 },
  { label: '6B - Loja - Normal', value: '6B - Loja - Normal', multiplier: 0.8969 },
  { label: '6C - Loja - Baixo', value: '6C - Loja - Baixo', multiplier: 0.6766 },
  { label: '6D - Loja - Popular', value: '6D - Loja - Popular', multiplier: 0.3854 },
  { label: '7A - Galpão - Luxo', value: '7A - Galpão - Luxo', multiplier: 0.8179 },
  { label: '7B - Galpão - Normal', value: '7B - Galpão - Normal', multiplier: 0.6270 },
  { label: '7C - Galpão - Baixo', value: '7C - Galpão - Baixo', multiplier: 0.4217 },
  { label: '7D - Galpão - Popular', value: '7D - Galpão - Popular', multiplier: 0.2340 },
  { label: '8A - Telheiro - Luxo', value: '8A - Telheiro - Luxo', multiplier: 0.7160 },
  { label: '8B - Telheiro - Normal', value: '8B - Telheiro - Normal', multiplier: 0.5679 },
  { label: '8C - Telheiro - Baixo', value: '8C - Telheiro - Baixo', multiplier: 0.3870 },
  { label: '8D - Telheiro - Popular', value: '8D - Telheiro - Popular', multiplier: 0.2017 },
  { label: '9A - Fábrica - Luxo', value: '9A - Fábrica - Luxo', multiplier: 0.9160 },
  { label: '9B - Fábrica - Normal', value: '9B - Fábrica - Normal', multiplier: 0.8179 },
  { label: '9C - Fábrica - Baixo', value: '9C - Fábrica - Baixo', multiplier: 0.6270 },
  { label: '9D - Fábrica - Popular', value: '9D - Fábrica - Popular', multiplier: 0.3817 },
  { label: '10A - Especial - Luxo', value: '10A - Especial - Luxo', multiplier: 0.9160 },
  { label: '10B - Especial - Normal', value: '10B - Especial - Normal', multiplier: 0.8179 },
  { label: '10C - Especial - Baixo', value: '10C - Especial - Baixo', multiplier: 0.6270 },
  { label: '10D - Especial - Popular', value: '10D - Especial - Popular', multiplier: 0.3817 },
  { label: '11A - Outros - Luxo', value: '11A - Outros - Luxo', multiplier: 0.9160 },
  { label: '11B - Outros - Normal', value: '11B - Outros - Normal', multiplier: 0.8179 },
  { label: '11C - Outros - Baixo', value: '11C - Outros - Baixo', multiplier: 0.6270 },
  { label: '11D - Outros - Popular', value: '11D - Outros - Popular', multiplier: 0.3817 },
];

export const ELEMENTO_CONSTRUTIVO = [
  { label: 'Alvenaria / Concreto', value: 'Alvenaria / Concreto', multiplier: 1.00 },
  { label: 'Sem Paredes', value: 'Sem Paredes', multiplier: 0.90 },
  { label: 'Adobe/Taipa', value: 'Adobe/Taipa', multiplier: 0.60 },
  { label: 'Madeira Simples', value: 'Madeira Simples', multiplier: 0.80 },
  { label: 'Madeira Luxo', value: 'Madeira Luxo', multiplier: 0.95 },
];

export const CONDOMINIO_VERTICAL = [
  { label: 'Não se aplica', value: 'Não se aplica', multiplier: 1.00 },
  { label: 'Apartamento - Luxo', value: 'Apartamento - Luxo', multiplier: 2.5 },
  { label: 'Apartamento - Normal', value: 'Apartamento - Normal', multiplier: 1.8 },
  { label: 'Apartamento - Baixo', value: 'Apartamento - Baixo', multiplier: 1.5 },
  { label: 'Apartamento - Popular', value: 'Apartamento - Popular', multiplier: 1.2 },
  { label: 'Loja - Luxo', value: 'Loja - Luxo', multiplier: 2.2 },
  { label: 'Garagem - Luxo', value: 'Garagem - Luxo', multiplier: 1.5 },
];
