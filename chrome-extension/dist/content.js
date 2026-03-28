// ============================================================
// Content Script — Viggo AI Support
// Painel lateral expansível (usa sessão do login)
// ============================================================

(function () {
  "use strict";
  if (window.__viggoAiInjected) return;
  window.__viggoAiInjected = true;

  let session = {};
  let enviando = false;
  let painelAberto = false;

  // Carrega sessão do storage (via background)
  function carregarSessao() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_SESSION" }, (resp) => {
        session = resp?.session || {};
        resolve();
      });
    });
  }

  // ----------------------------------------------------------------
  // Cria o painel lateral
  // ----------------------------------------------------------------
  function criarPainel() {
    if (document.getElementById("viggo-ai-painel")) return;

    const painel = document.createElement("div");
    painel.id = "viggo-ai-painel";
    painel.className = "viggo-ai-painel viggo-ai-fechado";

    painel.innerHTML = `
      <div class="viggo-ai-header">
        <div class="viggo-ai-header-titulo"><span>🤖</span><span>Viggo AI Support</span></div>
        <button id="viggo-ai-btn-fechar" class="viggo-ai-btn-icon" title="Fechar">✕</button>
      </div>
      <div class="viggo-ai-user-info" id="viggo-ai-user-info"></div>
      <div id="viggo-ai-mensagens" class="viggo-ai-mensagens">
        <div id="viggo-ai-vazio" class="viggo-ai-vazio">
          <div class="viggo-ai-vazio-icone">💬</div>
          <p>Digite a dúvida do cliente abaixo</p>
        </div>
      </div>
      <div id="viggo-ai-erro-banner" class="viggo-ai-erro-banner" style="display:none"></div>
      <div class="viggo-ai-input-area">
        <select id="viggo-ai-workspace" class="viggo-ai-workspace-select">
          <option value="">Carregando...</option>
        </select>
        <textarea id="viggo-ai-input" class="viggo-ai-textarea" placeholder="Digite a dúvida..." rows="1"></textarea>
        <button id="viggo-ai-btn-enviar" class="viggo-ai-btn-enviar" title="Enviar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(painel);

    // Eventos
    document.getElementById("viggo-ai-btn-fechar").addEventListener("click", fecharPainel);
    document.getElementById("viggo-ai-btn-enviar").addEventListener("click", enviar);
    document.getElementById("viggo-ai-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
    });
    document.getElementById("viggo-ai-input").addEventListener("input", (e) => {
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
    });

    // Mostra nome do usuário
    const userInfo = document.getElementById("viggo-ai-user-info");
    if (userInfo && session.username) {
      userInfo.textContent = `👤 ${session.username}`;
      userInfo.style.cssText = "font-size:11px;color:#a5b4fc;padding:4px 16px;background:#4f46e5;";
    }

    carregarWorkspaces();
  }

  // ----------------------------------------------------------------
  // Workspaces dinâmicos
  // ----------------------------------------------------------------
  async function carregarWorkspaces() {
    const sel = document.getElementById("viggo-ai-workspace");
    if (!sel || !session.token) return;

    try {
      const resp = await fetch(`${session.apiUrl}/api/v1/workspaces`, {
        headers: { Authorization: `Bearer ${session.token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      const workspaces = data.workspaces || [];

      sel.innerHTML = "";
      if (workspaces.length === 0) {
        sel.innerHTML = '<option value="">Nenhum workspace</option>';
        return;
      }
      workspaces.forEach((ws) => {
        const opt = document.createElement("option");
        opt.value = ws.slug;
        opt.textContent = ws.name;
        if (ws.slug === session.workspace) opt.selected = true;
        sel.appendChild(opt);
      });
      if (!sel.value) sel.value = workspaces[0].slug;
    } catch {
      sel.innerHTML = '<option value="">Erro ao carregar</option>';
    }
  }

  // ----------------------------------------------------------------
  // Envio
  // ----------------------------------------------------------------
  async function enviar() {
    const input = document.getElementById("viggo-ai-input");
    const pergunta = input?.value?.trim();
    if (!pergunta || enviando) return;

    enviando = true;
    document.getElementById("viggo-ai-vazio")?.remove();
    adicionarMensagem("usuario", pergunta);
    input.value = "";
    input.style.height = "auto";
    mostrarLoading();
    document.getElementById("viggo-ai-btn-enviar").disabled = true;

    const workspace = document.getElementById("viggo-ai-workspace")?.value;

    if (!session.token) {
      removerLoading();
      mostrarErro("Faça login no plugin primeiro (clique no ícone 🤖 na barra).");
      enviando = false;
      document.getElementById("viggo-ai-btn-enviar").disabled = false;
      return;
    }

    try {
      const resp = await fetch(`${session.apiUrl}/api/v1/workspace/${workspace}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ message: pergunta, mode: "query" }),
        signal: AbortSignal.timeout(30000),
      });
      removerLoading();

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || `Erro ${resp.status}`);
      }

      const data = await resp.json();
      adicionarMensagem("assistente", data.textResponse || "Sem resposta.", data.sources || []);
    } catch (err) {
      removerLoading();
      mostrarErro(err.message || "Erro ao consultar.");
    } finally {
      enviando = false;
      document.getElementById("viggo-ai-btn-enviar").disabled = false;
      document.getElementById("viggo-ai-input")?.focus();
    }
  }

  // ----------------------------------------------------------------
  // UI
  // ----------------------------------------------------------------
  function adicionarMensagem(tipo, texto, fontes = []) {
    const container = document.getElementById("viggo-ai-mensagens");
    if (!container) return;
    const div = document.createElement("div");
    div.className = `viggo-ai-msg viggo-ai-msg-${tipo}`;
    const balao = document.createElement("div");
    balao.className = "viggo-ai-balao";
    balao.textContent = texto;
    div.appendChild(balao);
    if (tipo === "assistente") {
      const acoes = document.createElement("div");
      acoes.className = "viggo-ai-acoes";
      const btn = document.createElement("button");
      btn.className = "viggo-ai-btn-copiar";
      btn.textContent = "📋 Copiar";
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(texto).then(() => {
          btn.textContent = "✅ Copiado!";
          setTimeout(() => (btn.textContent = "📋 Copiar"), 2000);
        });
      });
      acoes.appendChild(btn);
      div.appendChild(acoes);
      if (fontes.length > 0) {
        const f = document.createElement("div");
        f.className = "viggo-ai-fontes";
        f.textContent = "📄 " + fontes.map(s => s.title || s.name || "Doc").join(", ");
        div.appendChild(f);
      }
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function mostrarLoading() {
    const c = document.getElementById("viggo-ai-mensagens");
    if (!c) return;
    const el = document.createElement("div");
    el.className = "viggo-ai-loading"; el.id = "viggo-ai-loading";
    el.innerHTML = "<span></span><span></span><span></span>";
    c.appendChild(el); c.scrollTop = c.scrollHeight;
  }
  function removerLoading() { document.getElementById("viggo-ai-loading")?.remove(); }
  function mostrarErro(msg) {
    const el = document.getElementById("viggo-ai-erro-banner");
    if (!el) return;
    el.textContent = "⚠️ " + msg; el.style.display = "block";
    setTimeout(() => (el.style.display = "none"), 6000);
  }

  // ----------------------------------------------------------------
  // Painel abrir / fechar
  // ----------------------------------------------------------------
  async function abrirPainel(pergunta) {
    await carregarSessao();
    if (!session.token) {
      alert("Viggo AI: Faça login primeiro. Clique no ícone 🤖 na barra do Chrome.");
      return;
    }
    criarPainel();
    const painel = document.getElementById("viggo-ai-painel");
    painel?.classList.remove("viggo-ai-fechado");
    painel?.classList.add("viggo-ai-aberto");
    painelAberto = true;
    if (pergunta) {
      setTimeout(() => {
        const input = document.getElementById("viggo-ai-input");
        if (input) input.value = pergunta;
        enviar();
      }, 250);
    } else {
      setTimeout(() => document.getElementById("viggo-ai-input")?.focus(), 200);
    }
  }

  function fecharPainel() {
    const painel = document.getElementById("viggo-ai-painel");
    painel?.classList.add("viggo-ai-fechado");
    painel?.classList.remove("viggo-ai-aberto");
    painelAberto = false;
  }

  // ----------------------------------------------------------------
  // Listener
  // ----------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CONSULTAR") {
      abrirPainel(message.pergunta);
      sendResponse({ ok: true });
    }
    if (message.type === "TOGGLE") {
      painelAberto ? fecharPainel() : abrirPainel();
      sendResponse({ ok: true });
    }
  });
})();
