import { marked } from 'marked';
console.log("Content script loaded.");

// --- CSS Injection ---
let cssInjected = false;
const injectCSS = () => {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    #gemini-translate-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483646;
    }
    #gemini-translate-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #101;
      border-radius: 8px;
      padding: 0 20px 20px 20px;
      width: 90%;
      max-width: 800px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 2147483647;
      color: #AAA;
      opacity: 0.97;
      display: flex;
      flex-direction: column;
    }
    #gemini-translate-dialog .handle {
      margin: 0 -20px;
      padding: 20px 30px 10px 20px;
      cursor: move;
      color: #AAA;
    }
    #gemini-translate-dialog .close-button {
      position: absolute;
      top: 20px;
      right: 20px;
      font-size: 24px;
      color: #AAA;
      cursor: pointer;
      line-height: 1;
    }
    #gemini-translation-result {
      max-height: 60vh;
      overflow-y: auto;
      border-top: 1px solid #eee;
      padding-right: 15px;
      padding-bottom: 40px;
    }
    #gemini-translate-dialog .copy-button {
      position: absolute;
      bottom: 20px;
      right: 20px;
      font-size: 24px;
      color: #AAA;
      cursor: pointer;
    }
    #gemini-translate-dialog .copy-feedback {
      position: absolute;
      bottom: 25px;
      right: 55px;
      background: #333;
      color: #fff;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      display: none;
      z-index: 1;
    }
    #gemini-translate-icon {
      position: absolute;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 2147483646;
      color: black;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);
};

// --- Dialog Management ---
const removeDialog = () => {
  document.getElementById("gemini-translate-overlay")?.remove();
  document.getElementById("gemini-translate-dialog")?.remove();
};

const showTranslateDialog = (text: string) => {
  removeDialog();
  injectCSS();

  // Create elements from HTML strings
  const overlay = document.createElement("div");
  overlay.id = "gemini-translate-overlay";

  const dialogHTML = `
    <h3 class="handle">GenAI 翻訳</h3>
    <div class="close-button">✕</div>
    <div id="gemini-translation-result">翻訳中...</div>
    <span class="material-icons copy-button">content_copy</span>
    <span class="copy-feedback">コピーしました！</span>
  `;
  const dialog = document.createElement("div");
  dialog.id = "gemini-translate-dialog";
  dialog.innerHTML = dialogHTML;

  document.body.appendChild(overlay);
  document.body.appendChild(dialog);

  // Get element references
  const handle = dialog.querySelector<HTMLHeadingElement>(".handle")!;
  const closeButton = dialog.querySelector<HTMLDivElement>(".close-button")!;
  const resultText = dialog.querySelector<HTMLDivElement>("#gemini-translation-result")!;
  const copyButton = dialog.querySelector<HTMLSpanElement>(".copy-button")!;
  const copyFeedback = dialog.querySelector<HTMLSpanElement>(".copy-feedback")!;

  // --- Event Listeners ---

  // Close dialog
  const closeAndCleanup = () => {
    removeDialog();
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
  };
  overlay.addEventListener("click", closeAndCleanup);
  closeButton.addEventListener("click", closeAndCleanup);

  // Drag and drop
  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  const mouseMoveHandler = (e: MouseEvent) => {
    if (!isDragging) return;
    dialog.style.left = `${e.clientX - offsetX}px`;
    dialog.style.top = `${e.clientY - offsetY}px`;
    dialog.style.transform = "none";
  };

  const mouseUpHandler = () => {
    isDragging = false;
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
  };

  handle.addEventListener("mousedown", (e) => {
    isDragging = true;
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

  // Copy to clipboard
  copyButton.addEventListener("click", (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(resultText.innerText).then(() => {
      copyFeedback.style.display = "inline";
      setTimeout(() => { copyFeedback.style.display = "none"; }, 2000);
    }).catch((err) => {
      console.error("クリップボードへのコピーに失敗しました:", err);
      copyFeedback.textContent = "コピー失敗";
      copyFeedback.style.background = "red";
      copyFeedback.style.display = "inline";
      setTimeout(() => {
        copyFeedback.style.display = "none";
        copyFeedback.textContent = "コピーしました！";
        copyFeedback.style.background = "#333";
      }, 2000);
    });
  });

  // --- Translation Request ---
  chrome.storage.local.get(["includePageContent"], (result) => {
    const includePageContent = result.includePageContent || false;
    let pageContent = "";
    if (includePageContent) {
      pageContent = document.body.innerText;
    }

    chrome.runtime.sendMessage({
      type: "REQUEST_TRANSLATION",
      text: text,
      pageContent: pageContent
    }, (response) => {
      if (response.success) {
        resultText.innerHTML = marked(response.translation) as string;
      } else {
        resultText.textContent = `翻訳エラー: ${response.error}`;
        resultText.style.color = "red";
      }
    });
  });
};

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TRANSLATE_TEXT") {
    showTranslateDialog(request.text);
  }
  return true;
});

// --- Translate Icon ---
let translateIcon: HTMLDivElement | null = null;

const createTranslateIcon = (e: MouseEvent) => {
  removeTranslateIcon();
  injectCSS();

  translateIcon = document.createElement("div");
  translateIcon.id = "gemini-translate-icon";
  translateIcon.innerHTML = " G ";
  Object.assign(translateIcon.style, {
    top: `${e.pageY + 10}px`,
    left: `${e.pageX + 20}px`,
  });

  document.body.appendChild(translateIcon);
  return translateIcon;
};

const removeTranslateIcon = () => {
  translateIcon?.remove();
  translateIcon = null;
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

    const documentClickHandler = (event: MouseEvent) => {
      if (event.target !== icon) {
        removeTranslateIcon();
        document.removeEventListener("mousedown", documentClickHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener("mousedown", documentClickHandler);
    }, 100);
  }
});

document.addEventListener("mousedown", () => {
  if (!window.getSelection()?.toString().trim()) {
    removeTranslateIcon();
  }
});
