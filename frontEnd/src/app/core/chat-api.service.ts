import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TimeoutError, firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../environments/environment';

export type Mode = 'explicar' | 'praticar';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Tipos de falha que a interface sabe tratar (no passo 6 viram alertas do SweetAlert2). */
export type ChatErrorKind =
  | 'server_down' // sem resposta: servidor fora do ar, dormindo ou bloqueado por CORS
  | 'timeout' // demorou demais (ex.: servidor gratuito acordando)
  | 'model_error' // o backend falhou ao falar com o LLM (502)
  | 'rate_limit' // limite de requisições (429)
  | 'invalid' // requisição inválida (422)
  | 'unknown';

export class ChatError extends Error {
  constructor(
    readonly kind: ChatErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

// Um servidor gratuito "dormindo" pode levar ~30 s para acordar, e o LLM também demora.
const CHAT_TIMEOUT_MS = 90_000;
const HEALTH_TIMEOUT_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** Envia o histórico completo (o backend não guarda estado) e devolve a resposta do tutor. */
  async sendMessage(messages: ChatMessage[], mode: Mode): Promise<string> {
    try {
      const res = await firstValueFrom(
        this.http
          .post<{ reply: string }>(`${this.baseUrl}/api/chat`, { messages, mode })
          .pipe(timeout(CHAT_TIMEOUT_MS)),
      );
      return res.reply;
    } catch (err) {
      throw this.toChatError(err);
    }
  }

  /** Verifica se o backend está no ar. Também serve para "acordar" um servidor gratuito. */
  async health(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get(`${this.baseUrl}/health`).pipe(timeout(HEALTH_TIMEOUT_MS)),
      );
      return true;
    } catch {
      return false;
    }
  }

  private toChatError(err: unknown): ChatError {
    if (err instanceof TimeoutError) {
      return new ChatError('timeout', 'O servidor demorou demais para responder.');
    }
    if (err instanceof HttpErrorResponse) {
      switch (err.status) {
        case 0:
          return new ChatError('server_down', 'Não foi possível conectar ao servidor.');
        case 422:
          return new ChatError('invalid', 'A mensagem enviada é inválida.');
        case 429:
          return new ChatError('rate_limit', 'Muitas requisições. Aguarde um pouco.');
        case 502:
          return new ChatError('model_error', 'O tutor não conseguiu responder agora.');
      }
    }
    return new ChatError('unknown', 'Ocorreu um erro inesperado.');
  }
}
