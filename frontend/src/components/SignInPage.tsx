import { SignIn } from '@clerk/react';
import { Link } from 'react-router';

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0b0f19', padding: '1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>← Back to Home</Link>
      </div>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
