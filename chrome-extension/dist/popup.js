// ============================================================
// Popup — Viggo AI Support
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Carrega configurações
  const config = await getConfig();

  // Atualiza UI com workspace atual
  const workspaceEl = document.getElementById("workspace-ativo");
  if (workspaceEl) workspaceEl.textContent = config.workspace || "suporte";

  // Verifica status do AnythingLLM
  verificarStatus(config);

  // Botão: Abrir painel lateral
  document.getElementById("btn-abrir-painel")?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.dispatchEvent(new CustomEvent("viggo-ai:toggle")),
      });
      window.close();
    }
  });

  // Botão: Abrir AnythingLLM no browser
  document.getElementById("btn-abrir-anythingllm")?.addEventListener("click", () => {
    chrome.tabs.create({ url: config.apiUrl || "http://localhost:3001" });
    window.close();
  });

  // Botão: Configurações
  document.getElementById("btn-configuracoes")?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage?.() ||
      chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    window.close();
  });
});

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        apiUrl: "http://localhost:3001",
        apiKey: "",
        workspace: "suporte",
      },
      resolve
    );
  });
}

async function verificarStatus(config) {
  const dot = document.getElementById("status-dot");
  const texto = document.getElementById("status-texto");

  try {
    const resp = await fetch(`${config.apiUrl}/api/ping`, {
      signal: AbortSignal.timeout(5000),
    });

    if (resp.ok) {
      dot?.classList.remove("checking", "offline");
      dot?.classList.add("online");
      if (texto) texto.textContent = "Online ✓";
    } else {
      throw new Error("não respondeu");
    }
  } catch {
    dot?.classList.remove("checking", "online");
    dot?.classList.add("offline");
    if (texto) texto.textContent = "Offline";
  }
}
