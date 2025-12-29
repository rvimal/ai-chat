export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  function: {
    index?: number;
    name: string;
    arguments: any;
  };
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  modelProvider?: string;
  modelId?: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  mcpServerId?: string;
  modelProvider?: string;
  modelId?: string;
  useMcpTools?: boolean; // Enable MCP tools for this request
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
}

// AI Provider Models
export interface AIModel {
  id: string;
  name: string;
  description: string;
}

export interface AIProvider {
  name: string;
  apiUrl: string;
  requiresApiKey?: boolean;
  apiKey?: string;
  models: AIModel[];
}

// Ollama specific interfaces
export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: ToolCall[];
}

export interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  tools?: OllamaTool[];
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
    tool_calls?: ToolCall[];
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaToolFunction {
  name: string;
  description: string;
  parameters: any;
}

export interface OllamaTool {
  type: 'function';
  function: OllamaToolFunction;
}
