export class GoogleGenAI {
  constructor(options: { apiKey: string }) {}
  models = {
    generateContent: jest.fn(() => Promise.resolve({ text: "mocked translation" })),
  };
}
