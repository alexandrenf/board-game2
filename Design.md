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

The visual identity embraces a **Soft 3D, Glassmorphism, and Playful Modern UI** aesthetic. The design feels bright, inviting, and dimensional, replacing harsh borders with soft gradients, translucent frosted glass, and rounded, tactile 3D elements. Set against a vibrant low-poly landscape background, the UI floats elegantly above the game world.

Key characteristics:
- **Glassmorphism**: Translucent panels and pills with background blur and soft white borders.
- **Tactile 3D UI**: Buttons and cards have soft gradients, inner highlights, and soft drop shadows, making them look like physical, satisfying objects.
- **Vibrant Environment**: Low-poly 3D nature backgrounds (sky, mountains, trees) set a positive, adventurous tone.
- **Soft Typography**: Bold, rounded white text with soft drop shadows for perfect readability against dynamic backgrounds.

---

### Colors

#### Brand Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `brand-orange` | `#F7931E` | Primary CTA, progress bars, highlights, badges |
| `brand-pink` | `#EC008C` | Secondary accents, Personalizar card base |
| `brand-blue` | `#006BB6` | Info states, Multiplayer card base |
| `brand-green` | `#009444` | Success states, Aprender card base |
| `brand-red` | `#ED1C24` | Danger states, warnings |

#### Glassmorphism & UI Palette
| Token | RGBA / Hex | Usage |
|-------|------------|-------|
| `glass-bg` | `rgba(255, 255, 255, 0.25)` | Translucent pill backgrounds, header stats |
| `glass-border`| `rgba(255, 255, 255, 0.5)` | Soft white borders for glass elements |
| `card-bg` | `rgba(255, 255, 255, 0.9)` | Card surfaces, modal content |
| `text-light` | `#FFFFFF` | Primary titles, stats, button labels |
| `text-dark` | `#1A1A1A` | Secondary text inside white cards |
| `shadow-soft` | `rgba(0, 0, 0, 0.15)` | Soft diffused drop shadows |

#### 3D Scene Environment
| Token | Hex | Usage |
|-------|-----|-------|
| `sky-blue` | `#87CEEB` | Background sky |
| `mountain-snow`| `#FFFFFF` | Snowy peaks in low-poly background |
| `grass-green` | `#8BC34A` | Low-poly terrain and trees |
| `pine-dark` | `#2E7D32` | Darker low-poly trees |

---

### Typography

**Font Family:** System default (San Francisco on iOS, Roboto on Android, system-ui on Web)  
**Approach:** Heavy use of `fontWeight: 900` (Black) for headings and labels, presented primarily in white with soft shadows to pop against the colorful background.

| Style | Size | Weight | Letter Spacing | Line Height | Usage |
|-------|------|--------|----------------|-------------|-------|
| Game Title | 48px | 900 | -0.5px | 50px | Main menu hero title |
| Subtitle | 16px | 600 | 0px | 22px | Main menu tagline |
| H1 | 42px | 900 | — | — | Loading screen title |
| H2 | 36px | 900 | — | — | Modal titles |
| H3 | 32px | 900 | — | — | Section headers |
| Card Title | 14px | 800 | 1px | — | Bottom tab text on main cards |
| Stat Value | 24px | 800 | — | — | Numbers in the top header |
| Stat Label | 10px | 800 | 1.5px | — | "PASSOS", "FALTAM" under stats |

**Text Effects:**
- Primary Titles: `color: #FFFFFF`, `textShadowColor: rgba(0,0,0,0.2)`, `textShadowOffset: {width: 0, height: 4}`, `textShadowRadius: 10`
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

**Safe Area:** All UI respects `useSafeAreaInsets()` with additional padding.

---

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 10px | Small badges |
| `md` | 16px | 3D vertical cards on the main menu |
| `lg` | 24px | Modals |
| `xl` | 32px | Top stats banner |
| `full` | 9999px | Circular main CTA, pill buttons |

---

### Borders & Shadows

Moving away from flat black borders, the new aesthetic uses soft strokes and deep, blurred shadows to create volume.

| Token | Width / Effect | Usage |
|-------|----------------|-------|
| `glass-edge` | 1.5px solid `rgba(255,255,255,0.4)` | Top stats banner, reset button |
| `card-edge` | 2px solid `rgba(255,255,255,0.8)` | Main menu cards |
| `cta-edge` | 4px solid `#FFFFFF` | Main circular "INICIAR SOLO" button |

**Shadows:**
- `soft-drop`: `{width: 0, height: 8}`, opacity `0.15`, radius `15` (Used for floating cards)
- `glow-primary`: `{width: 0, height: 0}`, opacity `0.4`, radius `20`, color `brand-orange` (Used behind the main CTA)

---

### Iconography

**Library:** FontAwesome 6 (`@expo/vector-icons`) via custom `AppIcon` wrapper  
**Style:** Solid weight, mostly white when placed on colored or glass backgrounds.  
**Size Scale:** 12px (micro), 14px (small), 16px (default), 24px (large), 32px (CTA)

**Key Icons:**
| Icon | Name | Usage |
|------|------|-------|
| 🚀 | `rocket` | Start game (Main CTA) |
| 🔄 | `rotate-left` | Resetar jogo |
| 👥 | `users` | Multiplayer stat/card |
| 📖 | `book-open` | Aprender card |
| 👕 | `shirt` | Personalizar card |
| 👣 | `shoe-prints` | Passos icon |
| 🏁 | `flag-checkered` | Faltam icon |

---

## Assets

### 3D Assets

| Asset | Format | Usage |
|-------|--------|-------|
| **Character Model** | `character.glb` | Player avatar (customizable shirt, hair, skin) |
| **Low-Poly Landscape** | Procedural/GLB | Main menu background (mountains, pines, clouds) |
| **Board Tiles** | Procedural + Images | 3D board path with color-coded tiles |
| **Card Illustrations** | Rendered 2D | 3D scenes used inside the main menu cards |
| **Dice** | Procedural 3D | Animated 3D die roll |

---

## Navigation & User Flows

### App States

```text
[3D Game Scene / Low-Poly Background]
    ↓
[UI Layer — switches between states]
    ├─ Loading Screen
    ├─ Main Menu Overlay
    ├─ Game Overlay (solo play)
    ├─ Multiplayer Overlay
    └─ Shared Modals (customization, help, celebration)
```

---

## Screens

### Screen: Main Menu Overlay

**Z-Index:** 999  
**Layout:** Full screen overlay, pointer events `box-none`  
**Background:** Low-poly 3D landscape with sky, mountains, and pine trees.

#### Top Section (Stats Banner)
- **Container:** A large, pill-shaped glassmorphism container centered at the top.
- **Background:** `rgba(255, 255, 255, 0.25)` with backdrop blur.
- **Border:** 1.5px solid `rgba(255, 255, 255, 0.5)`.
- **Content (3 Columns):**
  1. **Passos:** Icon (footprints) + "0", Label: "PASSOS"
  2. **Progresso:** Large circle with "0%", Label: "PROGRESSO"
  3. **Faltam:** Icon (flag) + "45", Label: "FALTAM"
- **Text Style:** Pure white, bold, soft drop shadow.

#### Hero Title (Center-Top)
- **Title:** "JOGO DA PREVENÇÃO" in 48px, 900 weight, white text with a soft drop shadow.
- **Subtitle:** "Aprenda sobre HIV/AIDS e outras\nISTs de forma divertida" in 16px, white, medium weight.

#### Main Navigation Cards (Center)
- **Layout:** Row of 3 vertical cards.
- **Card Structure:** 
  - Top portion: Soft translucent white background containing a 3D illustration.
  - Bottom portion: Solid colored tab with bold white text.
  - Border radius: 16px.
  - Soft drop shadow for a floating 3D effect.
- **Cards:**
  1. **Multiplayer:** Illustration of players. Bottom tab: `brand-blue` background, text "MULTIPLAYER".
  2. **Aprender:** Illustration of an open book. Bottom tab: `brand-green` background, text "APRENDER".
  3. **Personalizar:** Illustration of a character and wardrobe. Bottom tab: `brand-pink` background, text "PERSONALIZAR".

#### Primary CTA (Bottom Center)
- **Button:** Large circular button, approx 90px diameter.
- **Background:** Orange/Gold radial gradient.
- **Border:** 4px solid white.
- **Content:** White rocket icon centered, with "INICIAR SOLO" text below the icon (or just the icon if text is placed below the button).
- **Effect:** Glowing orange aura behind the button, pulsing animation.

#### Secondary Action (Bottom Anchor)
- **Button:** Small pill-shaped button at the very bottom.
- **Background:** Glassmorphism (translucent white).
- **Border:** Soft white edge.
- **Content:** "RESETAR JOGO" text with a reset icon.

---

### Screen: Game Overlay (Solo)

*(Remains functionally similar, but styling updates to match the new Soft 3D/Glassmorphism aesthetic instead of Neobrutalism. Wooden frames are replaced with translucent glass panels and soft, rounded shapes.)*

#### Bottom Dock
- **Container:** Centered, max-width 390px
- **Card:** Glassmorphism background, soft white border, border-radius 24px.
- **Content:** Camera toggle, large 3D Dice button (primary action), Character/Settings buttons.

---

### Screen: Quiz Modal

**Type:** Bottom sheet modal  
**Background:** `rgba(0,0,0,0.4)` backdrop  
**Sheet:** Background `#FFFFFF` (solid), border-radius 32px top, soft upward shadow.

#### Layout
*(Content structure remains the same, but borders are soft/light grey instead of thick black. Option cards use soft shadows and colorful active states rather than Neobrutalist harsh borders.)*

---

## Components

### GlassCard
Reusable container for the new aesthetic.
- Background: `rgba(255,255,255,0.25)`
- Backdrop Filter: blur(10px)
- Border: 1.5px solid `rgba(255,255,255,0.5)`
- Border-radius: variable (16px to 999px)
- Shadow: Soft diffused drop shadow

### ActionCard3D
Used for the main menu options (Multiplayer, Aprender, Personalizar).
- Upper body: translucent white with illustration.
- Lower tab: vibrant solid color block with label.
- Scale animation on press.

### AnimatedButton
Wrapper around Pressable/TouchableOpacity with:
- Haptic feedback on press
- Scale animation on press (0.95)
- Soft glow or shadow adjustments during interaction.

---

## Technical Notes

- **Framework:** Expo ~54, React Native 0.81, React 19
- **3D Engine:** React Three Fiber (R3F) + Three.js 0.160
- **Styling:** Moving away from hard borders to heavy use of `expo-linear-gradient` and `expo-blur` (BlurView) for glassmorphism effects.
- **State Management:** Zustand (client), Convex (server/multiplayer)
- **Animation:** React Native Animated + Reanimated
- **Icons:** FontAwesome 6 via `@expo/vector-icons`
- **Images:** `expo-image` for optimized caching

(End of file)
