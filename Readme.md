# Electra — tutor de medicina com IA

Assistente de estudos para estudantes de medicina. O aluno conversa em uma interface web, e um backend em Python consulta um modelo de linguagem (LLM) para explicar conteúdos ou treinar de forma interativa.

Projeto criado para **aprender a desenvolver aplicações com LLM** (Angular + Python) e publicado **de graça** na internet.

> **Aviso:** ferramenta **educacional**. O modelo pode errar. Confira doses, critérios diagnósticos e condutas em fontes oficiais. **Não use para pacientes reais** e não envie dados que identifiquem pessoas (nome, CPF, prontuário).

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Rodando localmente](#rodando-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [API](#api)
- [Deploy gratuito](#deploy-gratuito)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Problemas comuns](#problemas-comuns)
- [Roadmap](#roadmap)

---

## Funcionalidades

**Chat**
- Conversa com um tutor de medicina em português do Brasil.
- Dois modos, alternáveis no cabeçalho:
  - **Explicar:** resposta direta e didática, com dicas de prova.
  - **Praticar:** método socrático (perguntas, dicas graduais e só então a resposta completa).
- Respostas renderizadas em **Markdown** (títulos, listas, tabelas, código) e **fórmulas LaTeX**.
- Indicador de "digitando", rolagem automática e envio com `Enter` (`Shift+Enter` quebra a linha).

**Experiência de uso**
- Tema **claro/escuro**, com a escolha lembrada.
- A **conversa e o modo ficam salvos no navegador** (`localStorage`) e sobrevivem ao recarregar a página.
- Alertas com **SweetAlert2**: aviso educacional na primeira visita, confirmação ao limpar a conversa e mensagens específicas para cada tipo de erro, com "Tentar novamente".
- Banner de **"Acordando o servidor gratuito…"** quando o backend está dormindo (planos gratuitos hibernam por inatividade).
- Interface minimalista e responsiva, com barras de rolagem estilizadas.

---

## Arquitetura

```
┌─────────────────────┐      HTTPS / JSON       ┌──────────────────────┐     HTTPS     ┌───────────┐
│ Angular (Vercel)    │ ──────────────────────▶ │ FastAPI (Render)     │ ────────────▶ │ LLM (API) │
│ chat, Markdown,     │ ◀────────────────────── │ valida, corta o      │ ◀──────────── │ Gemini    │
│ histórico no browser│      POST /api/chat     │ histórico, chama LLM │               └───────────┘
└─────────────────────┘                         └──────────────────────┘
```

Decisões de projeto:

- **O front nunca fala com o LLM.** A chave da API fica só no backend.
- **Backend sem estado (stateless):** não há banco de dados. O front guarda a conversa no navegador e reenvia o histórico a cada mensagem. Isso simplifica o deploy gratuito.
- **O provedor de LLM é trocável.** O backend usa o SDK da OpenAI, que funciona com qualquer API compatível com esse formato (Gemini, Groq, OpenRouter etc.). Trocar de provedor é só mudar variáveis de ambiente.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | Angular (componentes standalone e *signals*), Tailwind CSS v4, SweetAlert2, `marked` (Markdown) |
| Back-end | Python 3.12, FastAPI, Pydantic, Uvicorn |
| LLM | SDK `openai` apontando para uma API compatível (Google Gemini) |
| Hospedagem | Vercel (front) e Render (back), ambos em planos gratuitos |

---

## Estrutura do projeto

```
AgenteVirtual/
├── backEnd/
│   ├── app/
│   │   ├── main.py          # FastAPI: CORS, validação e rotas
│   │   ├── config.py        # variáveis de ambiente e limites
│   │   ├── llm.py           # cliente do LLM (único ponto de troca de provedor)
│   │   ├── prompts.py       # system prompts dos modos Explicar e Praticar
│   │   └── tools/           # (reservado para ferramentas do agente)
│   ├── requirements.txt
│   └── .env.example
└── frontEnd/
    └── src/
        ├── app/
        │   ├── core/
        │   │   ├── chat-api.service.ts   # chamadas HTTP e erros tipados
        │   │   ├── chat.store.ts         # estado do chat (signals) + persistência
        │   │   └── alert.service.ts      # alertas do SweetAlert2
        │   ├── chat/
        │   │   ├── message-list/         # mensagens, estado vazio, "digitando"
        │   │   └── message-input/        # campo de texto
        │   └── shared/markdown.pipe.ts   # Markdown (e fórmulas) → HTML seguro
        ├── environments/                 # URL da API (desenvolvimento e produção)
        ├── styles.css
        └── scrollbar.css
```

---

## Rodando localmente

**Pré-requisitos:** Python 3.12, Node.js (versão LTS recente, exigida pelo Angular) e o Angular CLI (`npm install -g @angular/cli`). Você também precisa de uma chave de API de um provedor de LLM com plano gratuito (por exemplo, o [Google AI Studio](https://aistudio.google.com)).

### 1. Backend

```bash
cd backEnd
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # depois edite o .env e cole sua chave
uvicorn app.main:app --reload
```

O backend sobe em `http://127.0.0.1:8000`. A documentação interativa fica em `http://127.0.0.1:8000/docs`.

### 2. Frontend

```bash
cd frontEnd
npm install
ng serve
```

Abra `http://localhost:4200`. Em desenvolvimento, o front usa `http://127.0.0.1:8000` (definido em `src/environments/environment.development.ts`).

> Acesse sempre por **`localhost:4200`**, e não por `127.0.0.1:4200`: o CORS do backend libera apenas essa origem.

---

## Variáveis de ambiente

### Backend (`backEnd/.env`)

| Variável | Obrigatória | Descrição | Exemplo |
|---|---|---|---|
| `LLM_API_KEY` | Sim | Chave da API do provedor | `AIza...` |
| `LLM_BASE_URL` | Não | Endereço da API compatível com OpenAI | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `LLM_MODEL` | Não | Nome do modelo | (veja a documentação do provedor) |
| `LLM_REASONING_EFFORT` | Não | Esforço de raciocínio: `minimal`, `low`, `medium` ou `high`. Apague se o provedor não aceitar | `low` |
| `ALLOWED_ORIGIN` | Não | Origem do front liberada no CORS | `http://localhost:4200` |
| `MAX_HISTORY` | Não | Nº de mensagens do histórico enviadas ao LLM | `20` |
| `MAX_TOKENS` | Não | Limite de tokens da resposta (inclui o raciocínio do modelo) | `2500` |

> **Nunca** faça commit do `.env`. Ele já está no `.gitignore`.

### Frontend

| Arquivo | Uso |
|---|---|
| `src/environments/environment.development.ts` | `apiUrl` usada no `ng serve` (backend local) |
| `src/environments/environment.ts` | `apiUrl` usada no build de produção (URL do backend no Render, **sem barra no final**) |

---

## API

Prefixo: nenhum. Formato: JSON.

### `GET /health`

Verifica se o backend está no ar (também "acorda" um servidor gratuito hibernando).

```json
{ "status": "ok" }
```

### `POST /api/chat`

Recebe o histórico da conversa e devolve a resposta do tutor.

**Requisição**

```json
{
  "messages": [
    { "role": "user", "content": "Explique a fisiopatologia da insuficiência cardíaca" }
  ],
  "mode": "explicar"
}
```

| Campo | Regras |
|---|---|
| `messages` | Lista com ao menos 1 item. `role` é `user` ou `assistant` |
| `messages[].content` | Mensagem do aluno: até **4.000** caracteres. Respostas do tutor no histórico: até **20.000** |
| `mode` | `explicar` (padrão) ou `praticar` |

O backend usa apenas as **últimas 20 mensagens** do histórico.

**Resposta (200)**

```json
{ "reply": "A insuficiência cardíaca (IC) é uma síndrome clínica..." }
```

**Erros**

| Status | Significado |
|---|---|
| `422` | Corpo inválido (campo faltando, papel inválido, mensagem longa demais) |
| `502` | Falha ao consultar o LLM (chave, modelo ou limite de uso). O motivo real aparece nos logs |

**Exemplo com `curl`**

```bash
curl -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"O que é o clearance de creatinina?"}],"mode":"explicar"}'
```

---

## Deploy gratuito

Ordem sugerida: **backend → front → ajuste do CORS**.

### 1. Repositório no GitHub

Na raiz do projeto:

```bash
git init
git add .
git status        # confira: .env, .venv/, node_modules/ e dist/ NÃO podem aparecer
git commit -m "Primeira versão"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

> **Atenção:** o `ng new` cria um repositório Git **dentro** de `frontEnd/`. Nesse caso, o `git add .` da raiz envia só um ponteiro vazio e o front não sobe. Verifique com `git ls-files -s frontEnd` (se aparecer uma linha `160000`, é o problema) e corrija com:
>
> ```bash
> rm -rf frontEnd/.git
> git rm -rf --cached frontEnd
> git add .
> git commit -m "Adiciona o front-end"
> git push
> ```

### 2. Backend no Render

**New + → Web Service**, conecte o repositório e configure:

| Campo | Valor |
|---|---|
| Root Directory | `backEnd` |
| Language | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free |
| Health Check Path | `/health` |

Em **Environment**, crie as variáveis da [tabela acima](#backend-backendenv) e `PYTHON_VERSION` (mesma versão do seu computador, no formato completo). O `--host 0.0.0.0 --port $PORT` é obrigatório.

### 3. Front-end na Vercel

1. Coloque a URL do Render em `frontEnd/src/environments/environment.ts` (`apiUrl`, sem barra no final) e faça o push.
2. Na Vercel: **Add New → Project**, importe o repositório.
3. Configure **Root Directory = `frontEnd`**. O preset **Angular** deve ser detectado. Se não for, preencha:

| Campo | Valor |
|---|---|
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist/NOME/browser` (veja o *Output location* que o `ng build` mostra) |

4. Ajuste a versão do Node nas configurações do projeto para a mesma versão principal do seu computador.

### 4. Libere o CORS

No Render, altere `ALLOWED_ORIGIN` para o endereço da Vercel, com `https://` e **sem barra no final** (ex.: `https://meu-projeto.vercel.app`). O Render refaz o deploy sozinho. O backend aceita **uma única origem**, então os links de *preview* da Vercel não conseguem usá-lo.

### Como o plano gratuito se comporta

- O backend no Render **hiberna após cerca de 15 minutos sem acessos** e leva de 30 s a 1 min para acordar. O front chama o `/health` ao abrir e mostra o banner de aviso. Confira os limites atuais na página de preços do Render.
- Cada `git push` na branch `main` dispara um novo deploy.
- O plano gratuito da Vercel é voltado a projetos pessoais e não comerciais.

---

## Segurança e privacidade

- A **chave do LLM só existe no backend**, em variável de ambiente.
- A resposta do modelo **não é confiável** e é sanitizada antes de virar HTML (proteção contra XSS e *prompt injection*).
- O CORS é restrito a uma origem, e o backend valida o formato e o tamanho de tudo que recebe.
- **A conversa fica salva no `localStorage` do navegador.** Em computadores compartilhados, use a lixeira para apagá-la.
- As mensagens são **enviadas ao provedor de LLM** para gerar as respostas. Em planos gratuitos, alguns provedores podem usar os dados para treinamento, então não envie informações sensíveis.
- **Ainda não há rate limit:** o endpoint é público e a cota gratuita do LLM é compartilhada por quem tiver o link. Veja o [roadmap](#roadmap).

---

## Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| `API online? false` / banner vermelho "Não consegui conectar" | Backend fora do ar, `apiUrl` errado ou Render ainda acordando |
| `ERR_BLOCKED_BY_CLIENT` no console | Um **bloqueador de anúncios/privacidade** (uBlock, AdGuard, Brave Shields) barrou a requisição. Teste em janela anônima ou desative a extensão no site |
| Erro de CORS no console | `ALLOWED_ORIGIN` diferente da URL real do front (barra final, `http` em vez de `https`) ou acesso por `127.0.0.1:4200` |
| `502` ao conversar | Chave, modelo ou limite de uso do LLM. Veja os logs do backend |
| `422` ao conversar | Mensagem acima de 4.000 caracteres ou formato inválido |
| `NG0908: requires Zone.js` | O projeto é *zoneless*: não use `provideZoneChangeDetection` no `app.config.ts` |
| Resposta cortada ou com "rascunho" do modelo | Modelos que "pensam" gastam `MAX_TOKENS` raciocinando: aumente o limite ou reduza `LLM_REASONING_EFFORT` |
| Vercel não detecta o Angular | Root Directory diferente de `frontEnd`, ou o front não foi enviado ao GitHub (veja o aviso do [deploy](#1-repositório-no-github)) |
| Build falha por *budget* | Aumente `maximumError` em `budgets` no `angular.json` |

---

## Roadmap

- [ ] **Rate limit por IP** no backend (`slowapi`), protegendo a cota gratuita. O front já trata o erro `429`.
- [ ] **Streaming (SSE):** a resposta aparecendo palavra por palavra.
- [ ] **Ferramentas do agente:** calculadora clínica em código (Cockcroft-Gault, IMC, escores) e gerador de questões em formato estruturado, exibido como card de quiz.
- [ ] Testes automatizados (backend e front).
- [ ] Flashcards com repetição espaçada e simulados.
- [ ] Chat com o material do aluno (upload de PDF com RAG).

---

## Licença

Projeto de estudo. Defina a licença de sua preferência antes de tornar o repositório público.