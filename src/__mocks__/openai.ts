class OpenAI {
  constructor(options?: { apiKey?: string; baseURL?: string; defaultQuery?: any; defaultHeaders?: any }) {}
  chat = {
    completions: {
      create: jest.fn(() =>
        Promise.resolve({
          choices: [{ message: { content: "mocked chatgpt translation" } }],
        })
      ),
    },
  };
}

export default OpenAI;
