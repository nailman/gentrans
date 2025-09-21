jest.mock("@google/genai", () => {
  const mockGoogleGenAI = {
    models: {
      generateContent: jest.fn(),
    },
  };
  return { GoogleGenAI: jest.fn(() => mockGoogleGenAI) };
});

jest.mock("openai", () => {
  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };
  return jest.fn(() => mockOpenAI);
});

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { DEFAULT_SYSTEM_PROMPT, PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL } from "../constants";

let mockGoogleGenAI: any;
let mockOpenAI: any;

// background.ts をインポート
require("../background");

describe("background.ts", () => {
  // 各テストの前にモックをクリア
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoogleGenAI = new GoogleGenAI({ apiKey: "test-key" });
    mockOpenAI = new OpenAI();
    // モックのgenerateContentとcreateメソッドをjest.fn()で上書きし、呼び出しを追跡できるようにする
    (mockGoogleGenAI.models.generateContent as jest.Mock).mockResolvedValue({ text: "mocked gemini translation" });
    (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{ message: { content: "mocked chatgpt translation" } }],
    });
    // chrome.storage.local のモックをリセット
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys: string | string[] | Record<string, any> | null, callback: (items: Record<string, any>) => void) => {
      const result: Record<string, any> = {}; // 型を明示
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          if (key === "geminiApiKey") result[key] = "test-gemini-key";
          if (key === "chatgptApiKey") result[key] = "test-chatgpt-key";
          if (key === "chatgptAzureApiKey") result[key] = "test-chatgpt-azure-key";
          if (key === "chatgptAzureEndpoint") result[key] = "https://test.azure.openai.com";
          if (key === "chatgptAzureDeploymentName") result[key] = "test-deployment";
          if (key === "chatgptAzureApiVersion") result[key] = "2023-07-01-preview";
          if (key === "translationEngine") result[key] = "gemini"; // デフォルト
          if (key === "systemPrompt") result[key] = "Test System Prompt";
          if (key === "doNotTranslateProperNouns") result[key] = false;
          if (key === "includePageContent") result[key] = false;
        });
      } else if (typeof keys === "string") {
        if (keys === "geminiApiKey") result[keys] = "test-gemini-key";
        if (keys === "chatgptApiKey") result[keys] = "test-chatgpt-key";
        if (keys === "chatgptAzureApiKey") result[keys] = "test-chatgpt-azure-key";
        if (keys === "chatgptAzureEndpoint") result[keys] = "https://test.azure.openai.com";
        if (keys === "chatgptAzureDeploymentName") result[keys] = "test-deployment";
        if (keys === "chatgptAzureApiVersion") result[keys] = "2023-07-01-preview";
        if (keys === "translationEngine") result[keys] = "gemini"; // デフォルト
        if (keys === "systemPrompt") result[keys] = "Test System Prompt";
        if (keys === "doNotTranslateProperNouns") result[keys] = false;
        if (keys === "includePageContent") result[keys] = false;
      } else if (typeof keys === "object" && keys !== null) {
        for (const key in keys) {
          if (key === "geminiApiKey") result[key] = "test-gemini-key";
          else if (key === "chatgptApiKey") result[key] = "test-chatgpt-key";
          else if (key === "chatgptAzureApiKey") result[key] = "test-chatgpt-azure-key";
          else if (key === "chatgptAzureEndpoint") result[key] = "https://test.azure.openai.com";
          else if (key === "chatgptAzureDeploymentName") result[key] = "test-deployment";
          else if (key === "chatgptAzureApiVersion") result[key] = "2023-07-01-preview";
          else if (key === "translationEngine") result[key] = "gemini"; // デフォルト
          else if (key === "systemPrompt") result[key] = "Test System Prompt";
          else if (key === "doNotTranslateProperNouns") result[key] = false;
          else if (key === "includePageContent") result[key] = false;
          else result[key] = keys[key]; // デフォルト値
        }
      } else {
        result["geminiApiKey"] = "test-gemini-key";
        result["chatgptApiKey"] = "test-chatgpt-key";
        result["chatgptAzureApiKey"] = "test-chatgpt-azure-key";
        result["chatgptAzureEndpoint"] = "https://test.azure.openai.com";
        result["chatgptAzureDeploymentName"] = "test-deployment";
        result["chatgptAzureApiVersion"] = "2023-07-01-preview";
        result["translationEngine"] = "gemini";
        result["systemPrompt"] = "Test System Prompt";
        result["doNotTranslateProperNouns"] = false;
        result["includePageContent"] = false;
      }
      callback(result);
    });
    // onInstalled イベントをトリガー
    (chrome.runtime.onInstalled as any).callListeners();
  });

  // formatPageContentForModel のテスト
  it("should format page content for the model", () => {
    // background.ts 内のプライベート関数なので、直接テストできない。
    // ただし、onMessageリスナー内で使用されるため、そのテストで間接的に検証される。
    // ここでは、エクスポートされていない関数なので、直接テストはスキップ。
    // もしエクスポートされていれば、以下のようにテストできる。
    // const formattedContent = formatPageContentForModel("test content");
    // expect(formattedContent).toBe("以下は翻訳の参考情報となるテキストの全文です。参考情報自体は翻訳しないでください。\n  <参考情報>\n  test content\n  </参考情報>");
  });

  // chrome.runtime.onInstalled のテスト
  it("should create a context menu item on installation", () => {
    // onInstalled イベントは background.ts のインポート時に一度だけ発火する
    // そのため、テストの実行前に既に実行されているはず
    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: "translateWithGemini",
      title: "Geminiで翻訳",
      contexts: ["selection"],
    });
  });

  // chrome.contextMenus.onClicked のテスト
  it("should send a message to content script when context menu is clicked", () => {
    const mockTabId = 123;
    const mockSelectionText = "Selected Text";
    const mockInfo = {
      menuItemId: "translateWithGemini",
      selectionText: mockSelectionText,
    };
    const mockTab = { id: mockTabId };

    // onClicked リスナーをトリガー
    (chrome.contextMenus.onClicked as any).callListeners(mockInfo, mockTab);

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(mockTabId, {
      type: "TRANSLATE_TEXT",
      text: mockSelectionText,
    });
  });

  // chrome.runtime.onMessage のテスト
  describe("chrome.runtime.onMessage - REQUEST_TRANSLATION", () => {
    let resolveSendResponse: (value: any) => void;
    const sendResponsePromise = new Promise<any>((resolve) => {
      resolveSendResponse = resolve;
    });
    const mockSendResponse = jest.fn((response) => {
      resolveSendResponse(response);
    });
    const mockRequest = {
      type: "REQUEST_TRANSLATION",
      text: "Hello",
      pageContent: "This is page content.",
    };
    const mockSender = {};

    it("should return an error if Gemini API key is not set for Gemini engine", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({ translationEngine: "gemini", geminiApiKey: undefined });
      });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Gemini APIキーが設定されていません。",
      });
    });

    it("should return an error if ChatGPT API key is not set for ChatGPT engine", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({ translationEngine: "chatgpt", chatgptApiKey: undefined });
      });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: "ChatGPT APIキーが設定されていません。",
      });
    });

    it("should return an error if Azure OpenAI API settings are incomplete for Azure engine", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({
          translationEngine: "chatgpt_azure",
          chatgptAzureApiKey: undefined,
          chatgptAzureEndpoint: "https://test.azure.openai.com",
          chatgptAzureDeploymentName: "test-deployment",
        });
      });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Azure OpenAI APIの設定が不完全です。",
      });
    });

    it("should translate using Gemini API", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({
          translationEngine: "gemini",
          geminiApiKey: "test-gemini-key",
          systemPrompt: "Test System Prompt",
          includePageContent: true,
        });
      });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledTimes(1);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledWith({
        model: "gemini-2.5-flash",
        contents: [
          { text: `以下は翻訳の参考情報となるテキストの全文です。参考情報自体は翻訳しないでください。\n  <参考情報>\n  ${mockRequest.pageContent}\n  </参考情報>` },
          { text: mockRequest.text },
        ],
        config: {
          systemInstruction: "Test System Prompt",
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translation: "mocked gemini translation",
      });
    });

    it("should translate using Gemini API without page content if includePageContent is false", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({
          translationEngine: "gemini",
          geminiApiKey: "test-gemini-key",
          systemPrompt: "Test System Prompt",
          includePageContent: false,
        });
      });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledTimes(1);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledWith({
        model: "gemini-2.5-flash",
        contents: [
          { text: mockRequest.text },
        ],
        config: {
          systemInstruction: "Test System Prompt",
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translation: "mocked gemini translation",
      });
    });

    it("should translate using Gemini API and restore proper nouns if doNotTranslateProperNouns is true", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({
          translationEngine: "gemini",
          geminiApiKey: "test-gemini-key",
          systemPrompt: "Test System Prompt",
          doNotTranslateProperNouns: true,
        });
      });
      (mockGoogleGenAI.models.generateContent as jest.Mock)
        .mockResolvedValueOnce({ text: "initial gemini translation" })
        .mockResolvedValueOnce({ text: "restored gemini translation" });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledTimes(2);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenNthCalledWith(2, {
        model: "gemini-2.5-flash",
        contents: [
          { text: `原文: ${mockRequest.text}\n翻訳文: initial gemini translation` },
        ],
        config: {
          systemInstruction: PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translation: "restored gemini translation",
      });
    });

    it("should translate using ChatGPT (OpenAI) API", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({
          translationEngine: "chatgpt",
          chatgptApiKey: "test-chatgpt-key",
          systemPrompt: "Test System Prompt",
          includePageContent: true,
        });
      });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        messages: [
          { role: "system", content: "Test System Prompt" },
          { text: `以下は翻訳の参考情報となるテキストの全文です。参考情報自体は翻訳しないでください。\n  <参考情報>\n  ${mockRequest.pageContent}\n  </参考情報>` },
          { role: "user", content: mockRequest.text },
        ],
        model: "gpt-4.1-mini",
      });
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translation: "mocked chatgpt translation",
      });
    });

    it("should translate using ChatGPT (OpenAI) API without page content if includePageContent is false", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({
          translationEngine: "chatgpt",
          chatgptApiKey: "test-chatgpt-key",
          systemPrompt: "Test System Prompt",
          includePageContent: false,
        });
      });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        messages: [
          { role: "system", content: "Test System Prompt" },
          { role: "user", content: mockRequest.text },
        ],
        model: "gpt-4.1-mini",
      });
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translation: "mocked chatgpt translation",
      });
    });

    it("should translate using ChatGPT (Azure) API", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({
          translationEngine: "chatgpt_azure",
          chatgptAzureApiKey: "test-chatgpt-azure-key",
          chatgptAzureEndpoint: "https://test.azure.openai.com",
          chatgptAzureDeploymentName: "test-deployment",
          systemPrompt: "Test System Prompt",
          includePageContent: true,
        });
      });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        messages: [
          { role: "system", content: "Test System Prompt" },
          { role: "user", content: `以下は翻訳の参考情報となるテキストの全文です。参考情報自体は翻訳しないでください。\n  <参考情報>\n  ${mockRequest.pageContent}\n  </参考情報>` },
          { role: "user", content: mockRequest.text },
        ],
        model: "test-deployment",
      });
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translation: "mocked chatgpt translation",
      });
    });

    it("should translate using ChatGPT (Azure) API and restore proper nouns if doNotTranslateProperNouns is true", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({
          translationEngine: "chatgpt_azure",
          chatgptAzureApiKey: "test-chatgpt-azure-key",
          chatgptAzureEndpoint: "https://test.azure.openai.com",
          chatgptAzureDeploymentName: "test-deployment",
          systemPrompt: "Test System Prompt",
          doNotTranslateProperNouns: true,
        });
      });
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValueOnce({ choices: [{ message: { content: "initial azure translation" } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: "restored azure translation" } }] });

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
      expect(mockOpenAI.chat.completions.create).toHaveBeenNthCalledWith(2, {
        messages: [
          { role: "system", content: PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL },
          { role: "user", content: `原文: ${mockRequest.text}\n翻訳文: initial azure translation` },
        ],
        model: "test-deployment",
      });
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translation: "restored azure translation",
      });
    });

    it("should handle API errors", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementationOnce((keys, callback) => {
        callback({
          translationEngine: "gemini",
          geminiApiKey: "test-gemini-key",
        });
      });
      (mockGoogleGenAI.models.generateContent as jest.Mock).mockRejectedValueOnce(new Error("Gemini API Error"));

      await (chrome.runtime.onMessage as any).callListeners(mockRequest, mockSender, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Gemini API Error",
      });
    });
  });
});
