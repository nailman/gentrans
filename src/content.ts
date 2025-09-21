console.log("Content script loaded.");

// 既存のダイアログがあれば削除する関数
const removeDialog = () => {
  const existingDialog = document.getElementById("gemini-translate-dialog");
  if (existingDialog) {
    existingDialog.remove();
  }
};

// ダイアログを作成して表示する関数
const showTranslateDialog = (text: string) => {
  // 既存のダイアログを削除
  removeDialog();

  // オーバーレイ
  const overlay = document.createElement("div");
  overlay.id = "gemini-translate-dialog";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: "2147483647",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  });
  overlay.addEventListener("click", removeDialog);

  // ダイアログ本体
  const dialog = document.createElement("div");
  Object.assign(dialog.style, {
    background: "white",
    borderRadius: "8px",
    padding: "20px",
    width: "90%",
    maxWidth: "500px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
  });
  dialog.addEventListener("click", (e) => e.stopPropagation()); // ダイアログ内クリックで閉じないように

  // タイトル
  const title = document.createElement("h2");
  title.textContent = "Gemini 翻訳";
  Object.assign(title.style, { marginTop: "0", borderBottom: "1px solid #eee", paddingBottom: "10px" });

  // 元のテキスト
  const originalText = document.createElement("p");
  originalText.textContent = text;
  Object.assign(originalText.style, { fontStyle: "italic", color: "#555" });

  // 翻訳結果エリア
  const resultText = document.createElement("p");
  resultText.id = "gemini-translation-result";
  resultText.textContent = "翻訳中...";

  // 閉じるボタン
  const closeButton = document.createElement("button");
  closeButton.textContent = "閉じる";
  Object.assign(closeButton.style, {
    display: "block",
    marginLeft: "auto",
    marginTop: "20px",
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  });
  closeButton.addEventListener("click", removeDialog);

  // 要素を組み立て
  dialog.appendChild(title);
  dialog.appendChild(originalText);
  dialog.appendChild(resultText);
  dialog.appendChild(closeButton);
  overlay.appendChild(dialog);

  // bodyに追加
  document.body.appendChild(overlay);
};

// backgroundからのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TRANSLATE_TEXT") {
    // ダイアログを表示
    showTranslateDialog(request.text);

    // backgroundに翻訳をリクエスト
    chrome.runtime.sendMessage({ type: "REQUEST_TRANSLATION", text: request.text }, (response) => {
      const resultTextElement = document.getElementById("gemini-translation-result");
      if (resultTextElement) {
        if (response.success) {
          resultTextElement.textContent = response.translation;
        } else {
          resultTextElement.textContent = `翻訳エラー: ${response.error}`;
          resultTextElement.style.color = "red";
        }
      }
    });
  }
  return true; // 非同期のレスポンスを待つためにtrueを返す
});
