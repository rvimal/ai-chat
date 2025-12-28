import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MessageComponent } from '../message/message.component';
import { SessionService } from '../../services/session/session.service';
import { ChatService } from '../../services/chat/chat.service';
import { Conversation, Message } from '../../models';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, MessageComponent],
  template: `
    <div class="main-chat">
      <!-- Messages Area -->
      <div class="messages-container" #messagesContainer>
        @if (activeConversation && activeConversation.messages.length > 0) {
          @for (message of activeConversation.messages; track message.id) {
            <app-message [message]="message" />
          }
        } @else {
          <div class="text-center mt-5">
            <h3 class="text-muted">Start a new conversation</h3>
            <p class="text-muted">Send a message to begin chatting</p>
          </div>
        }
      </div>

      <!-- Input Area -->
      <div class="input-container">
        <div class="d-flex gap-2">
          <textarea
            class="form-control chat-input"
            placeholder="Type your message..."
            [(ngModel)]="messageText"
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
    }
    
    .messages-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-bottom: 2rem;
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
      border-top: none !important;
      background-color: transparent !important;
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private sessionService = inject(SessionService);
  private chatService = inject(ChatService);
  private destroy$ = new Subject<void>();

  activeConversation: Conversation | null = null;
  messageText = '';
  isLoading = false;
  private shouldScrollToBottom = false;

  ngOnInit(): void {
    this.sessionService.activeConversation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conversation => {
        this.activeConversation = conversation;
        this.shouldScrollToBottom = true;
      });
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
      conversationId: this.activeConversation.id
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
