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
    // コンテンツスクリプトにメッセージを送信
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selectedText) => {
        // ここでダイアログを表示するなどの処理を行う
        // とりあえずアラートで表示
        alert(`選択されたテキスト: ${selectedText}`);
      },
      args: [info.selectionText],
    });
  }
});
