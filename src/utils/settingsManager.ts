// src/utils/settingsManager.ts
import { TranslationSettings } from '../types';
import { DEFAULT_SYSTEM_PROMPT } from '../constants';

/**
 * 翻訳設定をchrome.storage.localから取得する非同期関数
 * @returns 翻訳設定を含むオブジェクト
 */
export async function getTranslationSettings(): Promise<TranslationSettings> {
  const result = await new Promise<{ [key: string]: any }>((resolve) => {
    chrome.storage.local.get([
      "geminiApiKey",
      "translationEngine",
      "chatgptApiKey",
      "chatgptAzureApiKey",
      "chatgptAzureEndpoint",
      "chatgptAzureDeploymentName",
      "chatgptAzureApiVersion",
      "systemPrompt",
      "doNotTranslateProperNouns",
      "includePageContent"
    ], resolve);
  });

  return {
    geminiApiKey: result.geminiApiKey,
    translationEngine: result.translationEngine || "gemini",
    chatgptApiKey: result.chatgptApiKey,
    chatgptAzureApiKey: result.chatgptAzureApiKey,
    chatgptAzureEndpoint: result.chatgptAzureEndpoint,
    chatgptAzureDeploymentName: result.chatgptAzureDeploymentName,
    chatgptAzureApiVersion: result.chatgptAzureApiVersion || "2023-07-01-preview",
    systemPrompt: result.systemPrompt || DEFAULT_SYSTEM_PROMPT, // ここでデフォルト値を適用
    includePageContent: result.includePageContent || false,
    doNotTranslateProperNouns: result.doNotTranslateProperNouns || false,
  };
}
