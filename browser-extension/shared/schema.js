export const CAPTURE_SCHEMA_VERSION = 1;

export function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl || '');
    return {
      url: url.href,
      host: url.hostname,
      origin: url.origin
    };
  } catch {
    return { url: rawUrl || '', host: '', origin: '' };
  }
}

export function createPageCapture(page = {}) {
  const normalized = normalizeUrl(page.url);
  const now = new Date().toISOString();
  return {
    schemaVersion: CAPTURE_SCHEMA_VERSION,
    capturedAt: now,
    source: 'browser-extension',
    page: {
      title: String(page.title || '当前页面').trim(),
      url: normalized.url,
      host: page.host || normalized.host,
      origin: normalized.origin,
      description: String(page.description || '').trim(),
      selection: String(page.selection || '').trim(),
      headings: Array.isArray(page.headings) ? page.headings.map(String).map((x) => x.trim()).filter(Boolean).slice(0, 12) : []
    }
  };
}

export function captureToMemoryPayload(capture) {
  const page = capture.page;
  const selected = page.selection ? `\n\n选中文本：\n${page.selection}` : '';
  const headings = page.headings.length ? `\n\n页面结构：${page.headings.join(' / ')}` : '';
  return {
    content: `网页记忆线索：${page.title}\nURL：${page.url}\n摘要：${page.description || '无'}${selected}${headings}`,
    concepts: ['browser-context', page.host].filter(Boolean),
    files: [],
    project: 'browser'
  };
}

export function captureToLessonPayload(capture, note) {
  const page = capture.page;
  return {
    content: note || `从网页 ${page.title} 提炼一条可复用经验`,
    context: `${page.title}\n${page.url}`,
    tags: ['browser', 'web-context'],
    project: 'browser',
    confidence: 0.75
  };
}

export function createCaptureRecord(capture, kind, result) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    title: capture.page.title,
    url: capture.page.url,
    host: capture.page.host,
    savedAt: new Date().toISOString(),
    resultId: result && (result.id || result.memoryId || result.lessonId || result.actionId || '')
  };
}
