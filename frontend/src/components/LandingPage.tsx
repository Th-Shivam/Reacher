import { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import { useNavigate } from 'react-router';
import type { SplineEvent } from '@splinetool/runtime';
import FloatingDockDemo from '@/components/ui/floating-dock-demo';

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Intercept embedded Spline Open-URL window.open calls to prevent external 404 redirects
  useEffect(() => {
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const urlStr = String(url || '');
      if (urlStr.includes('clerk.accounts.dev') || urlStr.includes('sign-in') || urlStr.includes('sign-up')) {
        if (urlStr.includes('sign-in')) {
          navigate('/sign-in');
        } else {
          navigate('/sign-up');
        }
        return null;
      }
      return originalOpen.apply(this, [url, target, features] as any);
    };

    return () => {
      window.open = originalOpen;
    };
  }, [navigate]);

  const processSplineClick = (objectName: string) => {
    const name = (objectName || '').trim();
    const lowerName = name.toLowerCase();

    // Map Sign In targets
    if (
      name === 'SignInButton' ||
      name === 'StartSignIn' ||
      name === 'Description' ||
      name === 'word' ||
      lowerName.includes('signin') ||
      lowerName.includes('login')
    ) {
      navigate('/sign-in');
      return true;
    }

    // Map Sign Up targets
    if (
      name === 'SignUpButton' ||
      name === 'StartSignUp' ||
      name === 'GetStartedButton' ||
      name === 'TextR' ||
      name === 'RectangleR' ||
      lowerName.includes('signup') ||
      lowerName.includes('getstarted') ||
      (lowerName.includes('button') && !lowerName.includes('signin')) ||
      lowerName.includes('start')
    ) {
      navigate('/sign-up');
      return true;
    }

    // Unrelated objects (e.g. robot, canvas) do nothing
    return false;
  };

  const handleSplineMouseDown = (e: SplineEvent | any) => {
    if (!e || !e.target) return;

    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (e.nativeEvent) {
      if (typeof e.nativeEvent.stopPropagation === 'function') e.nativeEvent.stopPropagation();
      if (typeof e.nativeEvent.preventDefault === 'function') e.nativeEvent.preventDefault();
    }

    const objectName = e.target.name || '';
    processSplineClick(objectName);
  };

  const handleSplineLoad = (splineApp: any) => {
    setIsLoading(false);
    if (splineApp && typeof splineApp.addEventListener === 'function') {
      splineApp.addEventListener('mouseDown', (e: any) => {
        if (!e || !e.target) return;

        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.preventDefault === 'function') e.preventDefault();

        const objectName = e.target.name || '';
        processSplineClick(objectName);
      });
    }
  };

  return (
    <div className="landing-container">
      {/* Background 3D Spline Canvas */}
      <div className="spline-wrapper">
        {isLoading && (
          <div className="spline-loader">
            <div className="spinner"></div>
            <p>Loading 3D Experience...</p>
          </div>
        )}
        <Spline
          scene="https://prod.spline.design/OATYG0p9C0UaiL2c/scene.splinecode"
          onLoad={handleSplineLoad}
          onSplineMouseDown={handleSplineMouseDown}
          onMouseDown={handleSplineMouseDown}
        />
      </div>

      {/* Floating Dock Navbar */}
      <header className="fixed top-6 left-0 right-0 z-50 flex items-center justify-between px-8 max-w-7xl mx-auto pointer-events-none">
        <div className="brand-logo pointer-events-auto bg-neutral-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-neutral-800/80 shadow-2xl">
          <span className="logo-icon">✨</span>
          <span className="logo-text">REACHER</span>
        </div>

        <div className="pointer-events-auto">
          <FloatingDockDemo />
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
            <button className="btn btn-large btn-primary" onClick={() => navigate('/sign-up')}>
              Start Free Trial →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
