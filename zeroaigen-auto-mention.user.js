// ==UserScript==
// @name         ZeroAIGen @主体标签一键关联工具(极速版)
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  在零一/aigc.zeroaigen.cn 文本框中一键将 @图x 和 @音频x 自动关联为实体标签
// @author       Antigravity
// @match        *://aigc.zeroaigen.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[ZeroAIGen Mention Userscript v2.0] 已成功加载！');

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
      border-radius: 20px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      transition: all 0.2s ease;
      user-select: none;
      z-index: 999999;
    }
    .zero-auto-mention-btn:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.55);
    }
    .zero-auto-mention-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    /* 右下角固定悬浮按钮 */
    #zero-fixed-mention-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      padding: 10px 20px;
      font-size: 14px;
    }

    .zero-mention-toast {
      position: fixed;
      top: 24px;
      right: 24px;
      background: #111827;
      color: #10b981;
      border: 1px solid #059669;
      padding: 12px 22px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      z-index: 9999999;
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

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'zero-mention-toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // 2. 挂载按钮（右下角悬浮按钮保障 + 文本框内工具栏挂载）
  function mountButtons() {
    // 右下角全局悬浮按钮
    if (!document.getElementById('zero-fixed-mention-btn')) {
      const fixedBtn = document.createElement('button');
      fixedBtn.id = 'zero-fixed-mention-btn';
      fixedBtn.className = 'zero-auto-mention-btn';
      fixedBtn.type = 'button';
      fixedBtn.innerHTML = '⚡ 一键关联 @标签';
      fixedBtn.onclick = (e) => {
        e.preventDefault();
        runAutoMentionTurbo();
      };
      document.body.appendChild(fixedBtn);
    }

    // 文本框工具栏按钮
    if (!document.getElementById('zero-auto-mention-btn')) {
      const allElems = document.querySelectorAll('button, div, footer, span');
      let targetParent = null;

      for (const el of allElems) {
        if (el.children.length === 0 && el.innerText && el.innerText.trim() === '匹配参考主体') {
          targetParent = el.closest('div') || el.parentElement;
          break;
        }
      }

      if (targetParent) {
        const toolbarBtn = document.createElement('button');
        toolbarBtn.id = 'zero-auto-mention-btn';
        toolbarBtn.className = 'zero-auto-mention-btn';
        toolbarBtn.type = 'button';
        toolbarBtn.style.margin = '0 8px';
        toolbarBtn.innerHTML = '⚡ 一键关联 @标签';
        toolbarBtn.onclick = (e) => {
          e.preventDefault();
          runAutoMentionTurbo();
        };
        targetParent.appendChild(toolbarBtn);
      }
    }
  }

  // 3. 验证通过的极速全量转换核心算法
  async function runAutoMentionTurbo() {
    const btn1 = document.getElementById('zero-auto-mention-btn');
    const btn2 = document.getElementById('zero-fixed-mention-btn');
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');

    if (!editor) {
      showToast('❌ 未找到提示词文本框！');
      return;
    }

    [btn1, btn2].forEach((btn) => {
      if (btn) {
        btn.disabled = true;
        btn.innerText = '🔄 正在关联中...';
      }
    });

    let totalProcessed = 0;
    const maxLoops = 60;
    const evEnter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });

    try {
      for (let i = 0; i < maxLoops; i++) {
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
        let targetNode = null;
        let targetMatch = null;
        let node;

        while ((node = walker.nextNode())) {
          const val = node.nodeValue || '';
          const m = /(?:@|＠)(图\d+|音频\d+)/.exec(val);
          if (m) {
            targetNode = node;
            targetMatch = m;
            break;
          }
        }

        if (!targetNode || !targetMatch) break;

        const matchText = targetMatch[0];
        const matchIndex = targetMatch.index;

        if (matchIndex + matchText.length > targetNode.nodeValue.length) continue;

        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(targetNode, matchIndex);
          range.setEnd(targetNode, matchIndex + matchText.length);
          sel.removeAllRanges();
          sel.addRange(range);

          editor.focus();

          document.execCommand('insertText', false, matchText.slice(0, -1));
          await new Promise((r) => setTimeout(r, 15));

          document.execCommand('insertText', false, matchText.slice(-1));
          await new Promise((r) => setTimeout(r, 25));

          editor.dispatchEvent(evEnter);
          await new Promise((r) => setTimeout(r, 35));

          totalProcessed++;
        } catch (err) {
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      if (totalProcessed > 0) {
        showToast(`✅ 极速关联完成！共转换 ${totalProcessed} 个标签`);
      } else {
        showToast('ℹ️ 文本框中未发现未关联的 @ 标签');
      }
    } catch (err) {
      console.error('[ZeroAIGen Mention Error]', err);
      showToast('⚠️ 处理出错');
    } finally {
      [btn1, btn2].forEach((btn) => {
        if (btn) {
          btn.disabled = false;
          btn.innerText = '⚡ 一键关联 @标签';
        }
      });
    }
  }

  // 监听 SPA DOM 渲染挂载按钮
  const observer = new MutationObserver(() => mountButtons());
  observer.observe(document.body, { childList: true, subtree: true });
  mountButtons();
})();
