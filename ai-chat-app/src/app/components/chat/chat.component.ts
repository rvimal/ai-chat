import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MessageComponent } from '../message/message.component';
import { SessionService } from '../../services/session/session.service';
import { ChatService } from '../../services/chat/chat.service';
import { Conversation, Message, AIModel } from '../../models';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, MessageComponent],
  template: `
    <div class="main-chat">
      <!-- Model Selection Bar -->
      <div class="model-selector-bar">
        <div class="model-selector-container">
          <label class="form-label me-2 mb-0">AI Model:</label>
          <select 
            class="form-select form-select-sm d-inline-block w-auto"
            [(ngModel)]="selectedProvider"
            (change)="onProviderChange()">
            @for (provider of getProvidersList(); track provider.key) {
              <option [value]="provider.key">{{ provider.value.name }}</option>
            }
          </select>
          
          <select 
            class="form-select form-select-sm d-inline-block w-auto ms-2"
            [(ngModel)]="selectedModel"
            (change)="onModelChange()">
            @for (model of availableModels; track model.id) {
              <option [value]="model.id">{{ model.name }}</option>
            }
          </select>
          
          <div class="form-check form-switch d-inline-block ms-3">
            <input 
              class="form-check-input" 
              type="checkbox" 
              role="switch" 
              id="mcpToolsSwitch"
              [(ngModel)]="useMcpTools"
              (change)="onMcpToolsToggle()">
            <label class="form-check-label" for="mcpToolsSwitch">
              🔧 MCP Tools
            </label>
          </div>
          
          <small class="text-muted ms-3">
            {{ getCurrentModelDescription() }}
          </small>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="messages-container" #messagesContainer>
        @if (activeConversation && activeConversation.messages.length > 0) {
          @for (message of activeConversation.messages; track message.id) {
            <app-message [message]="message" />
          }
        } @else {
          <div class="text-center mt-5">
            <h3 class="text-muted">Start a new conversation</h3>
            <p class="text-muted">Send a message to begin chatting with {{ selectedProvider }} - {{ getCurrentModelName() }}</p>
          </div>
        }
      </div>

      <!-- Input Area -->
      <div class="input-container">
        <div class="d-flex gap-2">
          <textarea
            #messageInput
            class="form-control chat-input"
            placeholder="Type your message..."
            [(ngModel)]="messageText"
            (input)="adjustTextareaHeight()"
            (keydown.enter)="handleKeyDown($any($event))"
            [disabled]="isLoading"
            rows="1"></textarea>
          <button 
            class="btn btn-primary"
            (click)="sendMessage()"
            [disabled]="!messageText.trim() || isLoading">
            @if (isLoading) {
              <span class="spinner-border spinner-border-sm" role="status"></span>
            } @else {
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/>
              </svg>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      height: 100%;
    }
    
    .main-chat {
      width: 100%;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    .model-selector-bar {
      flex-shrink: 0;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--bs-border-color);
      background-color: var(--bs-body-bg);
    }
    
    .model-selector-container {
      display: flex;
      align-items: center;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .messages-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    
    .messages-container > * {
      width: 100%;
      max-width: 800px;
    }
    
    .input-container {
      flex-shrink: 0;
      width: 50%;
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
      border-top: none !important;
      background-color: transparent !important;
    }
    
    .chat-input {
      resize: none;
      overflow-y: hidden;
      min-height: 38px;
      max-height: 200px;
    }
    
    .input-container .d-flex {
      align-items: flex-end;
    }
    
    .input-container .btn {
      height: 38px;
      flex-shrink: 0;
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef<HTMLTextAreaElement>;

  private sessionService = inject(SessionService);
  private chatService = inject(ChatService);
  private destroy$ = new Subject<void>();

  activeConversation: Conversation | null = null;
  messageText = '';
  isLoading = false;
  private shouldScrollToBottom = false;
  
  // AI Model Selection
  selectedProvider: string = '';
  selectedModel: string = '';
  availableModels: AIModel[] = [];
  
  // MCP Tools Toggle
  useMcpTools: boolean = false;

  ngOnInit(): void {
    this.sessionService.activeConversation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conversation => {
        this.activeConversation = conversation;
        this.shouldScrollToBottom = true;
      });
    
    // Initialize model selection
    this.selectedProvider = this.chatService.getCurrentProvider();
    this.selectedModel = this.chatService.getCurrentModel();
    this.loadAvailableModels();
    
    // Load MCP tools preference
    this.useMcpTools = localStorage.getItem('use_mcp_tools') === 'true';
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    if (!this.messageText.trim() || this.isLoading) return;

    // Create or get conversation
    if (!this.activeConversation) {
      this.activeConversation = this.sessionService.createConversation();
    }

    const userMessage: Message = {
      id: this.generateId(),
      conversationId: this.activeConversation.id,
      role: 'user',
      content: this.messageText.trim(),
      timestamp: new Date()
    };

    this.sessionService.addMessage(this.activeConversation.id, userMessage);
    const messageToSend = this.messageText;
    this.messageText = '';
    setTimeout(() => this.adjustTextareaHeight(), 0);
    this.isLoading = true;
    this.shouldScrollToBottom = true;

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: this.generateId(),
      conversationId: this.activeConversation.id,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    this.sessionService.addMessage(this.activeConversation.id, assistantMessage);

    // Use real API with streaming support
    this.chatService.streamMessage({
      message: messageToSend,
      conversationId: this.activeConversation.id,
      useMcpTools: this.useMcpTools
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chunk) => {
          console.log('[Chat Component] Received chunk:', chunk);
          if (this.activeConversation) {
            const currentMessage = this.activeConversation.messages.find(
              m => m.id === assistantMessage.id
            );
            const newContent = (currentMessage?.content || '') + chunk;
            console.log('[Chat Component] Updating message with content:', newContent);
            this.sessionService.updateMessage(
              this.activeConversation.id,
              assistantMessage.id,
              newContent
            );
            this.shouldScrollToBottom = true;
          }
        },
        complete: () => {
          if (this.activeConversation) {
            const message = this.activeConversation.messages.find(
              m => m.id === assistantMessage.id
            );
            if (message) {
              message.isStreaming = false;
            }
          }
          this.isLoading = false;
          this.shouldScrollToBottom = true;
        },
        error: (error) => {
          console.error('Error sending message:', error);
          if (this.activeConversation) {
            this.sessionService.updateMessage(
              this.activeConversation.id,
              assistantMessage.id,
              'Sorry, there was an error processing your request.'
            );
          }
          this.isLoading = false;
        }
      });
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = 
        this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  // Model Selection Methods
  getProvidersList(): Array<{ key: string, value: any }> {
    const providers = this.chatService.getProviders();
    return Object.keys(providers).map(key => ({ key, value: providers[key] }));
  }

  loadAvailableModels(): void {
    this.availableModels = this.chatService.getAvailableModels(this.selectedProvider);
  }

  onProviderChange(): void {
    this.chatService.setProvider(this.selectedProvider);
    this.loadAvailableModels();
    this.selectedModel = this.chatService.getCurrentModel();
  }

  onModelChange(): void {
    this.chatService.setModel(this.selectedModel);
  }
  
  onMcpToolsToggle(): void {
    localStorage.setItem('use_mcp_tools', this.useMcpTools.toString());
  }

  getCurrentModelName(): string {
    const model = this.availableModels.find(m => m.id === this.selectedModel);
    return model?.name || this.selectedModel;
  }

  getCurrentModelDescription(): string {
    const model = this.availableModels.find(m => m.id === this.selectedModel);
    return model?.description || '';
  }

  adjustTextareaHeight(): void {
    const textarea = this.messageInput?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
