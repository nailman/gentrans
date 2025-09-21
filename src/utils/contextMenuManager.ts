// src/utils/contextMenuManager.ts

export function initializeContextMenu() {
  // 拡張機能がインストールされたときに実行
  chrome.runtime.onInstalled.addListener(() => {
    // コンテキストメニュー（右クリックメニュー）を作成
    chrome.contextMenus.create({
      id: "translateWithGemini", // メニューのID
      title: "GenAIで翻訳", // メニューに表示されるテキスト
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
}
