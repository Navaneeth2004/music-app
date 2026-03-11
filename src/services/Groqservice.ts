import AsyncStorage from '@react-native-async-storage/async-storage';

export const GROQ_COLOR = '#F55733';
export const GROQ_LABEL = 'Groq';
export const GROQ_ICON  = '⚡';

const KEY_STORAGE   = 'groq_api_key';
const MODEL_STORAGE = 'groq_model';

export type GroqModel =
  | 'llama-3.3-70b-versatile'
  | 'qwen2-32b'
  | 'openai/gpt-oss-20b'
  | 'openai/gpt-oss-120b';

export const GROQ_MODELS: { id: GroqModel; label: string; note: string }[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B',      note: 'Most capable & reasoning — recommended' },
  { id: 'openai/gpt-oss-120b',     label: 'GPT-OSS 120B',      note: 'Most powerful' },
  { id: 'qwen2-32b',               label: 'Qwen 2 32B',        note: 'Efficient multilingual' },
  { id: 'openai/gpt-oss-20b',      label: 'GPT-OSS 20B',       note: 'Fast & reliable' },
];

export async function getGroqKey(): Promise<string | null> { return AsyncStorage.getItem(KEY_STORAGE); }
export async function setGroqKey(k: string): Promise<void> { await AsyncStorage.setItem(KEY_STORAGE, k.trim()); }
export async function clearGroqKey(): Promise<void>        { await AsyncStorage.removeItem(KEY_STORAGE); }
export async function getGroqModel(): Promise<GroqModel> {
  const m = await AsyncStorage.getItem(MODEL_STORAGE);
  return (m as GroqModel) ?? 'mixtral-8x7b-32768';
}
export async function setGroqModel(m: GroqModel): Promise<void> {
  await AsyncStorage.setItem(MODEL_STORAGE, m);
}

// ─── Core fetch ───────────────────────────────────────────────
async function callGroq(apiKey: string, model: GroqModel, userContent: any[], system?: string): Promise<string> {
  const messages: any[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userContent });
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function groqExtractText(key: string, model: GroqModel, b64: string, mime = 'image/jpeg'): Promise<string> {
  return callGroq(key, model,
    [
      { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}`, detail: 'high' } },
      { type: 'text',      text: 'Extract ALL text from this image exactly as written. Preserve structure. Output ONLY the extracted text.' },
    ],
    'You are a precise OCR engine. Extract text exactly as it appears. No commentary.');
}
export async function groqParagraph(key: string, model: GroqModel, prompt: string, ctx?: string): Promise<string> {
  const text = ctx ? `Source:\n${ctx}\n\nInstruction: ${prompt}` : prompt;
  return callGroq(key, model, [{ type: 'text', text }], 'Write clear informative paragraphs. You may use <b>bold</b> and <i>italic</i>. Output ONLY the paragraph.');
}
export async function groqBullets(key: string, model: GroqModel, prompt: string, ctx?: string): Promise<string[]> {
  const text = ctx ? `Source:\n${ctx}\n\n${prompt}\n\nOutput as numbered list: "1. item"` : `${prompt}\n\nOutput as numbered list: "1. item"`;
  const raw  = await callGroq(key, model, [{ type: 'text', text }], 'Output ONLY a numbered list, one item per line. You may use <b>bold</b> and <i>italic</i>.');
  return raw.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}
export async function groqTableCell(key: string, model: GroqModel, prompt: string, col: string, ctx?: string): Promise<string> {
  const text = ctx ? `Column: "${col}"\nSource:\n${ctx}\n\nInstruction: ${prompt}` : `Column: "${col}"\nInstruction: ${prompt}`;
  return callGroq(key, model, [{ type: 'text', text }], 'Fill a single table cell concisely. Output ONLY the cell text.');
}
export async function groqFlashcard(key: string, model: GroqModel, prompt: string, side: 'front' | 'back', other?: string, ctx?: string): Promise<string> {
  let text = '';
  if (side === 'back' && other) text += `Front: "${other}"\n`;
  if (ctx) text += `Source:\n${ctx}\n\n`;
  text += `Instruction: ${prompt}`;
  return callGroq(key, model, [{ type: 'text', text }], `Write the ${side} of a flashcard. Max 200 words. Output ONLY the text.`);
}
