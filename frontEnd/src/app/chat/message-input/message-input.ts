import { Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-message-input',
  templateUrl: './message-input.html',
  host: { class: 'block px-4 pt-2 pb-4' },
})
export class MessageInput {
  /** Enquanto o tutor responde, o envio fica bloqueado (mas dá para ir digitando). */
  readonly busy = input(false);
  readonly send = output<string>();

  protected readonly draft = signal('');
  protected readonly canSend = computed(() => !!this.draft().trim() && !this.busy());

  protected onKeydown(event: KeyboardEvent): void {
    // Enter envia; Shift+Enter quebra a linha. O isComposing evita enviar
    // no meio de uma composição de acento/IME.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.submit();
    }
  }

  protected submit(): void {
    if (!this.canSend()) return;
    this.send.emit(this.draft().trim());
    this.draft.set('');
  }
}
