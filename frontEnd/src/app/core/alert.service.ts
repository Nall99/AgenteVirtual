import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

import { ChatError, ChatErrorKind } from './chat-api.service';

/** Troque aqui se mudar o nome do app. */
const APP_NAME = 'Electra';
const NOTICE_KEY = 'notice-accepted';

// --- Estilo: classes do Tailwind aplicadas nos elementos do SweetAlert2. ---
// O "!" no final força a classe a vencer o CSS padrão da biblioteca.
const BTN =
  'm-1 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4';
const PRIMARY = `${BTN} bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/25`;
const DANGER = `${BTN} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/25`;
const SECONDARY = `${BTN} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`;

const modal = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  customClass: {
    container: 'backdrop-blur-sm',
    popup:
      'w-[92vw]! max-w-md! rounded-2xl! border border-zinc-200 bg-white! p-6! text-zinc-900! shadow-xl dark:border-zinc-800 dark:bg-zinc-900! dark:text-zinc-100!',
    title: 'p-0! text-lg! font-semibold!',
    htmlContainer: 'mx-0! mt-2! mb-0! p-0! text-sm! leading-relaxed! text-zinc-600! dark:text-zinc-400!',
    actions: 'mt-6! w-full!',
    confirmButton: PRIMARY,
    cancelButton: SECONDARY,
  },
});

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
  customClass: {
    popup:
      'rounded-xl! border border-zinc-200 bg-white! text-zinc-900! shadow-lg dark:border-zinc-800 dark:bg-zinc-900! dark:text-zinc-100!',
  },
});

interface ErrorCopy {
  icon: 'error' | 'warning';
  title: string;
  text: string;
  canRetry: boolean;
}

const ERRORS: Record<ChatErrorKind, ErrorCopy> = {
  server_down: {
    icon: 'error',
    title: 'Servidor indisponível',
    text: 'Não consegui conectar ao servidor. Se ele estiver em um plano gratuito, pode estar acordando: aguarde cerca de um minuto e tente de novo.',
    canRetry: true,
  },
  timeout: {
    icon: 'warning',
    title: 'Demorou demais',
    text: 'O servidor não respondeu a tempo. Isso costuma acontecer quando ele está acordando. Tente de novo.',
    canRetry: true,
  },
  model_error: {
    icon: 'error',
    title: 'O tutor não respondeu',
    text: 'Houve uma falha ao consultar o modelo de IA. Pode ser uma instabilidade ou o limite de uso gratuito. Tente novamente em instantes.',
    canRetry: true,
  },
  rate_limit: {
    icon: 'warning',
    title: 'Muitas perguntas seguidas',
    text: 'Você atingiu o limite de requisições. Aguarde cerca de um minuto antes de tentar de novo.',
    canRetry: true,
  },
  invalid: {
    icon: 'warning',
    title: 'Mensagem inválida',
    text: 'Não foi possível enviar essa mensagem. Ela pode ser longa demais (o limite é de 4.000 caracteres).',
    canRetry: false,
  },
  unknown: {
    icon: 'error',
    title: 'Algo deu errado',
    text: 'Ocorreu um erro inesperado. Tente novamente.',
    canRetry: true,
  },
};

@Injectable({ providedIn: 'root' })
export class AlertService {
  /** O aviso inicial já foi aceito neste navegador? */
  noticeSeen(): boolean {
    try {
      return localStorage.getItem(NOTICE_KEY) === '1';
    } catch {
      return false;
    }
  }

  /** Aviso educacional. Na primeira visita é obrigatório aceitar; depois, pode ser reaberto pelo botão (i). */
  async notice(firstVisit: boolean): Promise<void> {
    await modal.fire({
      icon: 'info',
      title: 'Antes de começar',
      html: `
        <ul class="list-disc space-y-2 pl-5 text-left">
          <li><strong>${APP_NAME}</strong> é uma ferramenta de estudo e <strong>pode errar</strong>.
              Confira doses, critérios e condutas em fontes oficiais.</li>
          <li><strong>Não use para pacientes reais</strong> e não envie dados que identifiquem
              pessoas (nome, CPF, prontuário).</li>
          <li>Suas mensagens são enviadas a um provedor de IA para gerar as respostas.</li>
          <li>A conversa fica salva neste navegador. Use a lixeira para apagá-la.</li>
        </ul>`,
      confirmButtonText: firstVisit ? 'Entendi, continuar' : 'Fechar',
      allowOutsideClick: !firstVisit,
      allowEscapeKey: !firstVisit,
    });

    try {
      localStorage.setItem(NOTICE_KEY, '1');
    } catch {
      /* sem localStorage: o aviso aparece de novo na próxima visita */
    }
  }

  /** Alerta de erro do chat. Devolve o que o usuário escolheu. */
  async chatError(err: ChatError): Promise<'retry' | 'close'> {
    const copy = ERRORS[err.kind];
    const result = await modal.fire({
      icon: copy.icon,
      title: copy.title,
      text: copy.text,
      showCancelButton: copy.canRetry,
      confirmButtonText: copy.canRetry ? 'Tentar novamente' : 'Entendi',
      cancelButtonText: 'Fechar',
    });
    return copy.canRetry && result.isConfirmed ? 'retry' : 'close';
  }

  async confirmClear(): Promise<boolean> {
    const result = await modal.fire({
      icon: 'warning',
      title: 'Limpar conversa?',
      text: 'Todas as mensagens desta conversa serão apagadas.',
      showCancelButton: true,
      confirmButtonText: 'Limpar',
      cancelButtonText: 'Cancelar',
      focusCancel: true,
      customClass: {
        container: 'backdrop-blur-sm',
        popup:
          'w-[92vw]! max-w-md! rounded-2xl! border border-zinc-200 bg-white! p-6! text-zinc-900! shadow-xl dark:border-zinc-800 dark:bg-zinc-900! dark:text-zinc-100!',
        title: 'p-0! text-lg! font-semibold!',
        htmlContainer: 'mx-0! mt-2! mb-0! p-0! text-sm! leading-relaxed! text-zinc-600! dark:text-zinc-400!',
        actions: 'mt-6! w-full!',
        confirmButton: DANGER,
        cancelButton: SECONDARY,
      },
    });
    return result.isConfirmed;
  }

  /** Aviso pequeno no canto da tela, some sozinho. */
  toast(title: string): void {
    void toast.fire({ title });
  }
}
