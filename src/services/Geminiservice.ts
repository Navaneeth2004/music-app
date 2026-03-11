import AsyncStorage from '@react-native-async-storage/async-storage';

export const GEMINI_COLOR   = '#4285F4';
export const GEMINI_LABEL   = 'Gemini';
export const GEMINI_ICON    = '✦';

const KEY_STORAGE   = 'gemini_api_key';
const MODEL_STORAGE = 'gemini_model';

export type GeminiModel = 'gemini-2.0-flash' | 'gemini-2.0-flash-lite';
export const GEMINI_MODELS: { id: GeminiModel; label: string; note: string }[] = [
  { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash',      note: 'Fast & capable — recommended' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', note: 'Fastest, lightest' },
];

export async function getGeminiKey(): Promise<string | null> { return AsyncStorage.getItem(KEY_STORAGE); }
export async function setGeminiKey(k: string): Promise<void> { await AsyncStorage.setItem(KEY_STORAGE, k.trim()); }
export async function clearGeminiKey(): Promise<void>        { await AsyncStorage.removeItem(KEY_STORAGE); }
export async function getGeminiModel(): Promise<GeminiModel> {
  const m = await AsyncStorage.getItem(MODEL_STORAGE);
  return (m as GeminiModel) ?? 'gemini-2.0-flash';
}
export async function setGeminiModel(m: GeminiModel): Promise<void> {
  await AsyncStorage.setItem(MODEL_STORAGE, m);
}

// ─── Core fetch ───────────────────────────────────────────────
async function callGemini(apiKey: string, model: GeminiModel, parts: any[], system?: string): Promise<string> {
  const url  = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body: any = { contents: [{ role: 'user', parts }] };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function geminiExtractText(key: string, model: GeminiModel, b64: string, mime = 'image/jpeg'): Promise<string> {
  return callGemini(key, model,
    [{ inline_data: { mime_type: mime, data: b64 } }, { text: 'Extract ALL text from this image exactly as written. Preserve structure. Output ONLY the extracted text.' }],
    'You are a precise OCR engine. Extract text exactly as it appears. No commentary.');
}
export async function geminiParagraph(key: string, model: GeminiModel, prompt: string, ctx?: string): Promise<string> {
  const text = ctx ? `Source:\n${ctx}\n\nInstruction: ${prompt}` : prompt;
  return callGemini(key, model, [{ text }], 'Write clear informative paragraphs. You may use <b>bold</b> and <i>italic</i>. Output ONLY the paragraph.');
}
export async function geminiBullets(key: string, model: GeminiModel, prompt: string, ctx?: string): Promise<string[]> {
  const text = ctx ? `Source:\n${ctx}\n\n${prompt}\n\nOutput as numbered list: "1. item"` : `${prompt}\n\nOutput as numbered list: "1. item"`;
  const raw  = await callGemini(key, model, [{ text }], 'Output ONLY a numbered list, one item per line. You may use <b>bold</b> and <i>italic</i>.');
  return raw.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}
export async function geminiTableCell(key: string, model: GeminiModel, prompt: string, col: string, ctx?: string): Promise<string> {
  const text = ctx ? `Column: "${col}"\nSource:\n${ctx}\n\nInstruction: ${prompt}` : `Column: "${col}"\nInstruction: ${prompt}`;
  return callGemini(key, model, [{ text }], 'Fill a single table cell concisely. Output ONLY the cell text.');
}
export async function geminiFlashcard(key: string, model: GeminiModel, prompt: string, side: 'front' | 'back', other?: string, ctx?: string): Promise<string> {
  let text = '';
  if (side === 'back' && other) text += `Front: "${other}"\n`;
  if (ctx) text += `Source:\n${ctx}\n\n`;
  text += `Instruction: ${prompt}`;
  return callGemini(key, model, [{ text }], `Write the ${side} of a flashcard. Max 200 words. Output ONLY the text.`);
}