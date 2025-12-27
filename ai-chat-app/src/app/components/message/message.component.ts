import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models';

@Component({
  selector: 'app-message',
  imports: [CommonModule],
  template: `
    <div class="message" [class.message-user]="message.role === 'user'" 
         [class.message-assistant]="message.role === 'assistant'">
      <div class="message-avatar">
        {{ message.role === 'user' ? 'U' : 'AI' }}
      </div>
      <div class="message-content">
        <div [innerHTML]="formatContent(message.content)"></div>
        @if (message.isStreaming) {
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        }
      </div>
    </div>
  `,
  styles: []
})
export class MessageComponent {
  @Input({ required: true }) message!: Message;

  formatContent(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\n/g, '<br>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }
}
