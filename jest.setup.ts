/// <reference types="jest" />
import "jest-chrome";

// chrome APIのモック
// jest-chromeが提供していないAPIや、特定の挙動をさせたい場合にjest.fn()などで上書きする
Object.assign(global, require("jest-chrome"));

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

// 各テストの前にストレージをクリア
beforeEach(() => {
  mockStorage = {}; // ストレージをクリア
  jest.clearAllMocks();
});