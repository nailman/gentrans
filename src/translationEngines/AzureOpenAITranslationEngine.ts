import OpenAI from 'openai';
import { ITranslationEngine } from './ITranslationEngine';
import { TranslationRequest, TranslationSettings } from '../types';
import { DEFAULT_PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL } from '../constants';
import { formatPageContentForModel } from '../utils/translationUtils'; // 追加

export class AzureOpenAITranslationEngine implements ITranslationEngine {
  async translate(request: TranslationRequest, settings: TranslationSettings): Promise<string> {
    const {
      chatgptAzureApiKey,
      chatgptAzureEndpoint,
      chatgptAzureDeploymentName,
      chatgptAzureApiVersion,
      systemPrompt,
      includePageContent,
      doNotTranslateProperNouns,
    } = settings;

    if (!chatgptAzureApiKey || !chatgptAzureEndpoint || !chatgptAzureDeploymentName) {
      throw new Error("Azure OpenAI APIの設定が不完全です。");
    }

    const openai = new OpenAI({
      apiKey: chatgptAzureApiKey,
      baseURL: `${chatgptAzureEndpoint}openai/deployments/${chatgptAzureDeploymentName}`,
      defaultQuery: { 'api-version': chatgptAzureApiVersion },
      defaultHeaders: { 'api-key': chatgptAzureApiKey },
    });

    // 選択したテキストを翻訳する
    const messages: any[] = [
      { role: "system", content: systemPrompt },
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
    let translation = translationContent;

    // 固有名詞を翻訳しない場合の処理
    if (doNotTranslateProperNouns && translation) {
      const restorePrompt = DEFAULT_PROMPT_RESTORE_PROPER_NOUNS_TO_ORIGINAL;
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
    return translation;
  }
}
