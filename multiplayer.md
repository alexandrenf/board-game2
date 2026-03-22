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

- Jogador escolhe personagem apenas no estado de lobby.
- Escolha de personagem é bloqueada após já ter sido definida para o jogador.
- `Pronto` só pode ser marcado após escolher personagem.
- Host só inicia quando todos os jogadores ativos estão prontos.

### 4) Início da partida com dado por jogador e sem empate

- Na mutation `startGame`, os valores iniciais são sorteados **antes** e sem repetição.
- Cada jogador recebe um valor único (pool 1..6 embaralhado).
- A ordem de turno é definida em ordem decrescente desses valores.
- A UI mostra o valor do dado sobre o “head badge” de cada jogador.

### 4.1) Comportamento visual de início/turno

- Antes da primeira jogada, jogadores aparecem **lado a lado** na largada.
- Em jogo, o jogador em ação fica em destaque e os demais entram em **fade**.
- O jogador em foco recebe animação de “salto” para reforçar a ação atual.
- Quando não é o seu turno, a interface mostra explicitamente qual jogador está jogando.
- Botões de ação ficam com estilo visual “não responsivo” (cores desativadas) quando bloqueados.

### 4.2) Sobreposição em mesma casa (+N)

- Se você compartilha casa com outros jogadores, a visualização prioriza um token principal.
- Regra aplicada:
  - Por padrão, mostra seu token.
  - Se for o turno de outro jogador que está na mesma casa, mostra o token dele.
- Os demais ocupantes da mesma casa aparecem em bolha agregada (`+1`, `+2`, `+3`).

### 5) Posição dos jogadores + histórico para recuperação pós-lag

- Posição persistida por jogador em `roomPlayers.position`.
- Eventos de jogo persistidos em `roomEvents` com sequência.
- Histórico exibido no cliente para reproduzir timeline e recuperar contexto após reconexão.
- Presença/heartbeat periódico (`touchPresence`) para manter estado online.

### 6) Destruição de sala

- **Imediata** quando todos os jogadores ativos saem explicitamente (`leaveRoom`).
- **Automática por cron** a cada 12h (`cleanup-empty-rooms`): remove salas sem jogadores online por tempo suficiente.

## Edge cases tratados

- **Host sai da sala**: novo host é promovido automaticamente.
- **Jogador sai durante partida**:
  - ordem de turnos é recalculada removendo o jogador
  - se restar só um jogador ativo, partida encerra com vencedor
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
- `src/services/multiplayer/convexClient.ts`
- `src/services/multiplayer/api.ts`
- `src/services/multiplayer/clientIdentity.ts`
- `convex/schema.ts`
- `convex/rooms.ts`
- `convex/crons.ts`
- `tsconfig.json`
- `.env.example`

## Setup para rodar com Convex

1. Defina `EXPO_PUBLIC_CONVEX_URL` (ex.: em `.env.local`).
2. Rode `npx convex dev` para configurar deployment e gerar `convex/_generated/*`.
3. Suba o app (`bunx expo start`).

> Observação: o projeto foi configurado para continuar compilando no app mesmo antes do primeiro codegen do Convex.

## Observação atual de regra de movimento

- No modo multiplayer, o servidor aplica movimento por dado de forma linear (`posição atual + valor do dado`, com limite no fim do tabuleiro).
- Efeitos especiais de casa do modo singleplayer (avanço/recuo por cor/regra) ainda não foram espelhados no backend multiplayer.
