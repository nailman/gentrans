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
import { GoogleGenAI } from '@google/genai';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "REQUEST_TRANSLATION") {
    // ストレージからAPIキーを取得
    chrome.storage.local.get(["geminiApiKey"], async (result) => {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        sendResponse({ success: false, error: "Gemini APIキーが設定されていません。" });
        return;
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: request.text,
          config: {
            systemInstruction: "あなたは優秀な翻訳家です。与えられたテキストを日本語に翻訳してください。",
            thinkingConfig: {
              thinkingBudget: 0, // Disables thinking
            },
          }
        });

        const translation = response.text;
        if (translation) {
          sendResponse({ success: true, translation: translation });
        } else {
          throw new Error("APIレスポンスからテキストを取得できませんでした。");
        }

      } catch (error) {
        console.error("Gemini APIエラー:", error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : "不明なエラー" });
      }
    });

    return true; // 非同期レスポンスのためにtrueを返す
  }
});

