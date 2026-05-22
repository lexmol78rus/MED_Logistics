import type { UserListItem } from '../api/users';
import { MAX_PAGE_SIZE } from '../pagination';
import { fetchUsers } from '../api/users';

export type OperatorUserLookup = Pick<UserListItem, 'id' | 'email' | 'displayName'>;

/** Same «Имя» field as Users grid — display_name from users table only. */
export function operatorNameFromUser(user: OperatorUserLookup | undefined): string | null {
  const name = user?.displayName?.trim();
  return name || null;
}

export function buildUsersByEmail(users: OperatorUserLookup[]): Map<string, OperatorUserLookup> {
  const map = new Map<string, OperatorUserLookup>();
  for (const user of users) {
    const email = user.email?.trim();
    if (!email) continue;
    map.set(email.toLowerCase(), user);
  }
  return map;
}

export async function fetchAllUsersForLookup(): Promise<OperatorUserLookup[]> {
  const pageSize = MAX_PAGE_SIZE;
  const all: OperatorUserLookup[] = [];
  let page = 1;
  let total = 0;

  do {
    const res = await fetchUsers({ page, pageSize });
    for (const u of res.items ?? []) {
      if (!u?.id) continue;
      all.push({ id: u.id, email: u.email, displayName: u.displayName ?? null });
    }
    total = res.total ?? 0;
    page += 1;
    if (!res.items?.length) break;
  } while (all.length < total);

  return all;
}

/**
 * Operator label for movements UI.
 * Priority: users.displayName (колонка «Имя») → full email. Never parses email local-part.
 */
export function resolveOperatorDisplay(
  email: string | null | undefined,
  usersByEmail: Map<string, OperatorUserLookup>,
): string {
  const raw = email?.trim();
  if (!raw || raw === 'Система') return 'Система';

  const user = usersByEmail.get(raw.toLowerCase());
  const name = operatorNameFromUser(user);
  if (name) return name;

  return raw;
}

export function formatOperatorField(
  raw: string | null | undefined,
  usersByEmail: Map<string, OperatorUserLookup>,
): string {
  if (!raw?.trim()) return '—';
  const tokens = [...new Set(raw.trim().split(/\s+/).filter(Boolean))];
  return tokens.map((token) => resolveOperatorDisplay(token, usersByEmail)).join(' ');
}
