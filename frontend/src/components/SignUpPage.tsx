import { SignUp } from '@clerk/react';
import AuthLayout from './AuthLayout';
import { clerkAppearance } from './clerkAppearance';

export default function SignUpPage() {
  return (
    <AuthLayout ariaLabel="Create your Reacher account">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={clerkAppearance}
      />
    </AuthLayout>
  );
}
