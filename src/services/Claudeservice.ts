import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLAUDE_COLOR = '#D4A27A';
export const CLAUDE_LABEL = 'Claude';
export const CLAUDE_ICON  = '◆';

const KEY_STORAGE   = 'claude_api_key';
const MODEL_STORAGE = 'claude_model';

export type ClaudeModel =
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5-20251001';

export const CLAUDE_MODELS: { id: ClaudeModel; label: string; note: string }[] = [
  { id: 'claude-sonnet-4-5',        label: 'Claude Sonnet 4.5', note: 'Smart & balanced — recommended' },
  { id: 'claude-haiku-4-5-20251001',label: 'Claude Haiku 4.5',  note: 'Fastest, most affordable' },
];

export async function getClaudeKey(): Promise<string | null> { return AsyncStorage.getItem(KEY_STORAGE); }
export async function setClaudeKey(k: string): Promise<void> { await AsyncStorage.setItem(KEY_STORAGE, k.trim()); }
export async function clearClaudeKey(): Promise<void>        { await AsyncStorage.removeItem(KEY_STORAGE); }
export async function getClaudeModel(): Promise<ClaudeModel> {
  const m = await AsyncStorage.getItem(MODEL_STORAGE);
  return (m as ClaudeModel) ?? 'claude-sonnet-4-5';
}
export async function setClaudeModel(m: ClaudeModel): Promise<void> {
  await AsyncStorage.setItem(MODEL_STORAGE, m);
}

// ─── Core fetch ───────────────────────────────────────────────
async function callClaude(apiKey: string, model: ClaudeModel, userContent: any[], system?: string): Promise<string> {
  const body: any = {
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: userContent }],
  };
  if (system) body.system = system;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

export async function claudeExtractText(key: string, model: ClaudeModel, b64: string, mime = 'image/jpeg'): Promise<string> {
  return callClaude(key, model,
    [
      { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
      { type: 'text',  text: 'Extract ALL text from this image exactly as written. Preserve structure. Output ONLY the extracted text.' },
    ],
    'You are a precise OCR engine. Extract text exactly as it appears. No commentary.');
}
export async function claudeParagraph(key: string, model: ClaudeModel, prompt: string, ctx?: string): Promise<string> {
  const text = ctx ? `Source:\n${ctx}\n\nInstruction: ${prompt}` : prompt;
  return callClaude(key, model, [{ type: 'text', text }], 'Write clear informative paragraphs. You may use <b>bold</b> and <i>italic</i>. Output ONLY the paragraph.');
}
export async function claudeBullets(key: string, model: ClaudeModel, prompt: string, ctx?: string): Promise<string[]> {
  const text = ctx ? `Source:\n${ctx}\n\n${prompt}\n\nOutput as numbered list: "1. item"` : `${prompt}\n\nOutput as numbered list: "1. item"`;
  const raw  = await callClaude(key, model, [{ type: 'text', text }], 'Output ONLY a numbered list, one item per line. You may use <b>bold</b> and <i>italic</i>.');
  return raw.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}
export async function claudeTableCell(key: string, model: ClaudeModel, prompt: string, col: string, ctx?: string): Promise<string> {
  const text = ctx ? `Column: "${col}"\nSource:\n${ctx}\n\nInstruction: ${prompt}` : `Column: "${col}"\nInstruction: ${prompt}`;
  return callClaude(key, model, [{ type: 'text', text }], 'Fill a single table cell concisely. Output ONLY the cell text.');
}
export async function claudeFlashcard(key: string, model: ClaudeModel, prompt: string, side: 'front' | 'back', other?: string, ctx?: string): Promise<string> {
  let text = '';
  if (side === 'back' && other) text += `Front: "${other}"\n`;
  if (ctx) text += `Source:\n${ctx}\n\n`;
  text += `Instruction: ${prompt}`;
  return callClaude(key, model, [{ type: 'text', text }], `Write the ${side} of a flashcard. Max 200 words. Output ONLY the text.`);
}