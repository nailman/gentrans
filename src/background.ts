import { TranslationSettings, TranslationRequest } from './types';
import { ITranslationEngine } from './translationEngines/ITranslationEngine';
import { GeminiTranslationEngine } from './translationEngines/GeminiTranslationEngine';
import { OpenAITranslationEngine } from './translationEngines/OpenAITranslationEngine';
import { AzureOpenAITranslationEngine } from './translationEngines/AzureOpenAITranslationEngine';


// 拡張機能がインストールされたときに実行
chrome.runtime.onInstalled.addListener(() => {
  // コンテキストメニュー（右クリックメニュー）を作成
  chrome.contextMenus.create({
    id: "translateWithGemini", // メニューのID
    title: "Geminiで翻訳", // メニューに表示されるテキスト
    contexts: ["selection"], // テキストを選択しているときのみ表示
  });
});

// コンテキストメニューがクリックされたときに実行
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // クリックされたメニューのIDが "translateWithGemini" であり、
  // 選択されたテキストが存在し、タブのIDがある場合
  if (info.menuItemId === "translateWithGemini" && info.selectionText && tab?.id) {
    // コンテンツスクリプトにダイアログ表示を指示
    chrome.tabs.sendMessage(tab.id, {
      type: "TRANSLATE_TEXT",
      text: info.selectionText,
    });
  }
});

// content.tsからの翻訳リクエストを受信
import { DEFAULT_SYSTEM_PROMPT, PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL } from './constants';

/**
 * 翻訳設定をchrome.storage.localから取得する非同期関数
 * @returns 翻訳設定を含むオブジェクト
 */
async function getTranslationSettings(): Promise<TranslationSettings> {
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

/**
 * 翻訳リクエストを処理する非同期関数
 * @param request content.tsからのリクエストオブジェクト
 * @param sendResponse content.tsへのレスポンスを送信する関数
 */
async function handleTranslationRequest(request: TranslationRequest, sendResponse: (response: any) => void) {
  const settings = await getTranslationSettings();

  try {
    let translation: string | undefined;
    let engine: ITranslationEngine | undefined;

    if (settings.translationEngine === "gemini") {
      engine = new GeminiTranslationEngine();
    } else if (settings.translationEngine === "chatgpt") {
      engine = new OpenAITranslationEngine();
    } else if (settings.translationEngine === "chatgpt_azure") {
      engine = new AzureOpenAITranslationEngine();
    } else {
      throw new Error("サポートされていない翻訳エンジンです。");
    }

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

chrome.runtime.onMessage.addListener((request: TranslationRequest, sender, sendResponse) => {
  if (request.type === "REQUEST_TRANSLATION") {
    handleTranslationRequest(request, sendResponse);
    return true;
  }
});

