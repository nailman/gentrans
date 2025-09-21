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

describe("background.ts", () => {
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

  it("should create a context menu item on installation", () => {
    require("../background");
    (chrome.runtime.onInstalled as any).callListeners();
    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: "translateWithGemini",
      title: "Geminiで翻訳",
      contexts: ["selection"],
    });
  });

  it("should send a message to content script when context menu is clicked", () => {
    require("../background");
    const mockTabId = 123;
    const mockSelectionText = "Selected Text";
    const mockInfo = { menuItemId: "translateWithGemini", selectionText: mockSelectionText };
    const mockTab = { id: mockTabId };
    (chrome.contextMenus.onClicked as any).callListeners(mockInfo, mockTab);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(mockTabId, { type: "TRANSLATE_TEXT", text: mockSelectionText });
  });

  describe("chrome.runtime.onMessage - REQUEST_TRANSLATION", () => {
    let mockSendResponse: jest.Mock;
    const mockRequest = { type: "REQUEST_TRANSLATION", text: "Hello", pageContent: "This is page content." };

    beforeEach(() => {
      require("../background");
      mockSendResponse = jest.fn();
    });

    it("should return an error if Gemini API key is not set", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => callback({ translationEngine: "gemini", geminiApiKey: undefined }));
      await (chrome.runtime.onMessage as any).callListeners(mockRequest, {}, mockSendResponse);
      expect(mockSendResponse).toHaveBeenCalledWith({ success: false, error: "Gemini APIキーが設定されていません。" });
    });

    it("should translate using Gemini API", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => callback({ translationEngine: "gemini", geminiApiKey: "key", includePageContent: true }));
      await (chrome.runtime.onMessage as any).callListeners(mockRequest, {}, mockSendResponse);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true, translation: "mocked gemini translation" });
    });

    it("should translate using ChatGPT (OpenAI) API", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => callback({ translationEngine: "chatgpt", chatgptApiKey: "key", includePageContent: true }));
      await (chrome.runtime.onMessage as any).callListeners(mockRequest, {}, mockSendResponse);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true, translation: "mocked chatgpt translation" });
    });

    it("should handle API errors", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => callback({ translationEngine: "gemini", geminiApiKey: "key" }));
      mockGenerateContent.mockRejectedValueOnce(new Error("API Error"));
      await (chrome.runtime.onMessage as any).callListeners(mockRequest, {}, mockSendResponse);
      expect(mockSendResponse).toHaveBeenCalledWith({ success: false, error: "API Error" });
    });
  });
});