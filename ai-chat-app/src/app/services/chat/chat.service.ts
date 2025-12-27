import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { ChatRequest, ChatResponse, Message } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly API_URL = '/api/chat';
  private streamSubject = new Subject<string>();
  public stream$ = this.streamSubject.asObservable();

  constructor(private http: HttpClient) {}

  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.API_URL, request);
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
