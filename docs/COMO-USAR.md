# Viggo AI Support — Guia Completo de Uso

**Para:** Suporte Viggo  
**Cenário:** Usar a base de conhecimento com IA direto no Movidesk

---

## Visão Geral

O Viggo AI Support é composto de duas partes:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  1. AnythingLLM (servidor AI)                           │
│     → Roda na VM/servidor da Viggo                      │
│     → Onde você sobe os documentos da base              │
│     → Responde as perguntas usando IA                   │
│                                                         │
│  2. Plugin Chrome (Viggo AI Support)                    │
│     → Instalado no Chrome dos agentes de suporte        │
│     → Abre painel lateral no Movidesk                   │
│     → Conecta no AnythingLLM e traz as respostas        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## PARTE 1: Configurar o AnythingLLM (servidor AI)

### Passo 1 — Subir o servidor

Na pasta `anythingllm/`, execute:

```bash
cd viggo-ai-support/anythingllm
docker compose up -d
```

Aguarde ~30 segundos e acesse: **http://localhost:3001**

> Se estiver em um servidor remoto, substitua `localhost` pelo IP ou domínio do servidor.

---

### Passo 2 — Configuração inicial (primeira vez)

1. Acesse `http://localhost:3001`
2. Crie sua conta de administrador (email + senha)
3. Na tela de configuração de LLM, escolha **OpenAI** e informe sua API Key  
   *(ou qualquer outro provider disponível na lista)*
4. Clique em **Salvar**

---

### Passo 3 — Criar os Workspaces

Workspaces são como "departamentos de conhecimento". Crie um para cada área:

1. Clique no ícone **"+"** na barra lateral
2. Crie os seguintes workspaces:
   - `suporte` — para manuais, tutoriais, FAQ de atendimento
   - `produto` — para documentação do produto
   - `financeiro` — para tabelas de preço, contratos (opcional)
   - `geral` — para informações gerais da empresa

> **O nome do workspace deve ser exatamente como criado** (minúsculo, sem espaço) — o plugin usa esse nome para consultar.

---

### Passo 4 — Subir os documentos

Para cada workspace:

1. Clique no workspace (ex: `suporte`)
2. Clique em **"Upload Document"** ou arraste os arquivos
3. Formatos aceitos: **PDF, TXT, DOCX, MD, CSV**
4. Aguarde o processamento (barra de progresso)
5. Após processado, o documento aparece na lista com ✓

**Documentos sugeridos para subir no workspace `suporte`:**
- Manual de uso do produto
- FAQ de perguntas frequentes
- Scripts de atendimento
- Políticas de cancelamento/reembolso
- Procedimentos internos

---

### Passo 5 — Obter a API Key

O plugin precisa de uma API Key para se comunicar com o AnythingLLM:

1. No AnythingLLM, vá em ⚙️ **Configurações** (ícone de engrenagem)
2. Clique em **API Keys**
3. Clique em **"Generate New API Key"**
4. Copie a chave gerada (começa com `ANYTHINGLLM-...`)
5. Guarde essa chave — você vai precisar na configuração do plugin

---

## PARTE 2: Instalar o Plugin Chrome

### Passo 1 — Gerar os arquivos do plugin

Na máquina onde os agentes usam o Chrome, abra o terminal:

```bash
cd viggo-ai-support/chrome-extension
bash build.sh
```

Isso gera a pasta `dist/` com todos os arquivos do plugin.

---

### Passo 2 — Carregar no Chrome

1. Abra o Chrome e acesse: **`chrome://extensions/`**
2. No canto superior direito, ative **"Modo do desenvolvedor"**

   ![Modo do desenvolvedor](prints/modo-desenvolvedor.png)

3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `viggo-ai-support/chrome-extension/dist`
5. O plugin aparece na lista com o nome **"Viggo AI Support"**
6. Clique no ícone de peça de quebra-cabeça 🧩 na barra do Chrome
7. Clique no alfinete ao lado de **Viggo AI Support** para fixá-lo na barra

---

### Passo 3 — Configurar o plugin

1. Clique no ícone do plugin 🤖 na barra do Chrome
2. No popup, clique em **⚙️ Configurações**
3. Preencha:
   - **URL do AnythingLLM:** `http://IP-DO-SERVIDOR:3001`  
     *(se for local: `http://localhost:3001`)*
   - **API Key:** cole a chave gerada no Passo 5 da Parte 1
   - **Workspace padrão:** `suporte`
4. Clique em **🔍 Testar conexão** — deve aparecer "✅ Conexão bem-sucedida!"
5. Clique em **💾 Salvar**

---

## PARTE 3: Usar no dia a dia (agente de suporte)

### Modo 1 — Seleção de texto (mais rápido)

Quando o cliente enviar uma mensagem no Movidesk:

1. **Selecione o texto** da mensagem do cliente com o mouse
2. Clique com o **botão direito**
3. Clique em **"🤖 Consultar base Viggo AI"**
4. O painel lateral abre automaticamente com a resposta

```
Cliente: "Como faço para cancelar minha assinatura?"
         ↑ selecione esse texto
         → botão direito
         → "Consultar base Viggo AI"
         → Resposta aparece no painel →
```

---

### Modo 2 — Painel manual

1. Clique no botão **🤖** (canto inferior direito da tela)
2. O painel lateral abre
3. Digite ou cole a pergunta do cliente no campo de texto
4. Pressione **Ctrl+Enter** ou clique em **"Consultar"**
5. A resposta aparece com as fontes consultadas

---

### Botão de copiar

Após receber a resposta:

1. Clique em **📋 Copiar**
2. Cole diretamente no campo de resposta do Movidesk

---

### Trocar a base de conhecimento

No rodapé do painel, há um seletor de workspace:
- **suporte** → dúvidas de atendimento geral
- **produto** → dúvidas técnicas sobre o produto
- **financeiro** → dúvidas sobre preços e cobranças
- **geral** → informações gerais

---

### Histórico de consultas

Clique no ícone de tabela (📊) no cabeçalho do painel para ver as últimas consultas da sessão. Clique em qualquer item para reutilizar a pergunta.

---

## Dicas de uso

### ✅ Para melhores resultados
- **Seja específico:** "Como reembolsar uma cobrança duplicada?" é melhor que "Como reembolsar?"
- **Use as palavras que o cliente usou:** a IA entende contexto
- **Revise a resposta** antes de enviar ao cliente — a IA pode não ter a informação mais atualizada

### ⚠️ Quando a IA não sabe responder
- O painel mostrará uma resposta genérica ou "não encontrei informações"
- Nesse caso, escalei para um supervisor ou consulte o manual manualmente
- Após resolver, considere **adicionar esse documento ao AnythingLLM** para casos futuros

---

## Adicionar novos documentos (manutenção)

Quando houver novos manuais, FAQs ou scripts:

1. Acesse `http://IP-DO-SERVIDOR:3001`
2. Vá ao workspace correto (ex: `suporte`)
3. Arraste o arquivo ou clique em "Upload Document"
4. O AnythingLLM processa automaticamente
5. O plugin já usa o novo documento nas próximas consultas

> Não é necessário reinstalar o plugin ou reiniciar nada.

---

## Solução de problemas

### Plugin mostra "Offline" no popup
- Verifique se o AnythingLLM está rodando: `docker compose ps` na pasta `anythingllm/`
- Se parado: `docker compose start`

### Resposta "Sem resultados" ou muito genérica
- O workspace pode estar sem documentos relevantes
- Acesse o AnythingLLM e suba mais documentos relacionados

### "Erro de autenticação"
- A API Key pode ter expirado — gere uma nova no AnythingLLM e atualize nas configurações do plugin

### Plugin não aparece no Movidesk
- Verifique se o domínio do Movidesk está na lista de permissões do manifest
- O manifest atual permite: `https://*.movidesk.com/*`

---

## Estrutura de arquivos

```
viggo-ai-support/
├── anythingllm/
│   └── docker-compose.yml       # Servidor AnythingLLM
├── chrome-extension/
│   ├── src/                     # Código-fonte do plugin
│   ├── dist/                    # Plugin compilado (carregar no Chrome)
│   └── build.sh                 # Script de build
└── docs/
    └── COMO-USAR.md             # Este arquivo
```

---

## Suporte técnico

Em caso de dúvidas ou problemas, contate o time de desenvolvimento Viggo.

---

*Viggo AI Support v1.0.0 — Desenvolvido pela equipe Viggo Sistemas*
