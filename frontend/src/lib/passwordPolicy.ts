export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_WEAK_MAX_LENGTH = 5;

export const PASSWORD_MIN_LENGTH_HINT = 'Минимум 4 символа';
export const PASSWORD_TOO_SHORT_MESSAGE = `Пароль должен содержать не менее ${PASSWORD_MIN_LENGTH} символов`;
export const PASSWORD_WEAK_HINT = 'Слабый пароль';

export function isPasswordTooShort(password: string): boolean {
  return password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
}

export function isWeakPassword(password: string): boolean {
  const len = password.length;
  return len >= PASSWORD_MIN_LENGTH && len <= PASSWORD_WEAK_MAX_LENGTH;
}
