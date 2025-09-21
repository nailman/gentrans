import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

/**
 * モデルに渡すページコンテンツのフォーマットを行うヘルパー関数
 * @param pageContent ページコンテンツの文字列
 * @returns フォーマットされたページコンテンツ
 */
function formatPageContentForModel(pageContent: string): string {
  return `以下は翻訳の参考情報となるテキストの全文です。参考情報自体は翻訳しないでください。
  <参考情報>
  ${pageContent}
  </参考情報>`;
}

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
import { DEFAULT_SYSTEM_PROMPT, PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL } from './constants';
/**
 * 翻訳リクエストを処理する非同期関数
 * @param request content.tsからのリクエストオブジェクト
 * @param sendResponse content.tsへのレスポンスを送信する関数
 */
async function handleTranslationRequest(request: any, sendResponse: (response: any) => void) {
  // ストレージからAPIキーと翻訳エンジンを取得
  const result = await new Promise<{ [key: string]: any }>((resolve) => {
    chrome.storage.local.get([
      "geminiApiKey",
      "translationEngine",
      "chatgptApiKey",
      "chatgptAzureApiKey",
      "chatgptAzureEndpoint",
      "chatgptAzureDeploymentName",
      "chatgptAzureApiVersion",
      "systemPrompt",
      "doNotTranslateProperNouns",
      "includePageContent"
    ], resolve);
  });

  const geminiApiKey = result.geminiApiKey;
  const translationEngine = result.translationEngine || "gemini"; // デフォルトはGemini
  const chatgptApiKey = result.chatgptApiKey;
  const chatgptAzureApiKey = result.chatgptAzureApiKey;
  const chatgptAzureEndpoint = result.chatgptAzureEndpoint;
  const chatgptAzureDeploymentName = result.chatgptAzureDeploymentName;
  const chatgptAzureApiVersion = result.chatgptAzureApiVersion || "2023-07-01-preview";
  const systemPrompt = result.systemPrompt;
  const includePageContent = result.includePageContent || false;
  const doNotTranslateProperNouns = result.doNotTranslateProperNouns || false;
  let finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

  try {
    let translation: string | undefined;

    // Geminiの場合
    if (translationEngine === "gemini") {
      if (!geminiApiKey) {
        sendResponse({ success: false, error: "Gemini APIキーが設定されていません。" });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const contents: any[] = [];
      if (includePageContent && request.pageContent) {
        contents.push({ text: formatPageContentForModel(request.pageContent) });
      }
      contents.push({ text: request.text });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: finalSystemPrompt,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        }
      });
      translation = response.text;

      if (doNotTranslateProperNouns && translation) {
        const restorePrompt = PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL;
        const restoreContents: any[] = [
          { text: `原文: ${request.text}\n翻訳文: ${translation}` },
        ];
        const restoreResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: restoreContents,
          config: {
            systemInstruction: restorePrompt,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          }
        });
        translation = restoreResponse.text;
      }

    }
    // ChatGPTの場合(OpenAI)
    else if (translationEngine === "chatgpt") {
      if (!chatgptApiKey) {
        sendResponse({ success: false, error: "ChatGPT APIキーが設定されていません。" });
        return;
      }
      const openai = new OpenAI({ apiKey: chatgptApiKey });
      const messages: any[] = [
        { role: "system", content: finalSystemPrompt },
      ];
      if (includePageContent && request.pageContent) {
        messages.push({ role: "user", content: formatPageContentForModel(request.pageContent) });
      }
      messages.push({ role: "user", content: request.text });

      const chatCompletion = await openai.chat.completions.create({
        messages: messages,
        model: "gpt-4.1-mini",
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

      const messages: any[] = [
        { role: "system", content: finalSystemPrompt },
      ];
      if (includePageContent && request.pageContent) {
        messages.push({ role: "user", content: formatPageContentForModel(request.pageContent) });
      }
      messages.push({ role: "user", content: request.text });

      const chatCompletion = await openai.chat.completions.create({
        messages: messages,
        model: chatgptAzureDeploymentName,
      });
      let translationContent = chatCompletion.choices[0]?.message?.content;
      if (translationContent === null || translationContent === undefined) {
        throw new Error("APIレスポンスからテキストを取得できませんでした。");
      }
      translation = translationContent;

      if (doNotTranslateProperNouns && translation) {
        const restorePrompt = PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL;
        const restoreMessages: any[] = [
          { role: "system", content: restorePrompt },
          { role: "user", content: `原文: ${request.text}\n翻訳文: ${translation}` },
        ];
        const restoreChatCompletion = await openai.chat.completions.create({
          messages: restoreMessages,
          model: chatgptAzureDeploymentName,
        });
        let restoreTranslationContent = restoreChatCompletion.choices[0]?.message?.content;
        if (restoreTranslationContent === null || restoreTranslationContent === undefined) {
          throw new Error("APIレスポンスからテキストを取得できませんでした。");
        }
        translation = restoreTranslationContent;
      }
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
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "REQUEST_TRANSLATION") {
    handleTranslationRequest(request, sendResponse);
    return true;
  }
});

