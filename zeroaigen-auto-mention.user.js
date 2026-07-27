// ==UserScript==
// @name         ZeroAIGen @主体标签一键关联工具(智能检测版)
// @namespace    http://tampermonkey.net/
// @version      3.1.0
// @description  在零一/aigc.zeroaigen.cn 网页上提供独立可拖拽悬浮窗，智能检测并一键自动关联 @图x 与 @音频x
// @author       Antigravity
// @match        *://aigc.zeroaigen.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[ZeroAIGen Floating Widget v3.1.0] 已载入智能检测版！');

  // 1. 注入 CSS 样式
  const style = `
    #zero-floating-widget {
      position: fixed;
      top: 120px;
      right: 40px;
      width: 250px;
      background: rgba(17, 24, 39, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 9999999;
      user-select: none;
      overflow: hidden;
      transition: box-shadow 0.2s ease;
    }

    #zero-floating-widget:hover {
      box-shadow: 0 16px 40px rgba(16, 185, 129, 0.25);
    }

    .zero-widget-header {
      padding: 10px 14px;
      background: rgba(31, 41, 55, 0.7);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      cursor: move;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .zero-widget-title {
      font-size: 13px;
      font-weight: 700;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .zero-widget-controls {
      display: flex;
      gap: 6px;
    }

    .zero-widget-btn-icon {
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .zero-widget-btn-icon:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.15);
    }

    .zero-widget-body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* 智能状态检测指示框 */
    .zero-widget-detection-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(31, 41, 55, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
    }

    .zero-detection-label {
      color: #9ca3af;
    }

    .zero-detection-value {
      font-weight: 700;
      color: #10b981;
    }

    .zero-detection-value.empty {
      color: #6b7280;
    }

    .zero-widget-action-btn {
      width: 100%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      border: none;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .zero-widget-action-btn:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
    }

    .zero-widget-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      background: #374151;
      box-shadow: none;
    }

    .zero-widget-status {
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }

    #zero-minimized-badge {
      position: fixed;
      top: 120px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
      z-index: 9999999;
      transition: transform 0.2s ease;
    }

    #zero-minimized-badge:hover {
      transform: scale(1.1);
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
      z-index: 99999999;
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

  // 2. 统计文本框中当前有多少未关联的 @图x / @音频x
  function detectUnlinkedMentions() {
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
    if (!editor) return { count: 0, items: [] };

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const items = [];
    let node;

    while ((node = walker.nextNode())) {
      const val = node.nodeValue || '';
      const matches = Array.from(val.matchAll(/(?:@|＠)(图\d+|音频\d+)/g));
      for (const m of matches) {
        items.push(m[0]);
      }
    }

    return { count: items.length, items };
  }

  // 更新面板上的智能检测统计指示
  function updateDetectionUI() {
    const countValueEl = document.getElementById('zero-detection-count');
    const statusTextEl = document.getElementById('zero-widget-status');
    const runBtn = document.getElementById('zero-widget-action-btn');

    if (!countValueEl) return;

    const { count, items } = detectUnlinkedMentions();

    if (count > 0) {
      countValueEl.innerText = `${count} 个待处理`;
      countValueEl.className = 'zero-detection-value';
      if (statusTextEl && !runBtn.disabled) {
        statusTextEl.innerText = `点击按钮自动关联这 ${count} 个标签`;
      }
    } else {
      countValueEl.innerText = '0 个 (已全部关联)';
      countValueEl.className = 'zero-detection-value empty';
      if (statusTextEl && !runBtn.disabled) {
        statusTextEl.innerText = '文本框暂无未关联标签';
      }
    }
  }

  // 3. 创建 UI 面板
  function createFloatingWidget() {
    if (document.getElementById('zero-floating-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'zero-floating-widget';
    widget.innerHTML = `
      <div class="zero-widget-header" id="zero-widget-drag-handle">
        <div class="zero-widget-title">
          <span>⚡</span>
          <span>@标签智能关联助手</span>
        </div>
        <div class="zero-widget-controls">
          <button class="zero-widget-btn-icon" id="zero-widget-min-btn" title="最小化">一</button>
        </div>
      </div>
      <div class="zero-widget-body">
        <div class="zero-widget-detection-bar">
          <span class="zero-detection-label">未关联检测：</span>
          <span class="zero-detection-value" id="zero-detection-count">检测中...</span>
        </div>
        <button class="zero-widget-action-btn" id="zero-widget-action-btn">
          <span>⚡</span>
          <span>一键关联 @标签</span>
        </button>
        <div class="zero-widget-status" id="zero-widget-status">准备就绪</div>
      </div>
    `;

    const minBadge = document.createElement('div');
    minBadge.id = 'zero-minimized-badge';
    minBadge.title = '打开 @标签关联助手';
    minBadge.innerHTML = '⚡';
    minBadge.style.display = 'none';

    document.body.appendChild(widget);
    document.body.appendChild(minBadge);

    document.getElementById('zero-widget-action-btn').onclick = () => runAutoMentionTurbo();

    document.getElementById('zero-widget-min-btn').onclick = () => {
      widget.style.display = 'none';
      minBadge.style.display = 'flex';
    };

    minBadge.onclick = () => {
      minBadge.style.display = 'none';
      widget.style.display = 'block';
      updateDetectionUI();
    };

    makeDraggable(widget, document.getElementById('zero-widget-drag-handle'));
    updateDetectionUI();
  }

  function makeDraggable(elmnt, dragHandle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    dragHandle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
      elmnt.style.right = 'auto';
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // 4. 执行自动关联
  async function runAutoMentionTurbo() {
    const runBtn = document.getElementById('zero-widget-action-btn');
    const statusText = document.getElementById('zero-widget-status');
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');

    if (!editor) {
      showToast('❌ 未找到提示词文本框！');
      return;
    }

    // 先做一次【判空检测】
    const initialCheck = detectUnlinkedMentions();
    if (initialCheck.count === 0) {
      showToast('ℹ️ 文本框中当前没有未关联的 @标签！');
      if (statusText) statusText.innerText = '检测结果：无需关联处理';
      return;
    }

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span>🔄</span> 正在极速关联中...';
    }
    if (statusText) statusText.innerText = `正在处理 ${initialCheck.count} 个标签...`;

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

      showToast(`✅ 关联完成！成功转换 ${totalProcessed} 个标签`);
      if (statusText) statusText.innerText = `成功关联 ${totalProcessed} 个标签！`;
    } catch (err) {
      console.error('[ZeroAIGen Mention Error]', err);
      showToast('⚠️ 处理出错');
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<span>⚡</span> <span>一键关联 @标签</span>';
      }
      updateDetectionUI();
    }
  }

  // 初始化创建并定时检测文本框变化
  createFloatingWidget();
  setInterval(() => updateDetectionUI(), 1000);
})();
