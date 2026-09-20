import { Injectable, effect, inject, signal } from '@angular/core';

import { ChatApiService, ChatError, ChatMessage, Mode } from './chat-api.service';

// Sobe o "v1" se um dia o formato salvo mudar: dados antigos são ignorados.
const STORAGE_KEY = 'electra-chat-v1';
const MAX_STORED_MESSAGES = 100;

interface SavedChat {
  mode: Mode;
  messages: ChatMessage[];
}

function isChatMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== 'object') return false;
  const { role, content } = m as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string';
}

/** Lê a conversa salva. Qualquer dado inválido ou corrompido é descartado (devolve null). */
function loadSaved(): SavedChat | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;

    const { mode, messages } = data as Record<string, unknown>;
    if (mode !== 'explicar' && mode !== 'praticar') return null;
    if (!Array.isArray(messages) || !messages.every(isChatMessage)) return null;

    return { mode, messages };
  } catch {
    return null; // JSON quebrado ou localStorage indisponível
  }
}

function save(messages: ChatMessage[], mode: Mode): void {
  try {
    const data: SavedChat = { mode, messages: messages.slice(-MAX_STORED_MESSAGES) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* armazenamento cheio ou bloqueado: o chat continua funcionando, só não é lembrado */
  }
}

/**
 * Estado do chat (signals). Qualquer componente injeta este serviço
 * e lê/altera a mesma conversa. A conversa e o modo ficam salvos no navegador.
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

  constructor() {
    const saved = loadSaved();
    if (saved) {
      this.messages.set(saved.messages);
      this.mode.set(saved.mode);

      // A página foi fechada/recarregada antes da resposta chegar:
      // a última pergunta ficou sem resposta, e o aviso oferece "Tentar novamente".
      if (saved.messages.at(-1)?.role === 'user') {
        this.error.set(new ChatError('unknown', 'Sua última pergunta ficou sem resposta.'));
      }
    }

    // Salva a cada mudança na conversa ou no modo.
    effect(() => save(this.messages(), this.mode()));
  }

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
