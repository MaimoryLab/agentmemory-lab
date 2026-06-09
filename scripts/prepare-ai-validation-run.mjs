import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const evidenceDir = 'docs/validation/browser-extension-ai-sites';
const outDir = 'artifacts/ai-validation-run';
const requiredProducts = [
  {
    product: 'ChatGPT',
    domains: 'chatgpt.com / chat.openai.com',
    prompt: '帮我找一下我们之前关于浏览器插件和本地记忆的产品决策。'
  },
  {
    product: 'Claude',
    domains: 'claude.ai',
    prompt: '总结一下 Agent Memory Lab 的插件交付还差哪些真实站点证据。'
  },
  {
    product: 'Gemini',
    domains: 'gemini.google.com',
    prompt: '基于我的本地记忆，帮我整理浏览器插件的下一步验收计划。'
  },
  {
    product: 'Perplexity',
    domains: 'perplexity.ai / www.perplexity.ai',
    prompt: '检索并结合我的本地记忆，说明多 AI 网页记忆插件应该怎么验收。'
  }
];

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : 'unknown';
}

function readJson(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function providerSlug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function passedProducts(summary) {
  return new Set(Array.isArray(summary.passedRequired) ? summary.passedRequired : []);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

const commit = git(['rev-parse', '--short', 'HEAD']);
const branch = git(['branch', '--show-current']);
const delivery = readJson('artifacts/delivery-manifest.json');
const evidence = readJson('artifacts/ai-validation-evidence-summary.json', { passedRequired: [], passedCount: 0, requiredCount: 4 });
const passed = passedProducts(evidence);
const today = dateStamp();

mkdirSync(outDir, { recursive: true });

const rows = requiredProducts.map((item) => {
  const slug = providerSlug(item.product);
  const passedAlready = passed.has(item.product);
  const evidencePath = `${evidenceDir}/${today}-${slug}.json`;
  return { ...item, slug, passedAlready, evidencePath };
});

const checklist = `# Agent Memory Lab 真实 AI 站点验收清单

生成时间：${new Date().toISOString()}

| 项目 | 值 |
| --- | --- |
| Branch | ${branch} |
| Commit | ${commit} |
| Extension | ${delivery.extension?.name || 'Agent Memory Lab'} ${delivery.extension?.version || ''} |
| 当前真实证据 | ${evidence.passedCount || 0}/${evidence.requiredCount || requiredProducts.length} |

## 开始前

1. 启动本地工作台：

   \`\`\`bash
   npm run build
   npm run start
   \`\`\`

2. 在 Chrome / Edge 开发者模式加载 \`browser-extension/\`。
3. 打开插件同步侧栏，确认本地连接正常。
4. 每个站点都点击“复制问题信息”和“复制检查步骤”。
5. 不要提交私人聊天全文、Cookie、Token、账号信息或学校申请材料。

## 必测站点

${rows.map((item, index) => `### ${index + 1}. ${item.product}

- 目标域名：${item.domains}
- 建议 prompt：\`${item.prompt}\`
- 当前状态：${item.passedAlready ? '已有通过证据' : '待验收'}
- 建议证据文件：\`${item.evidencePath}\`
- 保存命令：

  \`\`\`bash
  npm run wizard:ai-validation-evidence -- --clipboard --provider "${item.product}"
  npm run check:ai-validation-evidence
  npm run sync:ai-validation-table
  \`\`\`

通过前必须确认：Provider 正确、输入框已找到、输入框附近出现记忆建议、记忆可插入或复制、原站输入和发送不受影响。
`).join('\n')}

## 收尾检查

\`\`\`bash
npm run check:ai-validation-evidence
npm run sync:ai-validation-table
npm run status:delivery
\`\`\`

四个必测站点都通过后，真实站点证据才会从 \`0/4\` 变成 \`4/4\`，公开发布门槛才可能解除。
`;

const json = {
  generatedAt: new Date().toISOString(),
  branch,
  commit,
  extension: delivery.extension || {},
  currentEvidence: {
    passedCount: evidence.passedCount || 0,
    requiredCount: evidence.requiredCount || requiredProducts.length,
    passedRequired: Array.from(passed)
  },
  targets: rows
};

writeFileSync(`${outDir}/checklist-cn.md`, checklist);
writeFileSync(`${outDir}/targets.json`, JSON.stringify(json, null, 2));

console.log('AI validation run prepared');
console.log(`${outDir}/checklist-cn.md`);
console.log(`${outDir}/targets.json`);
console.log(`remaining: ${rows.filter((item) => !item.passedAlready).map((item) => item.product).join(', ') || 'none'}`);
