import { GoogleGenAI } from '@google/genai';
import { ITranslationEngine } from './ITranslationEngine';
import { TranslationRequest, TranslationSettings } from '../types';
import { PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL } from '../constants';
import { formatPageContentForModel } from '../utils/translationUtils'; // 追加

export class GeminiTranslationEngine implements ITranslationEngine {
  async translate(request: TranslationRequest, settings: TranslationSettings): Promise<string> {
    const { geminiApiKey, systemPrompt, includePageContent, doNotTranslateProperNouns } = settings;
    if (!geminiApiKey) {
      throw new Error("Gemini APIキーが設定されていません。");
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const contents: any[] = [];
    if (includePageContent && request.pageContent) {
      contents.push({ text: formatPageContentForModel(request.pageContent) });
    }
    contents.push({ text: request.text });

    let translation: string | undefined;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
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

    if (!translation) {
      throw new Error("APIレスポンスからテキストを取得できませんでした。");
    }
    return translation;
  }
}
