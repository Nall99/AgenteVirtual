import { Pipe, PipeTransform } from '@angular/core';
import { Marked } from 'marked';

// gfm: tabelas, listas de tarefas, ~~riscado~~ etc.
const marked = new Marked({ gfm: true });

/**
 * Converte Markdown em HTML.
 *
 * Segurança: o resultado vai para [innerHTML], e o Angular sanitiza esse HTML
 * (remove <script>, atributos onclick/onerror, links javascript: etc.).
 * Isso importa porque a resposta do LLM não é confiável: ela pode ter sido
 * influenciada por conteúdo malicioso (prompt injection).
 */
@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    let html = marked.parse(value, { async: false }) as string;

    // Links abrem em outra aba, sem acesso à janela do app.
    html = html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');

    // Tabelas largas rolam na horizontal em vez de estourar a tela do celular.
    html = html
      .replace(/<table>/g, '<div class="overflow-x-auto"><table>')
      .replace(/<\/table>/g, '</table></div>');

    return html;
  }
}
