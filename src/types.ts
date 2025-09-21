export interface TranslationSettings {
  geminiApiKey?: string;
  translationEngine: "gemini" | "chatgpt" | "chatgpt_azure";
  chatgptApiKey?: string;
  chatgptAzureApiKey?: string;
  chatgptAzureEndpoint?: string;
  chatgptAzureDeploymentName?: string;
  chatgptAzureApiVersion: string;
  systemPrompt: string;
  doNotTranslateProperNouns: boolean;
  includePageContent: boolean;
}

export interface TranslationRequest {
  type: "REQUEST_TRANSLATION";
  text: string;
  pageContent?: string;
}
