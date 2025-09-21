/**
 * 翻訳エンジンの設定を定義するインターフェース。
 */
export interface TranslationSettings {
  /** Gemini APIキー (オプション) */
  geminiApiKey?: string;
  /** 使用する翻訳エンジン */
  translationEngine: "gemini" | "chatgpt" | "chatgpt_azure";
  /** ChatGPT APIキー (オプション) */
  chatgptApiKey?: string;
  /** ChatGPT Azure APIキー (オプション) */
  chatgptAzureApiKey?: string;
  /** ChatGPT Azure エンドポイント (オプション) */
  chatgptAzureEndpoint?: string;
  /** ChatGPT Azure デプロイメント名 (オプション) */
  chatgptAzureDeploymentName?: string;
  /** ChatGPT Azure APIバージョン */
  chatgptAzureApiVersion: string;
  /** システムプロンプト */
  systemPrompt: string;
  /** 固有名詞を翻訳しないかどうか */
  doNotTranslateProperNouns: boolean;
  /** 翻訳精度向上のため、ページ全体のコンテンツを参考情報として含めるかどうか */
  includePageContent: boolean;
}

/**
 * 翻訳リクエストを定義するインターフェース。
 */
export interface TranslationRequest {
  /** リクエストのタイプ */
  type: "REQUEST_TRANSLATION";
  /** 翻訳対象のテキスト */
  text: string;
  /** ページコンテンツ (オプション) */
  pageContent?: string;
}
