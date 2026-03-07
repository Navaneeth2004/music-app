/**
 * hidden.ts
 * Lightweight AsyncStorage layer for hiding books, chapters, and solo decks
 * from the student view. Only admins can hide/show items.
 *
 * Hidden state is per-device (AsyncStorage), not per-user.
 * Keys are prefixed by type so different content types never collide.
 *
 * Usage:
 *   const hidden = await getHidden('book');
 *   await toggleHidden('chapter', chapter.id);
 *   const yes = await isHidden('deck', deck.id);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type HideType = 'book' | 'chapter' | 'deck';

const key = (type: HideType) => `hidden_${type}`;

/** Return the full set of hidden IDs for a type. */
export async function getHidden(type: HideType): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key(type));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** Check whether a single item is hidden. */
export async function isHidden(type: HideType, id: string): Promise<boolean> {
  const set = await getHidden(type);
  return set.has(id);
}

/** Hide or unhide an item. Returns the new hidden state (true = now hidden). */
export async function toggleHidden(type: HideType, id: string): Promise<boolean> {
  const set = await getHidden(type);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  await AsyncStorage.setItem(key(type), JSON.stringify([...set]));
  return set.has(id);
}