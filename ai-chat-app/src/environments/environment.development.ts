export const environment = {
  production: false,
  // AI Provider Configuration
  aiProviders: {
    ollama: {
      name: 'Ollama',
      apiUrl: 'http://localhost:11434/api/chat',
      models: [
        { id: 'llama3.2:1b', name: 'Llama 3.2 1B', description: 'Fast and lightweight' },
        { id: 'llama3.2:3b', name: 'Llama 3.2 3B', description: 'Balanced performance' },
        { id: 'llama3.1:8b', name: 'Llama 3.1 8B', description: 'High quality responses' },
        { id: 'mistral:7b', name: 'Mistral 7B', description: 'Powerful open model' },
        { id: 'codellama:7b', name: 'Code Llama 7B', description: 'Optimized for coding' }
      ]
    },
    gemini: {
      name: 'Google Gemini',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash',
      requiresApiKey: true,
      models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and efficient' },
        { id: 'gemini-pro', name: 'Gemini Pro', description: 'Advanced capabilities' }
      ]
    }
  },
  // Default provider and model
  defaultProvider: 'ollama',
  defaultModel: 'llama3.2:1b',
  appName: 'AI Chat',
  version: '1.0.0'
};
