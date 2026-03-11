/**
 * src/services/aiService.ts
 * Unified AI router — delegates to the active provider (Gemini, Claude, or ChatGPT).
 * Provider selection stored in AsyncStorage under 'ai_active_provider'.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GEMINI_COLOR, GEMINI_LABEL, GEMINI_ICON, GEMINI_MODELS, GeminiModel,
  getGeminiKey, getGeminiModel,
  geminiExtractText, geminiParagraph, geminiBullets, geminiTableCell, geminiFlashcard,
} from './Geminiservice';
import {
  CLAUDE_COLOR, CLAUDE_LABEL, CLAUDE_ICON, CLAUDE_MODELS, ClaudeModel,
  getClaudeKey, getClaudeModel,
  claudeExtractText, claudeParagraph, claudeBullets, claudeTableCell, claudeFlashcard,
} from './Claudeservice';
import {
  CHATGPT_COLOR, CHATGPT_LABEL, CHATGPT_ICON, CHATGPT_MODELS, ChatGPTModel,
  getChatGPTKey, getChatGPTModel,
  chatgptExtractText, chatgptParagraph, chatgptBullets, chatgptTableCell, chatgptFlashcard,
} from './Chatgptservice';
import {
  GROQ_COLOR, GROQ_LABEL, GROQ_ICON, GROQ_MODELS, GroqModel,
  getGroqKey, getGroqModel,
  groqExtractText, groqParagraph, groqBullets, groqTableCell, groqFlashcard,
} from './Groqservice';

export {
  GEMINI_COLOR, GEMINI_LABEL, GEMINI_ICON, GEMINI_MODELS,
  CLAUDE_COLOR,  CLAUDE_LABEL,  CLAUDE_ICON,  CLAUDE_MODELS,
  CHATGPT_COLOR, CHATGPT_LABEL, CHATGPT_ICON, CHATGPT_MODELS,
  GROQ_COLOR,    GROQ_LABEL,    GROQ_ICON,    GROQ_MODELS,
};
export type { GeminiModel, ClaudeModel, ChatGPTModel, GroqModel };

export type AIProvider = 'gemini' | 'claude' | 'chatgpt' | 'groq';
export const AI_PROVIDERS: {
  id: AIProvider; label: string; icon: string; color: string; getKey: () => Promise<string | null>;
}[] = [
  { id: 'gemini',  label: GEMINI_LABEL,  icon: GEMINI_ICON,  color: GEMINI_COLOR,  getKey: getGeminiKey  },
  { id: 'claude',  label: CLAUDE_LABEL,  icon: CLAUDE_ICON,  color: CLAUDE_COLOR,  getKey: getClaudeKey  },
  { id: 'chatgpt', label: CHATGPT_LABEL, icon: CHATGPT_ICON, color: CHATGPT_COLOR, getKey: getChatGPTKey },
  { id: 'groq',    label: GROQ_LABEL,    icon: GROQ_ICON,    color: GROQ_COLOR,    getKey: getGroqKey    },
];

const PROVIDER_KEY = 'ai_active_provider';
export async function getActiveProvider(): Promise<AIProvider> {
  const p = await AsyncStorage.getItem(PROVIDER_KEY);
  return (p as AIProvider) ?? 'gemini';
}
export async function setActiveProvider(p: AIProvider): Promise<void> {
  await AsyncStorage.setItem(PROVIDER_KEY, p);
}

export async function getApiKey(): Promise<string | null> {
  const p = await getActiveProvider();
  if (p === 'claude')  return getClaudeKey();
  if (p === 'chatgpt') return getChatGPTKey();
  if (p === 'groq')    return getGroqKey();
  return getGeminiKey();
}
export async function getModel(): Promise<string> {
  const p = await getActiveProvider();
  if (p === 'claude')  return getClaudeModel();
  if (p === 'chatgpt') return getChatGPTModel();
  if (p === 'groq')    return getGroqModel();
  return getGeminiModel();
}

export async function extractTextFromImage(key: string, model: string, b64: string, mime = 'image/jpeg'): Promise<string> {
  const p = await getActiveProvider();
  if (p === 'claude')  return claudeExtractText(key,  model as ClaudeModel,  b64, mime);
  if (p === 'chatgpt') return chatgptExtractText(key, model as ChatGPTModel, b64, mime);
  if (p === 'groq')    return groqExtractText(key,    model as GroqModel,    b64, mime);
  return geminiExtractText(key, model as GeminiModel, b64, mime);
}
export async function generateParagraph(key: string, model: string, prompt: string, ctx?: string): Promise<string> {
  const p = await getActiveProvider();
  if (p === 'claude')  return claudeParagraph(key,  model as ClaudeModel,  prompt, ctx);
  if (p === 'chatgpt') return chatgptParagraph(key, model as ChatGPTModel, prompt, ctx);
  if (p === 'groq')    return groqParagraph(key,    model as GroqModel,    prompt, ctx);
  return geminiParagraph(key, model as GeminiModel, prompt, ctx);
}
export async function generateBullets(key: string, model: string, prompt: string, ctx?: string): Promise<string[]> {
  const p = await getActiveProvider();
  if (p === 'claude')  return claudeBullets(key,  model as ClaudeModel,  prompt, ctx);
  if (p === 'chatgpt') return chatgptBullets(key, model as ChatGPTModel, prompt, ctx);
  if (p === 'groq')    return groqBullets(key,    model as GroqModel,    prompt, ctx);
  return geminiBullets(key, model as GeminiModel, prompt, ctx);
}
export async function generateTableCell(key: string, model: string, prompt: string, col: string, ctx?: string): Promise<string> {
  const p = await getActiveProvider();
  if (p === 'claude')  return claudeTableCell(key,  model as ClaudeModel,  prompt, col, ctx);
  if (p === 'chatgpt') return chatgptTableCell(key, model as ChatGPTModel, prompt, col, ctx);
  if (p === 'groq')    return groqTableCell(key,    model as GroqModel,    prompt, col, ctx);
  return geminiTableCell(key, model as GeminiModel, prompt, col, ctx);
}
export async function generateFlashcard(key: string, model: string, prompt: string, side: 'front' | 'back', other?: string, ctx?: string): Promise<string> {
  const p = await getActiveProvider();
  if (p === 'claude')  return claudeFlashcard(key,  model as ClaudeModel,  prompt, side, other, ctx);
  if (p === 'chatgpt') return chatgptFlashcard(key, model as ChatGPTModel, prompt, side, other, ctx);
  if (p === 'groq')    return groqFlashcard(key,    model as GroqModel,    prompt, side, other, ctx);
  return geminiFlashcard(key, model as GeminiModel, prompt, side, other, ctx);
}

// ─── Legacy aliases (for backward compatibility) ─────────────
// These delegate to the currently active provider
export async function setApiKey(k: string): Promise<void> {
  const p = await getActiveProvider();
  if (p === 'claude')  { const { setClaudeKey }  = await import('./Claudeservice');  return setClaudeKey(k);  }
  if (p === 'chatgpt') { const { setChatGPTKey } = await import('./Chatgptservice'); return setChatGPTKey(k); }
  if (p === 'groq')    { const { setGroqKey }    = await import('./Groqservice');    return setGroqKey(k);    }
  const { setGeminiKey } = await import('./Geminiservice');
  return setGeminiKey(k);
}
export async function clearApiKey(): Promise<void> {
  const p = await getActiveProvider();
  if (p === 'claude')  { const { clearClaudeKey }  = await import('./Claudeservice');  return clearClaudeKey();  }
  if (p === 'chatgpt') { const { clearChatGPTKey } = await import('./Chatgptservice'); return clearChatGPTKey(); }
  if (p === 'groq')    { const { clearGroqKey }    = await import('./Groqservice');    return clearGroqKey();    }
  const { clearGeminiKey } = await import('./Geminiservice');
  return clearGeminiKey();
}
export async function setModel(m: string): Promise<void> {
  const p = await getActiveProvider();
  if (p === 'claude')  { const { setClaudeModel }  = await import('./Claudeservice');  return setClaudeModel(m as any);  }
  if (p === 'chatgpt') { const { setChatGPTModel } = await import('./Chatgptservice'); return setChatGPTModel(m as any); }
  if (p === 'groq')    { const { setGroqModel }    = await import('./Groqservice');    return setGroqModel(m as any);    }
  const { setGeminiModel } = await import('./Geminiservice');
  return setGeminiModel(m as any);
}