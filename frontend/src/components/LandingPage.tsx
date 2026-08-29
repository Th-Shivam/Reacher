import { useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import { useNavigate } from 'react-router';
import type { SplineEvent } from '@splinetool/runtime';
import { motion, AnimatePresence } from 'motion/react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import FloatingDockDemo from '@/components/ui/floating-dock-demo';

export type HeroScene = 'scene1' | 'scene2';

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeScene, setActiveScene] = useState<HeroScene>('scene1');
  const splineRef = useRef<any>(null);
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

  const handleSceneTransition = (targetScene: HeroScene) => {
    setActiveScene(targetScene);
    if (splineRef.current) {
      try {
        if (targetScene === 'scene2') {
          splineRef.current.emitEvent?.('mouseDown', 'SignInButton');
          splineRef.current.emitEvent?.('mouseDown', 'StartSignIn');
        } else {
          splineRef.current.emitEvent?.('mouseDown', 'Home');
        }
      } catch (e) {
        // Fallback for custom spline runtime events
      }
    }
  };

  const processSplineClick = (objectName: string) => {
    const name = (objectName || '').trim();
    const lowerName = name.toLowerCase();

    // 1. High priority: Sign In button targets
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

    // 2. High priority: Sign Up / Get Started button targets
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

    // 3. Fallback: non-auth object clicks in scene1 switch to scene2
    if (activeScene === 'scene1') {
      setActiveScene('scene2');
      return true;
    }

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
    splineRef.current = splineApp;

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
    <div className="landing-container" aria-busy={isLoading}>
      {/* Background 3D Spline Canvas */}
      <div className="spline-wrapper">
        {isLoading && (
          <div className="spline-loader">
            <DotLottieReact
              src="https://lottie.host/67ee2bcb-fe66-4594-b658-53cd62f1ca01/RvUpi1j3QG.lottie"
              loop
              autoplay
              className="spline-loader-animation"
              aria-label="Loading 3D experience"
            />
          </div>
        )}
        <Spline
          scene="https://prod.spline.design/OATYG0p9C0UaiL2c/scene.splinecode"
          onLoad={handleSplineLoad}
          onSplineMouseDown={handleSplineMouseDown}
          onMouseDown={handleSplineMouseDown}
        />
      </div>

      {!isLoading && (
        <>
          {/* Floating Dock Navbar at Bottom Center */}
          <div
            className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 pointer-events-auto sm:bottom-6"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <FloatingDockDemo
              activeScene={activeScene}
              onSelectScene={(scene) => handleSceneTransition(scene)}
            />
          </div>

          {/* Hero Content Overlay (Only rendered in Scene 1) */}
          <div className="hero-overlay-centered">
            <AnimatePresence mode="wait">
              {activeScene === 'scene1' && (
                <motion.div
                  key="scene1"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="hero-content-centered"
                >
                  <span className="badge">AI OUTREACH INTELLIGENCE</span>

                  <h1 className="hero-title-centered">
                    Research before <br />
                    <span className="font-light text-neutral-300 opacity-90">you reach.</span>
                  </h1>

                  <p className="hero-subtitle-centered">
                    Turn cold outreach into well-researched conversations.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
