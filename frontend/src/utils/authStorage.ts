import { UserProfile } from '../types/user';

const TOKEN_KEY = 'battlebrain.auth.token';
const USER_KEY = 'battlebrain.auth.user';

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function getStoredToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): UserProfile | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser() {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(USER_KEY);
}
