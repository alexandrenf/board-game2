# Tutorial “Como Jogar” — Redesign do vídeo

## Objetivo

Substituir o tutorial atual por um vídeo vertical, institucional com energia, criado para exibição em apresentações e eventos. O vídeo deve ensinar o fluxo multiplayer com clareza, manter o público atento e tornar cada mudança de jogador imediatamente reconhecível.

## Formato

- Resolução: 1080 × 1920, orientação vertical.
- Duração-alvo: 60–70 segundos.
- Idioma: português do Brasil.
- Áudio: música de fundo e efeitos sonoros de interação, sem narração.
- Entrega: MP4 H.264 com áudio AAC.

## Identidade dos jogadores

O vídeo apresenta dois participantes com identidades visuais constantes e independentes da aparência física dos avatares:

- Ana — “JOGADOR 1”, moldura coral, etiqueta coral e símbolo próprio.
- Bruno — “JOGADOR 2”, moldura ciano, etiqueta ciano e símbolo próprio.

As cores identificam somente os participantes e suas perspectivas. Elas não representam raça, gênero, cor de pele ou características do avatar.

Quando a perspectiva muda:

1. O telefone atual sai lateralmente.
2. O telefone do outro jogador entra pelo lado oposto.
3. Nome, número do jogador e cor aparecem durante a transição.
4. Um efeito sonoro curto reforça a troca.

Quando uma ação envolve os dois participantes — especialmente compartilhar e usar o código da sala — os dois telefones aparecem lado a lado por tempo suficiente para mostrar a relação entre as ações.

## Linguagem visual

- A captura do jogo aparece dentro de uma moldura de telefone grande.
- A interface deve ocupar a maior parte da área útil do telefone e nunca ser reduzida para simular uma página desktop dentro do vídeo.
- A gravação usa viewport móvel real de 360 × 640 pixels CSS com `deviceScaleFactor: 3`, produzindo uma fonte de 1080 × 1920 sem encolher o layout.
- Na composição final de um único jogador, a área útil do telefone ocupa entre 900 e 960 pixels da largura do vídeo.
- Textos do próprio jogo usados para ensinar uma ação devem permanecer legíveis sem depender de zoom digital. Se uma tela do app apresentar conteúdo demais, a montagem enquadra somente a região relevante em vez de reduzir a tela inteira.
- Cartões explicativos usam corpo mínimo de 40 pixels na entrega 1080 × 1920. Etiquetas de jogador e títulos usam no mínimo 48 pixels.
- Botões, campos, código da sala, pergunta e alternativas devem aparecer grandes o suficiente para que seus rótulos sejam reconhecidos numa tela vertical vista a alguns metros de distância.
- Cada ação importante recebe zoom, enquadramento ou destaque animado.
- O zoom é usado apenas para reforçar uma ação já legível. Ele não pode compensar uma captura originalmente pequena.
- Cada zoom tem alvo explícito — botão, campo, código, dado ou resposta — e mantém o elemento inteiro dentro do quadro.
- Aproximações e afastamentos usam movimento suave de 250–450 ms, sem saltos bruscos, oscilações ou mudanças de escala durante a leitura.
- O público nunca deve precisar procurar o botão ou campo mencionado no texto.
- Textos explicativos aparecem em cartões sólidos de alto contraste.
- Cada cartão usa no máximo duas linhas e uma instrução por vez.
- Legendas e elementos essenciais respeitam margens seguras para projeção e reprodução em telas verticais.
- Não são usados frames vazios, esperas de rede, carregamentos ou congelamentos para preencher duração.

## Roteiro e ritmo

### 1. Abertura — 4 a 5 segundos

- Logo e título “Jogo da Prevenção”.
- Subtítulo: “Aprender, jogar e prevenir”.
- Entrada rápida dos dois telefones, coral e ciano.

### 2. Ana cria a sala — 10 a 12 segundos

- Telefone coral em destaque.
- Etiqueta “ANA • JOGADOR 1”.
- Acesso ao multiplayer.
- Preenchimento do nome.
- Criação da sala.
- Código de três letras destacado e ampliado.
- Texto: “Ana cria a sala e compartilha o código”.

### 3. Bruno entra — 10 a 12 segundos

- Transição clara do telefone coral para o telefone ciano.
- Etiqueta “BRUNO • JOGADOR 2”.
- Preenchimento do nome e do código.
- Entrada na sala.
- Trecho breve em tela dupla para conectar o código de Ana à entrada de Bruno.
- Texto: “Bruno usa o código para entrar”.

### 4. Preparação — 8 a 10 segundos

- Tela dupla ou alternância rápida entre as identidades.
- Personalização resumida.
- Ambos marcam que estão prontos.
- Ana inicia a partida.
- Texto: “Personalize, marque pronto e comece”.

### 5. Jogada e pergunta — 16 a 20 segundos

- Retorno ao telefone do participante da vez, identificado por cor e nome.
- Destaque no botão de rolar.
- Corte dinâmico para o dado e movimento no tabuleiro.
- Pergunta educativa exibida em escala legível.
- Seleção de uma resposta predeterminada.
- Feedback educativo visível, com resposta e explicação validadas antes da gravação.
- Texto: “Cada rodada combina jogo e informação”.

### 6. Encerramento — 6 a 8 segundos

- Cartela criada especificamente para o vídeo.
- Logo, telefones coral e ciano e elementos do jogo.
- Mensagem: “Jogue junto. Aprenda junto. Previna-se.”
- Chamada: “Jogo da Prevenção”.
- Música e movimento terminam juntos, sem frame congelado.

## Movimento e som

- Transições rápidas e suaves, sem movimentos excessivamente elásticos.
- Zooms duram apenas o suficiente para orientar o olhar.
- Toques recebem som curto e discreto.
- Trocas de jogador usam uma assinatura sonora consistente.
- A rolagem do dado e a revelação da resposta recebem acentos sonoros próprios.
- A música sustenta energia institucional, sem competir com os textos.
- O final possui resolução musical, não um corte arbitrário.

## Produção

### Captura

- Gravar host e convidado em contextos separados com identidades explícitas.
- Capturar cada contexto em 360 × 640 pixels CSS com densidade 3, preservando o comportamento e a escala de um celular real.
- Registrar marcadores por participante e por ação concluída.
- Garantir deterministicamente qual participante joga, qual pergunta aparece e qual resposta é selecionada.
- Validar que o feedback educativo possui conteúdo visível antes de encerrar a captura.
- Remover carregamentos, esperas e estados intermediários da seleção final.

### Montagem

- Montar cenas com base em ações concluídas, não em esperas fixas.
- Aplicar as molduras coral e ciano como composição externa ao app.
- Incluir cartões de texto, destaques e transições de perspectiva.
- Usar somente pausas intencionais; não desacelerar o vídeo para atingir duração.
- Se o material ficar abaixo de 60 segundos, ajustar o roteiro ou o tempo dos cartões, nunca congelar frames.

## Tratamento de falhas

- A gravação falha se o participante ativo não corresponder ao vídeo selecionado.
- A gravação falha se o código da sala não for encontrado.
- A gravação falha se pergunta, resposta ou explicação não estiverem visíveis.
- A montagem falha se faltar qualquer marcador obrigatório.
- A validação final falha se houver congelamento prolongado, tela vazia ou duração fora de 60–70 segundos.

## Critérios de aceitação

- O arquivo final tem 1080 × 1920 e duração entre 60 e 70 segundos.
- Ana e Bruno são reconhecíveis sem depender da leitura do conteúdo do app.
- Toda troca de perspectiva inclui cor, nome e movimento coerentes.
- Nenhuma interface importante aparece pequena como no vídeo anterior; o layout do app corresponde a uma viewport móvel de 360 pixels CSS, não a uma viewport de 1080 pixels CSS.
- Em cenas de um jogador, o telefone utiliza pelo menos 900 pixels da largura do vídeo.
- Cartões explicativos têm corpo mínimo de 40 pixels, e etiquetas de jogador têm no mínimo 48 pixels.
- O zoom nunca é necessário para tornar a interface básica legível e nunca corta o alvo da ação.
- Código da sala, botão de rolar, pergunta e explicação ficam legíveis em uma tela vertical de evento.
- O vídeo não contém espera de rede, tela vazia ou frame congelado por mais de um segundo.
- A resposta apresentada é predeterminada e o feedback educativo aparece preenchido.
- Textos têm no máximo duas linhas e contraste alto.
- Música, efeitos e imagem terminam de forma coordenada.
- Uma folha de contato extraída do vídeo permite reconhecer cada etapa do roteiro.

## Fora de escopo

- Alterações na interface ou nas regras do jogo.
- Narração ou gravação de voz.
- Versão horizontal.
- Associação das cores dos jogadores à aparência dos avatares.
- Demonstração completa de uma partida até o vencedor.
