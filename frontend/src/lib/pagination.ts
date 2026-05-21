/** Backend PaginationQueryDto caps pageSize at 100. */
export const MAX_PAGE_SIZE = 100;

export function clampPageSize(pageSize?: number, fallback = 25): number {
  const size = pageSize ?? fallback;
  return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
}
