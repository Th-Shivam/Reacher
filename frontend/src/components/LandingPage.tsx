import { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import { useNavigate } from 'react-router';
import type { SplineEvent } from '@splinetool/runtime';

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Intercept any embedded Spline Open-URL window.open calls to prevent 404 external navigation
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

  const handleSplineMouseDown = (e: SplineEvent | any) => {
    if (!e || !e.target) return;

    // Prevent Spline internal event propagation if present
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (e.nativeEvent) {
      if (typeof e.nativeEvent.stopPropagation === 'function') e.nativeEvent.stopPropagation();
      if (typeof e.nativeEvent.preventDefault === 'function') e.nativeEvent.preventDefault();
    }

    const objectName = e.target.name || '';
    const lowerName = objectName.toLowerCase();

    console.log('Spline object clicked:', objectName);

    if (objectName === 'SignInButton' || lowerName.includes('signin') || lowerName.includes('login')) {
      navigate('/sign-in');
      return;
    }

    if (
      objectName === 'GetStartedButton' ||
      lowerName.includes('getstarted') ||
      lowerName.includes('button') ||
      lowerName.includes('start') ||
      lowerName.includes('textr') ||
      lowerName.includes('rectangler') ||
      lowerName.includes('part2')
    ) {
      navigate('/sign-up');
      return;
    }
  };

  const handleSplineLoad = (splineApp: any) => {
    setIsLoading(false);
    if (splineApp && typeof splineApp.addEventListener === 'function') {
      splineApp.addEventListener('mouseDown', (e: any) => {
        if (!e || !e.target) return;

        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.preventDefault === 'function') e.preventDefault();

        const objectName = e.target.name || '';
        const lowerName = objectName.toLowerCase();

        console.log('Spline event listener clicked:', objectName);

        if (objectName === 'SignInButton' || lowerName.includes('signin') || lowerName.includes('login')) {
          navigate('/sign-in');
          return;
        }

        if (
          objectName === 'GetStartedButton' ||
          lowerName.includes('getstarted') ||
          lowerName.includes('button') ||
          lowerName.includes('start') ||
          lowerName.includes('textr') ||
          lowerName.includes('rectangler') ||
          lowerName.includes('part2')
        ) {
          navigate('/sign-up');
          return;
        }
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

      {/* Top Navbar */}
      <header className="landing-navbar">
        <div className="brand-logo">
          <span className="logo-icon">✨</span>
          <span className="logo-text">REACHER</span>
        </div>
        <div className="nav-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/sign-in')}>
            Sign In
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/sign-up')}>
            Get Started
          </button>
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
