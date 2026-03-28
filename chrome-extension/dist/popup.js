// ============================================================
// Popup Chat com Login — Viggo AI Support
// ============================================================

let session = { apiUrl: "", token: "", username: "", workspace: "" };
let enviando = false;

document.addEventListener("DOMContentLoaded", async () => {
  // Carrega sessão salva
  session = await getSession();

  if (session.token && session.apiUrl) {
    // Já está logado — verifica se o token ainda vale
    const valido = await verificarToken();
    if (valido) {
      mostrarChat();
      return;
    }
  }

  // Não logado ou token expirado
  mostrarLogin();
});

// ================================================================
// LOGIN
// ================================================================

function mostrarLogin() {
  document.getElementById("tela-login").classList.remove("hidden");
  document.getElementById("tela-chat").classList.add("hidden");

  // Preenche URL salva
  const urlInput = document.getElementById("login-server-url");
  if (urlInput) urlInput.value = session.apiUrl || "http://10.0.0.6:3001";

  // Enter no campo de senha = login
  document.getElementById("login-password")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fazerLogin();
  });
  document.getElementById("login-username")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("login-password")?.focus();
  });

  document.getElementById("login-btn")?.addEventListener("click", fazerLogin);
  document.getElementById("login-username")?.focus();
}

async function fazerLogin() {
  const username = document.getElementById("login-username")?.value?.trim();
  const password = document.getElementById("login-password")?.value;
  const apiUrl = document.getElementById("login-server-url")?.value?.trim().replace(/\/$/, "") || "http://10.0.0.6:3001";
  const erroEl = document.getElementById("login-erro");
  const btn = document.getElementById("login-btn");

  if (!username || !password) {
    erroEl.textContent = "Preencha usuário e senha.";
    erroEl.style.display = "block";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Entrando...";
  erroEl.style.display = "none";

  try {
    const resp = await fetch(`${apiUrl}/api/request-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await resp.json();

    if (!data.valid || !data.token) {
      throw new Error(data.message || "Usuário ou senha incorretos.");
    }

    // Salva sessão
    session = {
      apiUrl,
      token: data.token,
      username: data.user?.username || username,
      workspace: "",
    };

    await saveSession(session);
    mostrarChat();

  } catch (err) {
    erroEl.textContent = err.name === "TimeoutError"
      ? "Servidor não respondeu. Verifique o endereço."
      : (err.message || "Erro ao conectar.");
    erroEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}

// ================================================================
// CHAT
// ================================================================

function mostrarChat() {
  document.getElementById("tela-login").classList.add("hidden");
  document.getElementById("tela-chat").classList.remove("hidden");

  // Mostra nome do usuário
  document.getElementById("user-nome").textContent = `👤 ${session.username}`;

  // Carrega workspaces
  carregarWorkspaces();

  // Eventos
  const textarea = document.getElementById("input-pergunta");
  textarea?.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + "px";
  });
  textarea?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  });

  document.getElementById("btn-enviar")?.addEventListener("click", enviar);

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await chrome.storage.local.remove(["viggo_session"]);
    session = { apiUrl: "", token: "", username: "", workspace: "" };
    location.reload();
  });

  document.getElementById("btn-expandir")?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE" });
      window.close();
    }
  });

  document.getElementById("btn-config")?.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    window.close();
  });

  document.getElementById("workspace-select")?.addEventListener("change", (e) => {
    session.workspace = e.target.value;
    saveSession(session);
  });

  textarea?.focus();
}

async function carregarWorkspaces() {
  const sel = document.getElementById("workspace-select");
  if (!sel) return;

  try {
    const resp = await fetch(`${session.apiUrl}/api/v1/workspaces`, {
      headers: { Authorization: `Bearer ${session.token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      if (resp.status === 403 || resp.status === 401) {
        // Token expirado
        await chrome.storage.local.remove(["viggo_session"]);
        location.reload();
        return;
      }
      throw new Error();
    }

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

    if (!sel.value) {
      sel.value = workspaces[0].slug;
      session.workspace = workspaces[0].slug;
      saveSession(session);
    }

  } catch {
    sel.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

async function enviar() {
  const textarea = document.getElementById("input-pergunta");
  const pergunta = textarea?.value?.trim();
  if (!pergunta || enviando) return;

  enviando = true;
  document.getElementById("vazio")?.remove();
  adicionarMensagem("usuario", pergunta);
  textarea.value = "";
  textarea.style.height = "auto";
  mostrarLoading();
  document.getElementById("btn-enviar").disabled = true;
  esconderErro();

  const workspace = document.getElementById("workspace-select")?.value || session.workspace;

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
      if (resp.status === 401 || resp.status === 403) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error || err?.message || `Erro ${resp.status}`);
    }

    const data = await resp.json();
    const resposta = data.textResponse || data.response || "Sem resposta.";
    const fontes = data.sources || [];
    adicionarMensagem("assistente", resposta, fontes);

  } catch (err) {
    removerLoading();
    mostrarErro(err.name === "TimeoutError" ? "Timeout — servidor não respondeu." : err.message);
  } finally {
    enviando = false;
    document.getElementById("btn-enviar").disabled = false;
    document.getElementById("input-pergunta")?.focus();
  }
}

// ================================================================
// UI HELPERS
// ================================================================

function adicionarMensagem(tipo, texto, fontes = []) {
  const container = document.getElementById("mensagens");
  const div = document.createElement("div");
  div.className = `msg ${tipo}`;

  const balao = document.createElement("div");
  balao.className = "msg-balao";
  balao.textContent = texto;
  div.appendChild(balao);

  if (tipo === "assistente") {
    const acoes = document.createElement("div");
    acoes.className = "msg-acoes";
    const btnCopiar = document.createElement("button");
    btnCopiar.className = "btn-copiar";
    btnCopiar.textContent = "📋 Copiar";
    btnCopiar.addEventListener("click", () => {
      navigator.clipboard.writeText(texto).then(() => {
        btnCopiar.textContent = "✅ Copiado!";
        setTimeout(() => (btnCopiar.textContent = "📋 Copiar"), 2000);
      });
    });
    acoes.appendChild(btnCopiar);
    div.appendChild(acoes);

    if (fontes.length > 0) {
      const fontesEl = document.createElement("div");
      fontesEl.className = "msg-fontes";
      fontesEl.textContent = "📄 " + fontes.map(f => f.title || f.name || "Documento").join(", ");
      div.appendChild(fontesEl);
    }
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function mostrarLoading() {
  const container = document.getElementById("mensagens");
  const el = document.createElement("div");
  el.className = "loading";
  el.id = "loading-indicator";
  el.innerHTML = "<span></span><span></span><span></span>";
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function removerLoading() {
  document.getElementById("loading-indicator")?.remove();
}

function mostrarErro(msg) {
  const el = document.getElementById("erro-banner");
  if (el) { el.textContent = "⚠️ " + msg; el.style.display = "block"; }
  setTimeout(() => { if (el) el.style.display = "none"; }, 6000);
}

function esconderErro() {
  const el = document.getElementById("erro-banner");
  if (el) el.style.display = "none";
}

// ================================================================
// STORAGE (sessão persistida)
// ================================================================

async function getSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ viggo_session: {} }, (data) => {
      resolve(data.viggo_session || {});
    });
  });
}

async function saveSession(s) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ viggo_session: s }, resolve);
  });
}

async function verificarToken() {
  try {
    const resp = await fetch(`${session.apiUrl}/api/v1/auth`, {
      headers: { Authorization: `Bearer ${session.token}` },
      signal: AbortSignal.timeout(5000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
