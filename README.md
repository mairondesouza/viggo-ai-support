# Viggo AI Support

Base de conhecimento inteligente com IA para o suporte Viggo.

## O que é

Plugin Chrome que permite aos agentes de suporte consultar a base de conhecimento da Viggo diretamente dentro do Movidesk, usando IA para encontrar respostas relevantes em segundos.

## Componentes

| Componente | Descrição |
|-----------|-----------|
| `anythingllm/` | Servidor AnythingLLM (Docker) — motor de IA e base de documentos |
| `chrome-extension/` | Plugin Chrome — painel lateral no Movidesk |
| `docs/` | Documentação e guias de uso |

## Início rápido

```bash
# 1. Subir o servidor de IA
cd anythingllm && docker compose up -d

# 2. Acessar e configurar: http://localhost:3001
# 3. Criar workspaces e subir documentos

# 4. Buildar o plugin
cd ../chrome-extension && bash build.sh

# 5. Carregar no Chrome via chrome://extensions/
```

## Documentação completa

→ [docs/COMO-USAR.md](docs/COMO-USAR.md)

## Stack

- **AnythingLLM** — RAG engine open-source (self-hosted)
- **Chrome Extension MV3** — Manifest V3, zero dependências externas
- **OpenAI GPT-4o-mini** — LLM para respostas (configurável)

## Funcionalidades do plugin

- 🖱️ Seleciona texto no Movidesk → consulta automática
- 📋 Painel lateral com resposta + fontes consultadas
- 📋 Botão copiar com 1 clique
- 📂 Seletor de workspace (suporte, produto, financeiro, geral)
- 🕒 Histórico de consultas da sessão
- ⚙️ Configurações persistidas (URL, API Key, workspace padrão)
- 🟢 Indicador de status (online/offline)
