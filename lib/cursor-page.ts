/**
 * Split a `take: limit + 1` result into a page and a cursor for the next
 * `skip: 1` query.
 *
 * The cursor MUST be the last *included* row. Using the extra (unshown) row
 * as the cursor, then skipping it on the next fetch, drops that row forever.
 */
export function paginateByCursor<T extends { id: number }>(
  rows: T[],
  limit: number,
): { items: T[]; nextCursor: number | null } {
  if (rows.length > limit) {
    const items = rows.slice(0, limit);
    return { items, nextCursor: items[items.length - 1]!.id };
  }
  return { items: rows, nextCursor: null };
}
