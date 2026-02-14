import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidEmail, validateDisplayName, validatePassword } from './authValidation.ts';

test('isValidEmail accepts valid email', () => {
  assert.equal(isValidEmail('user@example.com'), true);
});

test('isValidEmail rejects invalid email', () => {
  assert.equal(isValidEmail('invalid-email'), false);
});

test('validatePassword enforces min length', () => {
  assert.equal(validatePassword('12345'), 'Password must be at least 6 characters.');
  assert.equal(validatePassword('123456'), null);
});

test('validateDisplayName enforces required and max length', () => {
  assert.equal(validateDisplayName(''), 'Display name is required.');
  assert.equal(validateDisplayName('a'.repeat(31)), 'Display name must be at most 30 characters.');
  assert.equal(validateDisplayName('NeoRoaster'), null);
});
