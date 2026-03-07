/**
 * favorites.ts
 * Lightweight AsyncStorage layer for pinning books and solo decks.
 * Keys are prefixed by type so books and decks never collide.
 *
 * Usage:
 *   const pinned = await getFavorites('book');
 *   await toggleFavorite('book', book.id);
 *   const yes = await isFavorite('deck', deck.id);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type FavType = 'book' | 'deck';

const key = (type: FavType) => `favorites_${type}`;

/** Return the full set of pinned IDs for a type. */
export async function getFavorites(type: FavType): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key(type));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** Check whether a single item is pinned. */
export async function isFavorite(type: FavType, id: string): Promise<boolean> {
  const set = await getFavorites(type);
  return set.has(id);
}

/** Pin or unpin an item. Returns the new pinned state (true = now pinned). */
export async function toggleFavorite(type: FavType, id: string): Promise<boolean> {
  const set = await getFavorites(type);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  await AsyncStorage.setItem(key(type), JSON.stringify([...set]));
  return set.has(id);
}

/** Remove all favorites for a type (e.g. on logout). */
export async function clearFavorites(type: FavType): Promise<void> {
  await AsyncStorage.removeItem(key(type));
}