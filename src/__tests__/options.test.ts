
import { DEFAULT_SYSTEM_PROMPT } from '../constants';
import fs from 'fs';
import path from 'path';

describe('options.ts', () => {
  beforeEach(() => {
    // JSDOMのセットアップ
    const html = fs.readFileSync(path.resolve(process.cwd(), 'public/options.html'), 'utf8');
    document.body.innerHTML = html;

    // chrome APIのモックをクリア
    (chrome.storage.local.get as jest.Mock).mockClear();
    (chrome.storage.local.set as jest.Mock).mockClear();
    (chrome.storage.local.remove as jest.Mock).mockClear();

    // setTimeoutをモック
    jest.useFakeTimers();

    // モジュールを再インポートして、各テストの独立性を保つ
    jest.resetModules();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('DOMContentLoaded', () => {
    it('ストレージから設定を読み込みフォームに反映すること', () => {
      const settings = {
        geminiApiKey: 'test-gemini-key',
        translationEngine: 'chatgpt',
        chatgptApiKey: 'test-chatgpt-key',
        systemPrompt: 'test-prompt',
        doNotTranslateProperNouns: true,
        doNotTranslateProperNounsPrompt: 'test-doNotTranslateProperNounsPrompt',
        includePageContent: true,
      };
      (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
        callback(settings);
      });

      // options.tsを読み込む
      require('../options');

      // DOMContentLoadedイベントを発火
      document.dispatchEvent(new Event('DOMContentLoaded'));

      expect(chrome.storage.local.get).toHaveBeenCalled();
      expect((document.getElementById('api-key') as HTMLInputElement).value).toBe(settings.geminiApiKey);
      expect((document.getElementById('engine-chatgpt') as HTMLInputElement).checked).toBe(true);
      expect((document.getElementById('chatgpt-api-key') as HTMLInputElement).value).toBe(settings.chatgptApiKey);
      expect((document.getElementById('system-prompt') as HTMLTextAreaElement).value).toBe(settings.systemPrompt);
      expect((document.getElementById('do-not-translate-proper-nouns') as HTMLInputElement).checked).toBe(true);
      expect((document.getElementById('do-not-translate-proper-nouns-prompt') as HTMLTextAreaElement).value).toBe(settings.doNotTranslateProperNounsPrompt);
      expect((document.getElementById('include-page-content') as HTMLInputElement).checked).toBe(true);
    });

    it('ストレージにシステムプロンプトがない場合、デフォルト値を設定すること', () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
        callback({});
      });

      require('../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      expect((document.getElementById('system-prompt') as HTMLTextAreaElement).value).toBe(DEFAULT_SYSTEM_PROMPT);
    });
  });

  describe('UIインタラクション', () => {
    it('ChatGPTラジオボタンを選択すると、ChatGPTのAPIキー入力欄が表示されること', () => {
      require('../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const engineChatGPTRadio = document.getElementById('engine-chatgpt') as HTMLInputElement;
      engineChatGPTRadio.checked = true;
      engineChatGPTRadio.dispatchEvent(new Event('change'));

      expect((document.getElementById('chatgpt-api-key-group') as HTMLDivElement).style.display).toBe('block');
      expect((document.getElementById('chatgpt-azure-api-key-group') as HTMLDivElement).style.display).toBe('none');
    });

    it('ChatGPT (Azure)ラジオボタンを選択すると、Azure関連の入力欄が表示されること', () => {
      require('../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const engineChatGPTRadioAzure = document.getElementById('engine-chatgpt-azure') as HTMLInputElement;
      engineChatGPTRadioAzure.checked = true;
      engineChatGPTRadioAzure.dispatchEvent(new Event('change'));

      expect((document.getElementById('chatgpt-api-key-group') as HTMLDivElement).style.display).toBe('none');
      expect((document.getElementById('chatgpt-azure-api-key-group') as HTMLDivElement).style.display).toBe('block');
      expect((document.getElementById('chatgpt-azure-endpoint-group') as HTMLDivElement).style.display).toBe('block');
      expect((document.getElementById('chatgpt-azure-deployment-name-group') as HTMLDivElement).style.display).toBe('block');
      expect((document.getElementById('chatgpt-azure-api-version-group') as HTMLDivElement).style.display).toBe('block');
    });
  });

  describe('保存処理', () => {
    it('保存ボタンクリックで設定がchrome.storage.localに保存されること', () => {
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, callback) => {
        callback();
      });

      require('../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      // フォームの値を設定
      (document.getElementById('api-key') as HTMLInputElement).value = 'new-gemini-key';
      (document.getElementById('engine-chatgpt') as HTMLInputElement).checked = true;
      (document.getElementById('chatgpt-api-key') as HTMLInputElement).value = 'new-chatgpt-key';
      (document.getElementById('system-prompt') as HTMLTextAreaElement).value = 'new-system-prompt';
      (document.getElementById('do-not-translate-proper-nouns') as HTMLInputElement).checked = true;
      (document.getElementById('do-not-translate-proper-nouns-prompt') as HTMLTextAreaElement).value = 'new-do-not-translate-proper-nouns-prompt';
      (document.getElementById('include-page-content') as HTMLInputElement).checked = false;


      // 保存ボタンをクリック
      const saveButton = document.getElementById('save') as HTMLButtonElement;
      saveButton.click();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        {
          geminiApiKey: 'new-gemini-key',
          translationEngine: 'chatgpt',
          chatgptApiKey: 'new-chatgpt-key',
          systemPrompt: 'new-system-prompt',
          doNotTranslateProperNouns: true,
          doNotTranslateProperNounsPrompt: 'new-do-not-translate-proper-nouns-prompt',
          includePageContent: false,
        },
        expect.any(Function)
      );

      // ステータスメッセージのテスト
      const statusDiv = document.getElementById('status') as HTMLDivElement;
      expect(statusDiv.textContent).toBe('設定を保存しました。');
      jest.runAllTimers();
      expect(statusDiv.textContent).toBe('');
    });

    it('システムプロンプトがデフォルト値の場合、ストレージから削除されること', () => {
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, callback) => {
        callback && callback();
      });
      (chrome.storage.local.remove as jest.Mock).mockImplementation((keys, callback) => {
        callback && callback();
      });

      require('../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      (document.getElementById('system-prompt') as HTMLTextAreaElement).value = DEFAULT_SYSTEM_PROMPT;

      const saveButton = document.getElementById('save') as HTMLButtonElement;
      saveButton.click();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith('systemPrompt');
      // setが呼ばれるが、systemPromptは含まれない
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.not.objectContaining({ systemPrompt: DEFAULT_SYSTEM_PROMPT }),
        expect.any(Function)
      );
    });
  });

  describe('リセット処理', () => {
    it('リセットボタンクリックでシステムプロンプトがデフォルトに戻ること', () => {
      (chrome.storage.local.remove as jest.Mock).mockImplementation((keys, callback) => {
        callback && callback();
      });

      require('../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const systemPromptInput = document.getElementById('system-prompt') as HTMLTextAreaElement;
      systemPromptInput.value = 'カスタムプロンプト';

      const resetButton = document.getElementById('reset-system-prompt') as HTMLButtonElement;
      resetButton.click();

      expect(systemPromptInput.value).toBe(DEFAULT_SYSTEM_PROMPT);
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('systemPrompt', expect.any(Function));

      // ステータスメッセージのテスト
      const statusDiv = document.getElementById('status') as HTMLDivElement;
      expect(statusDiv.textContent).toBe('システムプロンプトをデフォルトに戻しました。');
      jest.runAllTimers();
      expect(statusDiv.textContent).toBe('');
    });
  });
});
