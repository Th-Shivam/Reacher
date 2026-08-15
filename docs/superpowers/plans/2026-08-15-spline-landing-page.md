# Spline 3D Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a modern landing page featuring an interactive Spline 3D Scene (`https://prod.spline.design/OATYG0p9C0UaiL2c/scene.splinecode`) for unauthenticated users in Reacher web application.

**Architecture:** Install `@splinetool/react-spline` dependency, build a dedicated `LandingPage.tsx` component with full-screen 3D canvas background and glassmorphism CTA header/overlay, and render it in `App.tsx` when user is signed out using Clerk Auth `<Show when="signed-out">`.

**Tech Stack:** React 19, Vite, TypeScript, `@splinetool/react-spline`, `@clerk/react`, Vanilla CSS.

---

### Task 1: Install `@splinetool/react-spline` dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install `@splinetool/react-spline`**

Run: `npm install @splinetool/react-spline` inside `frontend/` directory.

- [ ] **Step 2: Verify installation in `package.json`**

Check `frontend/package.json` contains `"@splinetool/react-spline"`.

- [ ] **Step 3: Commit dependency changes**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add @splinetool/react-spline dependency"
```

---

### Task 2: Create LandingPage component and styling

**Files:**
- Create: `frontend/src/components/LandingPage.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Create `LandingPage.tsx`**

Create `frontend/src/components/LandingPage.tsx` with Spline 3D canvas background, glassmorphism top navigation header, Reacher branding, Clerk SignIn/SignUp buttons, and hero title overlay.

```tsx
import React, { useState } from 'react';
import Spline from '@splinetool/react-spline';
import { SignInButton, SignUpButton } from '@clerk/react';

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="landing-container">
      {/* Background 3D Spline Canvas */}
      <div className="spline-wrapper">
        {isLoading && (
          <div className="spline-loader">
            <div className="spinner"></div>
            <p>Loading 3D Scene...</p>
          </div>
        )}
        <Spline
          scene="https://prod.spline.design/OATYG0p9C0UaiL2c/scene.splinecode"
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* Top Navbar */}
      <header className="landing-navbar">
        <div className="brand-logo">
          <span className="logo-icon">✨</span>
          <span className="logo-text">REACHER</span>
        </div>
        <div className="nav-actions">
          <SignInButton mode="modal">
            <button className="btn btn-secondary">Sign In</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="btn btn-primary">Get Started</button>
          </SignUpButton>
        </div>
      </header>

      {/* Hero Content Overlay */}
      <div className="hero-overlay">
        <div className="hero-content">
          <span className="badge">AI-POWERED RECRUITMENT & OUTREACH</span>
          <h1 className="hero-title">
            Intelligent Candidate Outreach <br />
            <span className="gradient-text">Engineered for Results</span>
          </h1>
          <p className="hero-subtitle">
            Analyze candidates, automate personalized Gmail outreach, and streamline recruitment workflows in seconds.
          </p>
          <div className="hero-cta">
            <SignUpButton mode="modal">
              <button className="btn btn-large btn-primary">Start Free Trial →</button>
            </SignUpButton>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `frontend/src/index.css` for Landing Page styles**

Add modern dark mode glassmorphism CSS rules to `frontend/src/index.css`.

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color-scheme: dark;
}

body {
  margin: 0;
  padding: 0;
  background-color: #0b0f19;
  color: #f3f4f6;
  overflow-x: hidden;
}

.landing-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.spline-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.spline-loader {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0b0f19;
  z-index: 2;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.landing-navbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2.5rem;
  background: rgba(11, 15, 25, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: 0.05em;
}

.logo-text {
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn {
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.16);
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
}

.btn-large {
  padding: 0.85rem 1.75rem;
  font-size: 1.05rem;
}

.hero-overlay {
  position: relative;
  z-index: 5;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 2.5rem;
  pointer-events: none;
}

.hero-content {
  max-width: 620px;
  pointer-events: auto;
}

.badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 1.25rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.15;
  margin: 0 0 1rem 0;
  color: #ffffff;
}

.gradient-text {
  background: linear-gradient(135deg, #a5b4fc 0%, #818cf8 50%, #c084fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #9ca3af;
  margin-bottom: 2rem;
}
```

- [ ] **Step 3: Commit LandingPage component**

```bash
git add frontend/src/components/LandingPage.tsx frontend/src/index.css
git commit -m "feat: add LandingPage component with Spline 3D scene"
```

---

### Task 3: Integrate LandingPage in `App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update `frontend/src/App.tsx` to conditionally render `LandingPage`**

Update `App.tsx` to render `LandingPage` inside `<Show when="signed-out">`.

```tsx
import './App.css'
import {
  Show,
  UserButton,
  useAuth,
} from '@clerk/react'
import { useEffect } from 'react'
import ProfileForm from './components/ProfileForm'
import { OutreachForm } from './components/OutreachForm'
import LandingPage from './components/LandingPage'

function App() {
  const { isSignedIn, isLoaded, getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const syncUser = async () => {
      try {
        const token = await getToken()
        if (!token) return

        await fetch('http://localhost:8000/api/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (error) {
        console.error('User sync error:', error)
      }
    }

    syncUser()
  }, [isSignedIn, isLoaded, getToken])

  return (
    <>
      <Show when="signed-out">
        <LandingPage />
      </Show>

      <Show when="signed-in">
        <header style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <UserButton />
        </header>
        <main style={{ padding: '2rem' }}>
          <ProfileForm />
          <OutreachForm />
        </main>
      </Show>
    </>
  )
}

export default App
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `frontend/` directory to ensure TypeScript type checking passes without errors.

- [ ] **Step 3: Commit `App.tsx` changes**

```bash
git add frontend/src/App.tsx
git commit -m "feat: render LandingPage for signed-out users in App.tsx"
```
