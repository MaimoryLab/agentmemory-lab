import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class FakeEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = !!options.bubbles;
    this.inputType = options.inputType || '';
    this.data = options.data || '';
    this.target = null;
  }
}

class FakeNode {
  constructor(tagName = 'div', attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.style = {};
    this.__agentMemoryBound = false;
    this.textContent = attrs.textContent || '';
    if (Object.prototype.hasOwnProperty.call(attrs, 'value')) this.value = attrs.value;
    this.isShadowRoot = false;
  }

  get id() {
    return this.attributes.id || '';
  }

  get className() {
    return this.attributes.class || '';
  }

  set className(value) {
    this.attributes.class = value;
  }

  get innerText() {
    if (Object.prototype.hasOwnProperty.call(this, 'value')) return this.value;
    return this.textContent || this.children.map((child) => child.innerText || '').join('');
  }

  set innerText(value) {
    this.textContent = String(value || '');
  }

  get innerHTML() {
    return this._innerHTML || this.children.map((child) => child.innerHTML || child.textContent || '').join('');
  }

  set innerHTML(html) {
    this._innerHTML = String(html || '');
    this.children = [];
    parseHtmlInto(this, this._innerHTML);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    const list = this.listeners.get(type) || [];
    list.push(handler);
    this.listeners.set(type, list);
  }

  dispatchEvent(event) {
    event.target = event.target || this;
    for (const handler of this.listeners.get(event.type) || []) handler.call(this, event);
    if (event.bubbles && this.parentElement) this.parentElement.dispatchEvent(event);
    return true;
  }

  click() {
    this.dispatchEvent(new FakeEvent('click', { bubbles: true }));
  }

  focus() {}

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  attachShadow() {
    const root = new FakeNode('#shadow-root');
    root.isShadowRoot = true;
    root.host = this;
    this.shadowRoot = root;
    return root;
  }

  querySelector(selector) {
    return queryAll(this, selector)[0] || null;
  }

  querySelectorAll(selector) {
    return queryAll(this, selector);
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (matchesSelector(node, selector)) return node;
      node = node.parentElement;
    }
    return null;
  }

  contains(target) {
    if (target === this) return true;
    return this.children.some((child) => child.contains(target));
  }

  getBoundingClientRect() {
    return { top: 520, right: 760, bottom: 590, left: 240, width: 520, height: 70 };
  }
}

function parseHtmlInto(parent, html) {
  const stack = [parent];
  const tokenRe = /<\/?[^>]+>|[^<]+/g;
  let match;
  while ((match = tokenRe.exec(html))) {
    const token = match[0];
    if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (!token.startsWith('<')) {
      const text = token.replace(/\s+/g, ' ').trim();
      if (text) stack[stack.length - 1].textContent += text;
      continue;
    }
    const tagMatch = token.match(/^<\s*([a-z0-9-]+)/i);
    if (!tagMatch) continue;
    const attrs = {};
    const attrRe = /([a-z0-9:-]+)=("[^"]*"|'[^']*')/gi;
    let attrMatch;
    while ((attrMatch = attrRe.exec(token))) {
      attrs[attrMatch[1]] = attrMatch[2].slice(1, -1);
    }
    const node = new FakeNode(tagMatch[1], attrs);
    stack[stack.length - 1].appendChild(node);
    if (!token.endsWith('/>') && !['path', 'input', 'br', 'img', 'meta', 'link'].includes(tagMatch[1].toLowerCase())) {
      stack.push(node);
    }
  }
}

function walk(root, out = []) {
  for (const child of root.children || []) {
    out.push(child);
    walk(child, out);
  }
  return out;
}

function queryAll(root, selector) {
  const selectors = String(selector || '').split(',').map((item) => item.trim()).filter(Boolean);
  const nodes = walk(root);
  return nodes.filter((node) => selectors.some((item) => matchesSelector(node, item)));
}

function matchesSelector(node, selector) {
  if (!selector || !node || node.tagName === '#SHADOW-ROOT') return false;
  const parts = selector.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return matchesDescendantSelector(node, parts);
  return matchesSimpleSelector(node, selector);
}

function matchesDescendantSelector(node, parts) {
  if (!matchesSimpleSelector(node, parts[parts.length - 1])) return false;
  let parent = node.parentElement;
  for (let i = parts.length - 2; i >= 0; i -= 1) {
    while (parent && !matchesSimpleSelector(parent, parts[i])) parent = parent.parentElement;
    if (!parent) return false;
    parent = parent.parentElement;
  }
  return true;
}

function matchesSimpleSelector(node, selector) {
  if (selector.startsWith('#')) return node.id === selector.slice(1);
  const attrMatches = [...selector.matchAll(/\[([^\]=*~^$|]+)(\*?=)?"?([^"\]]*)"?\]/g)];
  const classMatch = selector.match(/\.([a-z0-9_-]+)/i);
  const tagMatch = selector.match(/^([a-z0-9-]+)/i);
  if (tagMatch && node.tagName.toLowerCase() !== tagMatch[1].toLowerCase()) return false;
  if (classMatch && !String(node.className || '').split(/\s+/).includes(classMatch[1])) return false;
  for (const match of attrMatches) {
    const value = node.getAttribute(match[1].trim());
    if (value === null) return false;
    if (match[2] === '=' && value !== match[3]) return false;
    if (match[2] === '*=' && !value.includes(match[3])) return false;
  }
  if (!tagMatch && !classMatch && !attrMatches.length) return node.tagName.toLowerCase() === selector.toLowerCase();
  return true;
}

const documentElement = new FakeNode('html');
const body = new FakeNode('body');
documentElement.appendChild(body);
const main = new FakeNode('main');
const form = new FakeNode('form');
const editor = new FakeNode('div', {
  id: 'agentmemory-demo-input',
  contenteditable: 'true',
  textContent: '我们如何向外部试用者解释插件预览？'
});
form.appendChild(editor);
main.appendChild(new FakeNode('article', { 'data-message-author-role': 'user', textContent: 'We need a local preview for external testers.' }));
main.appendChild(new FakeNode('article', { 'data-message-author-role': 'assistant', textContent: 'Use the memory hint near the prompt.' }));
main.appendChild(form);
body.appendChild(main);

const document = {
  title: 'Agent Memory Lab 插件预览',
  documentElement,
  body,
  createElement: (tag) => new FakeNode(tag),
  querySelector: (selector) => documentElement.querySelector(selector),
  querySelectorAll: (selector) => documentElement.querySelectorAll(selector),
  addEventListener: () => {},
  createRange: () => ({ selectNodeContents: () => {}, collapse: () => {}, deleteContents: () => {}, insertNode: () => {} }),
  queryCommandSupported: () => false,
  execCommand: () => false
};

let mutationObserverCallback = null;
class FakeMutationObserver {
  constructor(callback) {
    mutationObserverCallback = callback;
  }
  observe() {}
}

const context = vm.createContext({
  document,
  location: { hostname: 'localhost', pathname: '/demo/browser-extension.html', href: 'http://localhost:3113/demo/browser-extension.html' },
  window: {
    innerWidth: 1200,
    addEventListener: () => {},
    getSelection: () => null
  },
  navigator: { clipboard: { writeText: async () => {} } },
  chrome: { runtime: { onMessage: { addListener: () => {} }, sendMessage: () => {} } },
  MutationObserver: FakeMutationObserver,
  InputEvent: FakeEvent,
  Event: FakeEvent,
  Text: class FakeText {},
  setTimeout,
  clearTimeout,
  console
});

vm.runInContext(readFileSync('browser-extension/content-script.js', 'utf8'), context, { filename: 'content-script.js' });
if (mutationObserverCallback) mutationObserverCallback([]);

const widget = documentElement.querySelector('agent-memory-lab-widget');
assert(widget, 'Memory widget was not created on the demo page.');
const root = widget.shadowRoot;
assert(root, 'Memory widget shadow root was not created.');
const trigger = root.querySelector('.trigger');
assert(trigger && trigger.innerText.includes('记忆建议'), 'Memory suggestion trigger missing.');

editor.textContent = '浏览器插件如何预览';
editor.dispatchEvent(new FakeEvent('input', { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 520));

const bodyNode = root.querySelector('.body');
assert(bodyNode && bodyNode.innerHTML.includes('浏览器插件方向'), 'Demo memories were not rendered after typing.');
const insertButton = root.querySelector('[data-insert-memory="0"]');
assert(insertButton, 'Insert button was not rendered for demo memory.');
insertButton.click();
assert(editor.textContent.includes('[本地记忆]'), 'Insert action did not add a local memory snippet to the editor.');

console.log('browser extension demo interaction ok');
