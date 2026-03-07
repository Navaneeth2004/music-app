/**
 * mediaExport.ts
 *
 * Helpers for embedding local media (images/audio) into export payloads
 * as base64 strings, and for restoring them on import.
 *
 * Uses expo-file-system "next" API: { File, Paths, Directory } from 'expo-file-system'
 * NOT the classic `import * as FileSystem` API.
 */

import { File, Paths, Directory } from 'expo-file-system';

/** Read a local URI as a base64 string. Returns null if the file can't be read. */
export async function fileToBase64(uri: string | undefined): Promise<string | null> {
  if (!uri) return null;
  // Skip remote URLs — they're not local files we own
  if (uri.startsWith('http://') || uri.startsWith('https://')) return null;
  try {
    const file = new File(uri);
    return await file.base64();
  } catch {
    return null;
  }
}

/** basename: "file:///foo/bar/baz.jpg" → "baz.jpg" */
export function basename(uri: string): string {
  return uri.split('/').pop() ?? 'file';
}

/**
 * Given a local URI, embed it into the media map keyed as
 * "images/filename.jpg" or "audio/filename.m4a".
 * Returns the bare filename (stored in the record) or undefined.
 */
export async function embedMedia(
  uri: string | undefined,
  type: 'images' | 'audio',
  mediaMap: Record<string, string>,
): Promise<string | undefined> {
  if (!uri) return undefined;
  const name = basename(uri);
  const key  = `${type}/${name}`;
  if (!mediaMap[key]) {
    const b64 = await fileToBase64(uri);
    if (b64) mediaMap[key] = b64;
  }
  return name;
}

/**
 * Write all media from a backup's media map into documentDirectory/media/.
 * Returns a map from "images/filename" → local URI.
 */
export async function restoreMediaMap(
  mediaObj: Record<string, string> | undefined,
): Promise<Record<string, string>> {
  const uriMap: Record<string, string> = {};
  if (!mediaObj) return uriMap;

  const mediaDir = new Directory(Paths.document, 'media');
  await mediaDir.create();

  for (const key of Object.keys(mediaObj)) {
    // key = "images/foo.jpg" or "audio/bar.m4a"
    // Flatten the slash so we don't need subdirs: "images_foo.jpg"
    const flatName = key.replace('/', '_');
    const file     = new File(mediaDir.uri, flatName);
    await file.write(mediaObj[key], { encoding: 'base64' } as any);
    uriMap[key] = file.uri;
  }
  return uriMap;
}

/** Remap a bare filename back to a local URI using the restored media map. */
export function remapUri(
  name: string | undefined,
  type: 'images' | 'audio',
  uriMap: Record<string, string>,
): string | undefined {
  if (!name) return undefined;
  return uriMap[`${type}/${name}`] ?? name;
}