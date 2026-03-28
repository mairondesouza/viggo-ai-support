// ============================================================
// Content Script — Viggo AI Support
// Injeta o painel lateral na página do Movidesk
// ============================================================

(function () {
  "use strict";

  // Evita injeção dupla
  if (window.__viggioAiInjected) return;
  window.__viggioAiInjected = true;

  // ----------------------------------------------------------------
  // Estado
  // ----------------------------------------------------------------
  let config = {
    apiUrl: "http://localhost:3001",
    apiKey: "",
    workspace: "suporte",
    autoDetect: false,
  };
  let painelAberto = false;
  let ultimaPergunta = "";
  let observadorMensagens = null;

  // ----------------------------------------------------------------
  // Carrega configurações
  // ----------------------------------------------------------------
  chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (resp) => {
    if (resp?.config) {
      config = resp.config;
      if (config.autoDetect) {
        iniciarObservadorMensagens();
      }
    }
  });

  // ----------------------------------------------------------------
  // Cria elementos do DOM
  // ----------------------------------------------------------------
  function criarPainel() {
    if (document.getElementById("viggo-ai-painel")) return;

    // Container principal
    const painel = document.createElement("div");
    painel.id = "viggo-ai-painel";
    painel.className = "viggo-ai-painel viggo-ai-fechado";

    painel.innerHTML = `
      <div class="viggo-ai-header">
        <div class="viggo-ai-header-titulo">
          <span class="viggo-ai-logo">🤖</span>
          <span>Viggo AI</span>
          <span class="viggo-ai-badge">Base de Conhecimento</span>
        </div>
        <div class="viggo-ai-header-acoes">
          <button id="viggo-ai-btn-historico" title="Histórico" class="viggo-ai-btn-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>
            </svg>
          </button>
          <button id="viggo-ai-btn-fechar" title="Fechar" class="viggo-ai-btn-icon viggo-ai-btn-fechar">✕</button>
        </div>
      </div>

      <div class="viggo-ai-corpo">
        <!-- Campo de busca -->
        <div class="viggo-ai-busca">
          <textarea
            id="viggo-ai-input"
            placeholder="Cole ou digite a dúvida do cliente aqui..."
            rows="3"
          ></textarea>
          <button id="viggo-ai-btn-enviar" class="viggo-ai-btn-primario">
            <span class="viggo-ai-btn-texto">Consultar</span>
            <span class="viggo-ai-btn-loading" style="display:none">
              <svg class="viggo-ai-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Consultando...
            </span>
          </button>
        </div>

        <!-- Área de resposta -->
        <div id="viggo-ai-resultado" class="viggo-ai-resultado" style="display:none">
          <div class="viggo-ai-resposta-header">
            <span class="viggo-ai-resposta-titulo">💬 Resposta sugerida</span>
            <button id="viggo-ai-btn-copiar" class="viggo-ai-btn-copiar" title="Copiar resposta">
              📋 Copiar
            </button>
          </div>
          <div id="viggo-ai-resposta-texto" class="viggo-ai-resposta-texto"></div>

          <!-- Fontes -->
          <div id="viggo-ai-fontes" class="viggo-ai-fontes" style="display:none">
            <div class="viggo-ai-fontes-titulo">📚 Fontes consultadas:</div>
            <ul id="viggo-ai-fontes-lista" class="viggo-ai-fontes-lista"></ul>
          </div>
        </div>

        <!-- Histórico -->
        <div id="viggo-ai-historico" class="viggo-ai-historico" style="display:none">
          <div class="viggo-ai-historico-titulo">🕒 Últimas consultas</div>
          <ul id="viggo-ai-historico-lista" class="viggo-ai-historico-lista"></ul>
          <button id="viggo-ai-btn-limpar-historico" class="viggo-ai-btn-secundario">
            Limpar histórico
          </button>
        </div>

        <!-- Estado vazio -->
        <div id="viggo-ai-vazio" class="viggo-ai-vazio">
          <div class="viggo-ai-vazio-icone">🔍</div>
          <p class="viggo-ai-vazio-texto">
            Selecione o texto da mensagem do cliente e clique com o botão direito,<br>
            ou cole a pergunta acima e clique em <strong>Consultar</strong>.
          </p>
        </div>

        <!-- Erro -->
        <div id="viggo-ai-erro" class="viggo-ai-erro" style="display:none">
          <div class="viggo-ai-erro-icone">⚠️</div>
          <p id="viggo-ai-erro-texto" class="viggo-ai-erro-texto"></p>
          <button id="viggo-ai-btn-tentar-novamente" class="viggo-ai-btn-secundario">
            Tentar novamente
          </button>
        </div>
      </div>

      <!-- Seletor de workspace -->
      <div class="viggo-ai-footer">
        <label class="viggo-ai-workspace-label">Base:</label>
        <select id="viggo-ai-workspace-select" class="viggo-ai-workspace-select">
          <option value="suporte">Suporte</option>
          <option value="produto">Produto</option>
          <option value="financeiro">Financeiro</option>
          <option value="geral">Geral</option>
        </select>
        <a href="#" id="viggo-ai-btn-config" class="viggo-ai-btn-config" title="Configurações">⚙️</a>
      </div>
    `;

    document.body.appendChild(painel);
    configurarEventos(painel);

    // Carrega workspace salvo
    chrome.storage.sync.get({ workspace: "suporte" }, (data) => {
      const sel = document.getElementById("viggo-ai-workspace-select");
      if (sel) sel.value = data.workspace;
    });
  }

  // ----------------------------------------------------------------
  // Botão flutuante (sempre visível)
  // ----------------------------------------------------------------
  function criarBotaoFlutuante() {
    if (document.getElementById("viggo-ai-fab")) return;

    const fab = document.createElement("button");
    fab.id = "viggo-ai-fab";
    fab.className = "viggo-ai-fab";
    fab.title = "Viggo AI Support";
    fab.innerHTML = `
      <span class="viggo-ai-fab-icone">🤖</span>
      <span class="viggo-ai-fab-badge" id="viggo-ai-fab-badge" style="display:none">!</span>
    `;

    fab.addEventListener("click", () => togglePainel());
    document.body.appendChild(fab);
  }

  // ----------------------------------------------------------------
  // Eventos do painel
  // ----------------------------------------------------------------
  function configurarEventos(painel) {
    // Fechar
    document.getElementById("viggo-ai-btn-fechar")?.addEventListener("click", () => {
      fecharPainel();
    });

    // Consultar
    document.getElementById("viggo-ai-btn-enviar")?.addEventListener("click", () => {
      const input = document.getElementById("viggo-ai-input");
      const pergunta = input?.value?.trim();
      if (pergunta) consultar(pergunta);
    });

    // Enter no textarea (Ctrl+Enter para enviar)
    document.getElementById("viggo-ai-input")?.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        const pergunta = e.target.value.trim();
        if (pergunta) consultar(pergunta);
      }
    });

    // Copiar resposta
    document.getElementById("viggo-ai-btn-copiar")?.addEventListener("click", () => {
      const texto = document.getElementById("viggo-ai-resposta-texto")?.innerText;
      if (texto) {
        navigator.clipboard.writeText(texto).then(() => {
          const btn = document.getElementById("viggo-ai-btn-copiar");
          btn.textContent = "✅ Copiado!";
          setTimeout(() => (btn.textContent = "📋 Copiar"), 2000);
        });
      }
    });

    // Histórico
    document.getElementById("viggo-ai-btn-historico")?.addEventListener("click", () => {
      toggleHistorico();
    });

    // Limpar histórico
    document.getElementById("viggo-ai-btn-limpar-historico")?.addEventListener("click", () => {
      chrome.storage.local.set({ history: [] }, () => {
        renderizarHistorico([]);
      });
    });

    // Tentar novamente
    document.getElementById("viggo-ai-btn-tentar-novamente")?.addEventListener("click", () => {
      if (ultimaPergunta) consultar(ultimaPergunta);
    });

    // Salvar workspace selecionado
    document.getElementById("viggo-ai-workspace-select")?.addEventListener("change", (e) => {
      chrome.storage.sync.set({ workspace: e.target.value });
    });

    // Config
    document.getElementById("viggo-ai-btn-config")?.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage?.() || window.open(chrome.runtime.getURL("options.html"));
    });
  }

  // ----------------------------------------------------------------
  // Lógica de consulta à API do AnythingLLM
  // ----------------------------------------------------------------
  async function consultar(pergunta) {
    ultimaPergunta = pergunta;

    // Atualiza UI para estado "carregando"
    mostrarCarregando(true);
    esconderTudo();

    // Pega workspace do select
    const workspace =
      document.getElementById("viggo-ai-workspace-select")?.value ||
      config.workspace;

    try {
      const resp = await fetch(
        `${config.apiUrl}/api/v1/workspace/${workspace}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            message: pergunta,
            mode: "query",
          }),
        }
      );

      if (!resp.ok) {
        const erro = await resp.json().catch(() => ({}));
        throw new Error(
          erro?.message || `Erro ${resp.status}: ${resp.statusText}`
        );
      }

      const data = await resp.json();
      const resposta = data.textResponse || data.response || "Sem resposta.";
      const fontes = data.sources || [];

      mostrarResposta(resposta, fontes);

      // Salva no histórico
      chrome.runtime.sendMessage({
        type: "SAVE_HISTORY",
        item: {
          pergunta,
          resposta,
          workspace,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      mostrarErro(err.message || "Não foi possível conectar ao Viggo AI.");
    } finally {
      mostrarCarregando(false);
    }
  }

  // ----------------------------------------------------------------
  // Funções de UI
  // ----------------------------------------------------------------
  function mostrarCarregando(ativo) {
    const btnTexto = document.querySelector(".viggo-ai-btn-texto");
    const btnLoading = document.querySelector(".viggo-ai-btn-loading");
    const btnEnviar = document.getElementById("viggo-ai-btn-enviar");
    if (btnTexto) btnTexto.style.display = ativo ? "none" : "inline";
    if (btnLoading) btnLoading.style.display = ativo ? "flex" : "none";
    if (btnEnviar) btnEnviar.disabled = ativo;
  }

  function esconderTudo() {
    ["viggo-ai-resultado", "viggo-ai-erro", "viggo-ai-vazio", "viggo-ai-historico"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      }
    );
  }

  function mostrarResposta(texto, fontes) {
    const resultado = document.getElementById("viggo-ai-resultado");
    const respostaEl = document.getElementById("viggo-ai-resposta-texto");
    const fontesEl = document.getElementById("viggo-ai-fontes");
    const fontesLista = document.getElementById("viggo-ai-fontes-lista");

    if (resultado) resultado.style.display = "block";
    if (respostaEl) respostaEl.textContent = texto;

    if (fontes.length > 0 && fontesEl && fontesLista) {
      fontesLista.innerHTML = fontes
        .map(
          (f) =>
            `<li class="viggo-ai-fonte-item">
              <span class="viggo-ai-fonte-icone">📄</span>
              <span>${f.title || f.name || "Documento"}</span>
            </li>`
        )
        .join("");
      fontesEl.style.display = "block";
    }
  }

  function mostrarErro(mensagem) {
    const erroEl = document.getElementById("viggo-ai-erro");
    const erroTexto = document.getElementById("viggo-ai-erro-texto");
    if (erroEl) erroEl.style.display = "block";
    if (erroTexto) erroTexto.textContent = mensagem;
  }

  function toggleHistorico() {
    const historicoEl = document.getElementById("viggo-ai-historico");
    const resultadoEl = document.getElementById("viggo-ai-resultado");
    const vazioEl = document.getElementById("viggo-ai-vazio");

    if (historicoEl?.style.display === "none" || !historicoEl?.style.display) {
      esconderTudo();
      if (historicoEl) historicoEl.style.display = "block";
      chrome.storage.local.get({ history: [] }, (data) => {
        renderizarHistorico(data.history);
      });
    } else {
      if (historicoEl) historicoEl.style.display = "none";
      if (vazioEl) vazioEl.style.display = "flex";
    }
  }

  function renderizarHistorico(history) {
    const lista = document.getElementById("viggo-ai-historico-lista");
    if (!lista) return;

    if (history.length === 0) {
      lista.innerHTML = '<li class="viggo-ai-historico-vazio">Nenhuma consulta ainda.</li>';
      return;
    }

    lista.innerHTML = history
      .map(
        (item) => `
        <li class="viggo-ai-historico-item" data-pergunta="${encodeURIComponent(item.pergunta)}">
          <div class="viggo-ai-historico-pergunta">${item.pergunta.slice(0, 80)}${item.pergunta.length > 80 ? "..." : ""}</div>
          <div class="viggo-ai-historico-meta">
            <span>${item.workspace}</span>
            <span>${new Date(item.timestamp).toLocaleTimeString("pt-BR")}</span>
          </div>
        </li>`
      )
      .join("");

    // Clicar no histórico preenche o input
    lista.querySelectorAll(".viggo-ai-historico-item").forEach((item) => {
      item.addEventListener("click", () => {
        const pergunta = decodeURIComponent(item.dataset.pergunta);
        const input = document.getElementById("viggo-ai-input");
        if (input) {
          input.value = pergunta;
          esconderTudo();
          document.getElementById("viggo-ai-vazio").style.display = "flex";
        }
      });
    });
  }

  // ----------------------------------------------------------------
  // Controle do painel
  // ----------------------------------------------------------------
  function abrirPainel() {
    criarPainel();
    const painel = document.getElementById("viggo-ai-painel");
    if (painel) {
      painel.classList.remove("viggo-ai-fechado");
      painel.classList.add("viggo-ai-aberto");
    }
    painelAberto = true;
    atualizarFab(true);
  }

  function fecharPainel() {
    const painel = document.getElementById("viggo-ai-painel");
    if (painel) {
      painel.classList.add("viggo-ai-fechado");
      painel.classList.remove("viggo-ai-aberto");
    }
    painelAberto = false;
    atualizarFab(false);
  }

  function togglePainel() {
    if (painelAberto) {
      fecharPainel();
    } else {
      abrirPainel();
    }
  }

  function atualizarFab(aberto) {
    const fab = document.getElementById("viggo-ai-fab");
    if (fab) {
      fab.classList.toggle("viggo-ai-fab-ativo", aberto);
    }
  }

  // ----------------------------------------------------------------
  // Auto-detecção de mensagens do cliente (Movidesk)
  // ----------------------------------------------------------------
  function iniciarObservadorMensagens() {
    if (observadorMensagens) return;

    observadorMensagens = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;

          // Tenta detectar mensagens do cliente no Movidesk
          // O Movidesk usa classes específicas para mensagens recebidas
          const seletoresMensagem = [
            ".message-received .message-text",
            ".chat-message.received .text",
            "[class*='incoming'] [class*='message']",
            ".ticket-msg-client",
          ];

          for (const seletor of seletoresMensagem) {
            const el = node.matches?.(seletor)
              ? node
              : node.querySelector?.(seletor);
            if (el && el.textContent.trim().length > 10) {
              notificarNovaMensagem(el.textContent.trim());
              return;
            }
          }
        }
      }
    });

    observadorMensagens.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function notificarNovaMensagem(texto) {
    // Mostra badge no FAB indicando nova mensagem
    const badge = document.getElementById("viggo-ai-fab-badge");
    if (badge) badge.style.display = "block";

    // Se o painel estiver aberto, preenche automaticamente
    if (painelAberto) {
      const input = document.getElementById("viggo-ai-input");
      if (input && !input.value) {
        input.value = texto;
      }
    }
  }

  // ----------------------------------------------------------------
  // Eventos do background script
  // ----------------------------------------------------------------
  window.addEventListener("viggo-ai:consultar", (e) => {
    const pergunta = e.detail?.pergunta;
    if (pergunta) {
      abrirPainel();
      // Pequeno delay pra garantir que o painel está no DOM
      setTimeout(() => {
        const input = document.getElementById("viggo-ai-input");
        if (input) input.value = pergunta;
        consultar(pergunta);
      }, 150);
    }
  });

  window.addEventListener("viggo-ai:toggle", () => {
    togglePainel();
  });

  // ----------------------------------------------------------------
  // Inicializa
  // ----------------------------------------------------------------
  criarBotaoFlutuante();

  console.log("[Viggo AI] Painel pronto. Clique no botão 🤖 ou selecione texto e clique com botão direito.");
})();
