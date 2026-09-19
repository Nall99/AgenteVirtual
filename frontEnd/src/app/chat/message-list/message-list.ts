import { Component, ElementRef, afterRenderEffect, inject, input, output } from '@angular/core';

import { ChatError, ChatMessage } from '../../core/chat-api.service';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'app-message-list',
  imports: [MarkdownComponent],
  templateUrl: './message-list.html',
  // O próprio componente é a área com rolagem.
  host: { class: 'block min-h-0 flex-1 overflow-y-auto' },
})
export class MessageList {
  readonly messages = input.required<ChatMessage[]>();
  readonly loading = input(false);
  readonly error = input<ChatError | null>(null);

  readonly suggestionPicked = output<string>();
  readonly retry = output<void>();

  protected readonly suggestions = [
    'Explique a fisiopatologia da insuficiência cardíaca',
    'Me faça uma questão de residência sobre pneumonia',
    'Diferença entre choque cardiogênico e hipovolêmico',
    'Calcule o clearance de creatinina (Cockcroft-Gault)',
  ];

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Depois de cada renderização em que a lista, o "digitando" ou o erro mudam,
    // rola até o fim.
    afterRenderEffect(() => {
      this.messages();
      this.loading();
      this.error();
      const el = this.host.nativeElement;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }
}
