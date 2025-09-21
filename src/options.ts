const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;

// ページ読み込み時に保存されているキーを読み込む
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });
});

// 保存ボタンのクリックイベント
saveButton.addEventListener("click", () => {
  const apiKey = apiKeyInput.value;
  if (apiKey) {
    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
      statusDiv.textContent = "APIキーを保存しました。";
      setTimeout(() => {
        statusDiv.textContent = "";
      }, 2000);
    });
  } else {
    statusDiv.textContent = "APIキーを入力してください。";
  }
});
