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
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: `${document.documentElement.scrollHeight}px`,
    backgroundColor: "transparent",
    zIndex: "2147483647",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: `${window.scrollY + 100}px`,
    boxSizing: "border-box", // paddingTopがheightに含まれないように
  });
  overlay.addEventListener("click", removeDialog);

  // ダイアログ本体
  const dialog = document.createElement("div");
  Object.assign(dialog.style, {
    background: "white",
    borderRadius: "8px",
    padding: "20px",
    width: "90%",
    maxWidth: "800px",
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

  // backgroundに翻訳をリクエスト
  chrome.runtime.sendMessage({ type: "REQUEST_TRANSLATION", text: text }, (response) => {
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
};

// backgroundからのメッセージを受信 (コンテキストメニュー用)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TRANSLATE_TEXT") {
    showTranslateDialog(request.text);
  }
  return true; // 非同期のレスポンスを待つためにtrueを返す
});


// 翻訳アイコン関連
let translateIcon: HTMLDivElement | null = null;

const createTranslateIcon = (range: Range) => {
  if (translateIcon) {
    translateIcon.remove();
  }
  const rect = range.getBoundingClientRect();
  translateIcon = document.createElement("div");
  translateIcon.id = "gemini-translate-icon";
  translateIcon.innerHTML = " G "; // アイコンの見た目
  Object.assign(translateIcon.style, {
    position: "absolute",
    top: `${window.scrollY + rect.bottom + 5}px`,
    left: `${window.scrollX + rect.left}px`,
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "50%",
    width: "24px",
    height: "24px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    zIndex: "2147483646",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    fontWeight: "bold",
  });

  document.body.appendChild(translateIcon);

  return translateIcon;
};

const removeTranslateIcon = () => {
  if (translateIcon) {
    translateIcon.remove();
    translateIcon = null;
  }
};

document.addEventListener("mouseup", (e) => {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (selectedText) {
    const range = selection!.getRangeAt(0);
    const icon = createTranslateIcon(range);

    const iconClickHandler = () => {
      showTranslateDialog(selectedText);
      removeTranslateIcon();
    };

    icon.addEventListener("click", iconClickHandler);

    // アイコン以外がクリックされたら消すためのイベント
    const documentClickHandler = (event: MouseEvent) => {
      if (event.target !== icon) {
        removeTranslateIcon();
        document.removeEventListener("mousedown", documentClickHandler);
      }
    };
    // mouseupの直後にmousedownイベントが発火してアイコンが消えるのを防ぐため、少し遅延させる
    setTimeout(() => {
        document.addEventListener("mousedown", documentClickHandler);
    }, 100);

  }
});

document.addEventListener("mousedown", (e) => {
    // マウスダウンで選択範囲がなくなる前にアイコンを消す
    const selection = window.getSelection();
    if (!selection?.toString().trim()) {
        removeTranslateIcon();
    }
});