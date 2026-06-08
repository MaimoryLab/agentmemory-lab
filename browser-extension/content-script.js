(() => {
  function textFromMeta(name) {
    const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return el ? (el.getAttribute('content') || '').trim() : '';
  }

  function collectPageContext() {
    const selection = String(window.getSelection ? window.getSelection() : '').trim();
    const description = textFromMeta('description') || textFromMeta('og:description');
    const title = document.title || textFromMeta('og:title') || location.hostname;
    const headings = Array.from(document.querySelectorAll('h1, h2')).slice(0, 8).map((el) => el.textContent.trim()).filter(Boolean);
    const turns = collectAiChatTurns();
    return {
      title,
      url: location.href,
      host: location.hostname,
      description,
      selection,
      headings,
      turns
    };
  }

  function collectAiChatTurns() {
    const host = location.hostname.toLowerCase();
    if (!/(chatgpt|chat\.openai|claude|gemini|perplexity|grok|poe|deepseek)/.test(host)) return [];
    const selectors = [
      '[data-message-author-role]',
      '[data-testid*="conversation-turn"]',
      '[class*="message"]',
      'main article'
    ];
    const nodes = Array.from(document.querySelectorAll(selectors.join(',')));
    const turns = [];
    const seen = new Set();
    for (const node of nodes.slice(-18)) {
      const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 12 || seen.has(text)) continue;
      seen.add(text);
      const explicitRole = node.getAttribute('data-message-author-role');
      const role = explicitRole || inferRole(node, turns.length);
      turns.push({ role, text });
    }
    return turns.slice(-8);
  }

  function inferRole(node, index) {
    const label = `${node.getAttribute('aria-label') || ''} ${node.className || ''}`.toLowerCase();
    if (/user|human|you|用户/.test(label)) return 'user';
    if (/assistant|agent|model|claude|chatgpt|gemini|回答/.test(label)) return 'assistant';
    return index % 2 === 0 ? 'user' : 'assistant';
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === 'AGENT_MEMORY_LAB_COLLECT_PAGE') {
      sendResponse({ ok: true, page: collectPageContext() });
      return true;
    }
    return false;
  });
})();
