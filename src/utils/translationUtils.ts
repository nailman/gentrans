/**
 * モデルに渡すページコンテンツのフォーマットを行うヘルパー関数
 * @param pageContent ページコンテンツの文字列
 * @returns フォーマットされたページコンテンツ
 */
export function formatPageContentForModel(pageContent: string): string {
  return `以下は翻訳の参考情報となるテキストの全文です。参考情報自体は翻訳しないでください。\n  <参考情報>\n  ${pageContent}\n  </参考情報>`;
}
