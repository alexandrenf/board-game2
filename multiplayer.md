# Multiplayer implementation

## O que foi implementado

- Fluxo de menu inicial com duas entradas:
  - **Singleplayer** (iniciar/continuar jornada local já existente)
  - **Multiplayer** (criar sala ou entrar com código)
- Integração do app com Convex via `ConvexProvider` em `app/_layout.tsx`.
- Backend multiplayer em `convex/` com:
  - `schema.ts` (tabelas `rooms`, `roomPlayers`, `roomEvents`)
  - `rooms.ts` (queries/mutations de sala, lobby, partida, presença, histórico)
  - `crons.ts` (limpeza automática a cada 12 horas)
- UI multiplayer em `src/components/game/MultiplayerOverlay.tsx`.
- Serviços de suporte em `src/services/multiplayer/`:
  - cliente Convex
  - API fallback (`anyApi`) para compilar antes do codegen
  - identidade persistente do jogador

## Requisitos atendidos

### 1) Tela inicial com singleplayer e multiplayer

- Botão principal mantém o fluxo singleplayer (`INICIAR SOLO` / `CONTINUAR SOLO` / `NOVA JORNADA SOLO`).
- Novo botão `MULTIPLAYER` abre o overlay multiplayer.

### 2) Criar sala / entrar em sala com código de 3 letras

- Ao criar sala, o backend gera código aleatório de 3 letras (`A-Z`, sem caracteres ambíguos).
- Ao entrar, valida código e capacidade máxima da sala.
- Limite de **até 4 jogadores**.

### 3) Setup de personagem + botão Pronto (pt-BR)

- No lobby multiplayer, a ação **"Escolha seu personagem (apenas no setup)"** agora usa a mesma tela de **personalização de personagem** (`CustomizationModal`) já existente no app.
- O jogador define roupa/cabelo/pele e, ao salvar, o avatar é registrado no backend como personagem da sala.
- Escolha de personagem é bloqueada após já ter sido definida para o jogador.
- `Pronto` só pode ser marcado após escolher personagem.
- Host só inicia quando todos os jogadores ativos estão prontos.

### 4) Início da partida com dado por jogador e sem empate

- Na mutation `startGame`, os valores iniciais são sorteados **antes** e sem repetição.
- Cada jogador recebe um valor único (pool 1..6 embaralhado).
- A ordem de turno é definida em ordem decrescente desses valores.
- A sala entra em `turnPhase = awaiting_roll` quando a partida começa.

### 4.1) Turno multiplayer no ambiente 3D (estilo “jogar normalmente”)

- Durante `room.status = playing`, a UI usa HUD de ação em cena (não mais painel estático de “tabuleiro 2D”).
- O `GameScene` passa a renderizar múltiplos tokens ativos (`MultiplayerPlayerTokens`) com offsets quando há sobreposição de jogadores na mesma casa.
- A câmera segue o jogador em ação durante movimento (`autoFollowActorId`) e, para espectadores, retorna para o enquadramento anterior após a animação.
- O botão de rolagem só fica ativo para o jogador do turno (`turnPhase = awaiting_roll` + `isCurrentTurn`).

### 4.2) Protocolo de turno autoritativo (Convex)

- `rooms` agora tem estado de fase (`turnPhase`), identidade de turno (`currentTurnId`) e metadados de tempo (`phaseStartedAt`, `phaseDeadlineAt`).
- `rollTurn` gera script completo da jogada (`turn_resolved`): rolagem, segmentos de movimento, casa de aterrissagem, efeito aplicado, resultado final.
- O backend mantém turno pendente em `roomTurnOperations` até confirmação.
- O jogador ativo confirma a leitura do resultado via `ackTurnModal`.
- Se não houver confirmação até o limite, a finalização ocorre por timeout (`finalizeTurnOperation` agendado), evitando travamento da sala.

### 4.3) Paridade de regras com singleplayer no backend

- A resolução de turno multiplayer usa regras de avanço/recuo por cor e efeito de casa (`boardRules`) em vez de movimento linear puro.
- O script inclui segmento principal do dado + segmento de efeito (quando aplicável) e índice final autoritativo.

### 5) Posição, replay e recuperação pós-lag

- Posição persistida por jogador em `roomPlayers.position`.
- Eventos persistidos em `roomEvents` agora possuem `eventVersion`, `turnId`, `turnNumber`, `phase`.
- `getRoomState` expõe `latestSequence` e `pendingTurn`.
- Nova query `getRoomEventsSince` permite delta incremental por sequência para replay/reconstrução de estado.
- Cliente usa runtime store (`useMultiplayerRuntimeStore`) para aplicar eventos em ordem, deduplicar por sequência e animar tokens.
- Presença/heartbeat periódico (`touchPresence`) para manter estado online.

### 6) Destruição de sala

- **Imediata** quando todos os jogadores ativos saem explicitamente (`leaveRoom`).
- **Automática por cron** a cada 12h (`cleanup-empty-rooms`): remove salas sem jogadores online por tempo suficiente.

## Edge cases tratados

- **Host sai da sala**: novo host é promovido automaticamente.
- **Jogador sai durante partida**:
  - ordem de turnos é recalculada removendo o jogador
  - se restar só um jogador ativo, partida encerra com vencedor
- **Jogador ativo desconecta no meio do turno**:
  - operação pendente pode ser finalizada por timeout para destravar a mesa
- **Jogador volta com mesmo device/clientId**:
  - reentrada no lobby suportada
  - sessão mais recente pode ser retomada (`getLatestSessionForClient`)
- **Sala removida enquanto cliente está conectado**:
  - UI detecta `roomState === null` e faz fallback seguro.

## Arquivos alterados

- `app/_layout.tsx`
- `app/index.tsx`
- `src/domain/game/types.ts`
- `src/components/game/MainMenuOverlay.tsx`
- `src/components/game/MultiplayerOverlay.tsx`
- `src/game/PlayerTokenActor.tsx`
- `src/game/MultiplayerPlayerTokens.tsx`
- `src/game/runtime/types.ts`
- `src/services/multiplayer/convexClient.ts`
- `src/services/multiplayer/api.ts`
- `src/services/multiplayer/clientIdentity.ts`
- `src/services/multiplayer/runtimeStore.ts`
- `convex/schema.ts`
- `convex/boardRules.ts`
- `convex/rooms.ts`
- `convex/crons.ts`
- `convex/tsconfig.json`
- `tsconfig.json`
- `.env.example`

## Setup para rodar com Convex

1. Defina `EXPO_PUBLIC_CONVEX_URL` (ex.: em `.env.local`).
2. Rode `npx convex dev` para configurar deployment e gerar `convex/_generated/*`.
3. Suba o app (`bunx expo start`).

> Observação: o projeto foi configurado para continuar compilando no app mesmo antes do primeiro codegen do Convex.

## Observação atual de renderização em cena

- No modo multiplayer, os tokens em cena são dirigidos por runtime local + eventos do Convex, enquanto o backend permanece autoridade de estado final/turno.
- Em caso de atraso de rede, o replay por sequência (`getRoomEventsSince`) mantém a reconstrução determinística da ação recente.
