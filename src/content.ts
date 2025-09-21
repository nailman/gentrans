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
    paddingRight: "30px", // 閉じるボタンのスペース
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
  // 結果エリアのスタイル調整
  Object.assign(resultText.style, {
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: "15px", // スクロールバーのスペース
    paddingBottom: "40px", // コピーボタンのスペース
  });

  // 閉じるボタン
  const closeButton = document.createElement("div");
  closeButton.textContent = "✕";
  Object.assign(closeButton.style, {
    position: "absolute",
    top: "20px",
    right: "20px",
    fontSize: "24px",
    color: "#AAA",
    cursor: "pointer",
    lineHeight: "1",
  });
  closeButton.addEventListener("click", () => {
    removeDialog();
    mouseUpHandler(); //念のため
  });

  // コピーボタン
  const copyButton = document.createElement("span");
  copyButton.textContent = "content_copy"; // マテリアルアイコンの名前
  copyButton.className = "material-icons"; // マテリアルアイコンのクラス
  Object.assign(copyButton.style, {
    position: "absolute",
    bottom: "20px",
    right: "20px",
    fontSize: "24px",
    color: "#AAA",
    cursor: "pointer",
  });

  // コピーフィードバック
  const copyFeedback = document.createElement("span");
  copyFeedback.textContent = "コピーしました！";
  Object.assign(copyFeedback.style, {
    position: "absolute",
    bottom: "25px",
    right: "55px",
    background: "#333",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    display: "none", // 最初は非表示
    zIndex: "1",
  });

  copyButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const resultElement = document.getElementById("gemini-translation-result");
    if (resultElement) {
      navigator.clipboard
        .writeText(resultElement.innerText)
        .then(() => {
          // フィードバックを表示して少ししたら消す
          copyFeedback.style.display = "inline";
          setTimeout(() => {
            copyFeedback.style.display = "none";
          }, 2000);
        })
        .catch((err) => {
          console.error("クリップボードへのコピーに失敗しました:", err);
          copyFeedback.textContent = "コピー失敗";
          copyFeedback.style.background = "red";
          copyFeedback.style.display = "inline";
          setTimeout(() => {
            copyFeedback.style.display = "none";
            // 元のテキストに戻す
            copyFeedback.textContent = "コピーしました！";
            copyFeedback.style.background = "#333";
          }, 2000);
        });
    }
  });

  // 要素を組み立て
  dialog.appendChild(title);
  dialog.appendChild(resultText);
  dialog.appendChild(closeButton);
  dialog.appendChild(copyButton);
  dialog.appendChild(copyFeedback);
  // オーバーレイとダイアログを別々に追加
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);

  // backgroundに翻訳をリクエスト
  // includePageContentオプションを取得
  chrome.storage.local.get(["includePageContent"], (result) => {
    const includePageContent = result.includePageContent || false;
    let pageContent = "";
    if (includePageContent) {
      // ページ全体のテキストコンテンツを取得
      pageContent = document.body.innerText;
    }

    chrome.runtime.sendMessage({
      type: "REQUEST_TRANSLATION",
      text: text,
      pageContent: pageContent // ページコンテンツを追加
    }, (response) => {
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

const createTranslateIcon = (e: MouseEvent) => {
  if (translateIcon) {
    translateIcon.remove();
  }
  translateIcon = document.createElement("div");
  translateIcon.id = "gemini-translate-icon";
  translateIcon.innerHTML = " G "; // アイコンの見た目
  Object.assign(translateIcon.style, {
    position: "absolute",
    top: `${e.pageY + 10}px`,
    left: `${e.pageX + 20}px`,
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "50%",
    width: "30px",
    height: "30px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    zIndex: "2147483646",
    color: "black",
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
    const icon = createTranslateIcon(e);

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