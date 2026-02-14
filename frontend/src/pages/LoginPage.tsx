import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { ApiService } from '../services/ApiService';
import { useUserStore } from '../stores/userStore';
import { isValidEmail, validatePassword } from '../utils/authValidation';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useUserStore((state) => state.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setSubmitting(true);
      const session = await ApiService.login(email.trim(), password);
      setSession(session);
      navigate('/match', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md py-8">
      <Card>
        <h1 className="font-[var(--font-display)] text-3xl tracking-[0.08em]">Log In</h1>
        <p className="mt-2 text-sm text-white/65">Enter your account and jump back into the arena.</p>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.08em] text-white/70">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="warrior@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.08em] text-white/70">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="text-sm text-[var(--color-neon-rose)]">{error}</p> : null}

          <Button type="submit" className="mt-2 w-full" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-white/70">
          No account yet?{' '}
          <Link to="/signup" className="text-[var(--color-neon-cyan)] hover:underline">
            Create one
          </Link>
        </p>
      </Card>
    </section>
  );
}
