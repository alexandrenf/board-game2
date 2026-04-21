export const MIN_QUESTIONS_PER_THEME = 12;

export const QUIZ_THEMES = {
  red: {
    label: 'Risco de Transmissão',
    description: 'Situações que podem aumentar o risco de transmissão do HIV.',
  },
  green: {
    label: 'Prevenção',
    description: 'Estratégias de prevenção combinada, testagem e cuidado.',
  },
  blue: {
    label: 'Sem Risco',
    description: 'Situações de convívio que não transmitem HIV.',
  },
  yellow: {
    label: 'Especial',
    description: 'Revisão, direitos, tratamento e tomada de decisão no cuidado.',
  },
} as const;

export type QuizTheme = keyof typeof QUIZ_THEMES;

export const QUIZ_SOURCES = {
  combinedPrevention: {
    title: 'Ministério da Saúde - Prevenção Combinada',
    url: 'https://www.gov.br/aids/pt-br/assuntos/prevencao-combinada',
  },
  prep: {
    title: 'Ministério da Saúde - Profilaxia Pré-exposição (PrEP)',
    url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aids-hiv/prep',
  },
  pep: {
    title: 'Ministério da Saúde - Profilaxia Pós-Exposição (PEP)',
    url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aids-hiv/pep',
  },
  condoms: {
    title: 'Ministério da Saúde - Use Preservativo',
    url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aids-hiv/use-preservativo',
  },
  verticalTransmission: {
    title: 'Ministério da Saúde - Prevenção à Transmissão vertical',
    url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aids-hiv/prevencao-a-transmissao-vertical/prevencao-a-transmissao-vertical/',
  },
  vaccines: {
    title: 'Ministério da Saúde - Imunizar para Hepatite B e HPV',
    url: 'https://www.gov.br/aids/pt-br/assuntos/prevencao-combinada/imunizar-para-hepatite-b-e-hpv',
  },
  rapidTests: {
    title: 'GOV.BR - Testes rápidos no SUS permitem diagnósticos em até 30 minutos',
    url: 'https://www.gov.br/pt-br/noticias/saude-e-vigilancia-sanitaria/2022/10/testes-rapidos-no-sus-permitem-diagnosticos-em-ate-30-minutos',
  },
  cdcTransmission: {
    title: 'CDC - How HIV Spreads',
    url: 'https://www.cdc.gov/hiv/causes/index.html',
  },
  cdcPrevention: {
    title: 'CDC - Preventing HIV',
    url: 'https://www.cdc.gov/hiv/prevention/index.html',
  },
  whoHiv: {
    title: 'WHO - HIV and AIDS',
    url: 'https://www.who.int/news-room/questions-and-answers/item/HIV-AIDS',
  },
  pahoPrepPep: {
    title: 'PAHO/WHO - PrEP, PEP, and Key Populations',
    url: 'https://www.paho.org/en/topics/prep-pep-and-key-populations',
  },
} as const;

export type QuizSourceId = keyof typeof QUIZ_SOURCES;

export type QuizQuestion = {
  id: string;
  theme: QuizTheme;
  prompt: string;
  options: readonly [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  explanation: string;
  sourceIds: readonly QuizSourceId[];
};

export const QUIZ_QUESTION_BANK = {
  red: [
    {
      id: 'red-01',
      theme: 'red',
      prompt: 'Qual situação pode transmitir HIV quando não há preservativo, PrEP, PEP ou tratamento efetivo envolvido?',
      options: [
        'Relação sexual vaginal ou anal sem proteção',
        'Abraçar uma pessoa que vive com HIV',
        'Usar o mesmo banheiro',
        'Sentar no mesmo banco do ônibus',
      ],
      correctOptionIndex: 0,
      explanation:
        'A transmissão pode ocorrer em relações sexuais anais ou vaginais sem proteção quando há contato com fluidos capazes de transmitir o HIV.',
      sourceIds: ['cdcTransmission', 'condoms'],
    },
    {
      id: 'red-02',
      theme: 'red',
      prompt: 'Compartilhar agulhas, seringas ou equipamentos de injeção usados é um risco porque pode haver contato com:',
      options: ['Suor seco', 'Sangue de outra pessoa', 'Lágrimas', 'Ar do ambiente'],
      correctOptionIndex: 1,
      explanation:
        'Agulhas e seringas usadas podem conter sangue. O sangue é um dos fluidos envolvidos na transmissão do HIV.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'red-03',
      theme: 'red',
      prompt: 'Durante a gestação, parto ou amamentação, quando pode haver transmissão vertical do HIV?',
      options: [
        'Quando a pessoa gestante não tem diagnóstico, acompanhamento e tratamento adequados',
        'Quando a gestante faz pré-natal e segue o tratamento indicado',
        'Quando o bebê recebe acompanhamento especializado',
        'Quando as parcerias sexuais são testadas e tratadas',
      ],
      correctOptionIndex: 0,
      explanation:
        'Diagnóstico, pré-natal e tratamento antirretroviral reduzem o risco de transmissão para o bebê. Sem esse cuidado, o risco aumenta.',
      sourceIds: ['verticalTransmission', 'cdcTransmission'],
    },
    {
      id: 'red-04',
      theme: 'red',
      prompt: 'Feridas, corrimentos ou outra IST sem tratamento podem aumentar o risco de HIV porque:',
      options: [
        'Aumentam a chance de contato com mucosas ou tecidos lesionados',
        'Fazem o HIV ser transmitido pelo ar',
        'Transformam suor em fluido transmissor',
        'Tornam abraços perigosos',
      ],
      correctOptionIndex: 0,
      explanation:
        'Outras ISTs podem aumentar a chance de adquirir ou transmitir HIV. Testar e tratar ISTs faz parte da prevenção.',
      sourceIds: ['cdcTransmission', 'combinedPrevention'],
    },
    {
      id: 'red-05',
      theme: 'red',
      prompt: 'Se houve relação sexual sem preservativo ou rompimento do preservativo, qual prazo máximo para procurar PEP?',
      options: ['Até 24 horas', 'Até 72 horas', 'Até 7 dias', 'Apenas depois de sintomas'],
      correctOptionIndex: 1,
      explanation:
        'A PEP é uma medida de emergência e deve ser iniciada o quanto antes, no máximo em até 72 horas após a exposição.',
      sourceIds: ['pep'],
    },
    {
      id: 'red-06',
      theme: 'red',
      prompt: 'Qual fator aumenta a chance de uma pessoa com HIV transmitir o vírus quando não está em tratamento efetivo?',
      options: [
        'Carga viral alta',
        'Carga viral indetectável e sustentada',
        'Aperto de mãos',
        'Compartilhar copos',
      ],
      correctOptionIndex: 0,
      explanation:
        'Quanto maior a carga viral, maior a possibilidade de transmissão. Tratamento com carga viral indetectável reduz esse risco.',
      sourceIds: ['cdcTransmission', 'combinedPrevention'],
    },
    {
      id: 'red-07',
      theme: 'red',
      prompt: 'Qual situação envolvendo sangue representa risco e exige cuidado de saúde?',
      options: [
        'Contato de sangue com mucosa, ferida ou perfuração da pele',
        'Doar sangue em serviço regulamentado',
        'Conversar com uma pessoa que vive com HIV',
        'Usar o mesmo prato no almoço',
      ],
      correctOptionIndex: 0,
      explanation:
        'A transmissão exige contato com fluidos capazes de transmitir HIV, como sangue, em mucosas, tecido lesionado ou diretamente na corrente sanguínea.',
      sourceIds: ['cdcTransmission', 'pep'],
    },
    {
      id: 'red-08',
      theme: 'red',
      prompt: 'Qual afirmação sobre sexo oral está mais correta?',
      options: [
        'Não envolve nenhum tipo de IST',
        'Tem risco baixo para HIV, mas feridas, sangue ou outras ISTs podem aumentar o risco',
        'Transmite HIV apenas pelo ar',
        'É sempre a forma de maior risco para HIV',
      ],
      correctOptionIndex: 1,
      explanation:
        'O risco de HIV no sexo oral é baixo, mas pode aumentar se houver sangue, feridas, úlceras ou outras ISTs.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'red-09',
      theme: 'red',
      prompt: 'Em tatuagem, piercing ou procedimento com perfuração, o risco aparece principalmente quando:',
      options: [
        'O equipamento ou tinta pode ter sangue e não foi esterilizado ou descartado corretamente',
        'A pessoa toma banho depois',
        'O local usa luvas e material novo',
        'O procedimento é feito em ambiente licenciado',
      ],
      correctOptionIndex: 0,
      explanation:
        'Procedimentos com perfuração devem usar materiais esterilizados ou descartáveis para evitar exposição a sangue.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'red-10',
      theme: 'red',
      prompt: 'Usar pílula anticoncepcional sem preservativo protege contra HIV?',
      options: [
        'Não. Ela pode prevenir gravidez, mas não previne HIV ou outras ISTs',
        'Sim. Ela substitui preservativo e PrEP',
        'Sim, mas apenas em relações vaginais',
        'Sim, se tomada no mesmo horário',
      ],
      correctOptionIndex: 0,
      explanation:
        'Métodos contraceptivos não substituem estratégias de prevenção de HIV e ISTs, como preservativos, PrEP, PEP e testagem.',
      sourceIds: ['condoms', 'combinedPrevention'],
    },
    {
      id: 'red-11',
      theme: 'red',
      prompt: 'Ter várias parcerias sexuais aumenta a necessidade de pensar em prevenção porque:',
      options: [
        'Pode aumentar as oportunidades de exposição ao HIV e a outras ISTs',
        'Faz o HIV ser transmitido por abraço',
        'Impede o uso de preservativo',
        'Torna os testes rápidos inválidos',
      ],
      correctOptionIndex: 0,
      explanation:
        'Quanto maior a possibilidade de exposição, mais importante é combinar prevenção, testagem e diálogo com serviços de saúde.',
      sourceIds: ['cdcTransmission', 'combinedPrevention'],
    },
    {
      id: 'red-12',
      theme: 'red',
      prompt: 'Álcool e outras drogas podem aumentar o risco de HIV quando levam a:',
      options: [
        'Decisões sexuais sem proteção ou compartilhamento de equipamentos de injeção',
        'Transmissão por suor',
        'Transmissão por picada de mosquito',
        'Risco em apertos de mão',
      ],
      correctOptionIndex: 0,
      explanation:
        'O uso de álcool e drogas pode afetar decisões sobre sexo e uso de equipamentos de injeção; redução de danos faz parte da prevenção combinada.',
      sourceIds: ['cdcTransmission', 'combinedPrevention'],
    },
  ],
  green: [
    {
      id: 'green-01',
      theme: 'green',
      prompt: 'Qual prática ajuda a prevenir HIV e outras ISTs em relações sexuais?',
      options: [
        'Usar preservativo interno ou externo corretamente',
        'Usar o mesmo preservativo mais de uma vez',
        'Guardar preservativo em local quente e com objetos cortantes',
        'Usar dois preservativos ao mesmo tempo',
      ],
      correctOptionIndex: 0,
      explanation:
        'Preservativos internos e externos são aliados importantes na prevenção de HIV, ISTs e gravidez não planejada quando usados corretamente.',
      sourceIds: ['condoms'],
    },
    {
      id: 'green-02',
      theme: 'green',
      prompt: 'Para reduzir chance de rompimento do preservativo de látex, qual lubrificante é preferível?',
      options: ['À base de água', 'Vaselina', 'Creme corporal oleoso', 'Óleo de cozinha'],
      correctOptionIndex: 0,
      explanation:
        'Lubrificantes à base de óleo podem danificar preservativos de látex; a orientação é preferir lubrificantes à base de água.',
      sourceIds: ['condoms'],
    },
    {
      id: 'green-03',
      theme: 'green',
      prompt: 'O que é PrEP?',
      options: [
        'Uso de antirretrovirais antes de uma possível exposição para prevenir HIV',
        'Tratamento de 28 dias depois de uma exposição de risco',
        'Vacina contra todas as ISTs',
        'Teste que substitui preservativos',
      ],
      correctOptionIndex: 0,
      explanation:
        'A PrEP prepara o corpo antes de uma possível exposição ao HIV e deve ser usada com acompanhamento de saúde.',
      sourceIds: ['prep', 'combinedPrevention'],
    },
    {
      id: 'green-04',
      theme: 'green',
      prompt: 'Qual afirmação sobre PrEP está correta?',
      options: [
        'Previne HIV, mas não substitui proteção contra outras ISTs',
        'Previne sífilis, gonorreia, hepatite B e HPV sozinha',
        'Funciona mesmo quando usada fora da orientação profissional',
        'É indicada apenas depois que a pessoa já tem HIV',
      ],
      correctOptionIndex: 0,
      explanation:
        'A PrEP é uma ferramenta contra HIV. Para prevenção mais completa, deve ser combinada com preservativos, testagem e cuidado para outras ISTs.',
      sourceIds: ['prep', 'pahoPrepPep'],
    },
    {
      id: 'green-05',
      theme: 'green',
      prompt: 'O que é PEP?',
      options: [
        'Medida de emergência após possível exposição ao HIV',
        'Vacina de dose única contra HIV',
        'Tratamento usado antes de qualquer exposição',
        'Teste rápido para HIV',
      ],
      correctOptionIndex: 0,
      explanation:
        'A PEP é usada após situações de risco e deve ser iniciada rapidamente, com tratamento por 28 dias e acompanhamento médico.',
      sourceIds: ['pep'],
    },
    {
      id: 'green-06',
      theme: 'green',
      prompt: 'Por que a testagem regular é parte da prevenção combinada?',
      options: [
        'Permite diagnóstico, cuidado oportuno e escolha de estratégias de prevenção',
        'Transforma resultado negativo em imunidade permanente',
        'Dispensa acompanhamento depois de exposição de risco',
        'Substitui preservativos em todas as situações',
      ],
      correctOptionIndex: 0,
      explanation:
        'A testagem ajuda no diagnóstico precoce, no início de tratamento quando necessário e no acesso a outras estratégias de prevenção.',
      sourceIds: ['combinedPrevention', 'rapidTests'],
    },
    {
      id: 'green-07',
      theme: 'green',
      prompt: 'Quanto tempo um teste rápido do SUS pode levar para execução, leitura e interpretação?',
      options: ['No máximo 30 minutos', 'Sempre 24 horas', 'Sempre 7 dias', 'Apenas depois de sintomas'],
      correctOptionIndex: 0,
      explanation:
        'Testes rápidos são simples, sigilosos e podem ser executados, lidos e interpretados em até 30 minutos.',
      sourceIds: ['rapidTests'],
    },
    {
      id: 'green-08',
      theme: 'green',
      prompt: 'Tratar ISTs como sífilis, gonorreia e clamídia ajuda na prevenção porque:',
      options: [
        'Reduz complicações e pode diminuir chances de adquirir ou transmitir HIV e outras ISTs',
        'Faz o HIV ser transmitido por saliva',
        'Dispensa preservativo para sempre',
        'Elimina a necessidade de testagem',
      ],
      correctOptionIndex: 0,
      explanation:
        'Diagnóstico e tratamento de ISTs são componentes da prevenção combinada e protegem a saúde sexual.',
      sourceIds: ['combinedPrevention', 'cdcTransmission'],
    },
    {
      id: 'green-09',
      theme: 'green',
      prompt: 'Quais vacinas aparecem como medidas importantes na prevenção combinada de ISTs?',
      options: ['Hepatite B e HPV', 'HIV e sífilis', 'Gonorreia e clamídia', 'HIV e hepatite C'],
      correctOptionIndex: 0,
      explanation:
        'A vacinação contra hepatite B e HPV faz parte das estratégias de prevenção de infecções sexualmente transmissíveis.',
      sourceIds: ['vaccines', 'combinedPrevention'],
    },
    {
      id: 'green-10',
      theme: 'green',
      prompt: 'O que significa I=I no contexto do HIV?',
      options: [
        'Indetectável é igual a intransmissível por via sexual quando a carga viral está indetectável e sustentada',
        'Infecção é igual a imunidade permanente',
        'IST é igual a HIV',
        'Indetectável dispensa acompanhamento de saúde',
      ],
      correctOptionIndex: 0,
      explanation:
        'Pessoas em tratamento com carga viral indetectável e boa adesão têm risco zero de transmissão sexual do HIV.',
      sourceIds: ['combinedPrevention', 'whoHiv'],
    },
    {
      id: 'green-11',
      theme: 'green',
      prompt: 'Qual cuidado no pré-natal ajuda a prevenir transmissão vertical?',
      options: [
        'Testar HIV, sífilis e hepatites e iniciar tratamento quando indicado',
        'Evitar toda testagem até o parto',
        'Suspender acompanhamento se não houver sintomas',
        'Usar apenas vitaminas sem avaliação de saúde',
      ],
      correctOptionIndex: 0,
      explanation:
        'Testagem no pré-natal, tratamento durante a gestação e acompanhamento do bebê reduzem o risco de transmissão vertical.',
      sourceIds: ['verticalTransmission', 'rapidTests'],
    },
    {
      id: 'green-12',
      theme: 'green',
      prompt: 'Qual atitude reduz risco relacionado a seringas e agulhas?',
      options: [
        'Usar material novo e descartável e descartar com segurança',
        'Compartilhar seringas apenas com pessoas conhecidas',
        'Lavar a seringa usada com água e reutilizar',
        'Guardar agulhas usadas em bolsos ou mochilas',
      ],
      correctOptionIndex: 0,
      explanation:
        'Não compartilhar equipamentos de injeção e descartar perfurocortantes corretamente evita contato com sangue.',
      sourceIds: ['cdcTransmission', 'combinedPrevention'],
    },
  ],
  blue: [
    {
      id: 'blue-01',
      theme: 'blue',
      prompt: 'Usar o mesmo sanitário que uma pessoa vivendo com HIV transmite HIV?',
      options: ['Não transmite', 'Transmite sempre', 'Transmite se a pessoa tossir', 'Transmite se a porta estiver fechada'],
      correctOptionIndex: 0,
      explanation:
        'HIV não é transmitido por compartilhar banheiro ou por contato casual com superfícies.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-02',
      theme: 'blue',
      prompt: 'Sentar no mesmo banco de ônibus usado por uma pessoa vivendo com HIV transmite o vírus?',
      options: ['Não', 'Sim, pelo tecido', 'Sim, pelo ar', 'Sim, pelo suor seco'],
      correctOptionIndex: 0,
      explanation:
        'O HIV não sobrevive por muito tempo fora do corpo e não se reproduz em superfícies como assentos.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-03',
      theme: 'blue',
      prompt: 'HIV é transmitido pelo ar, como em tosse, espirro ou respiração?',
      options: ['Não', 'Sim, como gripe', 'Apenas em lugares fechados', 'Apenas no frio'],
      correctOptionIndex: 0,
      explanation:
        'HIV não é transmitido pelo ar. A transmissão depende de fluidos específicos e condições de contato específicas.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-04',
      theme: 'blue',
      prompt: 'Lágrimas, suor ou saliva transmitem HIV quando não há sangue misturado?',
      options: ['Não', 'Sim, sempre', 'Apenas no calor', 'Apenas após exercício'],
      correctOptionIndex: 0,
      explanation:
        'HIV não é transmitido por saliva, lágrimas ou suor isoladamente.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-05',
      theme: 'blue',
      prompt: 'Beijo social ou beijo de boca fechada transmite HIV?',
      options: ['Não', 'Sim, pela saliva', 'Sim, pelo ar', 'Sim, pelo toque na pele'],
      correctOptionIndex: 0,
      explanation:
        'Beijo social ou de boca fechada não transmite HIV; saliva sozinha não transmite o vírus.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-06',
      theme: 'blue',
      prompt: 'Abraçar, fazer carinho ou apertar a mão de uma pessoa vivendo com HIV transmite HIV?',
      options: ['Não transmite', 'Transmite se durar muito', 'Transmite se a pessoa suar', 'Transmite se houver conversa'],
      correctOptionIndex: 0,
      explanation:
        'Contato cotidiano sem troca de fluidos transmissíveis, como abraço e aperto de mãos, não transmite HIV.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-07',
      theme: 'blue',
      prompt: 'Compartilhar pratos, copos, talheres ou comida transmite HIV?',
      options: ['Não', 'Sim, pela comida', 'Sim, pelo copo seco', 'Sim, pelo cheiro'],
      correctOptionIndex: 0,
      explanation:
        'HIV não é transmitido por alimentos, bebidas ou utensílios compartilhados no convívio comum.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-08',
      theme: 'blue',
      prompt: 'Praticar esporte com uma pessoa vivendo com HIV transmite o vírus?',
      options: ['Não, o convívio esportivo comum não transmite HIV', 'Sim, pelo suor', 'Sim, pelo ar', 'Sim, pelo uniforme'],
      correctOptionIndex: 0,
      explanation:
        'Atividades sem contato com fluidos capazes de transmitir HIV não oferecem risco de transmissão.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-09',
      theme: 'blue',
      prompt: 'Morar na mesma casa que uma pessoa vivendo com HIV transmite HIV?',
      options: ['Não', 'Sim, pelo sofá', 'Sim, pelo banheiro', 'Sim, pela roupa limpa'],
      correctOptionIndex: 0,
      explanation:
        'Convívio doméstico, banheiros e objetos de uso comum não transmitem HIV.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-10',
      theme: 'blue',
      prompt: 'Estudar ou trabalhar com uma pessoa vivendo com HIV transmite o vírus?',
      options: ['Não transmite', 'Transmite ao dividir sala', 'Transmite ao usar o mesmo computador', 'Transmite por conversa'],
      correctOptionIndex: 0,
      explanation:
        'Ambientes de estudo e trabalho compartilhados não transmitem HIV e não justificam discriminação.',
      sourceIds: ['cdcTransmission', 'combinedPrevention'],
    },
    {
      id: 'blue-11',
      theme: 'blue',
      prompt: 'Uma pessoa pode pegar HIV ao doar sangue em serviço regulamentado?',
      options: ['Não', 'Sim, pela agulha esterilizada', 'Sim, pela ficha de cadastro', 'Sim, pelo lanche após a doação'],
      correctOptionIndex: 0,
      explanation:
        'Doar sangue em serviços regulamentados é seguro; os procedimentos de coleta são controlados e não transmitem HIV ao doador.',
      sourceIds: ['cdcTransmission'],
    },
    {
      id: 'blue-12',
      theme: 'blue',
      prompt: 'Mosquitos, pernilongos, carrapatos ou outros insetos transmitem HIV?',
      options: ['Não', 'Sim, sempre', 'Apenas em área tropical', 'Apenas se picarem duas pessoas seguidas'],
      correctOptionIndex: 0,
      explanation:
        'HIV não é transmitido por mosquitos ou outros insetos que sugam sangue.',
      sourceIds: ['cdcTransmission'],
    },
  ],
  yellow: [
    {
      id: 'yellow-01',
      theme: 'yellow',
      prompt: 'Qual é a diferença entre HIV e aids?',
      options: [
        'HIV é o vírus; aids é uma condição que pode surgir quando a infecção não é tratada',
        'HIV e aids são a mesma palavra',
        'Aids é o vírus e HIV é a vacina',
        'HIV só existe quando há sintomas',
      ],
      correctOptionIndex: 0,
      explanation:
        'Uma pessoa pode viver com HIV sem desenvolver aids, especialmente com diagnóstico e tratamento adequados.',
      sourceIds: ['rapidTests', 'whoHiv'],
    },
    {
      id: 'yellow-02',
      theme: 'yellow',
      prompt: 'O que significa prevenção combinada?',
      options: [
        'Associar diferentes estratégias de prevenção conforme a vida e o contexto da pessoa',
        'Usar apenas preservativo e nunca testar',
        'Escolher uma regra igual para todas as pessoas',
        'Evitar contato social com quem vive com HIV',
      ],
      correctOptionIndex: 0,
      explanation:
        'Prevenção combinada une métodos biomédicos, comportamentais e estruturais para responder às necessidades de cada pessoa.',
      sourceIds: ['combinedPrevention'],
    },
    {
      id: 'yellow-03',
      theme: 'yellow',
      prompt: 'Qual atitude demonstra solidariedade e informação correta?',
      options: [
        'Apoiar pessoas vivendo com HIV e combater estigma e discriminação',
        'Afastar colegas que vivem com HIV',
        'Compartilhar boatos sobre diagnóstico de outra pessoa',
        'Impedir uma pessoa vivendo com HIV de estudar ou trabalhar',
      ],
      correctOptionIndex: 0,
      explanation:
        'A prevenção também envolve enfrentar estigma e barreiras de acesso a direitos e serviços de saúde.',
      sourceIds: ['combinedPrevention', 'whoHiv'],
    },
    {
      id: 'yellow-04',
      theme: 'yellow',
      prompt: 'Quando uma pessoa vivendo com HIV deve iniciar tratamento antirretroviral?',
      options: [
        'O quanto antes após o diagnóstico, com orientação de saúde',
        'Somente quando aparecerem sintomas graves',
        'Apenas depois de anos sem tratamento',
        'Nunca, porque HIV não tem tratamento',
      ],
      correctOptionIndex: 0,
      explanation:
        'O tratamento antirretroviral protege a saúde da pessoa, reduz a carga viral e ajuda a prevenir transmissão.',
      sourceIds: ['rapidTests', 'whoHiv'],
    },
    {
      id: 'yellow-05',
      theme: 'yellow',
      prompt: 'Qual combinação resume melhor PrEP e PEP?',
      options: [
        'PrEP é antes de possíveis exposições; PEP é emergência depois de uma exposição',
        'PrEP e PEP são vacinas contra HIV',
        'PrEP é para depois; PEP é para antes',
        'PrEP e PEP são testes rápidos',
      ],
      correctOptionIndex: 0,
      explanation:
        'PrEP é usada antes de possíveis exposições; PEP deve começar rápido depois de uma situação de risco.',
      sourceIds: ['prep', 'pep', 'pahoPrepPep'],
    },
    {
      id: 'yellow-06',
      theme: 'yellow',
      prompt: 'Se alguém procura PEP, por quanto tempo geralmente toma os medicamentos contra HIV?',
      options: ['28 dias', '1 dia', '3 meses sem acompanhamento', 'Apenas até se sentir melhor'],
      correctOptionIndex: 0,
      explanation:
        'A PEP contra HIV dura 28 dias e deve ser acompanhada por equipe de saúde.',
      sourceIds: ['pep'],
    },
    {
      id: 'yellow-07',
      theme: 'yellow',
      prompt: 'Por que fazer teste mesmo sem sintomas pode ser importante?',
      options: [
        'Porque a pessoa pode ter exposição de risco sem sintomas e se beneficiar de cuidado precoce',
        'Porque sintomas sempre aparecem no dia seguinte',
        'Porque teste substitui tratamento',
        'Porque resultado negativo impede futuras exposições',
      ],
      correctOptionIndex: 0,
      explanation:
        'Exposição de risco justifica testagem mesmo sem sintomas. Diagnóstico precoce facilita cuidado e prevenção.',
      sourceIds: ['rapidTests', 'combinedPrevention'],
    },
    {
      id: 'yellow-08',
      theme: 'yellow',
      prompt: 'No pré-natal, em quais momentos a testagem para HIV deve aparecer como cuidado importante?',
      options: [
        'No início da gestação, no fim da gestação e no parto conforme orientação de saúde',
        'Apenas depois do nascimento',
        'Nunca durante a gravidez',
        'Somente se houver febre',
      ],
      correctOptionIndex: 0,
      explanation:
        'A testagem no pré-natal e no parto ajuda a prevenir transmissão vertical e proteger a pessoa gestante e o bebê.',
      sourceIds: ['verticalTransmission', 'rapidTests'],
    },
    {
      id: 'yellow-09',
      theme: 'yellow',
      prompt: 'Qual frase melhor representa o cuidado com vacinas na prevenção de ISTs?',
      options: [
        'Vacinas contra hepatite B e HPV protegem contra infecções importantes e complementam outras estratégias',
        'Existe vacina que elimina toda necessidade de preservativo e testagem',
        'Vacina contra HPV trata HIV',
        'Vacina contra hepatite B só serve para quem já tem hepatite',
      ],
      correctOptionIndex: 0,
      explanation:
        'Hepatite B e HPV podem ser prevenidos por vacinas, que fazem parte do conjunto de ações de prevenção.',
      sourceIds: ['vaccines', 'combinedPrevention'],
    },
    {
      id: 'yellow-10',
      theme: 'yellow',
      prompt: 'Qual é uma vantagem de manter carga viral indetectável com tratamento?',
      options: [
        'Melhora a saúde da pessoa e zera o risco de transmissão sexual do HIV quando sustentada',
        'Permite abandonar acompanhamento para sempre',
        'Transforma HIV em hepatite B',
        'Faz o HIV ser transmitido pelo ar',
      ],
      correctOptionIndex: 0,
      explanation:
        'Tratamento contínuo pode manter a carga viral indetectável, o que protege a saúde e impede transmissão sexual.',
      sourceIds: ['combinedPrevention', 'whoHiv'],
    },
    {
      id: 'yellow-11',
      theme: 'yellow',
      prompt: 'Qual resposta é mais adequada depois de um autoteste ou teste rápido reagente para HIV?',
      options: [
        'Procurar um serviço de saúde para confirmação, acolhimento e início do cuidado',
        'Ignorar se não houver sintomas',
        'Repetir o teste por conta própria para sempre',
        'Evitar qualquer atendimento por medo de julgamento',
      ],
      correctOptionIndex: 0,
      explanation:
        'Resultado reagente deve levar a avaliação em serviço de saúde, confirmação conforme protocolo e acesso ao tratamento.',
      sourceIds: ['rapidTests', 'whoHiv'],
    },
    {
      id: 'yellow-12',
      theme: 'yellow',
      prompt: 'Qual princípio ajuda a escolher a melhor estratégia de prevenção?',
      options: [
        'A melhor estratégia é a que se ajusta às necessidades, contexto e orientação de saúde da pessoa',
        'Todas as pessoas devem usar exatamente a mesma combinação',
        'Prevenção só importa depois de sintomas',
        'Convívio social com pessoas vivendo com HIV deve ser evitado',
      ],
      correctOptionIndex: 0,
      explanation:
        'A prevenção combinada considera contexto, momento de vida e escolhas possíveis para cada pessoa.',
      sourceIds: ['combinedPrevention'],
    },
  ],
} as const satisfies Record<QuizTheme, readonly QuizQuestion[]>;

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  ...QUIZ_QUESTION_BANK.red,
  ...QUIZ_QUESTION_BANK.green,
  ...QUIZ_QUESTION_BANK.blue,
  ...QUIZ_QUESTION_BANK.yellow,
];

export const getQuizQuestionsForTheme = (theme: QuizTheme): readonly QuizQuestion[] =>
  QUIZ_QUESTION_BANK[theme];
