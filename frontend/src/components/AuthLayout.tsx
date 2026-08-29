import type { ReactNode, CSSProperties } from 'react';
import { IconArrowLeft, IconCheck, IconInfoCircle, IconMail } from '@tabler/icons-react';
import { Link } from 'react-router';
import signUpArtwork from '../assets/sign-up.png';

type AuthLayoutProps = {
  children: ReactNode;
  ariaLabel: string;
};

export default function AuthLayout({ children, ariaLabel }: AuthLayoutProps) {
  const artworkStyle = {
    '--auth-artwork': `url("${signUpArtwork}")`,
  } as CSSProperties;

  return (
    <main className="auth-page" style={artworkStyle}>
      <div className="auth-backdrop" aria-hidden="true" />

      <Link to="/" className="auth-brand" aria-label="Reacher home">
        REACHER
      </Link>

      <div className="auth-stage">
        <aside className="auth-beta-summary" aria-labelledby="auth-beta-title">
          <p className="auth-beta-eyebrow">Private beta access</p>
          <h1 id="auth-beta-title">Unlock Gmail drafts when verified.</h1>
          <p className="auth-beta-description">
            Reacher is open for new users to explore, but the complete Gmail workflow is currently limited to trusted users who have been added to the beta.
          </p>

          <div className="auth-access-group">
            <div className="auth-access-row">
              <span className="auth-access-icon" aria-hidden="true">
                <IconCheck />
              </span>
              <div>
                <p>Available to every user</p>
                <span>
                  Research opportunities, personalize your outreach, and generate complete email messages ready for review and use.
                </span>
              </div>
            </div>

            <div className="auth-access-row auth-access-row--trusted">
              <span className="auth-access-icon" aria-hidden="true">
                <IconMail />
              </span>
              <div>
                <p>Available to trusted / added users</p>
                <span>
                  Automatically save the generated email as a draft inside your connected Gmail account without copying and pasting it manually.
                </span>
              </div>
            </div>
          </div>

          <p className="auth-beta-contact">
            Want the complete beta experience?{' '}
            <a href="mailto:thakurshivam.gkp@gmail.com">Contact Shivam</a>
            {' '}to request trusted access. Otherwise, you are still welcome to use Reacher and generate your email message normally.
          </p>
        </aside>

        <section className="auth-card" aria-label={ariaLabel}>
          <Link to="/" className="auth-back-link">
            <IconArrowLeft aria-hidden="true" />
            Back to home
          </Link>

          <div className="auth-clerk-shell">{children}</div>

          <div className="auth-guidance" role="note">
            <IconInfoCircle aria-hidden="true" />
            <p>
              <strong>Beta access:</strong> You can generate email messages normally. Automatic Gmail draft saving is available only to trusted users added to the beta.{' '}
              <a href="mailto:thakurshivam.gkp@gmail.com">Contact Shivam</a>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
