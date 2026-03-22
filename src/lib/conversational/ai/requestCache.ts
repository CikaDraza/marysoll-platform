const cache = new Map<string, Promise<unknown>>();

export function dedupedRequest<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (cache.has(key)) return cache.get(key) as Promise<T>;

  const promise = fn().finally(() => {
    cache.delete(key);
  });

  cache.set(key, promise);
  return promise;
}
