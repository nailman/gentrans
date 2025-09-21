// src/utils/translationEngineFactory.ts
import { ITranslationEngine } from '../translationEngines/ITranslationEngine';
import { GeminiTranslationEngine } from '../translationEngines/GeminiTranslationEngine';
import { OpenAITranslationEngine } from '../translationEngines/OpenAITranslationEngine';
import { AzureOpenAITranslationEngine } from '../translationEngines/AzureOpenAITranslationEngine';
import { TranslationSettings } from '../types';

export function createTranslationEngine(settings: TranslationSettings): ITranslationEngine {
  switch (settings.translationEngine) {
    case "gemini":
      return new GeminiTranslationEngine();
    case "chatgpt":
      return new OpenAITranslationEngine();
    case "chatgpt_azure":
      return new AzureOpenAITranslationEngine();
    default:
      throw new Error("サポートされていない翻訳エンジンです。");
  }
}
