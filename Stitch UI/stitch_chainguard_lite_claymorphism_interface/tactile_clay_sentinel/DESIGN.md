---
name: Tactile Clay Sentinel
colors:
  surface: '#fcf9f5'
  surface-dim: '#dcdad6'
  surface-bright: '#fcf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ef'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e4'
  surface-container-highest: '#e5e2de'
  on-surface: '#1c1c19'
  on-surface-variant: '#564243'
  inverse-surface: '#31302e'
  inverse-on-surface: '#f3f0ec'
  outline: '#897172'
  outline-variant: '#ddc0c1'
  surface-tint: '#a43949'
  primary: '#5d0019'
  on-primary: '#ffffff'
  primary-container: '#7c1a2d'
  on-primary-container: '#ff8a96'
  inverse-primary: '#ffb2b8'
  secondary: '#7e5700'
  on-secondary: '#ffffff'
  secondary-container: '#fdbe50'
  on-secondary-container: '#714d00'
  tertiary: '#073214'
  on-tertiary: '#ffffff'
  tertiary-container: '#204928'
  on-tertiary-container: '#8bb88e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdadb'
  primary-fixed-dim: '#ffb2b8'
  on-primary-fixed: '#40000f'
  on-primary-fixed-variant: '#842133'
  secondary-fixed: '#ffdead'
  secondary-fixed-dim: '#fabc4d'
  on-secondary-fixed: '#281900'
  on-secondary-fixed-variant: '#604100'
  tertiary-fixed: '#bfeec1'
  tertiary-fixed-dim: '#a4d2a6'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#274f2e'
  background: '#fcf9f5'
  on-background: '#1c1c19'
  surface-variant: '#e5e2de'
typography:
  display-xl:
    fontFamily: Outfit
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-xl-mobile:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Outfit
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Outfit
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  mono-data:
    fontFamily: Space Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  space-xxs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
  gutter-mobile: 1rem
  gutter-desktop: 1.5rem
  container-max: 1200px
---

## Brand & Style

This design system establishes a sensory, tactile, and secure environment for an AI-assisted crypto security screening tool powered by Hedera x402 micropayments and The Graph indexing. The visual aesthetic fuses **Claymorphism**—characterized by soft, puffy 3D physical volumes, extruded surfaces, and dual-direction interior lighting—with the disciplined utility required by mission-critical Web3 risk assessment.

### Personality & Tone
- **Tactile & Reassuring:** Moves away from cold, intimidating neo-brutalist or dark-terminal crypto tropes into an inviting, touchable physical presence that alleviates the acute stress of blockchain transactions.
- **Vigilant & Authoritative:** Rich maroon and gold accents derived from the brand shield and link emblem deliver institutional gravitas and immediate clarity on contract risks.
- **Frictionless & Micro-Transactional:** Optimized for lightning-fast sub-cent payment prompts, quick address auditing, and real-time security scoring.

### Aesthetic Execution
- **Puffy 3D Clay Foundations:** Matte finishes, thick pill forms, extruded volumetric cards, and multi-layered inner glow/outer ambient shadows that give components weight and physical compliance.
- **Anti-Gloss Matte:** Zero harsh specular glass reflections. Lighting is diffused, mimicking smooth polymer clay or soft-touch silicone.
- **Physical Feedback:** Interaction states mimic physical push-buttons that compress on press (`translate-y-0.5` or `scale-[0.98]`) with recessed inset shadows.

## Colors

The color architecture directly incorporates the uploaded emblem's signature maroon shield (`#7C1A2D`) and warm amber link (`#E5A93C`), anchored on a warm, porous clay slate canvas.

### Palette Roles
- **Primary (`#7C1A2D` - Crimson Shield):** Represents ultimate authority, high-confidence security actions, critical threat alerts, primary call-to-actions, and verification highlights.
- **Secondary (`#E5A93C` - Amber Link):** Represents dynamic network activity, Hedera micropayment triggers, x402 paywall states, and intermediate risk/warning indicators.
- **Tertiary (`#355E3B` - Forest Safety):** Provides unequivocal positive confirmation for passed audits, verified safe smart contracts, and completed settlements.
- **Neutral Canvas (`#F4F1ED` - Warm Kaolin):** A foundational matte clay substrate that allows soft white ambient highlights and deep warm drop-shadows to sculpt 3D depth without causing eye fatigue.
- **Clay Contrast Dark (`#241B1E` - Charcoal Clay):** Deep warm neutral used for high-contrast headlines, contract hashes, and terminal readouts.

### Semantic Status Tokens
- **Verified / Safe:** `#2E7D32` (Clay Mint Base) paired with `#E8F5E9` background.
- **Suspicious / Caution:** `#E5A93C` (Amber Gold Base) paired with `#FFF8E7` background.
- **Critical Malicious / Drainer:** `#7C1A2D` (Crimson Base) paired with `#FDE8EB` background.
- **Hedera Micropayment / Processing:** `#00A389` (Hedera Teal Accent) for protocol-level operations.

## Typography

The typographic hierarchy blends geometric optimism with cryptographic exactitude. **Outfit** serves as the primary voice across marketing, UI headers, and informational content—its rounded curves mirror the tactile, sculpted clay interface.

### Technical & Cryptographic Data
For wallet addresses, transaction hashes, smart contract bytecode, and The Graph query metrics, the system switches to **Space Mono**. This creates a deliberate visual distinction between human-readable security analysis and raw decentralized ledger data.

### Structural Guidelines
- Display and headline levels must maintain tight negative letter spacing (`-0.02em` to `-0.03em`) to anchor the puffy visual weight of clay containers.
- Security metric values (e.g., "98/100 Safe Score") use `headline-lg` with `fontWeight: 700` paired directly with `label-caps` in uppercase styling.
- All numbers indicating micropayment costs (`0.001 HBAR`) should render in tabular figures using `mono-data`.

## Layout & Spacing

To sustain the volumetric 3D clay aesthetic, elements require generous negative space. Tight layouts flatten the clay illusion, whereas ample margins allow shadow drop-offs and inner highlights to flourish.

### Grid & Structure
- **Layout Model:** 12-column responsive fluid grid with a maximum content boundary of `1200px` for optimal scanning density.
- **Margins & Gutters:** Desktop uses `1.5rem` gutters with a minimum `2rem` screen margin. Mobile scales down to a 4-column layout with `1rem` margins and `0.75rem` gutters.
- **Volumetric Padding:** Containers demand elevated internal padding (`1.5rem` to `2.5rem`) to prevent text elements from colliding with the inner extruded shadows of the clay borders.

### Device Reflow Rules
- **Mobile (<640px):** Full-bleed stacked modules. Risk meters and audit input bars span 100% width. Bottom sheet interactions replace elevated modal popups.
- **Tablet (640px - 1024px):** 2-column modular cards; side-by-side transaction preview and threat analysis summary.
- **Desktop (>1024px):** Main screening dashboard layout with fixed-width tactical control drawer (`360px`) and primary indexing & audit viewport (`auto`).

## Elevation & Depth

Elevation in this design system departs strictly from standard CSS flat shadows. Depth is achieved entirely through **Claymorphic dual-direction light fields**: simultaneously casting an external ambient drop shadow and an internal top-left light extrusion combined with a bottom-right inset shadow.

### The Clay Elevation Formula
All volumetric surfaces use a four-tier shadow composite:
1. **Clay Base (Level 1 - Floating Badges & Controls):**
   - Box Shadow: `8px 8px 16px rgba(166, 153, 142, 0.35), -6px -6px 14px rgba(255, 255, 255, 0.85), inset 2px 2px 3px rgba(255, 255, 255, 0.6), inset -2px -2px 4px rgba(124, 26, 45, 0.05)`
2. **Clay Raised (Level 2 - Cards & Screening Modules):**
   - Box Shadow: `14px 14px 28px rgba(166, 153, 142, 0.4), -10px -10px 24px rgba(255, 255, 255, 0.95), inset 3px 3px 5px rgba(255, 255, 255, 0.7), inset -3px -3px 6px rgba(70, 50, 50, 0.08)`
3. **Clay Floating (Level 3 - Paywall Overlays & Scan Results Modals):**
   - Box Shadow: `22px 22px 44px rgba(166, 153, 142, 0.45), -14px -14px 32px rgba(255, 255, 255, 1.0), inset 4px 4px 6px rgba(255, 255, 255, 0.9), inset -4px -4px 8px rgba(124, 26, 45, 0.12)`
4. **Clay Inset / Depressed (Input Fields & Recessed Trays):**
   - Box Shadow: `inset 4px 4px 8px rgba(166, 153, 142, 0.35), inset -4px -4px 8px rgba(255, 255, 255, 0.9)`

### Material Rules
- **No Sharp Lines:** Never apply pure 1px solid high-contrast borders. Outlines, if needed for accessibility, must be tinted with 15% opacity primary or neutral dark.
- **Lighting Direction:** The universal directional light source is placed at top-left (`-45deg`).

## Shapes

The design system embraces ultra-generous, organic, continuous curvature. Radii mimic malleable clay sculptures, eliminating abrupt transitions.

### Curvature Tokens
- **Standard Cards & Modals (`rounded-3xl` / `24px - 32px`):** Used on all primary screening modules, paywall cards, and threat breakdowns.
- **Buttons & Action Pills (`rounded-full` / `9999px`):** Complete pill curvature across all interactive CTAs, filter chips, and micropayment badges.
- **Inputs & Data Wells (`rounded-2xl` / `16px`):** Slightly structured to maintain visual stability when reading monospaced wallet addresses.

## Components

### Buttons
- **Primary Action (Crimson Clay):** Volumetric background `#7C1A2D`, text `#FFFFFF`, rounded full. Outer shadow: `6px 6px 14px rgba(124, 26, 45, 0.35), -4px -4px 10px rgba(255, 255, 255, 0.8)`. Inset highlight: `inset 2px 2px 4px rgba(255, 255, 255, 0.4), inset -2px -2px 4px rgba(0, 0, 0, 0.25)`.
- **Active / Pressed State:** Shifts down `2px`, outer drop shadows collapse to `2px 2px 4px`, inset shadows invert to simulate physical clay deformation.
- **Secondary Action (Amber Micropay):** Warm background `#E5A93C`, dark maroon text `#4A0F1B`, identical pill construction. Features micro lightning icon for Hedera x402 payment confirmations.

### Input Fields
- Recessed into the canvas using `Clay Inset` shadow depth. Background tint `#ECE7E0`.
- Text styled in `Space Mono` for crisp cryptographic rendering.
- Right-aligned integrated action pill button ("Scan Address", "Verify 402").
- Focus state softens the inset shadow with an amber glow: `inset 2px 2px 4px rgba(229, 169, 60, 0.4), 0 0 0 3px rgba(229, 169, 60, 0.2)`.

### Cards & Screening Containers
- Built on `Clay Raised` elevation with minimum corner radius of `28px`.
- Feature double padding (`2rem`), subtle matte background `#FBF9F7`, and dedicated header badge displaying screening status or subgraph sync speed.

### Tactile Pill Badges
- Used to communicate contract risk levels, token classifications, and The Graph indexing sync states.
- High-cushion geometry: `px-4 py-1.5`, `rounded-full`, accompanied by an extruded dot indicator (e.g., pulsing green clay bead for "Active Sentinel Shield").

### Checkboxes & Segmented Toggles
- Checkboxes are oversized (`24px x 24px`) with `rounded-lg` (8px). Unchecked: recessed clay depression. Checked: pops outward into a crimson shield tick mark.
- Segmented switches sit in an elongated recessed clay ditch; the selected toggle is a white puffy clay pill that slides smoothly along the track.

### Specialized Component: Hedera x402 Micropayment Gate
- A dedicated clay module featuring the chain-link amber accent (`#E5A93C`).
- Presents the fee breakdown in clean monospaced format (`0.005 HBAR / Query`) with an immediate "Touch to Authorize" physical button with push-depth micro-interaction.