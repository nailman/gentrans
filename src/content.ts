import { marked } from 'marked';
console.log("Content script loaded.");

// 既存のダイアログがあれば削除する関数
const removeDialog = () => {
  const existingDialog = document.getElementById("gemini-translate-dialog");
  if (existingDialog) {
    existingDialog.remove();
  }
  const dialogBody = document.getElementById("gemini-translate-dialog-body");
  if (dialogBody) {
    dialogBody.remove();
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
    // backgroundColor: "rgba(0, 0, 0, 0.2)",
    zIndex: "2147483646", // アイコンより一つ下
  });

  // ダイアログ本体
  const dialog = document.createElement("div");
  dialog.id = "gemini-translate-dialog-body"; // IDを付与
  Object.assign(dialog.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#101",
    borderRadius: "8px",
    padding: "20px",
    width: "90%",
    maxWidth: "800px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
    zIndex: "2147483647",
    color: "#AAA",
  });
  dialog.addEventListener("click", (e) => e.stopPropagation());

  // タイトル（ドラッグハンドル）
  const title = document.createElement("h3");
  title.textContent = "Gemini 翻訳";
  Object.assign(title.style, {
    marginTop: "0",
    borderBottom: "1px solid #eee",
    paddingBottom: "10px",
    cursor: "move", // カーソルを移動アイコンに
  });

  // ドラッグ＆ドロップ機能
  let isDragging = false;
  let offsetX = 0,
    offsetY = 0;

  const mouseMoveHandler = (e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - offsetX;
    const newY = e.clientY - offsetY;
    dialog.style.left = `${newX}px`;
    dialog.style.top = `${newY}px`;
    dialog.style.transform = "none";
  };

  const mouseUpHandler = () => {
    isDragging = false;
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
  };

  title.addEventListener("mousedown", (e) => {
    isDragging = true;

    // transformを解除して、現在の表示位置をleft/topに反映
    const rect = dialog.getBoundingClientRect();
    dialog.style.transform = "none";
    dialog.style.left = `${rect.left}px`;
    dialog.style.top = `${rect.top}px`;

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    e.preventDefault();
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  });

  overlay.addEventListener("click", () => {
    removeDialog();
    mouseUpHandler(); //念のため
  });

  // 翻訳結果エリア
  const resultText = document.createElement("div");
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
  closeButton.addEventListener("click", () => {
    removeDialog();
    mouseUpHandler(); //念のため
  });

  // 要素を組み立て
  dialog.appendChild(title);
  dialog.appendChild(resultText);
  dialog.appendChild(closeButton);
  // オーバーレイとダイアログを別々に追加
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);

  // backgroundに翻訳をリクエスト
  chrome.runtime.sendMessage({ type: "REQUEST_TRANSLATION", text: text }, (response) => {
    const resultTextElement = document.getElementById("gemini-translation-result");
    if (resultTextElement) {
      if (response.success) {
        resultTextElement.innerHTML = marked(response.translation) as string;
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