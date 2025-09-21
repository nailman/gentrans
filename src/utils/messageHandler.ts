// src/utils/messageHandler.ts
import { TranslationRequest } from '../types';
import { ITranslationEngine } from '../translationEngines/ITranslationEngine';
import { createTranslationEngine } from './translationEngineFactory';
import { getTranslationSettings } from './settingsManager';

/**
 * 翻訳リクエストを処理する非同期関数
 * @param request content.tsからのリクエストオブジェクト
 * @param sendResponse content.tsへのレスポンスを送信する関数
 */
async function handleTranslationRequest(request: TranslationRequest, sendResponse: (response: any) => void) {
  const settings = await getTranslationSettings();

  try {
    let translation: string | undefined;
    const engine: ITranslationEngine = createTranslationEngine(settings);

    if (engine) {
      translation = await engine.translate(request, settings);
    } else {
      throw new Error("翻訳エンジンが初期化されませんでした。");
    }

    if (translation) {
      sendResponse({ success: true, translation: translation });
    } else {
      throw new Error("APIレスポンスからテキストを取得できませんでした。");
    }

  } catch (error) {
    console.error(`${settings.translationEngine} APIエラー:`, error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : "不明なエラー" });
  }
}

export function initializeMessageHandler() {
  chrome.runtime.onMessage.addListener((request: TranslationRequest, sender, sendResponse) => {
    if (request.type === "REQUEST_TRANSLATION") {
      handleTranslationRequest(request, sendResponse);
      return true;
    }
  });
}
