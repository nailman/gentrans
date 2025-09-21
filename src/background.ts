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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "REQUEST_TRANSLATION") {
    // ストレージからAPIキーを取得
    chrome.storage.local.get(["geminiApiKey"], async (result) => {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        sendResponse({ success: false, error: "Gemini APIキーが設定されていません。" });
        return;
      }

      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `以下のテキストを日本語に翻訳してください:\n\n"${request.text}"`
              }]
            }]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`APIリクエストに失敗しました: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        // APIレスポンスの構造を安全に辿る
        const translation = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (translation) {
          sendResponse({ success: true, translation: translation });
        } else {
          throw new Error("APIレスポンスの形式が正しくありません。");
        }

      } catch (error) {
        console.error("Gemini APIエラー:", error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : "不明なエラー" });
      }
    });

    return true; // 非同期レスポンスのためにtrueを返す
  }
});
