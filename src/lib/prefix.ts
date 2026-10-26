export function lowerBound(keys: string[], target: string): number {
  let low = 0;
  let high = keys.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (keys[mid] < target) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function prefixIds(
  keys: string[],
  map: Record<string, number[]>,
  prefix: string,
  limit: number,
): number[] {
  if (!prefix) return [];
  const start = lowerBound(keys, prefix);
  const ids: number[] = [];
  for (let i = start; i < keys.length; i += 1) {
    const key = keys[i];
    if (!key.startsWith(prefix)) break;
    for (const id of map[key] ?? []) {
      ids.push(id);
      if (ids.length >= limit) return ids;
    }
  }
  return ids;
}
