/// <reference types="jest" />
import '@testing-library/jest-dom';

// イベントリスナーを管理するためのヘルパーファクトリ
const createMockEventListener = () => {
  const listeners: ((...args: any[]) => any)[] = [];
  return {
    addListener: jest.fn((callback) => {
      listeners.push(callback);
    }),
    removeListener: jest.fn((callback) => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }),
    hasListener: jest.fn((callback) => listeners.includes(callback)),
    // テストコードからリスナーを同期的に呼び出すためのヘルパー
    callListeners: (...args: any[]) => {
      listeners.forEach((listener) => listener(...args));
    },
    // テスト間でリスナーをリセットするためのヘルパー
    clearListeners: () => {
      listeners.length = 0;
    },
  };
};

// jest-chromeの代わりに手動でchrome APIの基本構造をモックする
const chromeMock = {
  runtime: {
    onInstalled: createMockEventListener(),
    onMessage: createMockEventListener(),
    sendMessage: jest.fn(),
  },
  storage: {
    local: {}, // この後で詳細なモックに上書きされる
  },
  tabs: {
    create: jest.fn(),
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  contextMenus: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onClicked: createMockEventListener(),
  },
};

(global as any).chrome = chromeMock;

// chrome.storage.local のモック
let mockStorage: Record<string, any> = {};
Object.defineProperty(global.chrome.storage, "local", {
  value: {
    get: jest.fn((keys: string | string[] | Record<string, any> | null, callback: (items: Record<string, any>) => void) => {
      const result: Record<string, any> = {};
      if (keys === null || keys === undefined) {
        Object.assign(result, mockStorage);
      } else if (Array.isArray(keys)) {
        keys.forEach(key => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        });
      } else if (typeof keys === "string") {
        if (mockStorage[keys] !== undefined) {
          result[keys] = mockStorage[keys];
        }
      } else if (typeof keys === "object") {
        for (const key in keys) {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          } else {
            result[key] = keys[key]; // デフォルト値
          }
        }
      }
      callback(result);
    }),
    set: jest.fn((items: Record<string, any>, callback?: () => void) => {
      Object.assign(mockStorage, items);
      callback && callback();
    }),
    clear: jest.fn((callback?: () => void) => {
      mockStorage = {}; // ストレージをクリア
      callback && callback();
    }),
  },
  writable: true,
});

// 各テストの前にモックとストレージをクリア
beforeEach(() => {
  mockStorage = {};
  jest.clearAllMocks();

  // イベントリスナーをクリア
  chromeMock.runtime.onInstalled.clearListeners();
  chromeMock.runtime.onMessage.clearListeners();
  chromeMock.contextMenus.onClicked.clearListeners();

  // 関数モックの呼び出し履歴をクリア
  chromeMock.runtime.onInstalled.addListener.mockClear();
  chromeMock.runtime.onMessage.addListener.mockClear();
  chromeMock.contextMenus.onClicked.addListener.mockClear();
  chromeMock.runtime.sendMessage.mockClear();
  chromeMock.contextMenus.create.mockClear();
  chromeMock.tabs.create.mockClear();
  chromeMock.tabs.sendMessage.mockClear();
});