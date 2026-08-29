import { useEffect, useState } from 'react';
import {
  IconCheck,
  IconDownload,
  IconShare,
  IconX,
} from '@tabler/icons-react';
import './PwaInstallPrompt.css';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

const INSTALL_PROMPT_DISMISSED_KEY = 'reacher-pwa-install-dismissed';

function isRunningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((window.navigator as StandaloneNavigator).standalone);
}

function isIosDevice() {
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export default function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
      : false,
  );
  const [isIos] = useState(() => typeof window !== 'undefined' && isIosDevice());
  const [isInstalled, setIsInstalled] = useState(() =>
    typeof window !== 'undefined' && isRunningStandalone(),
  );
  const [isDismissed, setIsDismissed] = useState(() =>
    typeof window !== 'undefined'
      && window.sessionStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === 'true',
  );
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const updateMobileState = () => setIsMobile(mobileQuery.matches);
    const updateInstalledState = () => setIsInstalled(isRunningStandalone());

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    mobileQuery.addEventListener('change', updateMobileState);
    displayModeQuery.addEventListener('change', updateInstalledState);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      mobileQuery.removeEventListener('change', updateMobileState);
      displayModeQuery.removeEventListener('change', updateInstalledState);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIos) {
      setShowIosHelp(true);
      return;
    }

    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
      dismissInstallPrompt();
    }
  };

  const dismissInstallPrompt = () => {
    window.sessionStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  const canInstall = Boolean(installPrompt) || isIos;

  if (!isMobile || isInstalled || isDismissed || !canInstall) {
    return null;
  }

  return (
    <section className="pwa-install-prompt" aria-label="Install Reacher" aria-live="polite">
      <img className="pwa-install-icon" src="/reacher-icon-192.png" alt="" />

      <div className="pwa-install-copy">
        <strong>Install Reacher</strong>
        <span>
          {showIosHelp ? (
            <>
              Tap <IconShare aria-hidden="true" /> Share, then Add to Home Screen.
            </>
          ) : 'Add Reacher to your home screen.'}
        </span>
      </div>

      {!showIosHelp ? (
        <button type="button" className="pwa-install-action" onClick={handleInstall}>
          <IconDownload aria-hidden="true" />
          Install
        </button>
      ) : (
        <button type="button" className="pwa-install-action" onClick={dismissInstallPrompt}>
          <IconCheck aria-hidden="true" />
          Done
        </button>
      )}

      <button
        type="button"
        className="pwa-install-dismiss"
        aria-label={showIosHelp ? 'Close install instructions' : 'Dismiss install option'}
        title="Dismiss"
        onClick={dismissInstallPrompt}
      >
        <IconX aria-hidden="true" />
      </button>
    </section>
  );
}
