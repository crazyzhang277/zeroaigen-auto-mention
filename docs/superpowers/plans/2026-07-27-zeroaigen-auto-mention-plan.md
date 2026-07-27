# ZeroAIGen @主体标签自动关联油猴脚本 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Tampermonkey userscript `zeroaigen-auto-mention.user.js` that dynamically injects a "⚡ 一键关联 @标签" button onto the `aigc.zeroaigen.cn` video prompt page toolbar, enabling users to convert plain text `@图x` and `@音频x` references into native rich-text mention badge tags in bulk.

**Architecture:** A standalone Userscript listening to DOM changes via `MutationObserver`. When the prompt text area and toolbar are detected, it injects a stylized action button. Clicking the button initiates an async queue scanning unlinked `@(图|音频)\d+` text patterns, focusing the editor at each token's end, dispatching KeyboardEvents (`input`/`keydown` + `Enter`) to trigger the candidate popover, and replacing plain text with rich entity badges.

**Tech Stack:** JavaScript (ES6+), Tampermonkey / Violentmonkey Userscript APIs (`GM_addStyle`).

## Global Constraints

- Domain match: `*://aigc.zeroaigen.cn/*`
- Non-blocking async queue: process items sequentially with ~100ms interval to prevent UI freezes.
- Timeout protection: max 300ms waiting for dropdown popover per item before skipping non-existent assets (e.g. `@图99`).

---

### Task 1: Scaffold Userscript Repository File Structure

**Files:**
- Create: `zeroaigen-auto-mention.user.js`

**Interfaces:**
- Consumes: UserScript Engine Execution
- Produces: Base script template with Userscript Metadata Header

- [ ] **Step 1: Create `zeroaigen-auto-mention.user.js` with Userscript header and IIFE shell**

```javascript
// ==UserScript==
// @name         ZeroAIGen @主体标签自动关联工具
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  在零一/aigc.zeroaigen.cn 文本框中一键将 @图x 和 @音频x 自动关联为实体标签
// @author       Antigravity
// @match        *://aigc.zeroaigen.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';
  console.log('[ZeroAIGen Mention Script] Initialized.');
})();
```

- [ ] **Step 2: Verify syntax via Node / Lint**

Run: `node -c zeroaigen-auto-mention.user.js`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add zeroaigen-auto-mention.user.js
git commit -m "feat: scaffold tampermonkey userscript shell"
```

---

### Task 2: Implement UI Button Injection & Styling

**Files:**
- Modify: `zeroaigen-auto-mention.user.js`

**Interfaces:**
- Consumes: DOM nodes on `aigc.zeroaigen.cn`
- Produces: `injectButton()` & `showToast(msg)` UI helpers

- [ ] **Step 1: Implement CSS styles and UI injection logic in `zeroaigen-auto-mention.user.js`**

```javascript
// Add custom styles for the injected button and notification toasts
if (typeof GM_addStyle !== 'undefined') {
  GM_addStyle(`
    .zero-auto-mention-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
      transition: all 0.2s ease;
      margin-left: 8px;
      user-select: none;
    }
    .zero-auto-mention-btn:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
    }
    .zero-auto-mention-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .zero-mention-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1f2937;
      color: #f9fafb;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      z-index: 99999;
      animation: fadeInOut 2.5s forwards;
    }
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(-10px); }
      15% { opacity: 1; transform: translateY(0); }
      85% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-10px); }
    }
  `);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'zero-mention-toast';
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
```

- [ ] **Step 2: Add DOM Observer to mount button next to prompt toolbar**

```javascript
function mountButton() {
  if (document.getElementById('zero-auto-mention-btn')) return;

  // Locate the target toolbar or container near '匹配参考主体'
  const containers = document.querySelectorAll('div, footer, section');
  let targetContainer = null;

  for (const el of containers) {
    if (el.innerText && el.innerText.includes('匹配参考主体')) {
      targetContainer = el.parentElement || el;
      break;
    }
  }

  if (!targetContainer) {
    // Fallback: search for textarea / contenteditable wrapper
    const editor = document.querySelector('[contenteditable="true"], textarea');
    if (editor && editor.parentElement) {
      targetContainer = editor.parentElement;
    }
  }

  if (targetContainer) {
    const btn = document.createElement('button');
    btn.id = 'zero-auto-mention-btn';
    btn.className = 'zero-auto-mention-btn';
    btn.innerHTML = '⚡ 一键关联 @标签';
    btn.onclick = () => window.processAllMentions();
    targetContainer.appendChild(btn);
  }
}

const observer = new MutationObserver(() => mountButton());
observer.observe(document.body, { childList: true, subtree: true });
mountButton();
```

- [ ] **Step 3: Test syntax and commit**

Run: `node -c zeroaigen-auto-mention.user.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add zeroaigen-auto-mention.user.js
git commit -m "feat: add button injection and toast styling logic"
```

---

### Task 3: Implement Mentions Parser & Keyboard Simulation Event Logic

**Files:**
- Modify: `zeroaigen-auto-mention.user.js`

**Interfaces:**
- Consumes: Target editor element
- Produces: `processAllMentions()` core algorithm

- [ ] **Step 1: Add mention parsing & simulation logic to `zeroaigen-auto-mention.user.js`**

```javascript
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findEditor() {
  return document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
}

function dispatchKey(target, key, code, keyCode) {
  const eventInit = { key, code, keyCode, bubbles: true, cancelable: true };
  target.dispatchEvent(new KeyboardEvent('keydown', eventInit));
  target.dispatchEvent(new KeyboardEvent('keypress', eventInit));
  target.dispatchEvent(new KeyboardEvent('keyup', eventInit));
}

async function processAllMentions() {
  const btn = document.getElementById('zero-auto-mention-btn');
  const editor = findEditor();

  if (!editor) {
    showToast('❌ 未找到提示词文本框！');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = '🔄 正在关联中...';
  }

  try {
    const pattern = /(?:@|＠)(图\d+|音频\d+)/g;
    let text = editor.isContentEditable ? editor.innerText : editor.value;
    let matches = Array.from(text.matchAll(pattern));

    if (matches.length === 0) {
      showToast('ℹ️ 未检测到需要关联的 @图x 或 @音频x 标签');
      return;
    }

    let successCount = 0;

    for (const match of matches) {
      const fullTag = match[0]; // e.g. "@图1"
      const label = match[1];   // e.g. "图1"

      editor.focus();

      // Trigger candidate dropdown by replacing or placing selection
      // 1. Move cursor / selection to the mention
      // 2. Dispatch @ input or enter key
      dispatchKey(editor, 'Backspace', 'Backspace', 8);
      await sleep(50);

      // Re-type last character to re-trigger mention menu dropdown
      document.execCommand('insertText', false, fullTag.slice(-1));
      await sleep(120);

      // Dispatch Enter to confirm selection in the popover
      dispatchKey(editor, 'Enter', 'Enter', 13);
      await sleep(150);

      successCount++;
    }

    showToast(`✅ 已处理 ${successCount} 个标签关联！`);
  } catch (err) {
    console.error('[ZeroAIGen Mention Error]', err);
    showToast('⚠️ 部分标签关联失败');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '⚡ 一键关联 @标签';
    }
  }
}

window.processAllMentions = processAllMentions;
```

- [ ] **Step 2: Verify code syntax**

Run: `node -c zeroaigen-auto-mention.user.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add zeroaigen-auto-mention.user.js
git commit -m "feat: implement async mention scanning and event simulation"
```

---

### Task 4: Complete Documentation & Final Delivery

**Files:**
- Create: `README.md`
- Modify: `zeroaigen-auto-mention.user.js`

**Interfaces:**
- Consumes: Completed Userscript
- Produces: Installation instructions and user documentation

- [ ] **Step 1: Create `README.md` with install & usage instructions**

```markdown
# ZeroAIGen @主体标签自动关联油猴脚本

本油猴脚本专门用于 **aigc.zeroaigen.cn** 的 AI 视频提示词生成界面。

## 🌟 功能特性
- **自动识别**：扫描文本框中的所有 `@图x`（如 `@图1`、`@图6`）和 `@音频x`（如 `@音频1`）。
- **一键关联**：在文本框左下角新增 `⚡ 一键关联 @标签` 按钮，自动定位并按 Enter 转换为官方原生绿标卡片。
- **防止误触发**：按需点击关联，不影响正常粘贴与打字。

## 📦 安装说明
1. 浏览器安装 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 插件。
2. 新建脚本，将 `zeroaigen-auto-mention.user.js` 内容复制粘贴并保存。
3. 打开或刷新 `https://aigc.zeroaigen.cn/dashboard/universal` 页面即可使用！
```

- [ ] **Step 2: Commit documentation and complete tasks**

```bash
git add README.md
git commit -m "docs: add user installation guide"
```
