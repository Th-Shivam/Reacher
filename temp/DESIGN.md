---
name: Reacher Prime
colors:
  surface: '#f9f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#edeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#484555'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#797587'
  outline-variant: '#c9c4d8'
  surface-tint: '#613de0'
  primary: '#5f3add'
  on-primary: '#ffffff'
  primary-container: '#7857f8'
  on-primary-container: '#fffbff'
  inverse-primary: '#cabeff'
  secondary: '#634fab'
  on-secondary: '#ffffff'
  secondary-container: '#b19dff'
  on-secondary-container: '#432f8a'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4918c8'
  secondary-fixed: '#e7deff'
  secondary-fixed-dim: '#ccbeff'
  on-secondary-fixed: '#1e0060'
  on-secondary-fixed-variant: '#4b3792'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
  surface-glass: rgba(255, 255, 255, 0.7)
  border-subtle: '#EDEDF2'
  text-primary: '#0A0A0C'
  text-secondary: '#6B6B76'
  accent-lavender: '#F3F0FF'
  ai-dark-card: '#13131A'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  stats-number:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 40px
  gutter: 24px
  card-padding: 24px
  section-gap: 32px
  stack-sm: 8px
  stack-md: 16px
---

## Brand & Style

This design system embodies a **Premium Minimalism** aesthetic tailored for high-efficiency cold outreach. It draws inspiration from the precise, high-utility interfaces of modern developer tools and creative suites like Linear and Apple’s ecosystem.

The core philosophy focuses on:
- **Clarity over Clutter:** Every element is given generous room to breathe, reducing cognitive load during intensive outreach tasks.
- **Sophisticated Softness:** By combining sharp typography with large-radius containers and glassmorphism, the UI feels both professional and approachable.
- **Intentional Hierarchy:** High-contrast actions are balanced against a soft, monochromatic canvas of off-whites and lavenders, guiding the user's attention through color rather than density.

## Colors

The palette is centered around a vibrant lavender primary hue, supported by a spectrum of ultra-soft neutrals. 

- **Primary Lavender:** Used for core calls to action and active states. 
- **The Canvas:** The background utilizes a warm off-white (#F9F9FB) to prevent the "starkness" of pure white, creating a more premium feel.
- **Surface Strategy:** Backgrounds for cards utilize a semi-transparent white with backdrop-blur to create a "glass" effect, layered over the main canvas.
- **Semantic Colors:** Success states (Sent) use a crisp emerald green, while secondary/draft states use a muted periwinkle to differentiate status without competing for visual attention.

## Typography

This design system uses **Inter** exclusively to maintain a systematic, utilitarian, yet modern feel. 

- **Weight Usage:** Regular (400) is used for body text and descriptions. Medium (500) and Semi-Bold (600) are reserved for headings and interactive labels to provide clear structural anchors.
- **Tight Kerning:** Negative letter-spacing is applied to larger display and headline styles to emulate the "Inter Tight" aesthetic common in premium SaaS platforms.
- **Contrast:** High-level headers use the `#0A0A0C` primary text color, while secondary metadata and descriptions use `#6B6B76` to create a clear informational hierarchy.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The sidebar remains fixed at 260px, while the main dashboard area expands fluidly with a maximum content width of 1440px.

- **The Grid:** A 12-column grid is used for the main stage, with 24px gutters. Cards typically span 3 columns (for stats) or 8/4 splits (for main content vs. side panels).
- **Whitespace:** Emphasize generous vertical spacing (32px - 48px) between major sections to prevent the UI from feeling "cramped" or "data-heavy."
- **Breakpoints:**
  - **Desktop:** 1200px+ (Sidebar visible, full grid).
  - **Tablet:** 768px - 1199px (Sidebar collapses to icons, 2-column card stack).
  - **Mobile:** <767px (Sidebar becomes a bottom nav or hamburger, single column stack, 16px margins).

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** and **Glassmorphism** rather than traditional heavy drop shadows.

- **The Base:** Background level 0 is `#F9F9FB`.
- **The Layer:** Level 1 cards use `rgba(255, 255, 255, 0.7)` with a `backdrop-filter: blur(10px)`. This creates a sense of depth by allowing the background's warmth to peek through.
- **Shadows:** Use extremely soft, low-opacity shadows. 
  - *Example:* `0 4px 24px -2px rgba(0, 0, 0, 0.04)`.
- **Borders:** A 1px solid border of `#EDEDF2` is required on all glass cards to define the edges against the light background.
- **High-Depth AI Mode:** Specific featured cards (like AI Insights) can use a dark theme (`#13131A`) to break the monotony and signal high-value information.

## Shapes

The design system uses a very "friendly-professional" radius logic. 

- **Containers & Cards:** Use a minimum of 24px (`rounded-xl` in this system) to give the dashboard its distinct, modern appearance.
- **Buttons & Inputs:** Follow a 12px (`rounded-lg`) standard for a balanced look.
- **Chips/Status Tags:** Use fully pill-shaped (rounded-full) corners to distinguish them from interactive buttons.
- **Avatars:** Always circular to provide a soft contrast against the predominantly rectangular grid.

## Components

### Buttons
- **Primary:** Lavender `#7C5CFC` background with white text. No gradient. 12px radius.
- **Secondary:** Accent lavender `#F3F0FF` background with `#7C5CFC` text.
- **Action/Dark:** Dark navy/black `#0A0A0C` background for high-priority actions like "New Outreach."

### Cards
- **Standard:** Glassmorphic white, 24px radius, 1px `#EDEDF2` border.
- **Stat Cards:** Include a small 40px icon circle in a light tinted background (e.g., light purple for research, light green for sent).

### Form Elements
- **Inputs:** Background of `#FFFFFF`, 1px `#EDEDF2` border. On focus, border changes to `#7C5CFC` with a soft lavender outer glow.
- **Checkboxes:** Square with a 4px radius, using the primary color for the checked state.

### Lists & Tables
- **Row Styling:** No zebra striping. Use a simple 1px bottom border `#EDEDF2`. On hover, the row should have a subtle background tint of `#F9F9FB`.
- **Status Chips:** Small, pill-shaped. Background is a 10% opacity version of the status color (e.g., Green for Sent, Purple for Draft) with 100% opacity text.

### Sidebar
- **Active State:** The active menu item uses a soft purple background tint and a 3px vertical "pill" indicator on the left side or a highlighted background with the icon and text shifting to `#7C5CFC`.