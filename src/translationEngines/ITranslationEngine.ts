import { TranslationRequest, TranslationSettings } from '../types';

export interface ITranslationEngine {
  translate(request: TranslationRequest, settings: TranslationSettings): Promise<string>;
}
