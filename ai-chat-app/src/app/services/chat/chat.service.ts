import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { ChatRequest, ChatResponse, Message } from '../../models';
import { environment } from '../../../environments/environment';

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
    const geminiRequest: GeminiRequest = {
      contents: [
        {
          parts: [{ text: request.message }]
        }
      ]
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const url = `${environment.apiUrl}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    return new Observable(observer => {
      this.http.post(url, geminiRequest, {
        headers,
        responseType: 'text',
        observe: 'events',
        reportProgress: true
      }).subscribe({
        next: (event: any) => {
          if (event.type === 3) { // HttpEventType.DownloadProgress
            const responseText = event.partialText || '';
            const lines = responseText.split('\n');
            
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
                } catch (e) {
                  // Skip invalid JSON
                  console.warn('Failed to parse SSE data:', e);
                }
              }
            });
          } else if (event.type === 4) { // HttpEventType.Response
            observer.complete();
          }
        },
        error: (error) => {
          observer.error(error);
        }
      });
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
