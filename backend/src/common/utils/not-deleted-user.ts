/** Prisma filter: active accounts only (not soft-deleted). */
export const notDeletedUserWhere = { deletedAt: null } as const;
