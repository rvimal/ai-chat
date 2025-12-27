import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Conversation, Message } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  public conversations$ = this.conversationsSubject.asObservable();

  private activeConversationSubject = new BehaviorSubject<Conversation | null>(null);
  public activeConversation$ = this.activeConversationSubject.asObservable();

  constructor() {
    this.loadConversations();
  }

  private loadConversations(): void {
    const saved = localStorage.getItem('conversations');
    if (saved) {
      const conversations = JSON.parse(saved, (key, value) => {
        if (key === 'timestamp' || key === 'createdAt' || key === 'updatedAt') {
          return new Date(value);
        }
        return value;
      });
      this.conversationsSubject.next(conversations);
    }
  }

  private saveConversations(): void {
    localStorage.setItem('conversations', JSON.stringify(this.conversationsSubject.value));
  }

  createConversation(title: string = 'New Chat'): Conversation {
    const conversation: Conversation = {
      id: this.generateId(),
      title,
      userId: '1', // Get from auth service
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const conversations = [...this.conversationsSubject.value, conversation];
    this.conversationsSubject.next(conversations);
    this.saveConversations();
    this.setActiveConversation(conversation.id);
    
    return conversation;
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversationsSubject.value.find(c => c.id === id);
  }

  setActiveConversation(id: string): void {
    const conversation = this.getConversation(id);
    this.activeConversationSubject.next(conversation || null);
  }

  addMessage(conversationId: string, message: Message): void {
    const conversations = this.conversationsSubject.value.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          messages: [...conv.messages, message],
          updatedAt: new Date()
        };
      }
      return conv;
    });

    this.conversationsSubject.next(conversations);
    this.saveConversations();

    // Update active conversation if it's the one being modified
    if (this.activeConversationSubject.value?.id === conversationId) {
      const updated = conversations.find(c => c.id === conversationId);
      this.activeConversationSubject.next(updated || null);
    }
  }

  updateMessage(conversationId: string, messageId: string, content: string): void {
    const conversations = this.conversationsSubject.value.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          messages: conv.messages.map(msg =>
            msg.id === messageId ? { ...msg, content, isStreaming: false } : msg
          ),
          updatedAt: new Date()
        };
      }
      return conv;
    });

    this.conversationsSubject.next(conversations);
    this.saveConversations();

    if (this.activeConversationSubject.value?.id === conversationId) {
      const updated = conversations.find(c => c.id === conversationId);
      this.activeConversationSubject.next(updated || null);
    }
  }

  deleteConversation(id: string): void {
    const conversations = this.conversationsSubject.value.filter(c => c.id !== id);
    this.conversationsSubject.next(conversations);
    this.saveConversations();

    if (this.activeConversationSubject.value?.id === id) {
      this.activeConversationSubject.next(null);
    }
  }

  renameConversation(id: string, title: string): void {
    const conversations = this.conversationsSubject.value.map(conv =>
      conv.id === id ? { ...conv, title, updatedAt: new Date() } : conv
    );
    this.conversationsSubject.next(conversations);
    this.saveConversations();

    if (this.activeConversationSubject.value?.id === id) {
      const updated = conversations.find(c => c.id === id);
      this.activeConversationSubject.next(updated || null);
    }
  }

  clearAll(): void {
    this.conversationsSubject.next([]);
    this.activeConversationSubject.next(null);
    localStorage.removeItem('conversations');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
