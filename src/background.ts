import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

// 拡張機能がインストールされたときに実行
chrome.runtime.onInstalled.addListener(() => {
  // コンテキストメニュー（右クリックメニュー）を作成
  chrome.contextMenus.create({
    id: "translateWithGemini", // メニューのID
    title: "Geminiで翻訳", // メニューに表示されるテキスト
    contexts: ["selection"], // テキストを選択しているときのみ表示
  });
});

// コンテキストメニューがクリックされたときに実行
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // クリックされたメニューのIDが "translateWithGemini" であり、
  // 選択されたテキストが存在し、タブのIDがある場合
  if (info.menuItemId === "translateWithGemini" && info.selectionText && tab?.id) {
    // コンテンツスクリプトにダイアログ表示を指示
    chrome.tabs.sendMessage(tab.id, {
      type: "TRANSLATE_TEXT",
      text: info.selectionText,
    });
  }
});

// content.tsからの翻訳リクエストを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "REQUEST_TRANSLATION") {
    // ストレージからAPIキーと翻訳エンジンを取得
    chrome.storage.local.get([
      "geminiApiKey",
      "translationEngine",
      "chatgptApiKey",
      "chatgptAzureApiKey",
      "chatgptAzureEndpoint",
      "chatgptAzureDeploymentName",
      "chatgptAzureApiVersion"
    ], async (result) => {
      const geminiApiKey = result.geminiApiKey;
      const translationEngine = result.translationEngine || "gemini"; // デフォルトはGemini
      const chatgptApiKey = result.chatgptApiKey;
      const chatgptAzureApiKey = result.chatgptAzureApiKey;
      const chatgptAzureEndpoint = result.chatgptAzureEndpoint;
      const chatgptAzureDeploymentName = result.chatgptAzureDeploymentName;
      const chatgptAzureApiVersion = result.chatgptAzureApiVersion || "2023-07-01-preview";

      try {
        let translation: string | undefined;

        // Geminiの場合
        if (translationEngine === "gemini") {
          if (!geminiApiKey) {
            sendResponse({ success: false, error: "Gemini APIキーが設定されていません。" });
            return;
          }
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: request.text,
            config: {
              systemInstruction: "あなたは優秀な翻訳家です。与えられたテキストを日本語に翻訳し、結果をMarkdown形式で出力してください。",
              thinkingConfig: {
                thinkingBudget: 0, // Disables thinking
              },
            }
          });
          translation = response.text;

        } 
        // ChatGPTの場合(OpenAI)
        else if (translationEngine === "chatgpt") {
          if (!chatgptApiKey) {
            sendResponse({ success: false, error: "ChatGPT APIキーが設定されていません。" });
            return;
          }
          const openai = new OpenAI({ apiKey: chatgptApiKey });
          const chatCompletion = await openai.chat.completions.create({
            messages: [
              { role: "system", content: "あなたは優秀な翻訳家です。与えられたテキストを日本語に翻訳し、結果をMarkdown形式で出力してください。" },
              { role: "user", content: request.text },
            ],
            model: "gpt-4.1-mini", // または "gpt-4"
          });
          let translationContent = chatCompletion.choices[0]?.message?.content;
          if (translationContent === null || translationContent === undefined) {
            throw new Error("APIレスポンスからテキストを取得できませんでした。");
          }
          translation = translationContent;
        } 
        // ChatGPTの場合(Azure)
        else if (translationEngine === "chatgpt_azure") {
          if (!chatgptAzureApiKey || !chatgptAzureEndpoint || !chatgptAzureDeploymentName) {
            sendResponse({ success: false, error: "Azure OpenAI APIの設定が不完全です。" });
            return;
          }

          const openai = new OpenAI({
            apiKey: chatgptAzureApiKey,
            baseURL: `${chatgptAzureEndpoint}openai/deployments/${chatgptAzureDeploymentName}`,
            defaultQuery: { 'api-version': chatgptAzureApiVersion },
            defaultHeaders: { 'api-key': chatgptAzureApiKey },
          });

          const chatCompletion = await openai.chat.completions.create({
            messages: [
              { role: "system", content: "あなたは優秀な翻訳家です。与えられたテキストを日本語に翻訳し、結果をMarkdown形式で出力してください。" },
              { role: "user", content: request.text },
            ],
            model: chatgptAzureDeploymentName, // Azureではデプロイ名がモデル名になる
          });
          let translationContent = chatCompletion.choices[0]?.message?.content;
          if (translationContent === null || translationContent === undefined) {
            throw new Error("APIレスポンスからテキストを取得できませんでした。");
          }
          translation = translationContent;
        }

        if (translation) {
          sendResponse({ success: true, translation: translation });
        } else {
          throw new Error("APIレスポンスからテキストを取得できませんでした。");
        }

      } catch (error) {
        console.error(`${translationEngine} APIエラー:`, error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : "不明なエラー" });
      }
    });

    return true; // 非同期レスポンスのためにtrueを返す
  }
});

