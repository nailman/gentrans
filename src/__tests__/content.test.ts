// markedライブラリをモック
jest.mock('marked', () => ({
  marked: jest.fn((text) => text),
}));

describe('コンテントスクリプト', () => {
  // モックが設定された後に content.ts を読み込む
  beforeEach(() => {
    // 既存のモジュールキャッシュをクリアして、新しいテストケースごとにcontent.tsを再読み込みする
    jest.resetModules();
    // chrome.runtime.sendMessage のモックにデフォルトの応答を設定
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message, callback) => {
      if (callback) {
        callback({ success: true, translation: 'translated text' });
      }
    });
    // content.tsを動的にインポート
    require('../content');
  });

  // 各テストの後にDOMをクリーンアップ
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ダイアログ表示のテスト
  test('TRANSLATE_TEXTメッセージ受信時に翻訳ダイアログを表示する', () => {
    const textToTranslate = 'Hello, world!';
    
    // onMessageリスナーを呼び出してダイアログを表示
    (chrome.runtime.onMessage as any).callListeners({ type: 'TRANSLATE_TEXT', text: textToTranslate }, {}, () => {});

    // ダイアログがDOMに存在するか確認
    const dialog = document.getElementById('gemini-translate-dialog');
    const dialogBody = document.getElementById('gemini-translate-dialog-body');
    expect(dialog).toBeInTheDocument();
    expect(dialogBody).toBeInTheDocument();

    // 翻訳リクエストが送信されたか確認
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REQUEST_TRANSLATION',
        text: textToTranslate,
      }),
      expect.any(Function)
    );
  });

  // ダイアログ削除のテスト
  test('閉じるボタンクリックで翻訳ダイアログを削除する', () => {
    // まずダイアログを表示
    (chrome.runtime.onMessage as any).callListeners({ type: 'TRANSLATE_TEXT', text: 'test' }, {}, () => {});

    // 閉じるボタンを取得してクリック
    const closeButton = document.querySelector('#gemini-translate-dialog-body div[style*="cursor: pointer"]');
    expect(closeButton).toBeInTheDocument();
    (closeButton as HTMLElement).click();

    // ダイアログがDOMから削除されたか確認
    const dialog = document.getElementById('gemini-translate-dialog');
    const dialogBody = document.getElementById('gemini-translate-dialog-body');
    expect(dialog).not.toBeInTheDocument();
    expect(dialogBody).not.toBeInTheDocument();
  });

  // テキスト選択時のアイコン表示テスト
  test('テキスト選択時に翻訳アイコンを表示する', () => {
    // 選択範囲をシミュレート
    window.getSelection = jest.fn().mockReturnValue({
      toString: () => 'selected text',
    });

    // mouseupイベントを発火
    const mouseUpEvent = new MouseEvent('mouseup');
    document.dispatchEvent(mouseUpEvent);

    // アイコンがDOMに存在するか確認
    const icon = document.getElementById('gemini-translate-icon');
    expect(icon).toBeInTheDocument();
  });

  // アイコンクリック時の動作テスト
  test('アイコンクリックでダイアログを表示しアイコンを削除する', () => {
    // アイコン表示の前提条件
    window.getSelection = jest.fn().mockReturnValue({
      toString: () => 'selected text',
    });
    const mouseUpEvent = new MouseEvent('mouseup');
    document.dispatchEvent(mouseUpEvent);

    const icon = document.getElementById('gemini-translate-icon');
    expect(icon).toBeInTheDocument();

    // アイコンをクリック
    (icon as HTMLElement).click();

    // ダイアログが表示されたか確認
    const dialog = document.getElementById('gemini-translate-dialog-body');
    expect(dialog).toBeInTheDocument();

    // アイコンが削除されたか確認
    expect(icon).not.toBeInTheDocument();
  });

  // アイコン以外のクリックでアイコンが消えるかのテスト
  test('アイコン外のクリックでアイコンを削除する', () => {
    jest.useFakeTimers();

    // アイコン表示の前提条件
    window.getSelection = jest.fn().mockReturnValue({
      toString: () => 'selected text',
    });
    const mouseUpEvent = new MouseEvent('mouseup');
    document.dispatchEvent(mouseUpEvent);

    const icon = document.getElementById('gemini-translate-icon');
    expect(icon).toBeInTheDocument();

    // content.ts内のsetTimeoutを実行
    jest.runAllTimers();

    // クリック用のダミー要素を作成
    const clickTarget = document.createElement('div');
    document.body.appendChild(clickTarget);

    // ドキュメントの別の場所をクリック
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    clickTarget.dispatchEvent(mouseDownEvent);

    // アイコンが削除されたか確認
    expect(icon).not.toBeInTheDocument();

    jest.useRealTimers();
  });
});