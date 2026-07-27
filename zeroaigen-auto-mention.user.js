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

  // 1. 注入 CSS 样式
  const style = `
    .zero-auto-mention-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
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
      z-index: 100;
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
      top: 24px;
      right: 24px;
      background: #1f2937;
      color: #f9fafb;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      z-index: 999999;
      animation: zeroToastFade 2.5s forwards;
    }
    @keyframes zeroToastFade {
      0% { opacity: 0; transform: translateY(-10px); }
      15% { opacity: 1; transform: translateY(0); }
      85% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-10px); }
    }
  `;

  if (typeof GM_addStyle !== 'undefined') {
    GM_addStyle(style);
  } else {
    const s = document.createElement('style');
    s.innerHTML = style;
    document.head.appendChild(s);
  }

  // 2. 弹窗提示 Toast Helper
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'zero-mention-toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // 3. 动态挂载【⚡ 一键关联 @标签】按钮
  function mountButton() {
    if (document.getElementById('zero-auto-mention-btn')) return;

    // 寻找包含“匹配参考主体”文本的工具栏元素
    const allElems = document.querySelectorAll('button, div, footer, span');
    let targetParent = null;

    for (const el of allElems) {
      if (el.children.length === 0 && el.innerText && el.innerText.includes('匹配参考主体')) {
        targetParent = el.closest('div') || el.parentElement;
        break;
      }
    }

    // 备选容错：挂载到文本框父元素附近
    if (!targetParent) {
      const editor = document.querySelector('[contenteditable="true"], textarea');
      if (editor) {
        targetParent = editor.parentElement;
      }
    }

    if (targetParent && !document.getElementById('zero-auto-mention-btn')) {
      const btn = document.createElement('button');
      btn.id = 'zero-auto-mention-btn';
      btn.className = 'zero-auto-mention-btn';
      btn.type = 'button';
      btn.innerHTML = '⚡ 一键关联 @标签';
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        processAllMentions();
      };
      targetParent.appendChild(btn);
    }
  }

  // 4. 键盘事件派发辅助函数
  function dispatchKeyEvent(target, type, key, code, keyCode) {
    const event = new KeyboardEvent(type, {
      key: key,
      code: code,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 5. 核心处理逻辑：正则扫描未转换的 @图x / @音频x 并模拟 Enter
  async function processAllMentions() {
    const btn = document.getElementById('zero-auto-mention-btn');
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');

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
        showToast('ℹ️ 未检测到未关联的 @图x 或 @音频x 标签');
        return;
      }

      let count = 0;

      for (const match of matches) {
        const fullTag = match[0];
        editor.focus();

        // 模拟退格并补全最后一个字符，唤起下拉弹窗
        dispatchKeyEvent(editor, 'keydown', 'Backspace', 'Backspace', 8);
        await sleep(50);

        document.execCommand('insertText', false, fullTag.slice(-1));
        await sleep(100);

        // 派发 Enter 键事件确认选单项
        dispatchKeyEvent(editor, 'keydown', 'Enter', 'Enter', 13);
        dispatchKeyEvent(editor, 'keyup', 'Enter', 'Enter', 13);
        await sleep(150);

        count++;
      }

      showToast(`✅ 已处理 ${count} 个主体标签关联！`);
    } catch (err) {
      console.error('[ZeroAIGen Mention Error]', err);
      showToast('⚠️ 处理过程中出现异常');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '⚡ 一键关联 @标签';
      }
    }
  }

  // 监听 SPA 页面动态渲染 DOM
  const observer = new MutationObserver(() => mountButton());
  observer.observe(document.body, { childList: true, subtree: true });
  mountButton();
})();
