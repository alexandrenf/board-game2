# Design: Jogo da Prevenção — Juventude Protagonista

## Overview

**App Name:** Jogo da Prevenção  
**Brand:** Juventude Protagonista — IFMSA Brazil (Curitiba)  
**Platform:** iOS, Android, Web (Expo/React Native)  
**Orientation:** Portrait  
**Target Audience:** Young people (13–29 years old) learning about HIV/AIDS prevention and sexual health  
**Language:** Brazilian Portuguese (pt-BR)  
**Tone:** Playful, educational, warm, empowering, youth-centric  

A 3D board game that transforms sexual health education into an interactive journey. Players roll dice, move across a colorful 3D board, answer quiz questions about HIV/AIDS and other STIs, and learn prevention strategies through tile-based educational content. Features both solo and multiplayer modes with real-time synchronization via Convex.

---

## Design System

### Philosophy

The visual identity blends **Neobrutalism** with a **warm, organic game aesthetic**. The design feels tactile and physical — like a real board game — through thick solid borders, hard directional shadows, wooden frame colors, and paper-like backgrounds. The rainbow brand colors from the Juventude Protagonista logo inject energy, diversity, and youthfulness into every screen.

Key characteristics:
- **Tactile UI**: Thick borders (2–4px), visible shadows, rounded corners
- **Warm palette**: Wood tones, cream paper, earthy browns
- **High contrast**: Black text on light backgrounds for readability
- **Playful accents**: Rainbow stripes, floating shapes, pulsing glows
- **3D world**: Low-poly board game environment with stylized characters

---

### Colors

#### Brand Rainbow (from Logo)
| Token | Hex | Usage |
|-------|-----|-------|
| `brand-orange` | `#F7931E` | Primary CTA, progress bars, highlights, badges |
| `brand-pink` | `#EC008C` | Secondary accents, secondary buttons |
| `brand-red` | `#ED1C24` | Danger states, red tiles, warnings |
| `brand-purple` | `#662D91` | Tertiary accents, special tiles |
| `brand-blue` | `#006BB6` | Info states, blue tiles, links |
| `brand-green` | `#009444` | Success states, green tiles, prevention tiles |
| `brand-teal` | `#00A99D` | Completion accents, diversity representation |

#### UI Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#EBE6E0` | App background, warm paper grey |
| `card-bg` | `#FFFFFF` | Card surfaces, modal content |
| `card-border` | `#000000` | Primary borders (Neobrutalism) |
| `text` | `#000000` | Primary text |
| `text-muted` | `#525252` | Secondary text, hints, disabled |
| `shadow` | `#000000` | Hard directional shadows (no opacity) |

#### Warm Game Frames
| Token | Hex | Usage |
|-------|-----|-------|
| `frame-outer` | `#4E2C17` | Dark wood frame borders |
| `frame-bg` | `#8A5A34` | Medium wood panel backgrounds |
| `panel-bg` | `#F7EBD9` | Cream panel interiors |
| `track-bg` | `#E5D5BF` | Progress track backgrounds |
| `track-border` | `#B78D5F` | Warm tan borders |

#### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#009444` | Correct answers, positive effects |
| `warning` | `#F7931E` | Caution tiles, warnings |
| `danger` | `#ED1C24` | Incorrect answers, negative effects |
| `info` | `#006BB6` | Educational content, blue tiles |
| `gold` | `#F6D66B` | Achievements, celebration elements |

#### Tile Colors (Board Game)
| Token | Hex | Tile Type |
|-------|-----|-----------|
| `tile-red` | `#E53E3E` | Risk/Transmission alert tiles |
| `tile-green` | `#38A169` | Prevention/Protection tiles |
| `tile-blue` | `#4299E1` | Information/Education tiles |
| `tile-yellow` | `#ECC94B` | Special/Educational tiles |

#### 3D Scene Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `scene-cool-start` | `#EBF0FF` | Ambient light at game start |
| `scene-warm-end` | `#FFF5E0` | Ambient light near game end |
| `scene-sun-warm` | `#FFF0D4` | Directional sun light |
| `scene-sun-cool` | `#FFF5E6` | Alternative sun temperature |

---

### Typography

**Font Family:** System default (San Francisco on iOS, Roboto on Android, system-ui on Web)  
**Approach:** Heavy use of `fontWeight: 900` (Black) for headings and labels to create bold, punchy hierarchy.

| Style | Size | Weight | Letter Spacing | Line Height | Usage |
|-------|------|--------|----------------|-------------|-------|
| Game Title | 50px | 900 | -0.5px | 52px | Main menu hero title |
| H1 | 42px | 900 | — | — | Loading screen title |
| H2 | 36px | 900 | — | — | Modal titles |
| H3 | 32px | 900 | — | — | Section headers |
| H4 | 24px | 900 | — | — | Sub-sections |
| H5 | 20px | 800 | — | — | Card titles |
| H6 | 16px | 900 | — | — | Labels, badges |
| Body Large | 17px | 800 | — | 25px | Quiz questions |
| Body | 15px | 600–700 | — | 23px | Descriptions, explanations |
| Body Small | 13px | 800 | 0.3px | — | Section labels, metadata |
| Caption | 11–12px | 900 | 1.5–3px | — | Buttons, tags, progress labels |
| Micro | 9–10px | 800 | 0.3px | — | Hints, secondary captions |

**Text Effects:**
- Title shadows: `textShadowColor: #4E2C17`, `textShadowOffset: {width: 3, height: 3}`
- Badge shadows: `textShadowColor: rgba(0,0,0,0.3)`, `textShadowOffset: {width: 1, height: 1}`
- Tabular numbers for scores: `fontVariant: ['tabular-nums']`

---

### Spacing

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 20px |
| `xxl` | 24px |
| `xxxl` | 32px |
| `huge` | 40px |

**Safe Area:** All UI respects `useSafeAreaInsets()` with additional padding (`insets.top + 8`, `insets.bottom + 16`).

---

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Small badges, progress tracks |
| `sm` | 10px | Brand labels, status bars |
| `md` | 12px | Buttons, inputs, stat chips |
| `lg` | 14px | Cards, modals |
| `xl` | 16px | Large cards, image frames |
| `xxl` | 20px | Bottom panels, modal sheets |
| `xxxl` | 22px | — |
| `huge` | 24px | — |
| `massive` | 28px | — |
| `ultra` | 30px | — |
| `mega` | 32px | — |
| `full` | 9999px | Pills, circular buttons |

---

### Borders

| Token | Width | Usage |
|-------|-------|-------|
| `thin` | 2px | Internal cards, subtle dividers |
| `normal` | 3px | Buttons, primary borders (Neobrutalism default) |
| `thick` | 4px | CTA buttons, emphasis elements |
| `heavy` | 5px | — |

**Border Color Rule:** All primary UI borders use solid `#000000` (true black) for the Neobrutalist look. Warm game UI uses `#4E2C17` (dark wood) or `#B78D5F` (tan).

---

### Shadows

Hard, directional shadows (no blur — Neobrutalist style):

| Token | Offset | Opacity | Radius | Usage |
|-------|--------|---------|--------|-------|
| `sm` | `{width: 2, height: 2}` | 1.0 | 0 | Small buttons, badges |
| `md` | `{width: 4, height: 4}` | 1.0 | 0 | Cards, primary buttons |
| `lg` | `{width: 6, height: 6}` | 1.0 | 0 | Bottom panels, modals |
| `xl` | `{width: 8, height: 8}` | 1.0 | 0 | History panel, elevated modals |

Shadow color: `#000000` (solid black).

---

### Iconography

**Library:** FontAwesome 6 (`@expo/vector-icons`) via custom `AppIcon` wrapper  
**Style:** Solid weight, monochrome (black or white depending on background)  
**Size Scale:** 12px (micro), 14px (small), 16px (default), 18px (large), 20px (XL), 22px (CTA)

**Key Icons:**
| Icon | Name | Usage |
|------|------|-------|
| 🏠 | `house` | Menu button |
| ❓ | `circle-question` | Help button |
| 🎲 | `dice` | Dice roll, game rules |
| 👕 | `shirt` | Character customization |
| 👥 | `users` | Multiplayer |
| 📖 | `book-open` | Learn/Educational content |
| 🔄 | `rotate-right` | Restart game |
| 🚀 | `rocket` | Start game |
| ▶️ | `play` | Continue game |
| ➡️ | `arrow-right` | Navigation arrows |
| ✖️ | `xmark` | Close modal |
| ✓ | `check` | Success, selected state |
| ⚙️ | `sliders` | Settings |
| ⏱️ | `clock-rotate-left` | History, reset |
| 🔊 | `volume-high` / `volume-xmark` | Sound toggle |
| 🎮 | `gamepad` | Controls help |
| ℹ️ | `circle-info` | About |
| 💡 | `lightbulb` | Explanation |
| 🔗 | `link` | Source links |
| 🛣️ | `route` | Tile effect |
| ✨ | `wand-magic-sparkles` | Customization badge |
| ✂️ | `scissors` | Hair tab |
| 👤 | `user` | Skin tab |
| 📝 | `signature` | Name input |
| 🏆 | `trophy` | Celebration |

---

## Assets

### Logos

| Asset | File | Usage |
|-------|------|-------|
| **Primary Logo** | `logojp.png` | App icon, splash screen, branding |
| **IFMSA Brazil Logo** | (embedded in primary) | About section, attribution |

**Logo Description (Primary):**
- Circular badge format
- White/cream background
- "Juventude protagonista" in flowing black script (the "t" in "Juventude" has a cross accent; the "o's" in "protagonista" contain lightbulb icons)
- Curitiba skyline silhouette in black (horizontal strip)
- "CURITIBA" in bold sans-serif below skyline
- IFMSA Brazil logo at bottom
- Rainbow wave stripes at bottom: orange, blue, green (curved)

**Logo Description (Secondary/Square):**
- Rounded square format
- White/cream background
- Same "Juventude protagonista" typography centered
- Rainbow curved stripes at top-right and bottom-left corners (7 colors: orange, red, purple, blue, pink, green)

### 3D Assets

| Asset | Format | Usage |
|-------|--------|-------|
| **Character Model** | `character.glb` | Player avatar (customizable shirt, hair, skin) |
| **Board Tiles** | Procedural + Images | 3D board path with color-coded tiles |
| **Environment** | Procedural | Trees, decorations, water pond, clouds |
| **Dice** | Procedural 3D | Animated 3D die roll |

### Images

| Asset | Usage |
|-------|-------|
| Tile educational images | Per-tile content visuals (16:9 aspect ratio) |
| `splash-icon.png` | Expo splash screen |
| `favicon.png` | Web favicon |

---

## Navigation & User Flows

### App States

The app operates as a single-screen experience with overlay layers:

```
[3D Game Scene — always rendered in background]
    ↓
[UI Layer — switches between states]
    ├─ Loading Screen (initial boot)
    ├─ Main Menu Overlay
    ├─ Game Overlay (solo play)
    ├─ Multiplayer Overlay
    └─ Shared Modals (customization, help, celebration)
```

### State Machine

```
LOADING → MENU → PLAYING
                ↓
           MULTIPLAYER
                ↓
            FINISHED → MENU
```

### Flow Details

**1. App Launch → Loading**
- Rainbow stripe bar at top
- Brand badge: "JUVENTUDE PROTAGONISTA"
- Title: "JOGO DA PREVENÇÃO"
- Animated progress bar
- Rotating educational tips (e.g., "Casas verdes representam prevenção!")
- Fallback after 8s: retry or continue with low quality

**2. Loading → Main Menu**
- 3D board visible in background
- Top rainbow stripe bar
- Hero title block with floating decorative shapes
- Bottom panel with wooden frame:
  - Status bar ("PRONTO PARA JOGAR" / "PERCURSO CONCLUÍDO")
  - Progress bar + stat chips (passos, faltam, status)
  - Primary CTA: Start/Continue/Restart Solo
  - Secondary CTA: Multiplayer
  - Tertiary row: Learn, Customize, Reset

**3. Main Menu → Solo Game**
- Crossfade to Game Overlay
- HUD appears with top controls + bottom dock
- Camera focuses on player's current tile
- Player rolls dice → character moves → tile event triggers

**4. Solo Game → Tile Event**
- Educational Modal (info about the tile topic)
- OR Quiz Modal (question + multiple choice)
  - Correct: green badge, +5 points, positive effect
  - Incorrect: red badge, explanation, negative effect
- Character moves based on effect

**5. Game → Finish**
- Celebration Overlay with confetti
- Trophy animation
- Option to return to menu

**6. Main Menu → Multiplayer**
- Multiplayer Lobby: create or join room via code
- Lobby: player list, ready status, host controls
- Gameplay: synchronized turns, quiz rounds, real-time chat
- Results: final scores, winner celebration

---

## Screens

### Screen: Loading Screen

**Z-Index:** 100 (above everything)  
**Background:** `#F7EBD9` (cream)  

#### Layout
- **Top:** Rainbow stripe bar (6px height, 7 colored segments)
- **Center:** Vertically centered content
  - Brand badge (orange background, white text, black border)
  - Title: "JOGO DA PREVENÇÃO" (42px, dark wood color, centered)
  - Loading section:
    - Label: "CARREGANDO" (11px, uppercase, letter-spacing 3px)
    - Progress track (12px height, tan border, orange fill)
    - Rotating tip text (12px, tan color, fades every 3.5s)

#### States
| State | Visual |
|-------|--------|
| Normal loading | Progress bar animates, tips rotate |
| Slow loading (>8s) | Fallback card appears with retry/continue options |
| Dismissing | Fade out over 550ms |

#### Animations
- Progress bar: loop animation 1400ms forward, 500ms backward
- Tip fade: 200ms out → text change → 300ms in
- Exit: opacity 1→0 over 550ms

---

### Screen: Main Menu Overlay

**Z-Index:** 999  
**Layout:** Full screen overlay, pointer events `box-none`  
**Background:** Transparent (3D scene visible behind)

#### Top Section
- **Rainbow Stripe Bar:** 6px height, full width, 7 segments (brand colors), bottom border `#4E2C17`

#### Hero Block (Top-Center)
- **Position:** `absolute`, `top: insets.top + 40`, horizontal margins 20px
- **Floating Shapes:** 5 animated circles (brand colors) floating up/down with sine wave
  - Sizes: 8–16px, opacity: 0.15–0.3
  - Animation: translateY 0→-12px, durations 2800–4000ms
- **Brand Label Box:**
  - Background: `brand-orange`
  - Text: "JUVENTUDE PROTAGONISTA" (11px, 900 weight, white, letter-spacing 3px)
  - Border: 3px `#4E2C17`, border-radius 10px, small shadow
- **Game Title:**
  - Text: "JOGO DA\nPREVENÇÃO"
  - Style: 50px, 900 weight, white, text-shadow 3px 3px `#4E2C17`
- **Tagline Box:**
  - Background: `rgba(78,44,23,0.8)`
  - Text: "Aprenda brincando sobre HIV/AIDS\ne outras infecções transmissíveis"
  - Style: 12px, 700 weight, white, left border 4px orange

#### Bottom Panel (Warm Wooden Frame)
- **Frame:** Background `#8A5A34`, border-top 3px `#4E2C17`, border-radius 20px top corners
- **Inner Panel:** Background `#F7EBD9`, border 2px `#B78D5F`, padding 16px
- **Content (top to bottom):**
  1. **Status Bar:** Background `#8A5A34`, text "PRONTO PARA JOGAR" or "🏆 PERCURSO CONCLUÍDO"
  2. **Progress Section:**
     - Header: "PROGRESSO" label + percentage badge
     - Animated progress bar (orange fill, tan track)
  3. **Stat Row:** 3 chips
     - Passos (steps taken)
     - Faltam (steps remaining)
     - Status ("EM JOGO" dot or "FIM" checkmark)
  4. **Primary CTA:**
     - Full width, orange background, white text
     - Label: "INICIAR SOLO" / "CONTINUAR SOLO" / "NOVA JORNADA SOLO"
     - Icons: rocket / play / rotate-right + arrow-right
     - Pulsing glow animation behind button
     - Border: 4px `#4E2C17`
  5. **Secondary CTA:**
     - Cream background, black text
     - Label: "MULTIPLAYER"
     - Icon: users
  6. **Tertiary Row:** 2–3 small buttons
     - "APRENDER" (book-open icon)
     - "PERSONALIZAR" (shirt icon)
     - "RESETAR JOGO" (clock-rotate-left icon)
     - White background, black border, small shadow

#### Entrance Animations
- Hero: slide down 30px + fade in (spring, speed 10, bounciness 6)
- Panel: slide up 60px + fade in (delayed 150ms)
- Buttons: sequential fade-in (delay 350ms + 80ms stagger)

---

### Screen: Game Overlay (Solo)

**Z-Index:** 999  
**Layout:** Full screen, `justifyContent: 'space-between'`  
**Pointer Events:** `box-none` (passes through to 3D scene)

#### Top Bar
- **Actions Row:** 4 buttons in a row (flex, gap 8px)
  - "Menu" (house icon) — returns to main menu
  - "Ajuda" (circle-question icon) — opens help center
  - "Histórico" (clock-rotate-left icon) — toggles history panel
  - "Ajustes" (sliders icon) — opens settings
  - Style: white bg, 3px black border, border-radius 14px, min-height 42px

- **Scoreboard Row:** (multiplayer only) — pill-shaped player chips with names and points

- **Tile Banner:**
  - Card showing current tile info
  - Tile type badge (colored background + icon + label)
  - Tile name and step number
  - Progress bar
  - Quiz indicator (when applicable)

#### Center
- **Message Toast:** Bottom-centered, appears when game events occur (roll results, tile effects)
- **History Panel:** (right side, slide-in from right)
  - Title: "Histórico da Partida"
  - Scrollable list of event entries
  - Each entry: player name, timestamp, message text
  - White card, black border, large shadow

#### Bottom Dock
- **Container:** Centered, max-width 390px
- **Card:** Background `#FFF5EB`, border 3px `#C4956A`, border-radius 16px, padding 10px 16px
- **Content (left to right):**
  1. **Camera Toggle:** Circular button, camera mode indicator icon
  2. **Dice Menu:** Large circular dice button (primary interaction)
     - Idle: "RODAR DADO" with dice icon
     - Rolling: Animated 3D die + "ROLANDO..."
     - Disabled: Greyed out when not player's turn
     - Turn indicator: pulsing orange glow border when actionable
     - Breathing animation: scale 1→1.04 loop when active
  3. **Character Button:** "Personagem" with shirt icon → opens customization

#### Decorative Accents
- Top-left: Large orange circle (220px), opacity 0.18, z-index 0
- Bottom-right: Large pink circle (200px), opacity 0.18, z-index 0

---

### Screen: Quiz Modal

**Type:** Bottom sheet modal  
**Background:** `rgba(0,0,0,0.56)` backdrop  
**Sheet:** Background `#F4EADB`, border-radius 26px top, border 3px `#4E2C17`

#### Layout (Scrollable)
1. **Floating Close Button:** Top-right, 38px circle, cream bg, black border
2. **Hero Card:**
   - Top row: Tile type badge (colored) + "Quiz" badge (white)
   - Image frame: 16:9 aspect ratio, rounded 14px, tan border
   - Progress: "Casa X de Y"
   - Theme title (if applicable)
   - Tile label/title (20px, 800 weight)
3. **Timer Section:** (answering phase only)
   - QuizTimer component with 90s countdown
   - Visual bar + numeric countdown
4. **Result Card:** (feedback phase only)
   - Correct: green border/bg, checkmark icon, "Correto! +5 pontos"
   - Incorrect: red border/bg, xmark icon, "Incorreto" + explanation prompt
   - Timeout: red border/bg, hourglass icon
5. **Question Card:**
   - Title: "Pergunta" with question icon
   - Question text: 17px, 800 weight
6. **Explanation Card:** (feedback only)
   - Title: "Explicação" with lightbulb icon
   - Explanation text: 15px, 600 weight
7. **Educational Content Card:** (feedback only)
   - Title: "Conteúdo educativo" with book-open icon
   - Tile text content
8. **Sources Card:** (feedback only, if available)
   - Title: "Fontes" with link icon
   - Clickable source links (blue, underlined)
9. **Effect Card:** (feedback only)
   - Title: "Efeito" with route icon
   - Description of board movement effect
10. **Options List:**
    - 4 option cards (A, B, C, D)
    - Each: letter badge + text, full width
    - States: idle (white), selected (orange border), correct (green), incorrect (red), disabled (greyed)
    - Pressing triggers haptic light
11. **Footer:** (feedback only)
    - "Continuar" button, cream bg, brown border

#### Animations
- Entrance: backdrop fade 220ms + sheet spring from translateY 420px
- Feedback haptic: success (correct) or heavy (incorrect)

---

### Screen: Educational Modal

**Type:** Bottom sheet (similar to Quiz Modal but without questions)  
**Purpose:** Shows tile information when landing on non-quiz tiles

#### Content
- Hero card with tile image, type badge, name
- Educational text card with book-open icon
- Effect description card
- "Continuar" footer button

---

### Screen: Customization Modal

**Type:** Centered modal with overlay  
**Overlay:** `rgba(26, 16, 10, 0.45)`  
**Card:** Background `#FFFCF8`, border-radius 24px, border 2px `#E9DFD3`, max-width 340px

#### Layout
1. **Header:**
   - Badge: "PERSONAGEM" with wand icon
   - Title: "Personalizar" (20px, 900)
   - Subtitle: "Escolha as cores de roupa, cabelo e pele."
2. **Avatar Preview:**
   - 3D character preview (116px canvas) or fallback shapes
   - Auto-rotates slowly (sine wave on Y axis)
   - Warm lighting: ambient + directional + hemisphere
3. **Name Card:**
   - Label: "Nome do jogador" with signature icon
   - Text input: rounded 14px, tan border, cream bg
   - Hint: "Este nome será usado no modo solo e nas salas multiplayer."
4. **Tabs:** (shirt, hair, skin)
   - Segmented control style, cream bg, rounded 12px
   - Active tab: white bg, 2px black border, shadow
   - Icons: shirt, scissors, user
5. **Color Grid:**
   - 6 color options per tab
   - Circular swatches (48px), border 2px tan
   - Selected: black border, scale 1.03, white checkmark
   - Labels below: 11px, muted color
6. **Save Button:**
   - Full width, pink (`brand-pink`) bg, black border
   - Label: "SALVAR"

#### Animations
- Entrance: scale 0.9→1 + translateY 100px→0 + fade (spring, speed 14)
- Tab change: haptic light

---

### Screen: Help Center Modal

**Type:** Slide-up modal  
**Structure:** Sidebar navigation + content area

#### Sections
1. **Como Jogar:**
   - Game objective
   - Tile type explanations (red/green/blue/yellow with icons)
   - Turn flow diagram
2. **Controles:**
   - Camera controls (drag to pan, pinch to zoom)
   - Dice rolling
   - Roam mode vs Focus mode
3. **Ajustes:**
   - Render quality: Low / Média / Alta
   - Haptics: on/off toggle
   - Sound: on/off toggle
   - Current progress display
4. **Sobre:**
   - App version
   - Juventude Protagonista / IFMSA Brazil attribution
   - Credits

---

### Screen: Multiplayer Overlay

**Layout:** Same Game Overlay structure but with multiplayer-specific states

#### Lobby State
- Room code display (large, shareable)
- Player list with:
  - Avatar preview (small)
  - Name + host badge
  - Ready status indicator
  - Character colors
- Host controls: start game, kick players
- Joiner controls: ready/unready, leave room

#### Playing State
- Same HUD as solo but with:
  - Turn order indicator
  - Other player tokens visible on board
  - Synchronized quiz rounds with timer
  - Real-time answer reveal
  - Scoreboard in top bar

#### Results State
- Final rankings
- Points breakdown
- Winner celebration
- Rematch / Leave options

---

### Screen: Celebration Overlay

**Trigger:** Game completion  
**Type:** Full-screen overlay  
**Background:** Semi-transparent dark + confetti particles

#### Content
- Trophy icon (large, animated)
- Title: "PARABÉNS!" or "PERCURSO CONCLUÍDO!"
- Subtitle: Personalized winner message
- Stats summary: steps, correct answers, time
- CTA: "Voltar ao Menu"

---

## Components

### CuteCard
Reusable card component with Neobrutalist styling.
- Background: white or cream
- Border: 3px black or tan
- Border-radius: 14–16px
- Shadow: hard directional (4px offset)

### AnimatedButton
Wrapper around Pressable/TouchableOpacity with:
- Haptic feedback on press (light/medium/heavy/success)
- Scale animation on press (0.96–0.98)
- Optional entrance animations

### AppIcon
FontAwesome 6 icon wrapper with consistent sizing and color handling.

### QuizOption
Multiple-choice option card with 4 states:
| State | Visual |
|-------|--------|
| `idle` | White bg, tan border |
| `selected` | White bg, orange border, orange letter badge |
| `correct` | Green bg/border, checkmark, green letter badge |
| `incorrect` | Red bg/border, xmark, red letter badge |
| `disabled` | Greyed out, reduced opacity |

### TileFocusBanner
Compact card showing current tile information:
- Colored badge with tile type icon
- Tile name and step counter
- Mini progress bar
- Quiz pending indicator (question icon)

### MessageToast
Auto-dismissing notification banner:
- Bottom-centered, above dock
- Cream background, brown border
- Fade in/out animation
- Shows game events (dice rolls, tile effects)

### DiceMenu
Primary game interaction button:
- Large circular or rounded-rect format
- 3D die icon or animated rolling state
- Turn indicator glow when actionable
- Breathing scale animation

---

## Interactions & Animations

### Game Flow Animations
| Interaction | Animation |
|-------------|-----------|
| Dice roll | 3D die tumbles, camera shakes slightly, haptic heavy |
| Character move | Smooth tile-to-tile walk animation, blob shadow follows |
| Tile landing | Camera focuses on tile, slight zoom, toast message appears |
| Quiz open | Bottom sheet slides up with spring physics |
| Quiz answer | Option scales on press, feedback card expands |
| Correct answer | Green flash, success haptic, confetti particles |
| Incorrect answer | Red flash, heavy haptic, screen shake |
| Progress update | Progress bar fills with animated sparkle at leading edge |
| Menu entrance | Staggered fade + slide for all elements |

### Camera Behaviors
| Mode | Behavior |
|------|----------|
| Focus Mode | Camera follows player's token, slight angle offset |
| Roam Mode | Free camera drag (pan) and pinch (zoom), no auto-follow |
| Transition | Smooth lerp between positions, ~0.5s duration |

### Continuous Ambient Animations
- **Lighting breathing:** Sun intensity varies ±0.05 over ~40s cycle
- **Color grading:** Ambient light shifts from cool blue-white (start) to warm golden (end) based on progress
- **Floating shapes:** Sine-wave vertical float, 2800–4000ms cycles
- **Cloud drift:** Slow horizontal movement in 3D scene

---

## Accessibility

- **Color contrast:** All text meets WCAG AA against backgrounds
- **Touch targets:** Minimum 42px for buttons, 44px for icon buttons
- **Haptics:** Optional but default-on; can be disabled in settings
- **Screen reader:** All interactive elements have `accessibilityLabel` and `accessibilityHint`
- **Modal handling:** `accessibilityViewIsModal` on all modals
- **Text scaling:** Supports system font size adjustments
- **Reduced motion:** Respects system preference (animations simplified)
- **High contrast:** Black borders on all elements aid visibility

---

## Responsive Behavior

| Breakpoint | Adaptations |
|------------|-------------|
| Narrow (< 370px) | Compact modal (312px max), smaller preview, 2-column buttons |
| Short (< 760px) | Compact scroll layouts, reduced spacing |
| Web / Tablet | Max-width constraints on panels (390px dock), centered overlays |
| Landscape | Not supported; app locked to portrait |

---

## Technical Notes

- **Framework:** Expo ~54, React Native 0.81, React 19
- **3D Engine:** React Three Fiber (R3F) + Three.js 0.160
- **State Management:** Zustand (client), Convex (server/multiplayer)
- **Animation:** React Native Animated + Reanimated
- **Icons:** FontAwesome 6 via `@expo/vector-icons`
- **Images:** `expo-image` for optimized caching
- **Storage:** `expo-sqlite` / `expo-sqlite/kv-store`
- **Audio:** `expo-audio`
- **Haptics:** `expo-haptics`
- **Rendering:** Adaptive quality (low/medium/high) based on device performance
