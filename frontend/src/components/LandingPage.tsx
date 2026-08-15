import { useState } from 'react';
import Spline from '@splinetool/react-spline';
import { useNavigate } from 'react-router';
import type { SplineEvent } from '@splinetool/runtime';

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const handleSplineMouseDown = (e: SplineEvent | any) => {
    if (!e || !e.target) return;
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
