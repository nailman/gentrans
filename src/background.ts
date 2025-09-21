import { TranslationRequest } from './types';
import { ITranslationEngine } from './translationEngines/ITranslationEngine';
import { createTranslationEngine } from './utils/translationEngineFactory';
import { getTranslationSettings } from './utils/settingsManager';


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

chrome.runtime.onMessage.addListener((request: TranslationRequest, sender, sendResponse) => {
  if (request.type === "REQUEST_TRANSLATION") {
    handleTranslationRequest(request, sendResponse);
    return true;
  }
});

