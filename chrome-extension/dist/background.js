// ============================================================
// Background Service Worker — Viggo AI Support
// ============================================================

// Cria o menu de contexto ao instalar a extensão
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "viggo-ai-consultar",
    title: "🤖 Consultar base Viggo AI",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "viggo-ai-separator",
    type: "separator",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "viggo-ai-abrir-painel",
    title: "📋 Abrir painel Viggo AI",
    contexts: ["page", "selection"],
  });

  console.log("[Viggo AI] Extensão instalada. Menu de contexto criado.");
});

// Handler do menu de contexto
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "viggo-ai-consultar" && info.selectionText) {
    // Injeta o painel e envia a pergunta selecionada
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: abrirPainelComPergunta,
      args: [info.selectionText.trim()],
    });
  }

  if (info.menuItemId === "viggo-ai-abrir-painel") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: togglePainel,
      args: [],
    });
  }
});

// Comunicação com o content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_CONFIG") {
    chrome.storage.sync.get(
      {
        apiUrl: "http://localhost:3001",
        apiKey: "",
        workspace: "suporte",
        autoDetect: false,
      },
      (config) => {
        sendResponse({ config });
      }
    );
    return true; // Mantém canal aberto para resposta assíncrona
  }

  if (message.type === "SAVE_HISTORY") {
    const item = message.item;
    chrome.storage.local.get({ history: [] }, (data) => {
      const history = [item, ...data.history].slice(0, 50); // Últimas 50
      chrome.storage.local.set({ history });
    });
  }
});

// Funções injetadas no contexto da página
function abrirPainelComPergunta(pergunta) {
  // Dispara evento customizado pra o content script
  window.dispatchEvent(
    new CustomEvent("viggo-ai:consultar", { detail: { pergunta } })
  );
}

function togglePainel() {
  window.dispatchEvent(new CustomEvent("viggo-ai:toggle"));
}
