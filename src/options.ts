const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;
const engineGeminiRadio = document.getElementById("engine-gemini") as HTMLInputElement;
const engineChatGPTRadio = document.getElementById("engine-chatgpt") as HTMLInputElement;
const engineChatGPTRadioAzure = document.getElementById("engine-chatgpt-azure") as HTMLInputElement;

const chatgptApiKeyGroup = document.getElementById("chatgpt-api-key-group") as HTMLDivElement;
const chatgptApiKeyInput = document.getElementById("chatgpt-api-key") as HTMLInputElement;

const chatgptAzureApiKeyGroup = document.getElementById("chatgpt-azure-api-key-group") as HTMLDivElement;
const chatgptAzureApiKeyInput = document.getElementById("chatgpt-azure-api-key") as HTMLInputElement;
const chatgptAzureEndpointGroup = document.getElementById("chatgpt-azure-endpoint-group") as HTMLDivElement;
const chatgptAzureEndpointInput = document.getElementById("chatgpt-azure-endpoint") as HTMLInputElement;
const chatgptAzureDeploymentNameGroup = document.getElementById("chatgpt-azure-deployment-name-group") as HTMLDivElement;
const chatgptAzureDeploymentNameInput = document.getElementById("chatgpt-azure-deployment-name") as HTMLInputElement;
const chatgptAzureApiVersionGroup = document.getElementById("chatgpt-azure-api-version-group") as HTMLDivElement;
const chatgptAzureApiVersionInput = document.getElementById("chatgpt-azure-api-version") as HTMLInputElement;

function updateChatGPTOptionsVisibility() {
  chatgptApiKeyGroup.style.display = "none";
  chatgptAzureApiKeyGroup.style.display = "none";
  chatgptAzureEndpointGroup.style.display = "none";
  chatgptAzureDeploymentNameGroup.style.display = "none";
  chatgptAzureApiVersionGroup.style.display = "none";

  if (engineChatGPTRadio.checked) {
    chatgptApiKeyGroup.style.display = "block";
  } else if (engineChatGPTRadioAzure.checked) {
    chatgptAzureApiKeyGroup.style.display = "block";
    chatgptAzureEndpointGroup.style.display = "block";
    chatgptAzureDeploymentNameGroup.style.display = "block";
    chatgptAzureApiVersionGroup.style.display = "block";
  }
}

// ページ読み込み時に保存されている設定を読み込む
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get([
    "geminiApiKey",
    "translationEngine",
    "chatgptApiKey",
    "chatgptAzureApiKey",
    "chatgptAzureEndpoint",
    "chatgptAzureDeploymentName",
    "chatgptAzureApiVersion"
  ], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
    if (result.translationEngine) {
      if (result.translationEngine === "gemini") {
        engineGeminiRadio.checked = true;
      } else if (result.translationEngine === "chatgpt") {
        engineChatGPTRadio.checked = true;
      } else if (result.translationEngine === "chatgpt_azure") {
        engineChatGPTRadioAzure.checked = true;
      }
    } else {
      // デフォルトはGemini
      engineGeminiRadio.checked = true;
    }
    if (result.chatgptApiKey) {
      chatgptApiKeyInput.value = result.chatgptApiKey;
    }
    if (result.chatgptAzureApiKey) {
      chatgptAzureApiKeyInput.value = result.chatgptAzureApiKey;
    }
    if (result.chatgptAzureEndpoint) {
      chatgptAzureEndpointInput.value = result.chatgptAzureEndpoint;
    }
    if (result.chatgptAzureDeploymentName) {
      chatgptAzureDeploymentNameInput.value = result.chatgptAzureDeploymentName;
    }
    if (result.chatgptAzureApiVersion) {
      chatgptAzureApiVersionInput.value = result.chatgptAzureApiVersion;
    }
    updateChatGPTOptionsVisibility();
  });
});

// ラジオボタンの変更イベント
engineGeminiRadio.addEventListener("change", updateChatGPTOptionsVisibility);
engineChatGPTRadio.addEventListener("change", updateChatGPTOptionsVisibility);
engineChatGPTRadioAzure.addEventListener("change", updateChatGPTOptionsVisibility);

// 保存ボタンのクリックイベント
saveButton.addEventListener("click", () => {
  const geminiApiKey = apiKeyInput.value;
  let translationEngine = "gemini";
  if (engineChatGPTRadio.checked) {
    translationEngine = "chatgpt";
  } else if (engineChatGPTRadioAzure.checked) {
    translationEngine = "chatgpt_azure";
  }

  const chatgptApiKey = chatgptApiKeyInput.value;
  const chatgptAzureApiKey = chatgptAzureApiKeyInput.value;
  const chatgptAzureEndpoint = chatgptAzureEndpointInput.value;
  const chatgptAzureDeploymentName = chatgptAzureDeploymentNameInput.value;
  const chatgptAzureApiVersion = chatgptAzureApiVersionInput.value;

  const settings: { [key: string]: string } = {
    translationEngine: translationEngine,
  };

  if (geminiApiKey) {
    settings.geminiApiKey = geminiApiKey;
  }
  if (translationEngine === "chatgpt" && chatgptApiKey) {
    settings.chatgptApiKey = chatgptApiKey;
  }
  if (translationEngine === "chatgpt_azure") {
    if (chatgptAzureApiKey) {
      settings.chatgptAzureApiKey = chatgptAzureApiKey;
    }
    if (chatgptAzureEndpoint) {
      settings.chatgptAzureEndpoint = chatgptAzureEndpoint;
    }
    if (chatgptAzureDeploymentName) {
      settings.chatgptAzureDeploymentName = chatgptAzureDeploymentName;
    }
    if (chatgptAzureApiVersion) {
      settings.chatgptAzureApiVersion = chatgptAzureApiVersion;
    }
  }

  chrome.storage.local.set(settings, () => {
    statusDiv.textContent = "設定を保存しました。";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 2000);
  });
});
