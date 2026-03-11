import AsyncStorage from '@react-native-async-storage/async-storage';

export const CHATGPT_COLOR = '#10A37F';
export const CHATGPT_LABEL = 'ChatGPT';
export const CHATGPT_ICON  = '◉';

const KEY_STORAGE   = 'chatgpt_api_key';
const MODEL_STORAGE = 'chatgpt_model';

export type ChatGPTModel =
  | 'gpt-4o-mini'
  | 'gpt-4o';

export const CHATGPT_MODELS: { id: ChatGPTModel; label: string; note: string }[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', note: 'Fast & affordable — recommended' },
  { id: 'gpt-4o',      label: 'GPT-4o',      note: 'Most capable' },
];

export async function getChatGPTKey(): Promise<string | null> { return AsyncStorage.getItem(KEY_STORAGE); }
export async function setChatGPTKey(k: string): Promise<void> { await AsyncStorage.setItem(KEY_STORAGE, k.trim()); }
export async function clearChatGPTKey(): Promise<void>        { await AsyncStorage.removeItem(KEY_STORAGE); }
export async function getChatGPTModel(): Promise<ChatGPTModel> {
  const m = await AsyncStorage.getItem(MODEL_STORAGE);
  return (m as ChatGPTModel) ?? 'gpt-4o-mini';
}
export async function setChatGPTModel(m: ChatGPTModel): Promise<void> {
  await AsyncStorage.setItem(MODEL_STORAGE, m);
}

// ─── Core fetch ───────────────────────────────────────────────
async function callChatGPT(apiKey: string, model: ChatGPTModel, userContent: any[], system?: string): Promise<string> {
  const messages: any[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userContent });
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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

export async function chatgptExtractText(key: string, model: ChatGPTModel, b64: string, mime = 'image/jpeg'): Promise<string> {
  return callChatGPT(key, model,
    [
      { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}`, detail: 'high' } },
      { type: 'text',      text: 'Extract ALL text from this image exactly as written. Preserve structure. Output ONLY the extracted text.' },
    ],
    'You are a precise OCR engine. Extract text exactly as it appears. No commentary.');
}
export async function chatgptParagraph(key: string, model: ChatGPTModel, prompt: string, ctx?: string): Promise<string> {
  const text = ctx ? `Source:\n${ctx}\n\nInstruction: ${prompt}` : prompt;
  return callChatGPT(key, model, [{ type: 'text', text }], 'Write clear informative paragraphs. You may use <b>bold</b> and <i>italic</i>. Output ONLY the paragraph.');
}
export async function chatgptBullets(key: string, model: ChatGPTModel, prompt: string, ctx?: string): Promise<string[]> {
  const text = ctx ? `Source:\n${ctx}\n\n${prompt}\n\nOutput as numbered list: "1. item"` : `${prompt}\n\nOutput as numbered list: "1. item"`;
  const raw  = await callChatGPT(key, model, [{ type: 'text', text }], 'Output ONLY a numbered list, one item per line. You may use <b>bold</b> and <i>italic</i>.');
  return raw.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}
export async function chatgptTableCell(key: string, model: ChatGPTModel, prompt: string, col: string, ctx?: string): Promise<string> {
  const text = ctx ? `Column: "${col}"\nSource:\n${ctx}\n\nInstruction: ${prompt}` : `Column: "${col}"\nInstruction: ${prompt}`;
  return callChatGPT(key, model, [{ type: 'text', text }], 'Fill a single table cell concisely. Output ONLY the cell text.');
}
export async function chatgptFlashcard(key: string, model: ChatGPTModel, prompt: string, side: 'front' | 'back', other?: string, ctx?: string): Promise<string> {
  let text = '';
  if (side === 'back' && other) text += `Front: "${other}"\n`;
  if (ctx) text += `Source:\n${ctx}\n\n`;
  text += `Instruction: ${prompt}`;
  return callChatGPT(key, model, [{ type: 'text', text }], `Write the ${side} of a flashcard. Max 200 words. Output ONLY the text.`);
}