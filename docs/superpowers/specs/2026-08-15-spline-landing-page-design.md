# Design Document: Spline 3D Landing Page Integration

## Goal
Integrate the custom 3D Spline scene (`https://prod.spline.design/OATYG0p9C0UaiL2c/scene.splinecode`) into a modern, high-converting Landing Page for **Reacher** on the `frontend-integration` branch.

## Component Architecture

### 1. `frontend/src/components/LandingPage.tsx`
- **Background**: Full-screen `<Spline scene="..." />` canvas.
- **Top Navigation Bar**: Glassmorphic header featuring:
  - Reacher Brand Logo & Status indicator.
  - Clerk `<SignInButton />` and `<SignUpButton />` styled as modern action buttons.
- **Hero Content Overlay**:
  - Catchy title and subtitle introducing Reacher (Automated AI Candidate Outreach & Analysis).
  - Primary CTA button ("Get Started") triggering sign in/up modal.
- **Loading State**: Subtle dark mode skeleton / spinner while the 3D scene canvas initializes.

### 2. Integration in `frontend/src/App.tsx`
- Render `LandingPage` for signed-out users via Clerk `<Show when="signed-out">`.
- Render Main Application / Dashboard (Header with `<UserButton />`, `ProfileForm`, `OutreachForm`) for signed-in users via `<Show when="signed-in">`.

## Dependencies
- Package: `@splinetool/react-spline`
