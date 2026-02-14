import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { ApiService } from '../services/ApiService';
import { useUserStore } from '../stores/userStore';
import { isValidEmail, validateDisplayName, validatePassword } from '../utils/authValidation';

export default function SignupPage() {
  const navigate = useNavigate();
  const setSession = useUserStore((state) => state.setSession);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const displayNameError = validateDisplayName(displayName);
    if (displayNameError) {
      setError(displayNameError);
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const session = await ApiService.signup(email.trim(), password, displayName.trim());
      setSession(session);
      navigate('/match', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md py-8">
      <Card>
        <h1 className="font-[var(--font-display)] text-3xl tracking-[0.08em]">Create Account</h1>
        <p className="mt-2 text-sm text-white/65">Set your codename and enter BattleBrain.</p>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.08em] text-white/70">Display Name</span>
            <Input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="NeoRoaster"
              autoComplete="nickname"
              required
            />
          </label>

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
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.08em] text-white/70">Confirm Password</span>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              required
            />
          </label>

          {error ? <p className="text-sm text-[var(--color-neon-rose)]">{error}</p> : null}

          <Button type="submit" className="mt-2 w-full" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-white/70">
          Already registered?{' '}
          <Link to="/login" className="text-[var(--color-neon-cyan)] hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </section>
  );
}
