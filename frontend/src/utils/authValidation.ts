export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

export function validateDisplayName(displayName: string): string | null {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return 'Display name is required.';
  }
  if (trimmed.length > 30) {
    return 'Display name must be at most 30 characters.';
  }
  return null;
}
