import { Injectable, inject, signal } from '@angular/core';

import { ChatApiService, ChatError, ChatMessage, Mode } from './chat-api.service';

/**
 * Estado do chat (signals). Qualquer componente injeta este serviço
 * e lê/altera a mesma conversa.
 */
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly api = inject(ChatApiService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(false);
  readonly error = signal<ChatError | null>(null);
  readonly mode = signal<Mode>('explicar');

  // Se o usuário limpar a conversa enquanto uma resposta está a caminho,
  // essa resposta atrasada não deve reaparecer. Cada "geração" invalida a anterior.
  private generation = 0;

  async send(text: string): Promise<void> {
    const content = text.trim();
    if (!content || this.loading()) return;

    this.messages.update((list) => [...list, { role: 'user', content }]);
    await this.request();
  }

  /** Reenvia a última pergunta, que ficou sem resposta por causa de um erro. */
  async retry(): Promise<void> {
    const last = this.messages().at(-1);
    if (last?.role !== 'user' || this.loading()) return;
    await this.request();
  }

  clear(): void {
    this.generation++;
    this.messages.set([]);
    this.error.set(null);
    this.loading.set(false);
  }

  private async request(): Promise<void> {
    const gen = this.generation;
    this.error.set(null);
    this.loading.set(true);

    try {
      const reply = await this.api.sendMessage(this.messages(), this.mode());
      if (gen !== this.generation) return; // conversa limpa no meio do caminho
      this.messages.update((list) => [...list, { role: 'assistant', content: reply }]);
    } catch (err) {
      if (gen !== this.generation) return;
      this.error.set(err instanceof ChatError ? err : new ChatError('unknown', 'Ocorreu um erro inesperado.'));
    } finally {
      if (gen === this.generation) this.loading.set(false);
    }
  }
}
