# Ollama AI Integration Implementation

This document describes the implementation of Ollama AI integration with support for multiple AI providers and MCP (Model Context Protocol) integration.

## Overview

The application now supports multiple AI providers:
- **Ollama**: Local, open-source AI models (Llama, Mistral, CodeLlama, etc.)
- **Google Gemini**: Cloud-based AI with advanced capabilities

## Key Features

### 1. Multi-Provider Architecture
- Flexible provider system that can be easily extended
- Provider-specific implementations for Ollama and Gemini
- Centralized provider management in ChatService

### 2. Model Selection
- User can select AI provider (Ollama or Gemini)
- Dynamic model list based on selected provider
- Model preferences persisted in localStorage
- UI controls in both Chat and Settings views

### 3. Ollama Integration
- Full support for Ollama's streaming API
- MCP tool integration with Ollama models
- Support for multiple Ollama models:
  - Llama 3.2 (1B, 3B)
  - Llama 3.1 (8B)
  - Mistral 7B
  - Code Llama 7B

### 4. MCP Support with Ollama
- Tools are automatically converted to Ollama's format
- User approval flow for tool execution
- Tool results passed back to the model for continued conversation
- Works with both Ollama and Gemini providers

## Implementation Details

### Environment Configuration

**File**: `src/environments/environment.ts` and `environment.development.ts`

```typescript
export const environment = {
  production: false,
  aiProviders: {
    ollama: {
      name: 'Ollama',
      apiUrl: 'http://localhost:11434/api/chat',
      models: [
        { id: 'llama3.2:1b', name: 'Llama 3.2 1B', description: 'Fast and lightweight' },
        { id: 'llama3.2:3b', name: 'Llama 3.2 3B', description: 'Balanced performance' },
        // ... more models
      ]
    },
    gemini: {
      name: 'Google Gemini',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash',
      requiresApiKey: true,
      models: [...]
    }
  },
  defaultProvider: 'ollama',
  defaultModel: 'llama3.2:1b'
};
```

### Data Models

**File**: `src/app/models/chat.model.ts`

New interfaces added:
- `AIModel`: Represents an AI model with id, name, and description
- `AIProvider`: Represents a provider configuration
- `OllamaRequest`: Request format for Ollama API
- `OllamaResponse`: Response format from Ollama API
- `OllamaTool`: MCP tool in Ollama's format
- `ToolCall`: Represents a tool call from the AI

### Chat Service

**File**: `src/app/services/chat/chat.service.ts`

Key methods:
- `getProviders()`: Get all available AI providers
- `setProvider(providerId)`: Set the active provider
- `setModel(modelId)`: Set the active model
- `streamMessage()`: Main streaming method that routes to provider-specific implementations
- `streamOllamaMessage()`: Ollama-specific streaming implementation
- `handleOllamaToolCalls()`: Process MCP tool calls from Ollama
- `continueOllamaWithToolResult()`: Continue conversation after tool execution

### UI Components

#### Chat Component
**File**: `src/app/components/chat/chat.component.ts`

Features:
- Model selector dropdown at the top of chat
- Provider and model selection
- Real-time model switching
- Display current model information

#### Settings Component
**File**: `src/app/components/settings/settings.component.ts`

Features:
- AI Model Configuration section
- Default provider and model selection
- API key management for providers that require it
- Visual indication of current configuration

## Ollama API Integration

### Request Format

```json
{
  "model": "llama3.2:1b",
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ],
  "stream": true,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Fetch current weather for a city",
        "parameters": {
          "type": "object",
          "properties": {
            "city": { "type": "string" }
          },
          "required": ["city"]
        }
      }
    }
  ]
}
```

### Streaming Response Format

Each line is a separate JSON object:

```json
{"model":"llama3.2:1b","created_at":"2025-12-29T11:29:06.3201659Z","message":{"role":"assistant","content":"How"},"done":false}
{"model":"llama3.2:1b","created_at":"2025-12-29T11:29:06.4205113Z","message":{"role":"assistant","content":" can"},"done":false}
...
{"model":"llama3.2:1b","created_at":"2025-12-29T11:29:07.2052279Z","message":{"role":"assistant","content":""},"done":true,"done_reason":"stop"}
```

### MCP Tool Call Response

```json
{
  "model": "llama3.2:1b",
  "message": {
    "role": "assistant",
    "content": "",
    "tool_calls": [
      {
        "id": "call_ly0d3v5a",
        "function": {
          "name": "get_weather",
          "arguments": {
            "city": "Tokyo"
          }
        }
      }
    ]
  },
  "done": true
}
```

## Usage Instructions

### Prerequisites

1. **Install Ollama**:
   ```bash
   # Windows: Download from https://ollama.com
   # macOS: brew install ollama
   # Linux: curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Pull Models**:
   ```bash
   ollama pull llama3.2:1b
   ollama pull llama3.2:3b
   ollama pull mistral:7b
   ```

3. **Start Ollama**:
   ```bash
   ollama serve
   ```
   This will start the API server at `http://localhost:11434`

### Using the Application

1. **Select Provider**:
   - Go to Settings or use the model selector in Chat
   - Choose "Ollama" from the provider dropdown
   - Select your desired model

2. **Start Chatting**:
   - Type your message in the chat input
   - The AI will respond using the selected Ollama model
   - Streaming responses are displayed in real-time

3. **Using MCP Tools with Ollama**:
   - Configure MCP servers in Settings
   - Connect to an MCP server
   - When chatting, if the AI wants to use a tool:
     - You'll see a tool request notification
     - Approve or deny the tool execution
     - The tool result is sent back to the AI
     - The AI provides a final response based on the tool result

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Chat Component                        │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐     │
│  │  Provider  │  │   Model    │  │  Chat Input  │     │
│  │  Selector  │  │  Selector  │  │              │     │
│  └────────────┘  └────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Chat Service                          │
│  ┌─────────────────┐         ┌─────────────────┐       │
│  │ Provider Router │         │  MCP Service    │       │
│  │                 │         │                 │       │
│  │  - setProvider  │◄───────►│  - listTools    │       │
│  │  - setModel     │         │  - callTool     │       │
│  │  - streamMsg    │         │  - getClient    │       │
│  └─────────────────┘         └─────────────────┘       │
│           │                           │                 │
│   ┌───────┴────────┐         ┌───────┴───────┐        │
│   ▼                ▼         ▼               ▼         │
│  Ollama        Gemini      MCP Tools      MCP Tools    │
│  Stream        Stream      (Ollama)       (Gemini)     │
└─────────────────────────────────────────────────────────┘
           │                │
           ▼                ▼
    ┌──────────┐    ┌──────────────┐
    │  Ollama  │    │    Gemini    │
    │   API    │    │     API      │
    │ :11434   │    │   (Cloud)    │
    └──────────┘    └──────────────┘
```

## Testing

### Test Ollama Integration

1. **Basic Chat**:
   ```
   User: Hello, introduce yourself
   AI: [Response from Ollama model]
   ```

2. **Streaming**:
   - Verify text appears word-by-word
   - Check console for chunk logging

3. **MCP Integration**:
   - Set up a test MCP server
   - Ask the AI to use a tool
   - Verify tool approval dialog appears
   - Check tool execution and response

### Debug Logging

The implementation includes extensive console logging:
- `[Chat Service - Ollama]`: Ollama-specific operations
- `[Chat Service - Gemini]`: Gemini-specific operations
- `[Chat Service]`: General chat service operations
- `[MCP Service]`: MCP-related operations

## Future Enhancements

1. **Add More Providers**:
   - OpenAI GPT models
   - Anthropic Claude
   - Local LLMs (LM Studio, etc.)

2. **Advanced Features**:
   - Conversation history with tools
   - Multi-turn tool interactions
   - Model-specific parameters (temperature, top_p, etc.)
   - Cost tracking for API-based providers

3. **UI Improvements**:
   - Model performance metrics
   - Provider status indicators
   - Model comparison view

## Troubleshooting

### Ollama Connection Issues

**Problem**: "Failed to connect to Ollama"
**Solution**: 
- Ensure Ollama is running: `ollama serve`
- Check if the port is correct (default: 11434)
- Verify firewall settings

### Model Not Available

**Problem**: "Model not found"
**Solution**:
- Pull the model: `ollama pull llama3.2:1b`
- List available models: `ollama list`

### MCP Tools Not Working

**Problem**: Tools not detected
**Solution**:
- Verify MCP server is connected (green "Connected" badge)
- Check browser console for errors
- Ensure model supports tool calling (most newer models do)

## API Reference

### ChatService Methods

```typescript
// Get all providers
getProviders(): { [key: string]: AIProvider }

// Get models for a provider
getAvailableModels(providerId?: string): AIModel[]

// Set active provider
setProvider(providerId: string): void

// Set active model
setModel(modelId: string): void

// Send streaming message
streamMessage(request: ChatRequest): Observable<string>

// Set API key for provider
setApiKey(providerId: string, key: string): void

// Get API key for provider
getApiKey(providerId: string): string
```

### ChatRequest Interface

```typescript
interface ChatRequest {
  message: string;
  conversationId?: string;
  mcpServerId?: string;
  modelProvider?: string;
  modelId?: string;
}
```

## Conclusion

This implementation provides a robust, extensible architecture for supporting multiple AI providers while maintaining full MCP integration. The Ollama integration allows users to run powerful open-source models locally, while the multi-provider architecture makes it easy to add new providers in the future.
