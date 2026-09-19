import { Component, effect, inject, signal } from '@angular/core';

import { MessageInput } from './chat/message-input/message-input';
import { MessageList } from './chat/message-list/message-list';
import { AlertService } from './core/alert.service';
import { ChatApiService, Mode } from './core/chat-api.service';
import { ChatStore } from './core/chat.store';

type ServerStatus = 'checking' | 'waking' | 'online' | 'offline';

@Component({
  selector: 'app-root',
  imports: [MessageList, MessageInput],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly chat = inject(ChatStore);
  private readonly api = inject(ChatApiService);
  private readonly alerts = inject(AlertService);

  protected readonly modes: { value: Mode; label: string }[] = [
    { value: 'explicar', label: 'Explicar' },
    { value: 'praticar', label: 'Praticar' },
  ];

  protected readonly dark = signal(this.initialDark());
  protected readonly server = signal<ServerStatus>('checking');

  constructor() {
    // Aplica o tema no <html> e lembra a escolha do usuário.
    effect(() => {
      const isDark = this.dark();
      document.documentElement.classList.toggle('dark', isDark);
      try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      } catch {
        /* localStorage indisponível: ignora */
      }
    });

    // "Acorda" o backend (servidores gratuitos dormem por inatividade).
    void this.checkServer();

    // Aviso educacional na primeira visita.
    if (!this.alerts.noticeSeen()) void this.alerts.notice(true);
  }

  protected async checkServer(): Promise<void> {
    this.server.set('checking');
    // Se a resposta demora, provavelmente o servidor gratuito está acordando.
    const timer = setTimeout(() => {
      if (this.server() === 'checking') this.server.set('waking');
    }, 2500);

    const ok = await this.api.health();
    clearTimeout(timer);
    this.server.set(ok ? 'online' : 'offline');
  }

  protected async send(text: string): Promise<void> {
    await this.chat.send(text);
    await this.afterRequest();
  }

  protected async retry(): Promise<void> {
    await this.chat.retry();
    await this.afterRequest();
  }

  // Depois de cada tentativa: se deu certo, o servidor está no ar; se falhou, avisa.
  private async afterRequest(): Promise<void> {
    const err = this.chat.error();
    if (!err) {
      this.server.set('online');
      return;
    }
    if ((await this.alerts.chatError(err)) === 'retry') await this.retry();
  }

  protected async confirmClear(): Promise<void> {
    if (await this.alerts.confirmClear()) {
      this.chat.clear();
      this.alerts.toast('Conversa apagada');
    }
  }

  protected showNotice(): void {
    void this.alerts.notice(false);
  }

  private initialDark(): boolean {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
    } catch {
      /* ignora */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  protected toggleTheme(): void {
    this.dark.update((v) => !v);
  }
}
