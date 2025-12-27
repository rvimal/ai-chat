import { Component, Input, SecurityContext, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Message } from '../../models';
import { marked } from 'marked';
import hljs from 'highlight.js';

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
        <div [innerHTML]="formattedContent"></div>
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
export class MessageComponent implements OnChanges {
  @Input({ required: true }) message!: Message;
  formattedContent: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {
    // Configure marked with highlight.js using renderer hooks
    const renderer = new marked.Renderer();
    
    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(text, { language: lang }).value;
          return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
        } catch (err) {
          console.error('Highlight error:', err);
        }
      }
      const highlighted = hljs.highlightAuto(text).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    };

    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true
    });
  }

  ngOnChanges(): void {
    this.formattedContent = this.formatContent(this.message.content);
  }

  private formatContent(content: string): SafeHtml {
    try {
      const html = marked.parse(content) as string;
      return this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
    } catch (err) {
      console.error('Markdown parsing error:', err);
      return content;
    }
  }
}
