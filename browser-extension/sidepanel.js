import { buildBrowserLessonDraft, buildBrowserMemoryDraft } from './shared/schema.js';

const $ = (id) => document.getElementById(id);
const AI_SITE_TEST_CARDS_PATH = '/docs/browser-extension-ai-site-test-cards-cn.md';
let latestCapture = null;
let defaultDraft = { kind: 'memory', title: '', content: '', meta: {} };

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

async function send(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response || !response.ok) throw new Error((response && response.error) || '操作失败');
  return response.data;
}

function setMessage(text, kind = '') {
  $('message').textContent = text || '';
  $('message').className = `message ${kind}`.trim();
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function buildDiagnosticReport(capture) {
  const page = capture && capture.page ? capture.page : {};
  const diagnostics = capture && capture.diagnostics ? capture.diagnostics : {};
  const conversation = capture && capture.conversation ? capture.conversation : {};
  const manifest = chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest() : {};
  const matched = diagnostics.matchedSelectors || {};
  return {
    product: 'Agent Memory Lab Browser Extension',
    extension: {
      name: manifest.name || 'Agent Memory Lab',
      version: manifest.version || '',
      manifestVersion: manifest.manifest_version || 3
    },
    generatedAt: new Date().toISOString(),
    validationGuide: {
      title: '浏览器插件真实 AI 站点测试卡',
      path: AI_SITE_TEST_CARDS_PATH,
      requiredProducts: ['ChatGPT', 'Claude', 'Gemini', 'Perplexity']
    },
    page: {
      title: page.title || '',
      url: page.url || '',
      host: page.host || '',
      origin: page.origin || '',
      type: page.type || '',
      typeLabel: page.typeLabel || ''
    },
    ai: {
      supportedAiPage: !!diagnostics.supportedAiPage,
      provider: diagnostics.provider || conversation.provider || '',
      editorFound: !!diagnostics.editorFound,
      editorSelector: diagnostics.editorSelector || '',
      anchorFound: !!diagnostics.anchorFound,
      anchorSelector: diagnostics.anchorSelector || '',
      anchorSource: diagnostics.anchorSource || '',
      adjacentSelector: diagnostics.adjacentSelector || '',
      sendFound: !!diagnostics.sendFound,
      sendSelector: diagnostics.sendSelector || '',
      turnSelector: diagnostics.turnSelector || '',
      turnSelectorCount: diagnostics.turnSelectorCount || 0,
      matchedSelectors: {
        editor: matched.editor || diagnostics.editorSelector || '',
        anchor: matched.anchor || diagnostics.anchorSelector || '',
        anchorSource: matched.anchorSource || diagnostics.anchorSource || '',
        adjacent: matched.adjacent || diagnostics.adjacentSelector || '',
        send: matched.send || diagnostics.sendSelector || '',
        turn: matched.turn || diagnostics.turnSelector || ''
      },
      placement: diagnostics.placement || '',
      memoryWidgetVisible: !!diagnostics.memoryWidgetVisible,
      promptLength: diagnostics.promptLength || 0,
      turnCount: diagnostics.turnCount || 0,
      checkedAt: diagnostics.checkedAt || ''
    },
    manualValidation: {
      memoryInsertPassed: false,
      diagnosticsCopied: true,
      siteInputStillWorks: false,
      browser: '填写浏览器名称和版本',
      notes: '填写无隐私信息的验收备注'
    }
  };
}

function providerArg(value) {
  const provider = String(value || '').trim();
  return provider ? ` --provider "${provider.replace(/"/g, '\\"')}"` : '';
}

function buildEvidenceCommand(capture) {
  const diagnostics = capture && capture.diagnostics ? capture.diagnostics : {};
  const provider = diagnostics.provider || (capture && capture.conversation && capture.conversation.provider) || '';
  return `npm run wizard:ai-validation-evidence -- --clipboard${providerArg(provider)}`;
}

function setConnectionState(state, text) {
  const card = $('connectionCard');
  card.className = `connection-card ${state}`;
  if (state === 'connected') {
    $('connectionTitle').textContent = '可以保存';
    $('connectionText').textContent = text || '内容会先放进本地工作台，由你确认后再变成长期记忆。';
    $('connectionAction').textContent = '刷新';
    syncSavePageState();
    return;
  }
  if (state === 'offline') {
    $('connectionTitle').textContent = '本地工作台未连接';
    $('connectionText').textContent = text || '先启动 Agent Memory Lab，再保存网页内容。';
    $('connectionAction').textContent = '重试';
    $('savePage').disabled = true;
    return;
  }
  $('connectionTitle').textContent = '检查连接中';
  $('connectionText').textContent = '正在确认能否保存到本地工作台。';
  $('connectionAction').textContent = '重试';
}

function candidateEmptyState(kind) {
  const capture = latestCapture || {};
  const page = capture.page || {};
  const conversation = capture.conversation || {};
  const turns = Array.isArray(conversation.turns) ? conversation.turns : [];
  const provider = conversation.provider || '';
  if (provider && !turns.length) {
    return {
      title: kind === 'lesson' ? '还不能沉淀经验' : '还不能生成记忆',
      body: '插件还没有读到这页的具体对话。为了避免把网页介绍、链接或输入框草稿误存成记忆，请先展开真实对话，或选中一段具体内容后再保存。'
    };
  }
  return {
    title: kind === 'lesson' ? '暂时没有经验建议' : '暂时没有记忆建议',
    body: page.selection ? '选中的内容还不够具体，可以手动改写后加入待确认。' : '当前页面还没有足够具体的信息，可以选中一段内容，或在准备保存区手动补充。'
  };
}

function renderCandidateList(node, items, kind) {
  if (!items || !items.length) {
    node.className = 'candidate-list empty';
    const empty = candidateEmptyState(kind);
    node.innerHTML = `<div class="empty-card"><strong>${escapeHtml(empty.title)}</strong><span>${escapeHtml(empty.body)}</span></div>`;
    return;
  }
  node.className = 'candidate-list';
  node.innerHTML = items.map((text) => `
    <article class="candidate">
      <p>${escapeHtml(text)}</p>
      <button data-draft-kind="${kind}" data-draft-text="${escapeHtml(text)}">使用这条</button>
    </article>
  `).join('');
}

function normalizeTags(tags) {
  const seen = new Set();
  return String(Array.isArray(tags) ? tags.join(',') : tags || '')
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildDraftMetaFields(capture, kind = 'memory') {
  const page = capture && capture.page ? capture.page : {};
  const provider = capture && capture.conversation && capture.conversation.provider ? capture.conversation.provider : '';
  const typeLabel = String(page.typeLabel || '').trim();
  const tags = ['browser', provider ? provider.toLowerCase() : '', typeLabel ? typeLabel.toLowerCase() : '', kind === 'lesson' ? 'lesson' : 'memory'];
  return {
    projectScope: provider ? 'page' : 'all',
    project: provider || page.host || 'browser',
    tags: normalizeTags(tags.join(', ')),
    asLesson: kind === 'lesson'
  };
}

function setDraftMetaFields(meta = {}) {
  $('draftProject').value = meta.projectScope === 'page' ? 'page' : 'all';
  $('draftTags').value = normalizeTags(meta.tags || '').join(', ');
  $('draftAsLesson').checked = !!meta.asLesson;
}

function getDraftMetaFields() {
  const page = latestCapture && latestCapture.page ? latestCapture.page : {};
  const provider = latestCapture && latestCapture.conversation && latestCapture.conversation.provider ? latestCapture.conversation.provider : '';
  const projectScope = $('draftProject').value === 'page' ? 'page' : 'all';
  return {
    projectScope,
    project: projectScope === 'page' ? (provider || page.host || 'browser') : 'all',
    tags: normalizeTags($('draftTags').value),
    asLesson: $('draftAsLesson').checked
  };
}

function buildDefaultDraft(capture) {
  const draft = buildBrowserMemoryDraft(capture);
  return {
    kind: 'memory',
    title: draft.title || '浏览器记忆候选',
    content: draft.content,
    emptyReason: draft.emptyReason || '',
    meta: buildDraftMetaFields(capture, 'memory')
  };
}

function draftMetaText(capture, kind) {
  const page = capture && capture.page ? capture.page : {};
  const provider = capture && capture.conversation && capture.conversation.provider ? capture.conversation.provider : '';
  const source = provider || page.typeLabel || page.host || '浏览器';
  const meta = getDraftMetaFields();
  const type = meta.asLesson || kind === 'lesson' ? '会整理成经验' : '会保存为记忆';
  const project = meta.projectScope === 'all' ? '以后都能用' : '只和这个网页相关';
  const tags = meta.tags.length ? `已加备注：${meta.tags.join('、')}` : '还没有分类备注';
  const privacy = capture && capture.privacy && capture.privacy.risk === 'medium' ? '可能含敏感信息，建议先删改' : '保存后仍需在工作台确认';
  return `${source} · ${project} · ${tags} · ${type} · ${privacy}`;
}

function setDraft(draft, options = {}) {
  defaultDraft = options.defaultDraft ? draft : defaultDraft;
  $('draftTitle').value = draft.title || '';
  $('draftContent').value = draft.content || draft.emptyReason || '';
  $('draftContent').dataset.kind = draft.kind || 'memory';
  syncSavePageState();
  setDraftMetaFields(draft.meta || buildDraftMetaFields(latestCapture, draft.kind || 'memory'));
  $('draftMeta').textContent = draftMetaText(latestCapture, draft.kind || 'memory');
}

function syncSavePageState() {
  const text = $('draftContent').value.trim();
  const emptyReason = defaultDraft && defaultDraft.emptyReason ? defaultDraft.emptyReason.trim() : '';
  $('savePage').disabled = !text || (!!emptyReason && text === emptyReason);
}

function renderTurns(turns) {
  const chatSection = $('chatSection');
  if (!turns || !turns.length) {
    chatSection.hidden = true;
    return;
  }
  chatSection.hidden = false;
  $('turnCount').textContent = String(turns.length);
  $('turnList').innerHTML = turns.map((turn) => `
    <article class="turn">
      <div class="turn-label">${turn.role === 'user' ? '用户' : turn.role === 'assistant' ? 'AI' : '对话'}</div>
      <p>${escapeHtml(turn.text)}</p>
    </article>
  `).join('');
}

function renderDiagnostics(capture) {
  const diagnostics = capture && capture.diagnostics ? capture.diagnostics : {};
  const section = $('aiDiagnostics');
  if (!diagnostics.supportedAiPage) {
    section.hidden = true;
    $('copyDiagnostics').disabled = true;
    $('copyEvidenceCommand').disabled = true;
    $('evidenceCommandHint').hidden = true;
    return;
  }
  section.hidden = false;
  $('copyDiagnostics').disabled = false;
  $('copyEvidenceCommand').disabled = false;
  $('evidenceCommandHint').hidden = false;
  $('aiProvider').textContent = diagnostics.provider || 'AI 页面';
  const readyForTrial = !!(diagnostics.editorFound && diagnostics.anchorFound && diagnostics.memoryWidgetVisible && diagnostics.sendFound);
  const missing = [];
  if (!diagnostics.editorFound) missing.push('输入框');
  if (!diagnostics.anchorFound || !diagnostics.memoryWidgetVisible) missing.push('记忆入口');
  if (!diagnostics.sendFound) missing.push('发送按钮');
  $('aiValidationSummary').className = `validation-summary ${readyForTrial ? 'ready' : 'needs-check'}`;
  $('aiValidationSummary').innerHTML = `
    <strong>${readyForTrial ? '页面识别正常' : '页面识别待确认'}</strong>
    <span>${readyForTrial ? '输入框、记忆入口和发送按钮都已识别。' : `还缺：${escapeHtml(missing.join('、') || '页面结构确认')}`}</span>
  `;
  const rows = [
    { label: '页面', value: diagnostics.provider || '已识别', ok: true },
    { label: '输入框', value: diagnostics.editorFound ? '可用' : '未找到', ok: !!diagnostics.editorFound },
    { label: '记忆入口', value: diagnostics.anchorFound ? '可显示' : '未找到合适位置', ok: !!diagnostics.anchorFound },
    { label: '发送按钮', value: diagnostics.sendFound ? '未受影响' : '未确认', ok: !!diagnostics.sendFound },
    { label: '输入草稿', value: `${diagnostics.promptLength || 0} 字`, ok: true },
    { label: '最近对话', value: `${diagnostics.turnCount || 0} 条`, ok: true }
  ];
  $('aiDiagnosticList').innerHTML = rows.map((row) => `
    <div class="diagnostic-row${row.ok ? '' : ' warn'}">
      <span>${escapeHtml(row.label)}</span>
      <strong>${escapeHtml(row.value)}</strong>
    </div>
  `).join('');
}

function renderRecent(items) {
  const node = $('recentList');
  if (!items || !items.length) {
    node.className = 'recent-list empty';
    node.textContent = '暂无记录';
    return;
  }
  node.className = 'recent-list';
  node.innerHTML = items.slice(0, 6).map((item) => `
    <article class="recent-item">
      <div class="recent-meta">${escapeHtml(item.typeLabel || item.host || '')} · ${item.kind === 'review' ? '待确认' : item.kind === 'lesson' ? '经验' : '记忆'}</div>
      <div class="recent-title">${escapeHtml(item.title || '未命名页面')}</div>
    </article>
  `).join('');
}

function renderCapture(capture) {
  latestCapture = capture;
  const page = capture.page || {};
  $('pageType').textContent = page.typeLabel || '网页';
  $('pageTitle').textContent = page.title || '当前页面';
  $('pageUrl').textContent = page.url || '';
  const reasons = capture.privacy && capture.privacy.reasons ? capture.privacy.reasons : [];
  $('privacy').textContent = reasons.length ? reasons.join('、') : '隐私风险低';
  $('privacy').className = `privacy ${capture.privacy && capture.privacy.risk === 'medium' ? 'medium' : 'low'}`;
  const memories = capture.candidates && capture.candidates.memories ? capture.candidates.memories : [];
  const lessons = capture.candidates && capture.candidates.lessons ? capture.candidates.lessons : [];
  $('memoryCount').textContent = String(memories.length);
  $('lessonCount').textContent = String(lessons.length);
  renderCandidateList($('memoryCandidates'), memories, 'memory');
  renderCandidateList($('lessonCandidates'), lessons, 'lesson');
  setDraft(buildDefaultDraft(capture), { defaultDraft: true });
  renderDiagnostics(capture);
  renderTurns(capture.conversation && capture.conversation.turns ? capture.conversation.turns : []);
}

async function refresh() {
  setMessage('');
  setConnectionState('checking');
  try {
    const health = await send('HEALTH');
    $('status').textContent = health && health.status === 'ok' ? '本地工作台已连接' : '本地工作台可访问';
    setConnectionState('connected');
  } catch {
    $('status').textContent = '未连接本地工作台';
    setConnectionState('offline');
  }
  try {
    renderCapture(await send('COLLECT_PAGE'));
  } catch (err) {
    $('pageTitle').textContent = '无法读取当前页面';
    $('pageUrl').textContent = err.message || '';
  }
  try {
    renderRecent(await send('RECENT_CAPTURES'));
  } catch {
    renderRecent([]);
  }
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-draft-kind]');
  if (!target) return;
  const kind = target.dataset.draftKind || 'memory';
  const page = latestCapture && latestCapture.page ? latestCapture.page : {};
  const selectedText = target.dataset.draftText || '';
  const source = latestCapture && latestCapture.conversation && latestCapture.conversation.provider
    ? latestCapture.conversation.provider
    : page.typeLabel || page.host || '浏览器';
  const lessonDraft = kind === 'lesson' ? buildBrowserLessonDraft({
    ...latestCapture,
    candidates: {
      ...(latestCapture && latestCapture.candidates ? latestCapture.candidates : {}),
      lessons: selectedText ? [selectedText] : []
    }
  }) : null;
  setDraft({
    kind,
    title: lessonDraft ? lessonDraft.title : selectedText.slice(0, 42) || page.title || '记忆候选',
    content: lessonDraft ? lessonDraft.content : [`候选事实：${selectedText}`, `依据：来自 ${source} 的具体内容`].filter(Boolean).join('\n'),
    meta: buildDraftMetaFields(latestCapture, kind)
  });
  setMessage('已放入准备保存区');
});

$('refresh').addEventListener('click', refresh);
$('connectionAction').addEventListener('click', refresh);
$('copyDiagnostics').addEventListener('click', async () => {
  try {
    await copyText(JSON.stringify(buildDiagnosticReport(latestCapture), null, 2));
    setMessage('已复制问题信息', 'ok');
  } catch (err) {
    setMessage(err.message || '复制失败', 'error');
  }
});
$('copyEvidenceCommand').addEventListener('click', async () => {
  try {
    await copyText(buildEvidenceCommand(latestCapture));
    setMessage('已复制检查步骤', 'ok');
  } catch (err) {
    setMessage(err.message || '复制失败', 'error');
  }
});
$('savePage').addEventListener('click', async () => {
  $('savePage').disabled = true;
  setMessage('正在加入待确认...');
  try {
    const title = $('draftTitle').value.trim();
    const text = $('draftContent').value.trim();
    const meta = getDraftMetaFields();
    const kind = meta.asLesson ? 'lesson' : ($('draftContent').dataset.kind || 'memory');
    if (!text) throw new Error('先确认一条要保存的内容');
    await send('SAVE_CANDIDATE', { kind, title, text, meta });
    setMessage('已加入工作台，稍后确认即可保存', 'ok');
    await refresh();
  } catch (err) {
    setMessage(err.message || '保存失败', 'error');
  } finally {
    syncSavePageState();
  }
});
$('resetDraft').addEventListener('click', () => {
  setDraft(defaultDraft);
  setMessage('已恢复为自动整理的内容');
});
$('draftContent').addEventListener('input', syncSavePageState);
$('draftProject').addEventListener('change', () => {
  $('draftMeta').textContent = draftMetaText(latestCapture, $('draftContent').dataset.kind || 'memory');
});
$('draftTags').addEventListener('input', () => {
  $('draftMeta').textContent = draftMetaText(latestCapture, $('draftContent').dataset.kind || 'memory');
});
$('draftAsLesson').addEventListener('change', () => {
  $('draftMeta').textContent = draftMetaText(latestCapture, $('draftContent').dataset.kind || 'memory');
});
$('openWorkbench').addEventListener('click', () => send('OPEN_VIEWER', { tab: 'dashboard' }).catch(() => {}));
$('openTestCards').addEventListener('click', () => send('OPEN_VIEWER', { path: AI_SITE_TEST_CARDS_PATH }).catch(() => {}));

refresh();
