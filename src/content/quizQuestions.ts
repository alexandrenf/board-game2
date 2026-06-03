export const MIN_QUESTIONS_PER_TILE = 3;

export const QUIZ_THEMES = {
  red: {
    label: "Risco de Transmissão",
    description: "Situações que podem aumentar o risco de transmissão do HIV.",
  },
  green: {
    label: "Prevenção",
    description: "Estratégias de prevenção combinada, testagem e cuidado.",
  },
  blue: {
    label: "Sem Risco",
    description: "Situações de convívio que não transmitem HIV.",
  },
  yellow: {
    label: "Especial",
    description:
      "Revisão, direitos, tratamento e tomada de decisão no cuidado.",
  },
} as const;

export type QuizTheme = keyof typeof QUIZ_THEMES;

export const QUIZ_SOURCES = {
  combinedPrevention: {
    title: "Ministério da Saúde - Prevenção Combinada",
    url: "https://www.gov.br/aids/pt-br/assuntos/prevencao-combinada",
  },
  prep: {
    title: "Ministério da Saúde - Profilaxia Pré-exposição (PrEP)",
    url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aids-hiv/prep",
  },
  pep: {
    title: "Ministério da Saúde - Profilaxia Pós-Exposição (PEP)",
    url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aids-hiv/pep",
  },
  condoms: {
    title: "Ministério da Saúde - Use Preservativo",
    url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aids-hiv/use-preservativo",
  },
  verticalTransmission: {
    title: "Ministério da Saúde - Prevenção à Transmissão vertical",
    url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aids-hiv/prevencao-a-transmissao-vertical/prevencao-a-transmissao-vertical/",
  },
  vaccines: {
    title: "Ministério da Saúde - Imunizar para Hepatite B e HPV",
    url: "https://www.gov.br/aids/pt-br/assuntos/prevencao-combinada/imunizar-para-hepatite-b-e-hpv",
  },
  rapidTests: {
    title:
      "GOV.BR - Testes rápidos no SUS permitem diagnósticos em até 30 minutos",
    url: "https://www.gov.br/pt-br/noticias/saude-e-vigilancia-sanitaria/2022/10/testes-rapidos-no-sus-permitem-diagnosticos-em-ate-30-minutos",
  },
  cdcTransmission: {
    title: "CDC - How HIV Spreads",
    url: "https://www.cdc.gov/hiv/causes/index.html",
  },
  cdcPrevention: {
    title: "CDC - Preventing HIV",
    url: "https://www.cdc.gov/hiv/prevention/index.html",
  },
  whoHiv: {
    title: "WHO - HIV and AIDS",
    url: "https://www.who.int/news-room/questions-and-answers/item/HIV-AIDS",
  },
  pahoPrepPep: {
    title: "PAHO/WHO - PrEP, PEP, and Key Populations",
    url: "https://www.paho.org/en/topics/prep-pep-and-key-populations",
  },
} as const;

export type QuizSourceId = keyof typeof QUIZ_SOURCES;

export type QuizQuestion = {
  id: string;
  tileId: number;
  theme: QuizTheme;
  prompt: string;
  options: readonly [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  explanation?: string;
  sourceIds?: readonly QuizSourceId[];
};

type TileQuestionInput = {
  prompt: string;
  options: readonly [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
};

type TileQuestionsDefinition = {
  theme: QuizTheme;
  questions: readonly TileQuestionInput[];
};

const TILE_QUESTION_DEFINITIONS: Record<number, TileQuestionsDefinition> = {
  2: {
    theme: "blue",
    questions: [
      {
        prompt: "É possível transmitir HIV pelo uso de banheiro compartilhado?",
        options: [
          "Sim",
          "Apenas em locais públicos",
          "Não",
          "Apenas se o banheiro estiver molhado",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "O HIV sobrevive por muito tempo fora do corpo?",
        options: [
          "Sim, vários dias",
          "Sim, em qualquer superfície",
          "Não",
          "Apenas em banheiros",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "Compartilhar vaso sanitário oferece risco de infecção?",
        options: [
          "Sim",
          "Apenas com limpeza inadequada",
          "Não",
          "Apenas em hospitais",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt:
          "Por que existe preconceito relacionado ao HIV em espaços públicos?",
        options: [
          "Porque o HIV é transmitido pelo ar",
          "Pela falta de informação científica",
          "Porque o vírus vive em superfícies e pode contaminar ao encostar em objetos contaminados sem EPI adequado",
          "Porque o HIV passa pelo suor",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  3: {
    theme: "blue",
    questions: [
      {
        prompt: "O HIV pode ser transmitido pelo beijo?",
        options: [
          "Sim, sempre",
          "Apenas por abraço",
          "Não, apenas em contato com fluidos com carga viral relevante",
          "Apenas em locais públicos",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "A saliva transmite HIV?",
        options: [
          "Sim",
          "Não possui quantidade suficiente do vírus",
          "Apenas em crianças",
          "Apenas durante refeições",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Existe risco em beijo com presença de sangue na boca?",
        options: [
          "Sim, em situações raras",
          "Nunca",
          "Apenas em ambientes fechados",
          "Apenas se houver tosse",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Como combater mitos sobre transmissão do HIV?",
        options: [
          "Evitando contato social",
          "Compartilhando informações corretas",
          "Isolando pessoas e evitando falar no assunto para não abrir espaço para falar sobre os estigmas",
          "Evitando abraços",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  4: {
    theme: "red",
    questions: [
      {
        prompt: "Por que compartilhar seringas aumenta o risco de HIV?",
        options: [
          "Pelo contato com sangue contaminado",
          "Pela saliva",
          "Pelo suor",
          "Pelo ar",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt:
          "Quais outras doenças podem ser transmitidas por seringas contaminadas?",
        options: ["Diabetes", "Hepatites B e C", "Hipertensão", "Asma"],
        correctOptionIndex: 1,
      },
      {
        prompt:
          "Como prevenir infecções em usuários de medicamentos injetáveis?",
        options: [
          "Compartilhar materiais",
          "Usar materiais descartáveis",
          "Limpar com água",
          "Reutilizar seringas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O que deve ser feito ao sofrer acidente com agulha usada?",
        options: [
          "Ignorar",
          "Lavar apenas com água",
          "Procurar atendimento médico rapidamente",
          "Esperar sintomas aparecerem",
        ],
        correctOptionIndex: 2,
      },
    ],
  },
  5: {
    theme: "red",
    questions: [
      {
        prompt: "Relação sexual sem preservativo aumenta o risco de HIV?",
        options: ["Não", "Sim", "Apenas em idosos", "Apenas em homens"],
        correctOptionIndex: 1,
      },
      {
        prompt: "O que significa prevenção combinada?",
        options: [
          "Usar apenas camisinha",
          "Combinar diferentes estratégias de prevenção",
          "Não fazer testes",
          "Apenas tomar remédios",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como a PrEP e a PEP ajudam na prevenção?",
        options: [
          "Curam o HIV",
          "Reduzem o risco de infecção",
          "Eliminam outras ISTs",
          "Funcionam apenas após sintomas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O tratamento antirretroviral reduz a transmissão do HIV?",
        options: ["Não", "Sim", "Apenas parcialmente", "Apenas em hospitais"],
        correctOptionIndex: 1,
      },
    ],
  },
  6: {
    theme: "green",
    questions: [
      {
        prompt: "Qual a forma correta de colocar a camisinha masculina?",
        options: [
          "Após a relação",
          "Antes do contato sexual",
          "Apenas no final",
          "Com objetos pontiagudos",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Quando a camisinha deve ser colocada?",
        options: [
          "Após ejaculação",
          "Antes do início da relação",
          "Depois do beijo",
          "Apenas em relações longas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Pode reutilizar camisinha?",
        options: ["Sim", "Apenas uma vez", "Não", "Apenas lavando"],
        correctOptionIndex: 2,
      },
      {
        prompt: "O uso correto da camisinha protege contra outras ISTs?",
        options: ["Não", "Sim", "Apenas contra HIV", "Apenas contra gravidez"],
        correctOptionIndex: 1,
      },
    ],
  },
  7: {
    theme: "blue",
    questions: [
      {
        prompt: "É possível pegar HIV em assento de ônibus?",
        options: ["Sim", "Não", "Apenas no calor", "Apenas em ônibus lotados"],
        correctOptionIndex: 1,
      },
      {
        prompt: "O HIV é transmitido pelo contato com superfícies?",
        options: ["Sim", "Não", "Apenas em hospitais", "Apenas em banheiros"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que o HIV não sobrevive em bancos e cadeiras?",
        options: [
          "Porque precisa de condições específicas",
          "Porque é transmitido pelo ar",
          "Porque vive apenas na água",
          "Porque não existe fora do sangue",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Como combater desinformação sobre transmissão do HIV?",
        options: [
          "Compartilhando medo",
          "Espalhando mitos",
          "Divulgando informação científica",
          "Evitando convivência social",
        ],
        correctOptionIndex: 2,
      },
    ],
  },
  8: {
    theme: "blue",
    questions: [
      {
        prompt: "O HIV pode ser transmitido pelo ar?",
        options: ["Sim", "Não", "Apenas no frio", "Apenas em hospitais"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Qual a diferença entre HIV e doenças respiratórias contagiosas?",
        options: [
          "HIV é transmitido pelo ar",
          "HIV precisa de contato específico com fluidos corporais",
          "HIV é transmitido pela saliva",
          "Não existe diferença",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Tossir ou espirrar transmite HIV?",
        options: [
          "Sim",
          "Apenas em ambientes fechados",
          "Não",
          "Apenas em crianças",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "Por que o HIV precisa de contato específico para transmissão?",
        options: [
          "Porque o vírus não sobrevive no ar",
          "Porque é uma bactéria",
          "Porque é transmitido pela pele",
          "Porque só vive em objetos",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  9: {
    theme: "red",
    questions: [
      {
        prompt: "Quais fatores aumentam o risco de transmissão do HIV?",
        options: [
          "Uso de preservativo",
          "Feridas e ausência de prevenção",
          "Abraços",
          "Compartilhar talheres",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Feridas genitais aumentam a chance de infecção?",
        options: ["Não", "Sim", "Apenas em crianças", "Apenas em idosos"],
        correctOptionIndex: 1,
      },
      {
        prompt: "O uso de preservativo reduz significativamente o risco?",
        options: ["Não", "Sim", "Apenas parcialmente", "Apenas em homens"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como conversar sobre prevenção com parceiros(as)?",
        options: [
          "Evitando o assunto",
          "Com diálogo aberto e responsável",
          "Apenas após sintomas",
          "Apenas em consultas médicas",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  10: {
    theme: "green",
    questions: [
      {
        prompt: "O que significa PEP?",
        options: [
          "Profilaxia Pós-Exposição",
          "Prevenção Especial Permanente",
          "Programa de Emergência Pública",
          "Proteção Externa Preventiva",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Em quanto tempo a PEP deve ser iniciada?",
        options: [
          "Até 72 horas",
          "Até 30 dias",
          "Após sintomas",
          "Em qualquer momento",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Quanto tempo dura o tratamento da PEP?",
        options: ["7 dias", "14 dias", "28 dias", "60 dias"],
        correctOptionIndex: 2,
      },
      {
        prompt: "Em quais situações a PEP é indicada?",
        options: [
          "Relação sexual desprotegida e acidentes com sangue",
          "Compartilhar banheiro",
          "Abraços",
          "Picadas de mosquito",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  11: {
    theme: "green",
    questions: [
      {
        prompt: "Por que o descarte correto de agulhas é importante?",
        options: [
          "Evita acidentes e infecções",
          "Apenas organiza o ambiente",
          "Evita ferrugem",
          "Apenas reduz lixo",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Onde descartar materiais perfurocortantes?",
        options: [
          "No lixo comum",
          "Em recipientes apropriados",
          "Em caixas de papelão",
          "Em qualquer saco plástico",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Quais riscos existem no descarte inadequado?",
        options: [
          "Nenhum",
          "Apenas sujeira",
          "Acidentes com sangue contaminado",
          "Apenas mau cheiro",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "Como proteger profissionais da limpeza contra acidentes?",
        options: [
          "Jogando materiais no lixo comum",
          "Descartando corretamente os materiais",
          "Lavando as agulhas",
          "Quebrando as seringas",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  12: {
    theme: "green",
    questions: [
      {
        prompt: "O que é PrEP?",
        options: [
          "Medicamento para prevenir HIV",
          "Vacina contra HIV",
          "Tratamento para gripe",
          "Tipo de exame",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Quem pode usar PrEP?",
        options: [
          "Pessoas com maior risco de exposição ao HIV",
          "Apenas crianças",
          "Apenas idosos",
          "Apenas médicos",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "A PrEP substitui o uso da camisinha?",
        options: ["Sim", "Não", "Apenas em casais", "Apenas em hospitais"],
        correctOptionIndex: 1,
      },
      {
        prompt: "A PrEP protege contra outras ISTs?",
        options: ["Sim", "Apenas hepatite", "Não", "Apenas sífilis"],
        correctOptionIndex: 2,
      },
    ],
  },
  13: {
    theme: "blue",
    questions: [
      {
        prompt: "O HIV pode ser transmitido pelo suor?",
        options: [
          "Sim",
          "Não",
          "Apenas durante exercícios",
          "Apenas em contato direto",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Lágrimas transmitem HIV?",
        options: [
          "Sim",
          "Apenas em crianças",
          "Não",
          "Apenas em hospitais",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "Existe quantidade suficiente de HIV na saliva para transmissão?",
        options: [
          "Sim",
          "Apenas em alimentos",
          "Não",
          "Apenas em ambientes fechados",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "Por que suor, lágrimas e saliva não representam risco de transmissão do HIV?",
        options: [
          "Porque possuem baixa concentração viral",
          "Porque evaporam rápido",
          "Porque o HIV vive apenas na pele",
          "Porque são esterilizados",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  14: {
    theme: "blue",
    questions: [
      {
        prompt: "É seguro praticar esportes com pessoas vivendo com HIV?",
        options: ["Não", "Sim", "Apenas esportes leves", "Apenas ao ar livre"],
        correctOptionIndex: 1,
      },
      {
        prompt: "O suor transmite HIV durante atividades físicas?",
        options: [
          "Sim",
          "Apenas em academias",
          "Não",
          "Apenas em contato direto",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "Como agir em casos de sangramento durante esportes?",
        options: [
          "Ignorar",
          "Continuar normalmente",
          "Aplicar medidas de biossegurança",
          "Encerrar o esporte definitivamente",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "O preconceito pode afetar atletas vivendo com HIV?",
        options: [
          "Não",
          "Sim",
          "Apenas atletas profissionais",
          "Apenas em competições internacionais",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  15: {
    theme: "red",
    questions: [
      {
        prompt: "Confiar no parceiro elimina o risco de HIV?",
        options: [
          "Sim",
          "Não",
          "Apenas em casamentos",
          "Apenas em relações longas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que o diálogo sobre prevenção é importante?",
        options: [
          "Para evitar exames",
          "Para fortalecer o cuidado mútuo",
          "Apenas para médicos",
          "Apenas antes do casamento",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Fazer testagem regular ajuda na prevenção?",
        options: ["Não", "Sim", "Apenas após sintomas", "Apenas em hospitais"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como negociar o uso do preservativo em relacionamentos?",
        options: [
          "Evitando o assunto",
          "Com diálogo respeitoso e aberto",
          "Apenas após conflitos",
          "Apenas em consultas médicas",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  16: {
    theme: "blue",
    questions: [
      {
        prompt: "Morar com alguém vivendo com HIV oferece risco?",
        options: [
          "Sim",
          "Não",
          "Apenas em casas pequenas",
          "Apenas sem limpeza",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Compartilhar banheiro e cozinha transmite HIV?",
        options: [
          "Sim",
          "Apenas em hospitais",
          "Não",
          "Apenas em locais públicos",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "Como o apoio familiar influencia o tratamento?",
        options: [
          "Não influencia",
          "Melhora adesão e saúde emocional",
          "Apenas reduz custos",
          "Apenas ajuda financeiramente",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O preconceito doméstico afeta a saúde mental?",
        options: ["Não", "Sim", "Apenas em crianças", "Apenas em idosos"],
        correctOptionIndex: 1,
      },
    ],
  },
  17: {
    theme: "blue",
    questions: [
      {
        prompt: "O sangue doado passa por testes para HIV?",
        options: [
          "Não",
          "Apenas em hospitais privados",
          "Sim",
          "Apenas em emergências",
        ],
        correctOptionIndex: 2,
      },
      {
        prompt: "Pessoas vivendo com HIV podem doar sangue?",
        options: ["Sim", "Não", "Apenas em campanhas", "Apenas uma vez"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que a triagem é importante nos bancos de sangue?",
        options: [
          "Para reduzir custos",
          "Para garantir segurança transfusional",
          "Apenas para registro",
          "Apenas para estatísticas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O ato de doar sangue transmite HIV ao doador?",
        options: [
          "Sim",
          "Não",
          "Apenas sem luvas",
          "Apenas em hospitais públicos",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  18: {
    theme: "red",
    questions: [
      {
        prompt: "A pílula anticoncepcional protege contra HIV?",
        options: [
          "Sim",
          "Não",
          "Apenas parcialmente",
          "Apenas em relações estáveis",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Qual método previne gravidez e ISTs ao mesmo tempo?",
        options: [
          "Pílula anticoncepcional",
          "Camisinha",
          "DIU",
          "Tabela menstrual",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que combinar métodos preventivos é importante?",
        options: [
          "Para evitar consultas",
          "Para ampliar proteção",
          "Apenas para gravidez",
          "Apenas para HIV",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O preservativo continua importante em relações estáveis?",
        options: ["Não", "Sim", "Apenas no início", "Apenas em jovens"],
        correctOptionIndex: 1,
      },
    ],
  },
  19: {
    theme: "green",
    questions: [
      {
        prompt: "Por que o teste de HIV no pré-natal é importante?",
        options: [
          "Apenas para estatísticas",
          "Para proteger mãe e bebê",
          "Apenas para hospitais",
          "Apenas em gravidez de risco",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O tratamento reduz a transmissão vertical?",
        options: ["Não", "Sim", "Apenas parcialmente", "Apenas após o parto"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Quais ISTs também devem ser testadas no pré-natal?",
        options: [
          "Apenas HIV",
          "Sífilis e hepatites virais",
          "Apenas gripe",
          "Apenas HPV",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O diagnóstico precoce protege o bebê?",
        options: [
          "Não",
          "Sim",
          "Apenas após o nascimento",
          "Apenas em cesáreas",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  20: {
    theme: "blue",
    questions: [
      {
        prompt: "O HIV pode ser transmitido por aperto de mãos?",
        options: [
          "Sim",
          "Não",
          "Apenas em locais públicos",
          "Apenas em hospitais",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Contato físico casual transmite HIV?",
        options: ["Sim", "Não", "Apenas em academias", "Apenas em crianças"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como atitudes simples ajudam a combater o estigma?",
        options: [
          "Evitando contato",
          "Demonstrando respeito e acolhimento",
          "Isolando pessoas",
          "Evitando espaços públicos",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que o preconceito ainda existe?",
        options: [
          "Informação científica correta",
          "Desinformação e medo",
          "Vacinação",
          "Testagem rápida",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  21: {
    theme: "green",
    questions: [
      {
        prompt: "Ter IST aumenta o risco de HIV?",
        options: ["Não", "Sim", "Apenas em idosos", "Apenas em homens"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que tratar ISTs rapidamente é importante?",
        options: [
          "Para reduzir transmissão e complicações",
          "Apenas por estética",
          "Apenas em hospitais",
          "Apenas após sintomas graves",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Quais sintomas podem indicar uma IST?",
        options: [
          "Feridas e corrimentos",
          "Tosse",
          "Dor muscular apenas",
          "Queda de cabelo",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "O tratamento das ISTs faz parte da prevenção combinada?",
        options: ["Não", "Sim", "Apenas em gestantes", "Apenas em adolescentes"],
        correctOptionIndex: 1,
      },
    ],
  },
  22: {
    theme: "green",
    questions: [
      {
        prompt: "Existe vacina contra HIV?",
        options: [
          "Sim",
          "Não",
          "Apenas experimental no Brasil",
          "Apenas infantil",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Quais ISTs podem ser prevenidas por vacina?",
        options: [
          "HIV e sífilis",
          "HPV e hepatite B",
          "Gonorreia e clamídia",
          "Apenas hepatite C",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "A vacina contra hepatite B é importante para saúde sexual?",
        options: ["Não", "Sim", "Apenas em hospitais", "Apenas para idosos"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que a vacinação é uma estratégia preventiva?",
        options: [
          "Porque fortalece proteção contra doenças",
          "Porque elimina consultas",
          "Porque substitui camisinha",
          "Porque evita exames",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  23: {
    theme: "blue",
    questions: [
      {
        prompt: "Mosquitos podem transmitir HIV?",
        options: [
          "Sim",
          "Não",
          "Apenas em áreas tropicais",
          "Apenas à noite",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que o HIV não se multiplica em insetos?",
        options: [
          "Porque o vírus não sobrevive neles",
          "Porque insetos não picam humanos",
          "Porque o HIV vive no ar",
          "Porque o vírus é eliminado pela saliva",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Qual a diferença entre HIV e doenças transmitidas por mosquitos?",
        options: [
          "HIV não utiliza insetos como vetor",
          "HIV é transmitido pelo suor",
          "HIV é transmitido pelo ar",
          "Não existe diferença",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "O mito de que mosquitos transmitem HIV contribui para o preconceito?",
        options: ["Não", "Sim", "Apenas em crianças", "Apenas em hospitais"],
        correctOptionIndex: 1,
      },
    ],
  },
  24: {
    theme: "green",
    questions: [
      {
        prompt: "Quando é recomendado usar luvas?",
        options: [
          "Em contato com sangue ou fluidos corporais",
          "Apenas em cirurgias",
          "Apenas em laboratórios",
          "Apenas em hospitais privados",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Luvas ajudam a evitar contato com sangue contaminado?",
        options: ["Não", "Sim", "Apenas parcialmente", "Apenas em emergências"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Profissionais de saúde devem seguir biossegurança?",
        options: ["Não", "Sim", "Apenas médicos", "Apenas enfermeiros"],
        correctOptionIndex: 1,
      },
      {
        prompt: "O uso de luvas elimina totalmente o risco?",
        options: ["Sim", "Não", "Apenas em hospitais", "Apenas em clínicas"],
        correctOptionIndex: 1,
      },
    ],
  },
  25: {
    theme: "red",
    questions: [
      {
        prompt: "Feridas genitais aumentam risco de HIV?",
        options: ["Não", "Sim", "Apenas em idosos", "Apenas em mulheres"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Corrimentos podem indicar IST?",
        options: ["Não", "Sim", "Apenas alergias", "Apenas gravidez"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que procurar atendimento médico rapidamente?",
        options: [
          "Para diagnóstico e tratamento adequado",
          "Apenas por estética",
          "Apenas em hospitais privados",
          "Apenas após febre",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Como prevenir ISTs e HIV simultaneamente?",
        options: [
          "Compartilhando objetos",
          "Usando preservativo",
          "Evitando esportes",
          "Apenas com vacinas",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  26: {
    theme: "blue",
    questions: [
      {
        prompt: "Como apoiar pessoas vivendo com HIV?",
        options: [
          "Isolando-as",
          "Com acolhimento e respeito",
          "Evitando contato",
          "Apenas financeiramente",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O preconceito interfere no tratamento?",
        options: ["Não", "Sim", "Apenas em adolescentes", "Apenas em hospitais"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Qual a importância do acolhimento?",
        options: [
          "Melhorar qualidade de vida",
          "Evitar exames",
          "Apenas ajudar financeiramente",
          "Apenas reduzir filas",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Como promover empatia e informação?",
        options: [
          "Compartilhando conhecimento correto",
          "Espalhando medo",
          "Evitando conversas",
          "Criando isolamento social",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  27: {
    theme: "green",
    questions: [
      {
        prompt: "Como utilizar corretamente a camisinha feminina?",
        options: [
          "Após a relação",
          "Antes da relação sexual",
          "Apenas em hospitais",
          "Somente com lubrificante",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "A camisinha feminina protege contra HIV?",
        options: ["Não", "Sim", "Apenas gravidez", "Apenas sífilis"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Quais vantagens da camisinha feminina?",
        options: [
          "Maior autonomia e prevenção",
          "Uso único hospitalar",
          "Apenas prevenção da gravidez",
          "Apenas conforto",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Pode usar camisinha masculina e feminina juntas?",
        options: ["Sim", "Não", "Apenas em hospitais", "Apenas em adolescentes"],
        correctOptionIndex: 1,
      },
    ],
  },
  28: {
    theme: "green",
    questions: [
      {
        prompt: "O que são antirretrovirais?",
        options: [
          "Vacinas",
          "Medicamentos para tratar o HIV",
          "Antibióticos",
          "Analgésicos",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Pessoas em tratamento podem ter carga viral indetectável?",
        options: [
          "Não",
          "Sim",
          "Apenas em hospitais",
          "Apenas no início do tratamento",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O que significa \"Indetectável = Intransmissível\"?",
        options: [
          "O HIV foi curado",
          "Pessoas com carga viral indetectável não transmitem HIV sexualmente",
          "O HIV desaparece do corpo",
          "O tratamento pode ser interrompido",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que a adesão ao tratamento é importante?",
        options: [
          "Para manter saúde e reduzir transmissão",
          "Apenas para evitar exames",
          "Apenas para reduzir sintomas",
          "Apenas em idosos",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  29: {
    theme: "blue",
    questions: [
      {
        prompt: "Conviver na escola transmite HIV?",
        options: [
          "Sim",
          "Não",
          "Apenas em esportes",
          "Apenas em escolas públicas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O ambiente escolar deve combater preconceitos?",
        options: ["Não", "Sim", "Apenas em campanhas", "Apenas em universidades"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como promover inclusão de pessoas vivendo com HIV?",
        options: [
          "Isolando estudantes",
          "Incentivando respeito e informação",
          "Evitando contato físico",
          "Separando materiais escolares",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O bullying pode afetar a saúde mental de pessoas vivendo com HIV?",
        options: ["Não", "Sim", "Apenas em crianças", "Apenas em adultos"],
        correctOptionIndex: 1,
      },
    ],
  },
  30: {
    theme: "blue",
    questions: [
      {
        prompt: "O sangue é testado antes da transfusão?",
        options: [
          "Não",
          "Sim",
          "Apenas em emergências",
          "Apenas em hospitais privados",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Existe risco de pegar HIV ao doar sangue?",
        options: [
          "Sim",
          "Não",
          "Apenas em campanhas públicas",
          "Apenas em cidades pequenas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que responder honestamente à triagem é importante?",
        options: [
          "Para reduzir custos",
          "Para garantir segurança transfusional",
          "Apenas para estatísticas",
          "Apenas para registro",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Bancos de sangue seguem normas de segurança?",
        options: [
          "Não",
          "Sim",
          "Apenas em capitais",
          "Apenas em hospitais universitários",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  31: {
    theme: "red",
    questions: [
      {
        prompt: "Ter múltiplos parceiros sem proteção aumenta o risco?",
        options: ["Não", "Sim", "Apenas em jovens", "Apenas em homens"],
        correctOptionIndex: 1,
      },
      {
        prompt: "A testagem frequente é importante para quem tem múltiplos parceiros sem proteção?",
        options: [
          "Não",
          "Sim",
          "Apenas após sintomas",
          "Apenas uma vez ao ano",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como a prevenção combinada ajuda?",
        options: [
          "Utilizando várias estratégias preventivas",
          "Apenas usando medicamentos",
          "Apenas usando camisinha",
          "Apenas fazendo exames",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Qual o papel do preservativo em relações com múltiplos parceiros?",
        options: [
          "Nenhum",
          "Reduzir o risco de ISTs e HIV",
          "Apenas evitar gravidez",
          "Apenas reduzir sintomas",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  32: {
    theme: "red",
    questions: [
      {
        prompt: "Uma mulher vivendo com HIV pode ter bebê saudável?",
        options: ["Não", "Sim", "Apenas com cesárea", "Apenas sem tratamento"],
        correctOptionIndex: 1,
      },
      {
        prompt: "O tratamento reduz a transmissão para o bebê?",
        options: ["Não", "Sim", "Apenas parcialmente", "Apenas após o parto"],
        correctOptionIndex: 1,
      },
      {
        prompt: "O pré-natal adequado é essencial?",
        options: [
          "Não",
          "Sim",
          "Apenas em gravidez de risco",
          "Apenas em hospitais privados",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Quais cuidados devem ser tomados após o parto?",
        options: [
          "Apenas repouso",
          "Seguir acompanhamento médico e orientações adequadas",
          "Suspender tratamento",
          "Evitar consultas médicas",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  33: {
    theme: "green",
    questions: [
      {
        prompt: "Por que usar materiais descartáveis é importante?",
        options: [
          "Evita transmissão de infecções",
          "Apenas reduz custos",
          "Apenas facilita descarte",
          "Apenas organiza hospitais",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Reutilizar agulhas aumenta risco de HIV?",
        options: [
          "Não",
          "Sim",
          "Apenas em hospitais",
          "Apenas em clínicas privadas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Quais profissionais usam materiais perfurocortantes?",
        options: [
          "Apenas médicos",
          "Profissionais da saúde em geral",
          "Apenas dentistas",
          "Apenas enfermeiros",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como garantir segurança em procedimentos?",
        options: [
          "Compartilhando materiais",
          "Utilizando materiais esterilizados e descartáveis",
          "Lavando apenas com água",
          "Reutilizando agulhas",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  34: {
    theme: "red",
    questions: [
      {
        prompt: "O preservativo é uma das formas mais eficazes de prevenção?",
        options: [
          "Não",
          "Sim",
          "Apenas em relações casuais",
          "Apenas para gravidez",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O uso de PrEP reduz o risco de HIV?",
        options: ["Não", "Sim", "Apenas em hospitais", "Apenas em adolescentes"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Conversar sobre testagem ajuda na prevenção?",
        options: [
          "Não",
          "Sim",
          "Apenas após sintomas",
          "Apenas em consultas médicas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Quais práticas fazem parte da prevenção combinada?",
        options: [
          "Preservativo, PrEP, PEP e testagem",
          "Apenas medicamentos",
          "Apenas vacinação",
          "Apenas exames laboratoriais",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  35: {
    theme: "blue",
    questions: [
      {
        prompt: "Trabalhar com alguém vivendo com HIV oferece risco?",
        options: [
          "Sim",
          "Não",
          "Apenas em hospitais",
          "Apenas em ambientes fechados",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O preconceito no trabalho ainda existe?",
        options: [
          "Não",
          "Sim",
          "Apenas em empresas pequenas",
          "Apenas em hospitais",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Pessoas vivendo com HIV podem exercer qualquer profissão?",
        options: [
          "Não",
          "Sim",
          "Apenas administrativas",
          "Apenas sem contato social",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como promover ambientes inclusivos?",
        options: [
          "Compartilhando informação e respeito",
          "Separando funcionários",
          "Evitando convivência",
          "Limitando funções",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  36: {
    theme: "blue",
    questions: [
      {
        prompt: "Consultórios odontológicos seguem normas de biossegurança?",
        options: ["Não", "Sim", "Apenas clínicas privadas", "Apenas hospitais"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Materiais esterilizados evitam transmissão de doenças?",
        options: ["Não", "Sim", "Apenas parcialmente", "Apenas em cirurgias"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Existe risco em procedimentos odontológicos feitos corretamente?",
        options: [
          "Sim, sempre",
          "Não significativamente",
          "Apenas em adultos",
          "Apenas em crianças",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que biossegurança é importante na saúde?",
        options: [
          "Para proteger pacientes e profissionais",
          "Apenas reduzir custos",
          "Apenas organizar clínicas",
          "Apenas evitar sujeira",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  37: {
    theme: "red",
    questions: [
      {
        prompt: "Feridas genitais podem facilitar transmissão do HIV?",
        options: ["Não", "Sim", "Apenas em idosos", "Apenas em homens"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Corrimentos devem ser investigados?",
        options: [
          "Não",
          "Sim",
          "Apenas em mulheres",
          "Apenas se houver febre",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O tratamento precoce evita complicações?",
        options: ["Não", "Sim", "Apenas parcialmente", "Apenas em hospitais"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como a educação sexual ajuda na prevenção?",
        options: [
          "Promovendo informação e cuidado",
          "Evitando conversas",
          "Apenas distribuindo remédios",
          "Apenas em escolas",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  38: {
    theme: "red",
    questions: [
      {
        prompt: "Gestantes também precisam prevenir ISTs?",
        options: [
          "Não",
          "Sim",
          "Apenas após o parto",
          "Apenas em hospitais",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O HIV pode ser transmitido durante a gestação?",
        options: ["Não", "Sim", "Apenas no parto", "Apenas pela saliva"],
        correctOptionIndex: 1,
      },
      {
        prompt: "O preservativo continua importante na gravidez?",
        options: [
          "Não",
          "Sim",
          "Apenas no primeiro trimestre",
          "Apenas em relações casuais",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como proteger mãe e bebê contra ISTs?",
        options: [
          "Apenas com vitaminas",
          "Com pré-natal, prevenção e acompanhamento médico",
          "Apenas com repouso",
          "Apenas com exames no parto",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  39: {
    theme: "blue",
    questions: [
      {
        prompt: "Abraços transmitem HIV?",
        options: ["Sim", "Não", "Apenas em crianças", "Apenas em hospitais"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Carinho e convivência oferecem risco?",
        options: [
          "Sim",
          "Não",
          "Apenas em locais fechados",
          "Apenas com contato prolongado",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que demonstrar afeto é importante?",
        options: [
          "Fortalece acolhimento e reduz preconceito",
          "Apenas melhora humor",
          "Apenas ajuda financeiramente",
          "Apenas em hospitais",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Como reduzir o estigma social?",
        options: [
          "Compartilhando informação correta",
          "Evitando convivência",
          "Isolando pessoas",
          "Evitando falar sobre HIV",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  40: {
    theme: "blue",
    questions: [
      {
        prompt: "Compartilhar utensílios transmite HIV?",
        options: [
          "Sim",
          "Não",
          "Apenas em restaurantes",
          "Apenas em escolas",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O HIV sobrevive fora do corpo em objetos?",
        options: [
          "Sim por semanas",
          "Não em condições capazes de causar infecção",
          "Apenas em metal",
          "Apenas em plástico",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como explicar que compartilhar utensílios não oferece risco de transmissão do HIV?",
        options: [
          "Mostrando informações científicas",
          "Evitando contato",
          "Separando utensílios",
          "Apenas em campanhas",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "O medo do convívio reforça preconceitos?",
        options: ["Não", "Sim", "Apenas em adultos", "Apenas em crianças"],
        correctOptionIndex: 1,
      },
    ],
  },
  41: {
    theme: "red",
    questions: [
      {
        prompt: "O HIV pode ser transmitido pelo leite materno?",
        options: [
          "Não",
          "Sim",
          "Apenas em recém-nascidos prematuros",
          "Apenas sem tratamento",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Quais orientações médicas existem para a amamentação de mães vivendo com HIV?",
        options: [
          "Seguir acompanhamento especializado",
          "Apenas suspender exames",
          "Evitar pré-natal",
          "Apenas usar vitaminas",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "O tratamento adequado reduz riscos?",
        options: ["Não", "Sim", "Apenas parcialmente", "Apenas no parto"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que o acompanhamento médico é essencial?",
        options: [
          "Para proteger mãe e bebê",
          "Apenas para exames",
          "Apenas para estatísticas",
          "Apenas para vacinação",
        ],
        correctOptionIndex: 0,
      },
    ],
  },
  42: {
    theme: "blue",
    questions: [
      {
        prompt: "Como o apoio emocional ajuda no tratamento?",
        options: [
          "Melhora adesão e qualidade de vida",
          "Apenas reduz custos",
          "Apenas evita consultas",
          "Apenas melhora alimentação",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "O preconceito dificulta a adesão ao cuidado?",
        options: ["Não", "Sim", "Apenas em jovens", "Apenas em idosos"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como amigos e familiares podem ajudar?",
        options: [
          "Com acolhimento e apoio",
          "Evitando convivência",
          "Isolando pessoas",
          "Apenas financeiramente",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Informação é uma ferramenta contra discriminação?",
        options: ["Não", "Sim", "Apenas em escolas", "Apenas em hospitais"],
        correctOptionIndex: 1,
      },
    ],
  },
  43: {
    theme: "green",
    questions: [
      {
        prompt: "O que são testes rápidos para HIV?",
        options: [
          "Exames com resultado em poucos minutos",
          "Vacinas",
          "Tratamentos",
          "Cirurgias preventivas",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Onde os testes rápidos podem ser realizados?",
        options: [
          "Apenas em hospitais privados",
          "Em unidades de saúde e campanhas",
          "Apenas em laboratórios internacionais",
          "Apenas em universidades",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "O resultado sai rapidamente?",
        options: ["Não", "Sim", "Apenas em hospitais", "Apenas em capitais"],
        correctOptionIndex: 1,
      },
      {
        prompt: "Fazer testagem regularmente é importante?",
        options: [
          "Não",
          "Sim",
          "Apenas após sintomas",
          "Apenas uma vez na vida",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  44: {
    theme: "red",
    questions: [
      {
        prompt: "O HIV pode ser transmitido pelo contato com sangue?",
        options: ["Sim", "Não", "Apenas pela saliva", "Apenas pelo suor"],
        correctOptionIndex: 0,
      },
      {
        prompt: "Quais cuidados devem ser tomados em acidentes?",
        options: [
          "Procurar atendimento imediatamente",
          "Apenas lavar com água",
          "Ignorar sintomas",
          "Apenas repousar",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Quando a PEP deve ser procurada?",
        options: [
          "Até 72 horas após exposição",
          "Após um mês",
          "Apenas após sintomas",
          "Apenas em hospitais privados",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "Luvas ajudam na prevenção em situações de risco?",
        options: ["Não", "Sim", "Apenas parcialmente", "Apenas em cirurgias"],
        correctOptionIndex: 1,
      },
    ],
  },
  45: {
    theme: "yellow",
    questions: [
      {
        prompt: "O que significa AIDS?",
        options: [
          "Qualquer IST em fase crônica",
          "Estágio mais avançado da infecção pelo HIV, quando há imunossupressão importante e maior risco de infecções oportunistas",
          "Uma vacina para não contrair HIV",
          "Uma alergia sanguínea hereditária",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Qual é uma forma eficaz de prevenir o HIV?",
        options: [
          "Compartilhar copos",
          "Usar preservativo",
          "Abraçar pessoas",
          "Usar banheiro público",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Pessoas vivendo com HIV podem ter qualidade de vida?",
        options: [
          "Não, a mortalidade é alta mesmo tratando adequadamente",
          "Apenas sem tratamento, vivendo com a condição em segredo",
          "Sim, com tratamento adequado",
          "Apenas em hospitais",
        ],
        correctOptionIndex: 2,
      },
    ],
  },
  46: {
    theme: "yellow",
    questions: [
      {
        prompt: "Qual foi o aprendizado mais importante sobre HIV?",
        options: [
          "HIV é transmitido por abraço",
          "Informação correta ajuda na prevenção e combate ao preconceito",
          "HIV passa por objetos",
          "Pessoas vivendo com HIV não podem conviver socialmente",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Como compartilhar informação correta com outras pessoas?",
        options: [
          "Espalhando mitos",
          "Utilizando fontes confiáveis",
          "Evitando conversas",
          "Compartilhando fake news",
        ],
        correctOptionIndex: 1,
      },
      {
        prompt: "Por que combater o preconceito é essencial?",
        options: [
          "Para promover inclusão e saúde",
          "Apenas para evitar conflitos",
          "Apenas em hospitais",
          "Apenas em escolas",
        ],
        correctOptionIndex: 0,
      },
      {
        prompt: "O que você pode fazer para promover saúde sexual segura?",
        options: [
          "Ignorar prevenção",
          "Utilizar prevenção combinada e compartilhar informação",
          "Evitar consultas médicas",
          "Apenas fazer exames uma vez na vida",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
};

const buildTileQuestions = (
  tileId: number,
  definition: TileQuestionsDefinition,
): readonly QuizQuestion[] =>
  definition.questions.map((entry, index) => ({
    id: `tile-${tileId}-q${index + 1}`,
    tileId,
    theme: definition.theme,
    prompt: entry.prompt,
    options: entry.options,
    correctOptionIndex: entry.correctOptionIndex,
  }));

/** Quiz question pool keyed by board tile id (matches `tile.id` in board.json). */
export const QUIZ_QUESTIONS_BY_TILE: Record<number, readonly QuizQuestion[]> =
  Object.fromEntries(
    Object.entries(TILE_QUESTION_DEFINITIONS).map(([tileId, definition]) => [
      Number(tileId),
      buildTileQuestions(Number(tileId), definition),
    ]),
  );

/** Flattened list of every quiz question across all tiles. */
export const QUIZ_QUESTIONS: readonly QuizQuestion[] = Object.values(
  QUIZ_QUESTIONS_BY_TILE,
).flat();

/** All tile ids that have at least one quiz question defined. */
export const TILES_WITH_QUESTIONS: readonly number[] = Object.keys(
  QUIZ_QUESTIONS_BY_TILE,
)
  .map(Number)
  .sort((a, b) => a - b);

/** Returns all quiz questions tied to a specific board tile id. */
export const getQuizQuestionsForTile = (
  tileId: number,
): readonly QuizQuestion[] => QUIZ_QUESTIONS_BY_TILE[tileId] ?? [];
