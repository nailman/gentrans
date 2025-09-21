const mockGenerateContent = jest.fn();
const mockCreate = jest.fn();

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe("background.tsのテスト", () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
    mockCreate.mockClear();
    jest.resetModules();

    mockGenerateContent.mockResolvedValue({ text: "mocked gemini translation" });
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "mocked chatgpt translation" } }] });

    (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
      const defaults = {
        geminiApiKey: "test-gemini-key",
        chatgptApiKey: "test-chatgpt-key",
        chatgptAzureApiKey: "test-chatgpt-azure-key",
        chatgptAzureEndpoint: "https://test.azure.openai.com",
        chatgptAzureDeploymentName: "test-deployment",
        chatgptAzureApiVersion: "2023-07-01-preview",
        translationEngine: "gemini",
        systemPrompt: "Test System Prompt",
        doNotTranslateProperNouns: false,
        includePageContent: false,
      };
      callback(defaults);
    });
  });

  it("インストール時にコンテキストメニュー項目を作成するべき", () => {
    require("../background");
    (chrome.runtime.onInstalled as any).callListeners();
    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: "translateWithGemini",
      title: "Geminiで翻訳",
      contexts: ["selection"],
    });
  });

  it("コンテキストメニューがクリックされたときにコンテンツスクリプトにメッセージを送信するべき", () => {
    require("../background");
    const mockTabId = 123;
    const mockSelectionText = "Selected Text";
    const mockInfo = { menuItemId: "translateWithGemini", selectionText: mockSelectionText };
    const mockTab = { id: mockTabId };
    (chrome.contextMenus.onClicked as any).callListeners(mockInfo, mockTab);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(mockTabId, { type: "TRANSLATE_TEXT", text: mockSelectionText });
  });

  describe("chrome.runtime.onMessage - 翻訳リクエスト", () => {
    let mockSendResponse: jest.Mock;
    const mockRequest = { type: "REQUEST_TRANSLATION", text: "Hello", pageContent: "This is page content." };

    beforeEach(() => {
      require("../background");
      mockSendResponse = jest.fn();
    });

    it("Gemini APIキーが設定されていない場合、エラーを返す", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => callback({ translationEngine: "gemini", geminiApiKey: undefined }));
      const responsePromise = new Promise<void>(resolve => {
        mockSendResponse.mockImplementationOnce((response) => {
          mockSendResponse.mock.calls.push([response]);
          resolve();
        });
      });

      (chrome.runtime.onMessage as any).callListeners(mockRequest, {}, mockSendResponse);
      await responsePromise;

      expect(mockSendResponse).toHaveBeenCalledWith({ success: false, error: "Gemini APIキーが設定されていません。" });
    });

    it("Gemini APIを使用して翻訳する", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => callback({ translationEngine: "gemini", geminiApiKey: "key", includePageContent: true }));
      const responsePromise = new Promise<void>(resolve => {
        mockSendResponse.mockImplementationOnce((response) => {
          mockSendResponse.mock.calls.push([response]);
          resolve();
        });
      });

      (chrome.runtime.onMessage as any).callListeners(mockRequest, {}, mockSendResponse);
      await responsePromise;

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true, translation: "mocked gemini translation" });
    });

    it("ChatGPT (OpenAI) APIを使用して翻訳する", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => callback({ translationEngine: "chatgpt", chatgptApiKey: "key", includePageContent: true }));
      const responsePromise = new Promise<void>(resolve => {
        mockSendResponse.mockImplementationOnce((response) => {
          mockSendResponse.mock.calls.push([response]);
          resolve();
        });
      });

      (chrome.runtime.onMessage as any).callListeners(mockRequest, {}, mockSendResponse);
      await responsePromise;

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true, translation: "mocked chatgpt translation" });
    });

    it("APIエラーを処理する", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => callback({ translationEngine: "gemini", geminiApiKey: "key" }));
      mockGenerateContent.mockRejectedValueOnce(new Error("API Error"));
      const responsePromise = new Promise<void>(resolve => {
        mockSendResponse.mockImplementationOnce((response) => {
          mockSendResponse.mock.calls.push([response]);
          resolve();
        });
      });

      (chrome.runtime.onMessage as any).callListeners(mockRequest, {}, mockSendResponse);
      await responsePromise;

      expect(mockSendResponse).toHaveBeenCalledWith({ success: false, error: "API Error" });
    });
  });
});