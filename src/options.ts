const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;
const engineGeminiRadio = document.getElementById("engine-gemini") as HTMLInputElement;
const engineChatGPTRadio = document.getElementById("engine-chatgpt") as HTMLInputElement;
const chatgptApiKeyGroup = document.getElementById("chatgpt-api-key-group") as HTMLDivElement;
const chatgptApiKeyInput = document.getElementById("chatgpt-api-key") as HTMLInputElement;

function updateChatGPTOptionsVisibility() {
  if (engineChatGPTRadio.checked) {
    chatgptApiKeyGroup.style.display = "block";
  } else {
    chatgptApiKeyGroup.style.display = "none";
  }
}

// ページ読み込み時に保存されている設定を読み込む
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["geminiApiKey", "translationEngine", "chatgptApiKey"], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
    if (result.translationEngine) {
      if (result.translationEngine === "gemini") {
        engineGeminiRadio.checked = true;
      } else if (result.translationEngine === "chatgpt") {
        engineChatGPTRadio.checked = true;
      }
    } else {
      // デフォルトはGemini
      engineGeminiRadio.checked = true;
    }
    if (result.chatgptApiKey) {
      chatgptApiKeyInput.value = result.chatgptApiKey;
    }
    updateChatGPTOptionsVisibility();
  });
});

// ラジオボタンの変更イベント
engineGeminiRadio.addEventListener("change", updateChatGPTOptionsVisibility);
engineChatGPTRadio.addEventListener("change", updateChatGPTOptionsVisibility);

// 保存ボタンのクリックイベント
saveButton.addEventListener("click", () => {
  const geminiApiKey = apiKeyInput.value;
  const translationEngine = engineGeminiRadio.checked ? "gemini" : "chatgpt";
  const chatgptApiKey = chatgptApiKeyInput.value;

  const settings: { [key: string]: string } = {
    translationEngine: translationEngine,
  };

  if (geminiApiKey) {
    settings.geminiApiKey = geminiApiKey;
  }
  if (translationEngine === "chatgpt" && chatgptApiKey) {
    settings.chatgptApiKey = chatgptApiKey;
  }

  chrome.storage.local.set(settings, () => {
    statusDiv.textContent = "設定を保存しました。";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 2000);
  });
});
