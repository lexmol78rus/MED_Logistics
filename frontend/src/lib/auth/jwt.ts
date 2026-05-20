type JwtPayload = {
  sub?: string;
  exp?: number;
  email?: string;
};

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** Client-side structural check: well-formed JWT with unexpired `exp`. */
export function isJwtValid(token: string | null | undefined): boolean {
  if (!token) {
    return false;
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.sub || typeof payload.exp !== 'number') {
    return false;
  }

  return payload.exp * 1000 > Date.now();
}
