import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { LoginFormData } from '../../types';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  const { isAuthenticated, login, isLoggingIn, loginError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
  });

  if (isAuthenticated) {
    return <Navigate to="/referrals" replace />;
  }

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary-800">RedMati Counsel</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your counsellor portal</p>
        </div>

        <form
          onSubmit={handleSubmit((data) => login(data))}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />

          {loginError && (
            <p className="text-sm text-red-600 text-center">
              {loginError.message ?? 'Invalid credentials. Please try again.'}
            </p>
          )}

          <Button type="submit" loading={isLoggingIn} className="w-full mt-2">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
