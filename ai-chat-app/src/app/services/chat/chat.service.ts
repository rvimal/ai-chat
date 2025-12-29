import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ChatRequest, 
  ChatResponse, 
  Message, 
  OllamaRequest, 
  OllamaResponse,
  OllamaTool,
  AIProvider,
  AIModel,
  ToolCall
} from '../../models';
import { environment } from '../../../environments/environment';
import { McpService } from '../mcp/mcp.service';

interface GeminiContent {
  parts: Array<{ text: string }>;
  role?: string;
}

interface GeminiRequest {
  contents: GeminiContent[];
  tools?: any[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason?: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private mcpService = inject(McpService);
  
  // Current AI provider and model configuration
  private currentProvider: string;
  private currentModel: string;
  private apiKeys: Map<string, string> = new Map();

  constructor() {
    // Load saved provider and model preferences
    this.currentProvider = localStorage.getItem('ai_provider') || environment.defaultProvider;
    this.currentModel = localStorage.getItem('ai_model') || environment.defaultModel;
    
    // Load API keys for providers that require them
    const savedKeys = localStorage.getItem('ai_api_keys');
    if (savedKeys) {
      try {
        const keysObj = JSON.parse(savedKeys);
        this.apiKeys = new Map(Object.entries(keysObj));
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
    
    // Load Gemini API key from environment if available
    if (environment.aiProviders.gemini?.apiKey) {
      this.apiKeys.set('gemini', environment.aiProviders.gemini.apiKey);
    }
  }

  // Provider and Model Management
  getProviders(): { [key: string]: AIProvider } {
    return environment.aiProviders;
  }

  getAvailableModels(providerId?: string): AIModel[] {
    const provider = providerId || this.currentProvider;
    const providers = environment.aiProviders as any;
    return providers[provider]?.models || [];
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setProvider(providerId: string): void {
    const providers = environment.aiProviders as any;
    if (providers[providerId]) {
      this.currentProvider = providerId;
      localStorage.setItem('ai_provider', providerId);
      
      // Set default model for this provider
      const provider = providers[providerId];
      if (provider.models.length > 0) {
        this.setModel(provider.models[0].id);
      }
    }
  }

  setModel(modelId: string): void {
    this.currentModel = modelId;
    localStorage.setItem('ai_model', modelId);
  }

  setApiKey(providerId: string, key: string): void {
    this.apiKeys.set(providerId, key);
    const keysObj = Object.fromEntries(this.apiKeys);
    localStorage.setItem('ai_api_keys', JSON.stringify(keysObj));
  }

  getApiKey(providerId: string): string {
    const providers = environment.aiProviders as any;
    return this.apiKeys.get(providerId) || providers[providerId]?.apiKey || '';
  }

  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    const provider = request.modelProvider || this.currentProvider;
    
    if (provider === 'ollama') {
      return this.sendOllamaMessage(request);
    } else if (provider === 'gemini') {
      return this.sendGeminiMessage(request);
    }
    
    throw new Error(`Unsupported provider: ${provider}`);
  }

  // Send message with streaming support
  streamMessage(request: ChatRequest): Observable<string> {
    return new Observable(observer => {
      const provider = request.modelProvider || this.currentProvider;
      
      if (provider === 'ollama') {
        this.streamOllamaMessage(request, observer);
      } else if (provider === 'gemini') {
        this.streamGeminiMessage(request, observer);
      } else {
        observer.error(new Error(`Unsupported provider: ${provider}`));
      }
    });
  }

  // ============= OLLAMA IMPLEMENTATION =============
  
  private sendOllamaMessage(request: ChatRequest): Observable<ChatResponse> {
    const model = request.modelId || this.currentModel;
    const ollamaRequest: OllamaRequest = {
      model: model,
      messages: [
        {
          role: 'user',
          content: request.message
        }
      ],
      stream: false
    };

    const provider = environment.aiProviders.ollama;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return new Observable(observer => {
      this.http.post<OllamaResponse>(provider.apiUrl, ollamaRequest, { headers })
        .subscribe({
          next: (response) => {
            const content = response.message?.content || 'No response';
            
            const chatResponse: ChatResponse = {
              conversationId: request.conversationId || this.generateId(),
              message: {
                id: this.generateId(),
                conversationId: request.conversationId || '',
                role: 'assistant',
                content: content,
                timestamp: new Date(),
                tool_calls: response.message?.tool_calls
              }
            };
            
            observer.next(chatResponse);
            observer.complete();
          },
          error: (error) => {
            observer.error(error);
          }
        });
    });
  }

  private async streamOllamaMessage(request: ChatRequest, observer: any): Promise<void> {
    try {
      const model = request.modelId || this.currentModel;
      const ollamaRequest: OllamaRequest = {
        model: model,
        messages: [
          {
            role: 'user',
            content: request.message
          }
        ],
        stream: true
      };

      // Only add MCP tools if explicitly requested
      if (request.useMcpTools) {
        const tools = await this.getAvailableMcpTools();
        console.log('[Chat Service - Ollama] Available MCP tools:', tools);
        
        if (tools.length > 0) {
          ollamaRequest.tools = tools.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description || 'No description available',
              parameters: tool.inputSchema || {
                type: 'object',
                properties: {},
                required: []
              }
            }
          }));
          console.log('[Chat Service - Ollama] Request with tools:', JSON.stringify(ollamaRequest, null, 2));
        } else {
          console.log('[Chat Service - Ollama] No MCP tools available');
        }
      } else {
        console.log('[Chat Service - Ollama] MCP tools not requested for this message');
      }

      const provider = environment.aiProviders.ollama;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      let toolCallsDetected = false;
      let accumulatedResponse = '';

      this.http.post(provider.apiUrl, ollamaRequest, {
        headers,
        responseType: 'text',
        observe: 'events',
        reportProgress: true
      }).subscribe({
        next: (event: any) => {
          if (event.type === 3) { // HttpEventType.DownloadProgress
            const responseText = event.partialText || '';
            const newText = responseText.substring(accumulatedResponse.length);
            accumulatedResponse = responseText;
            
            const lines = newText.split('\n').filter((line: string) => line.trim());
            
            lines.forEach((line: string) => {
              try {
                const parsed: OllamaResponse = JSON.parse(line);
                
                // Check for content
                if (parsed.message?.content) {
                  observer.next(parsed.message.content);
                }

                // Check for tool calls
                if (parsed.message?.tool_calls && parsed.message.tool_calls.length > 0) {
                  console.log('[Chat Service - Ollama] Tool calls detected:', parsed.message.tool_calls);
                  toolCallsDetected = true;
                  // Handle tool calls
                  this.handleOllamaToolCalls(parsed.message.tool_calls, request, observer);
                }

                // Check if done
                if (parsed.done && !toolCallsDetected) {
                  observer.complete();
                }
              } catch (e) {
                console.warn('[Chat Service - Ollama] Failed to parse response:', e, 'Line:', line);
              }
            });
          } else if (event.type === 4) { // HttpEventType.Response
            if (!toolCallsDetected) {
              observer.complete();
            }
          }
        },
        error: (error) => {
          console.error('[Chat Service - Ollama] HTTP Error:', error);
          observer.error(error);
        }
      });
    } catch (error) {
      console.error('[Chat Service - Ollama] Error in streamOllamaMessage:', error);
      observer.error(error);
    }
  }

  private async handleOllamaToolCalls(toolCalls: ToolCall[], request: ChatRequest, observer: any): Promise<void> {
    try {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;
        
        observer.next(`\n\n🔧 **MCP Tool Request**\n\nTool: \`${toolName}\`\n\nArguments:\n\`\`\`json\n${JSON.stringify(toolArgs, null, 2)}\n\`\`\`\n\n`);
        
        // Ask user for approval
        const approved = await this.requestToolApproval(toolName, toolArgs);
        
        if (!approved) {
          observer.next(`❌ Tool execution denied by user.\n\n`);
          observer.complete();
          return;
        }
        
        observer.next(`✅ Tool approved. Executing...\n\n`);
        
        // Execute the tool
        const servers = this.mcpService.getServers();
        const activeServers = servers.filter(s => s.isActive);
        let toolResult: any = null;
        
        for (const server of activeServers) {
          const client = this.mcpService.getClient(server.id);
          if (client) {
            try {
              const result = await client.callTool({
                name: toolName,
                arguments: toolArgs
              }, undefined, {});
              
              console.log('[Chat Service - Ollama] Tool result:', result);
              toolResult = result;
              observer.next(`\n**✓ Tool Executed**\n\n`);
              break;
            } catch (error) {
              console.error('[Chat Service - Ollama] Tool execution failed:', error);
            }
          }
        }
        
        if (!toolResult) {
          observer.next(`\n❌ **No MCP server found to execute the tool**\n\n`);
          observer.complete();
          return;
        }
        
        // Continue conversation with tool result
        await this.continueOllamaWithToolResult(request, toolCall, toolResult, observer);
      }
    } catch (error) {
      console.error('[Chat Service - Ollama] Error handling tool calls:', error);
      observer.next(`\n❌ **Error:** ${error}\n\n`);
      observer.complete();
    }
  }

  private async continueOllamaWithToolResult(
    request: ChatRequest,
    toolCall: ToolCall,
    toolResult: any,
    observer: any
  ): Promise<void> {
    try {
      observer.next(`\n**AI is analyzing the tool result...**\n\n`);
      
      // Extract text from MCP response
      let responseData = toolResult;
      if (toolResult.content && Array.isArray(toolResult.content)) {
        const textContent = toolResult.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
        responseData = textContent || JSON.stringify(toolResult);
      }
      
      const model = request.modelId || this.currentModel;
      const continueRequest: OllamaRequest = {
        model: model,
        messages: [
          {
            role: 'user',
            content: request.message
          },
          {
            role: 'assistant',
            content: '',
            tool_calls: [toolCall]
          },
          {
            role: 'user',
            content: `Tool result: ${JSON.stringify(responseData)}`
          }
        ],
        stream: true
      };
      
      const provider = environment.aiProviders.ollama;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });
      
      let accumulatedResponse = '';
      
      this.http.post(provider.apiUrl, continueRequest, {
        headers,
        responseType: 'text',
        observe: 'events',
        reportProgress: true
      }).subscribe({
        next: (event: any) => {
          if (event.type === 3) {
            const responseText = event.partialText || '';
            const newText = responseText.substring(accumulatedResponse.length);
            accumulatedResponse = responseText;
            
            const lines = newText.split('\n').filter((line: string) => line.trim());
            
            lines.forEach((line: string) => {
              try {
                const parsed: OllamaResponse = JSON.parse(line);
                
                if (parsed.message?.content) {
                  observer.next(parsed.message.content);
                }
                
                if (parsed.done) {
                  observer.complete();
                }
              } catch (e) {
                console.warn('[Chat Service - Ollama] Failed to parse continuation response:', e);
              }
            });
          } else if (event.type === 4) {
            observer.complete();
          }
        },
        error: (error) => {
          console.error('[Chat Service - Ollama] Error in continuation:', error);
          observer.error(error);
        }
      });
    } catch (error) {
      console.error('[Chat Service - Ollama] Error continuing with tool result:', error);
      observer.next(`\n❌ **Error continuing conversation:** ${error}\n\n`);
      observer.complete();
    }
  }

  // ============= GEMINI IMPLEMENTATION =============
  
  private sendGeminiMessage(request: ChatRequest): Observable<ChatResponse> {
    const apiKey = this.getApiKey('gemini');
    if (!apiKey) {
      return new Observable(observer => {
        observer.error(new Error('Gemini API key is required'));
      });
    }

    const geminiRequest: GeminiRequest = {
      contents: [
        {
          parts: [{ text: request.message }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    });

    const provider = environment.aiProviders.gemini;
    const model = request.modelId || this.currentModel;
    const url = `${provider.apiUrl}:generateContent`;

    return new Observable(observer => {
      this.http.post<GeminiResponse>(url, geminiRequest, { headers })
        .subscribe({
          next: (response) => {
            const content = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
            
            const chatResponse: ChatResponse = {
              conversationId: request.conversationId || this.generateId(),
              message: {
                id: this.generateId(),
                conversationId: request.conversationId || '',
                role: 'assistant',
                content: content,
                timestamp: new Date()
              }
            };
            
            observer.next(chatResponse);
            observer.complete();
          },
          error: (error) => {
            observer.error(error);
          }
        });
    });
  }

  private async streamGeminiMessage(request: ChatRequest, observer: any): Promise<void> {
    try {
      const apiKey = this.getApiKey('gemini');
      if (!apiKey) {
        observer.error(new Error('Gemini API key is required'));
        return;
      }

      const geminiRequest: any = {
        contents: [
          {
            parts: [{ text: request.message }]
          }
        ]
      };

      // Only add MCP tools if explicitly requested
      if (request.useMcpTools) {
        const tools = await this.getAvailableMcpTools();
        console.log('[Chat Service - Gemini] Available MCP tools:', tools);
        
        if (tools.length > 0) {
          const functionDeclarations = tools.map(tool => ({
            name: tool.name,
            description: tool.description || 'No description available',
            parameters: tool.inputSchema || {
              type: 'object',
              properties: {},
              required: []
            }
          }));

          geminiRequest.tools = [
            {
              functionDeclarations: functionDeclarations
            }
          ];
          
          console.log('[Chat Service - Gemini] Request with tools:', JSON.stringify(geminiRequest, null, 2));
        } else {
          console.log('[Chat Service - Gemini] No MCP tools available');
        }
      } else {
        console.log('[Chat Service - Gemini] MCP tools not requested for this message');
      }

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
      });

      const provider = environment.aiProviders.gemini;
      const url = `${provider.apiUrl}:streamGenerateContent?alt=sse&key=${apiKey}`;

      let processedLength = 0;
      let isFunctionCallInProgress = false;

      this.http.post(url, geminiRequest, {
        headers,
        responseType: 'text',
        observe: 'events',
        reportProgress: true
      }).subscribe({
        next: (event: any) => {
          if (event.type === 3) { // HttpEventType.DownloadProgress
            const responseText = event.partialText || '';
            const newText = responseText.substring(processedLength);
            processedLength = responseText.length;
            
            const lines = newText.split('\n');
            
            lines.forEach((line: string) => {
              if (line.startsWith('data: ')) {
                const data = line.substring(6).trim();
                
                if (!data || data === '[DONE]') {
                  return;
                }
                
                try {
                  const parsed: GeminiResponse = JSON.parse(data);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  
                  if (text) {
                    observer.next(text);
                  }

                  // Check for function calls
                  const functionCall = (parsed.candidates?.[0]?.content as any)?.parts?.[0]?.functionCall;
                  if (functionCall) {
                    console.log('[Chat Service - Gemini] Function call requested:', functionCall);
                    isFunctionCallInProgress = true;
                    this.handleGeminiFunctionCall(functionCall, request, observer);
                  }
                } catch (e) {
                  console.warn('[Chat Service - Gemini] Failed to parse SSE data:', e);
                }
              }
            });
          } else if (event.type === 4) { // HttpEventType.Response
            if (!isFunctionCallInProgress) {
              observer.complete();
            }
          }
        },
        error: (error) => {
          console.error('[Chat Service - Gemini] HTTP Error:', error);
          observer.error(error);
        }
      });
    } catch (error) {
      console.error('[Chat Service - Gemini] Error in streamGeminiMessage:', error);
      observer.error(error);
    }
  }

  private async handleGeminiFunctionCall(functionCall: any, request: ChatRequest, observer: any): Promise<void> {
    // Similar to Ollama tool handling but adapted for Gemini's format
    try {
      const toolName = functionCall.name;
      const toolArgs = functionCall.args || {};
      
      observer.next(`\n\n🔧 **MCP Tool Request**\n\nTool: \`${toolName}\`\n\nArguments:\n\`\`\`json\n${JSON.stringify(toolArgs, null, 2)}\n\`\`\`\n\n`);
      
      const approved = await this.requestToolApproval(toolName, toolArgs);
      
      if (!approved) {
        observer.next(`❌ Tool execution denied by user.\n\n`);
        observer.complete();
        return;
      }
      
      observer.next(`✅ Tool approved. Executing...\n\n`);
      
      const servers = this.mcpService.getServers();
      const activeServers = servers.filter(s => s.isActive);
      let toolResult: any = null;
      
      for (const server of activeServers) {
        const client = this.mcpService.getClient(server.id);
        if (client) {
          try {
            const result = await client.callTool({
              name: toolName,
              arguments: toolArgs
            }, undefined, {});
            
            console.log('[Chat Service - Gemini] Tool result:', result);
            toolResult = result;
            observer.next(`\n**✓ Tool Executed**\n\n`);
            break;
          } catch (error) {
            console.error('[Chat Service - Gemini] Tool execution failed:', error);
          }
        }
      }
      
      if (!toolResult) {
        observer.next(`\n❌ **No MCP server found to execute the tool**\n\n`);
        observer.complete();
        return;
      }
      
      // Continue with Gemini's specific format
      // ... (can implement if needed)
      observer.next(`\n**Tool executed successfully**\n\n`);
      observer.complete();
      
    } catch (error) {
      console.error('[Chat Service - Gemini] Error handling function call:', error);
      observer.next(`\n❌ **Error:** ${error}\n\n`);
      observer.complete();
    }
  }

  // ============= SHARED UTILITIES =============
  
  private async getAvailableMcpTools(): Promise<any[]> {
    const servers = this.mcpService.getServers();
    const activeServers = servers.filter(s => s.isActive);
    
    console.log('[Chat Service] Getting tools from active servers:', activeServers.length);
    
    if (activeServers.length === 0) {
      console.log('[Chat Service] No active servers found');
      return [];
    }
    
    const allTools: any[] = [];
    
    for (const server of activeServers) {
      try {
        console.log(`[Chat Service] Fetching tools from ${server.name} (${server.id})...`);
        const tools = await this.mcpService.listTools(server.id);
        console.log(`[Chat Service] Tools from ${server.name}:`, tools);
        
        if (tools && tools.length > 0) {
          allTools.push(...tools);
        }
      } catch (error) {
        console.error(`[Chat Service] Failed to get tools from ${server.name}:`, error);
      }
    }
    
    console.log('[Chat Service] Total tools collected:', allTools.length);
    return allTools;
  }

  private async requestToolApproval(toolName: string, toolArgs: any): Promise<boolean> {
    const argsPreview = Object.keys(toolArgs).length > 0 
      ? `\n\nArguments:\n${JSON.stringify(toolArgs, null, 2)}`
      : '';
    
    const message = `The AI wants to use the MCP tool:\n\n"${toolName}"${argsPreview}\n\nDo you approve this action?`;
    
    return new Promise((resolve) => {
      const approved = confirm(message);
      resolve(approved);
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
