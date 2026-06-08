export function detectAiProvider(page) {
  const host = String(page.host || '').toLowerCase();
  if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return 'ChatGPT';
  if (host.includes('claude.ai')) return 'Claude';
  if (host.includes('gemini.google.com')) return 'Gemini';
  if (host.includes('perplexity.ai')) return 'Perplexity';
  if (host.includes('grok.com') || host.includes('x.ai')) return 'Grok';
  if (host.includes('poe.com')) return 'Poe';
  if (host.includes('deepseek.com')) return 'DeepSeek';
  if (host.includes('qwen')) return 'Qwen';
  return '';
}

export function detectPageType(page) {
  const host = String(page.host || '').toLowerCase();
  const url = String(page.url || '').toLowerCase();
  if (detectAiProvider(page)) return 'ai-chat';
  if (host.includes('github.com')) return 'github';
  if (host.includes('feishu.cn') || host.includes('larksuite.com')) return 'feishu';
  if (host.includes('notion.so')) return 'notion';
  if (url.endsWith('.pdf') || host.includes('arxiv.org') || host.includes('doi.org')) return 'paper';
  if (host.includes('chrome.google.com') || host.includes('chromewebstore.google.com')) return 'extension-store';
  return 'webpage';
}

export const PAGE_TYPE_LABELS = {
  'ai-chat': 'AI 对话',
  github: 'GitHub',
  feishu: '飞书',
  notion: 'Notion',
  paper: '论文 / PDF',
  'extension-store': '插件商店',
  webpage: '网页'
};
