import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { ChatRequest, ChatResponse, Message } from '../../models';
import { environment } from '../../../environments/environment';
import { McpService } from '../mcp/mcp.service';

interface GeminiContent {
  parts: Array<{ text: string }>;
  role?: string;
}

interface GeminiRequest {
  contents: GeminiContent[];
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
  private apiKey: string = '';

  constructor() {
    // Try to get API key from localStorage or environment
    this.apiKey = localStorage.getItem('gemini_api_key') || environment.apiKey || '';
  }

  setApiKey(key: string): void {
    this.apiKey = key;
    localStorage.setItem('gemini_api_key', key);
  }

  getApiKey(): string {
    return this.apiKey;
  }

  sendMessage(request: ChatRequest): Observable<ChatResponse> {
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
      'x-goog-api-key': this.apiKey
    });

    const url = `${environment.apiUrl}:generateContent`;

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

  // Send message with streaming support using HttpClient
  streamMessage(request: ChatRequest): Observable<string> {
    return new Observable(observer => {
      this.streamMessageWithMcp(request, observer);
    });
  }

  private async streamMessageWithMcp(request: ChatRequest, observer: any): Promise<void> {
    try {
      // Get available MCP tools from active servers
      const tools = await this.getAvailableMcpTools();
      console.log('[Chat Service] Available MCP tools:', tools);
      console.log('[Chat Service] Number of tools:', tools.length);

      const geminiRequest: any = {
        contents: [
          {
            parts: [{ text: request.message }]
          }
        ]
      };

      // Add tools to the request if available
      if (tools.length > 0) {
        const functionDeclarations = tools.map(tool => {
          const declaration = {
            name: tool.name,
            description: tool.description || 'No description available',
            parameters: tool.inputSchema || {
              type: 'object',
              properties: {},
              required: []
            }
          };
          console.log('[Chat Service] Function declaration:', declaration);
          return declaration;
        });

        geminiRequest.tools = [
          {
            functionDeclarations: functionDeclarations
          }
        ];
        
        console.log('[Chat Service] Gemini request with tools:', JSON.stringify(geminiRequest, null, 2));
      } else {
        console.log('[Chat Service] No tools available, sending request without tools');
      }

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
      });

      const url = `${environment.apiUrl}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

      let processedLength = 0;
      let isFunctionCallInProgress = false;

      this.http.post(url, geminiRequest, {
        headers,
        responseType: 'text',
        observe: 'events',
        reportProgress: true
      }).subscribe({
        next: (event: any) => {
          console.log('[Chat Service] Event type:', event.type, 'Full event:', event);
          
          if (event.type === 3) { // HttpEventType.DownloadProgress
            const responseText = event.partialText || '';
            console.log('[Chat Service] Response partialText:', responseText);
            console.log('[Chat Service] Processed length:', processedLength);
            const newText = responseText.substring(processedLength);
            processedLength = responseText.length;
            
            console.log('[Chat Service] New chunk:', newText);
            const lines = newText.split('\n');
            
            lines.forEach((line: string) => {
              if (line.startsWith('data: ')) {
                const data = line.substring(6).trim();
                
                if (!data || data === '[DONE]') {
                  return;
                }
                
                try {
                  const parsed: GeminiResponse = JSON.parse(data);
                  console.log('[Chat Service] Parsed response:', parsed);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  
                  if (text) {
                    console.log('[Chat Service] Emitting text:', text);
                    observer.next(text);
                  }

                  // Check for function calls
                  const functionCall = (parsed.candidates?.[0]?.content as any)?.parts?.[0]?.functionCall;
                  if (functionCall) {
                    console.log('[Chat Service] Function call requested:', functionCall);
                    isFunctionCallInProgress = true;
                    // Handle function call asynchronously
                    this.handleFunctionCall(functionCall, request, observer);
                  }
                } catch (e) {
                  // Skip invalid JSON
                  console.warn('Failed to parse SSE data:', e, 'Line:', line);
                }
              }
            });
          } else if (event.type === 4) { // HttpEventType.Response
            console.log('[Chat Service] Response complete');
            console.log('[Chat Service] Final response body:', event.body);
            console.log('[Chat Service] Function call in progress:', isFunctionCallInProgress);
            
            // Only complete if no function call is in progress
            if (!isFunctionCallInProgress) {
              observer.complete();
            }
          }
        },
        error: (error) => {
          console.error('[Chat Service] HTTP Error:', error);
          observer.error(error);
        }
      });
    } catch (error) {
      console.error('[Chat Service] Error in streamMessageWithMcp:', error);
      observer.error(error);
    }
  }

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

  private async handleFunctionCall(functionCall: any, request: ChatRequest, observer: any): Promise<void> {
    try {
      console.log('[Chat Service] Function call requested:', functionCall);
      
      // Notify user that MCP tool is being requested
      const toolName = functionCall.name;
      const toolArgs = functionCall.args || {};
      const argsPreview = JSON.stringify(toolArgs, null, 2);
      
      observer.next(`\n\n🔧 **MCP Tool Request**\n\nTool: \`${toolName}\`\n\nArguments:\n\`\`\`json\n${argsPreview}\n\`\`\`\n\n`);
      
      // Ask user for approval
      const approved = await this.requestToolApproval(toolName, toolArgs);
      
      if (!approved) {
        observer.next(`❌ Tool execution denied by user.\n\n`);
        console.log('[Chat Service] Tool execution denied by user');
        observer.complete();
        return;
      }
      
      observer.next(`✅ Tool approved. Executing...\n\n`);
      
      // Find the server that has this tool and execute it
      const servers = this.mcpService.getServers();
      const activeServers = servers.filter(s => s.isActive);
      let toolResult: any = null;
      
      for (const server of activeServers) {
        const client = this.mcpService.getClient(server.id);
        if (client) {
          try {
            const result = await client.callTool({
              name: functionCall.name,
              arguments: functionCall.args
            }, undefined, {});
            
            console.log('[Chat Service] Function result:', result);
            toolResult = result;
            observer.next(`\n**✓ Tool Executed**\n\n`);
            break;
          } catch (error) {
            console.error('[Chat Service] Tool execution failed:', error);
            observer.next(`\n❌ **Tool execution failed:** ${error}\n\n`);
            observer.complete();
            return;
          }
        }
      }
      
      if (!toolResult) {
        observer.next(`\n❌ **No MCP server found to execute the tool**\n\n`);
        observer.complete();
        return;
      }
      
      // Send tool result back to Gemini to continue the conversation
      await this.continueWithToolResult(request, functionCall, toolResult, observer);
      
    } catch (error) {
      console.error('[Chat Service] Error handling function call:', error);
      observer.next(`\n❌ **Error:** ${error}\n\n`);
      observer.complete();
    }
  }

  private async continueWithToolResult(
    request: ChatRequest, 
    functionCall: any, 
    toolResult: any, 
    observer: any
  ): Promise<void> {
    try {
      console.log('[Chat Service] Sending tool result back to Gemini...');
      
      // Extract text from MCP response if it's in the standard format
      let responseData = toolResult;
      if (toolResult.content && Array.isArray(toolResult.content)) {
        // MCP standard format: {content: [{type: "text", text: "..."}]}
        const textContent = toolResult.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\\n');
        responseData = textContent || toolResult;
        console.log('[Chat Service] Extracted text from MCP response:', responseData);
      }
      
      // Get tools again for the continuation request
      const tools = await this.getAvailableMcpTools();
      
      // Build the conversation history with the tool call and result
      const geminiRequest: any = {
        contents: [
          {
            role: 'user',
            parts: [{ text: request.message }]
          },
          {
            role: 'model',
            parts: [{
              functionCall: {
                name: functionCall.name,
                args: functionCall.args
              }
            }]
          },
          {
            role: 'function',
            parts: [{
              functionResponse: {
                name: functionCall.name,
                response: {
                  result: responseData
                }
              }
            }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      };
      
      // Add tools to the request
      if (tools.length > 0) {
        geminiRequest.tools = [
          {
            functionDeclarations: tools.map(tool => ({
              name: tool.name,
              description: tool.description || 'No description available',
              parameters: tool.inputSchema || {
                type: 'object',
                properties: {},
                required: []
              }
            }))
          }
        ];
      }
      
      console.log('[Chat Service] Continuation request:', JSON.stringify(geminiRequest, null, 2));
      
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
      });

      const url = `${environment.apiUrl}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

      observer.next(`\n**AI is analyzing the tool result...**\n\n`);

      let processedLength = 0;

      this.http.post(url, geminiRequest, {
        headers,
        responseType: 'text',
        observe: 'events',
        reportProgress: true
      }).subscribe({
        next: (event: any) => {
          console.log('[Chat Service] Continuation event type:', event.type, 'Full event:', event);
          
          if (event.type === 3) { // HttpEventType.DownloadProgress
            const responseText = event.partialText || '';
            console.log('[Chat Service] Continuation partialText:', responseText);
            console.log('[Chat Service] Continuation processed length:', processedLength);
            const newText = responseText.substring(processedLength);
            processedLength = responseText.length;
            
            console.log('[Chat Service] Continuation new chunk:', newText);
            const lines = newText.split('\n');
            
            lines.forEach((line: string) => {
              if (line.startsWith('data: ')) {
                const data = line.substring(6).trim();
                
                if (!data || data === '[DONE]') {
                  return;
                }
                
                try {
                  const parsed: GeminiResponse = JSON.parse(data);
                  console.log('[Chat Service] Continuation parsed response:', parsed);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  
                  if (text) {
                    console.log('[Chat Service] Continuation emitting text:', text);
                    observer.next(text);
                  }
                } catch (e) {
                  console.warn('Failed to parse continuation SSE data:', e, 'Line:', line);
                }
              }
            });
          } else if (event.type === 4) { // HttpEventType.Response
            console.log('[Chat Service] Continuation complete');
            console.log('[Chat Service] Continuation final response body:', event.body);
            
            observer.complete();
          }
        },
        error: (error) => {
          console.error('[Chat Service] Error in continuation:', error);
          observer.error(error);
        }
      });
      
    } catch (error) {
      console.error('[Chat Service] Error continuing with tool result:', error);
      observer.next(`\n❌ **Error continuing conversation:** ${error}\n\n`);
      observer.complete();
    }
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

  // Mock response for development
  mockSendMessage(request: ChatRequest): Observable<ChatResponse> {
    return new Observable(observer => {
      setTimeout(() => {
        const response: ChatResponse = {
          conversationId: request.conversationId || this.generateId(),
          message: {
            id: this.generateId(),
            conversationId: request.conversationId || '',
            role: 'assistant',
            content: this.generateMockResponse(request.message),
            timestamp: new Date()
          }
        };
        observer.next(response);
        observer.complete();
      }, 1000);
    });
  }

  // Simulate streaming response
  mockStreamMessage(request: ChatRequest, onChunk: (chunk: string) => void): void {
    const fullResponse = this.generateMockResponse(request.message);
    const words = fullResponse.split(' ');
    let index = 0;

    const interval = setInterval(() => {
      if (index < words.length) {
        const chunk = (index === 0 ? '' : ' ') + words[index];
        onChunk(chunk);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);
  }

  private generateMockResponse(userMessage: string): string {
    const responses = [
      `I understand you're asking about "${userMessage}". This is a mock response from the LLM service. In production, this would connect to your actual LLM API endpoint.`,
      `Great question! "${userMessage}" - I'm a demonstration chatbot. To connect to a real LLM, configure the API endpoint in the environment settings.`,
      `Regarding "${userMessage}": This chatbot is set up to integrate with your LLM API. Update the API_URL in the chat service to connect to your backend.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
