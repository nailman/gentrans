import OpenAI from 'openai';
import { ITranslationEngine } from './ITranslationEngine';
import { TranslationRequest, TranslationSettings } from '../types';
import { formatPageContentForModel } from '../utils/translationUtils'; // 追加

export class OpenAITranslationEngine implements ITranslationEngine {
  async translate(request: TranslationRequest, settings: TranslationSettings): Promise<string> {
    const { chatgptApiKey, systemPrompt, includePageContent } = settings;
    if (!chatgptApiKey) {
      throw new Error("ChatGPT APIキーが設定されていません。");
    }
    const openai = new OpenAI({ apiKey: chatgptApiKey });
    const messages: any[] = [
      { role: "system", content: systemPrompt },
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
    return translationContent;
  }
}
