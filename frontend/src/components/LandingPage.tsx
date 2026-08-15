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
            <p>Loading 3D Experience...</p>
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
