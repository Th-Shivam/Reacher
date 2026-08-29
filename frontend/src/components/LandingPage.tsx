import { useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import { useNavigate } from 'react-router';
import type { SplineEvent } from '@splinetool/runtime';
import { motion, AnimatePresence } from 'motion/react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { IconArrowRight, IconLogin } from '@tabler/icons-react';
import FloatingDockDemo from '@/components/ui/floating-dock-demo';

export type HeroScene = 'scene1' | 'scene2';

const mobileSceneSignals = [
  { label: 'Cold Outreach', position: 'top-left' },
  { label: 'Company Research', position: 'top-right' },
  { label: 'Smart Drafts', position: 'middle-left' },
  { label: 'Context Intelligence', position: 'middle-right' },
  { label: 'Email Generation', position: 'bottom-left' },
  { label: 'Opportunity Mapping', position: 'bottom-right' },
] as const;

function MobileAuthScene({
  onSignIn,
  onSignUp,
}: {
  onSignIn: () => void;
  onSignUp: () => void;
}) {
  return (
    <motion.section
      className="mobile-auth-scene"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      aria-labelledby="mobile-auth-title"
    >
      <div className="mobile-auth-brand" aria-hidden="true">
        REACHER
      </div>

      <div className="mobile-auth-signals" aria-hidden="true">
        {mobileSceneSignals.map(({ label, position }, index) => (
          <span
            key={label}
            className={`mobile-auth-signal mobile-auth-signal--${position}`}
            style={{ animationDelay: `${index * 0.45}s` }}
          >
            {label}
          </span>
        ))}
      </div>

      <motion.div
        className="mobile-auth-content"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4, ease: 'easeOut' }}
      >
        <span className="mobile-auth-kicker">
          <span />
          Outreach intelligence
        </span>
        <h2 id="mobile-auth-title">
          Remove the friction from your job search journey.
        </h2>
        <p>
          Research the right people, write with context, and turn every reach-out into a better conversation.
        </p>

        <div className="mobile-auth-actions">
          <button type="button" className="mobile-auth-button mobile-auth-button--secondary" onClick={onSignIn}>
            <IconLogin aria-hidden="true" />
            Sign in
          </button>
          <button type="button" className="mobile-auth-button mobile-auth-button--primary" onClick={onSignUp}>
            Get started
            <IconArrowRight aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </motion.section>
  );
}

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeScene, setActiveScene] = useState<HeroScene>('scene1');
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );
  const splineRef = useRef<any>(null);
  const navigate = useNavigate();
  const showMobileAuthScene = isMobileViewport && activeScene === 'scene2';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);

    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    const splineApp = splineRef.current;
    if (!splineApp) return;

    if (showMobileAuthScene) {
      splineApp.stop?.();
    } else {
      splineApp.play?.();
    }
  }, [showMobileAuthScene]);

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
    // Spline's watermark is drawn by its internal logo pass rather than the DOM.
    // Disable that pass when the runtime exposes it, with the CSS cover below as
    // a fallback for scene/runtime versions that still paint the badge.
    splineApp?._renderer?.pipeline?.setWatermark?.(null);
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
          className={`spline-scene spline-scene--${activeScene}${showMobileAuthScene ? ' spline-scene--paused' : ''}`}
          scene="https://prod.spline.design/OATYG0p9C0UaiL2c/scene.splinecode"
          onLoad={handleSplineLoad}
          onSplineMouseDown={handleSplineMouseDown}
          onMouseDown={handleSplineMouseDown}
        />
        <AnimatePresence>
          {showMobileAuthScene && (
            <MobileAuthScene
              onSignIn={() => navigate('/sign-in')}
              onSignUp={() => navigate('/sign-up')}
            />
          )}
        </AnimatePresence>
        {!showMobileAuthScene && (
          <div className="spline-watermark-cover" aria-hidden="true">
            <span>REACHER</span>
          </div>
        )}
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
