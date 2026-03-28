// ============================================================
// Options — Viggo AI Support
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // Carrega configurações salvas
  chrome.storage.sync.get(
    {
      apiUrl: "http://localhost:3001",
      apiKey: "",
      workspace: "suporte",
      autoDetect: false,
    },
    (config) => {
      document.getElementById("apiUrl").value = config.apiUrl;
      document.getElementById("apiKey").value = config.apiKey;
      document.getElementById("workspace").value = config.workspace;
      document.getElementById("autoDetect").checked = config.autoDetect;
    }
  );

  // Salvar
  document.getElementById("btn-salvar")?.addEventListener("click", () => {
    const config = {
      apiUrl: document.getElementById("apiUrl").value.trim().replace(/\/$/, ""),
      apiKey: document.getElementById("apiKey").value.trim(),
      workspace: document.getElementById("workspace").value.trim() || "suporte",
      autoDetect: document.getElementById("autoDetect").checked,
    };

    if (!config.apiUrl) {
      mostrarMensagem("Por favor, informe a URL do AnythingLLM.", "erro");
      return;
    }

    chrome.storage.sync.set(config, () => {
      mostrarMensagem("✅ Configurações salvas com sucesso!", "sucesso");
    });
  });

  // Testar conexão
  document.getElementById("btn-testar")?.addEventListener("click", async () => {
    const apiUrl = document.getElementById("apiUrl").value.trim().replace(/\/$/, "");
    const apiKey = document.getElementById("apiKey").value.trim();

    mostrarMensagem("🔄 Testando conexão...", "sucesso");

    try {
      const resp = await fetch(`${apiUrl}/api/ping`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: AbortSignal.timeout(8000),
      });

      if (resp.ok) {
        mostrarMensagem("✅ Conexão bem-sucedida! AnythingLLM está online.", "sucesso");
      } else {
        mostrarMensagem(
          `⚠️ Servidor respondeu com erro ${resp.status}. Verifique a URL e a API Key.`,
          "erro"
        );
      }
    } catch (err) {
      if (err.name === "TimeoutError") {
        mostrarMensagem("⏱️ Timeout: O servidor não respondeu em 8 segundos.", "erro");
      } else {
        mostrarMensagem(
          `❌ Não foi possível conectar. Verifique se o AnythingLLM está rodando em ${apiUrl}`,
          "erro"
        );
      }
    }
  });
});

function mostrarMensagem(texto, tipo) {
  const el = document.getElementById("mensagem");
  if (!el) return;
  el.textContent = texto;
  el.className = `mensagem ${tipo}`;
  el.style.display = "block";
  if (tipo === "sucesso") {
    setTimeout(() => (el.style.display = "none"), 4000);
  }
}
