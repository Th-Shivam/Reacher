import { SignIn } from '@clerk/react';
import AuthLayout from './AuthLayout';
import { clerkAppearance } from './clerkAppearance';

export default function SignInPage() {
  return (
    <AuthLayout ariaLabel="Sign in to Reacher">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        appearance={clerkAppearance}
      />
    </AuthLayout>
  );
}
