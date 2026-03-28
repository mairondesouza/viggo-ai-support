// ============================================================
// Background Service Worker — Viggo AI Support
// ============================================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "viggo-ai-consultar",
      title: "🤖 Consultar base Viggo AI",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || info.menuItemId !== "viggo-ai-consultar" || !info.selectionText) return;

  chrome.tabs.sendMessage(tab.id, {
    type: "CONSULTAR",
    pergunta: info.selectionText.trim(),
  }, (resp) => {
    if (chrome.runtime.lastError) {
      // Content script não injetado — injeta manualmente
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      }, () => {
        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["sidebar.css"],
        }, () => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              type: "CONSULTAR",
              pergunta: info.selectionText.trim(),
            });
          }, 400);
        });
      });
    }
  });
});

// Comunicação com content script — repassa sessão salva
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SESSION") {
    chrome.storage.local.get({ viggo_session: {} }, (data) => {
      sendResponse({ session: data.viggo_session || {} });
    });
    return true;
  }
});
