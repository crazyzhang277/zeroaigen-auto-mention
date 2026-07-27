// ==UserScript==
// @name         ZeroAIGen @主体标签一键关联工具(悬浮窗面板版)
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  在零一/aigc.zeroaigen.cn 网页上提供独立可拖拽悬浮窗，一键自动关联 @图x 与 @音频x
// @author       Antigravity
// @match        *://aigc.zeroaigen.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[ZeroAIGen Floating Widget v3.0] 已载入！');

  // 1. 注入悬浮窗专属毛玻璃高颜值 CSS 样式
  const style = `
    /* 悬浮窗主容器 */
    #zero-floating-widget {
      position: fixed;
      top: 120px;
      right: 40px;
      width: 240px;
      background: rgba(17, 24, 39, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 9999999;
      user-select: none;
      overflow: hidden;
      transition: box-shadow 0.2s ease;
    }

    #zero-floating-widget:hover {
      box-shadow: 0 16px 40px rgba(16, 185, 129, 0.2);
    }

    /* 拖拽标题栏 */
    .zero-widget-header {
      padding: 10px 14px;
      background: rgba(31, 41, 55, 0.6);
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

    /* 主体内容区 */
    .zero-widget-body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* 一键关联核心按钮 */
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
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .zero-widget-status {
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }

    /* 最小化展开悬浮球 */
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

  // 2. 创建可拖拽悬浮窗 UI
  function createFloatingWidget() {
    if (document.getElementById('zero-floating-widget')) return;

    // A. 悬浮窗主面板
    const widget = document.createElement('div');
    widget.id = 'zero-floating-widget';
    widget.innerHTML = `
      <div class="zero-widget-header" id="zero-widget-drag-handle">
        <div class="zero-widget-title">
          <span>⚡</span>
          <span>@标签自动关联助手</span>
        </div>
        <div class="zero-widget-controls">
          <button class="zero-widget-btn-icon" id="zero-widget-min-btn" title="最小化">一</button>
        </div>
      </div>
      <div class="zero-widget-body" id="zero-widget-body">
        <button class="zero-widget-action-btn" id="zero-widget-run-btn">
          <span>⚡</span>
          <span>一键关联 @标签</span>
        </button>
        <div class="zero-widget-status" id="zero-widget-status">就绪：粘贴提示词后点击处理</div>
      </div>
    `;

    // B. 最小化悬浮球
    const minBadge = document.createElement('div');
    minBadge.id = 'zero-minimized-badge';
    minBadge.title = '打开 @标签关联助手';
    minBadge.innerHTML = '⚡';
    minBadge.style.display = 'none';

    document.body.appendChild(widget);
    document.body.appendChild(minBadge);

    // 绑定事件
    document.getElementById('zero-widget-run-btn').onclick = () => runAutoMentionTurbo();

    document.getElementById('zero-widget-min-btn').onclick = () => {
      widget.style.display = 'none';
      minBadge.style.display = 'flex';
    };

    minBadge.onclick = () => {
      minBadge.style.display = 'none';
      widget.style.display = 'block';
    };

    // 实现悬浮窗自由拖拽逻辑
    makeDraggable(widget, document.getElementById('zero-widget-drag-handle'));
  }

  // 拖拽算法
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
      elmnt.style.right = 'auto'; // 清除右定位
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // 3. 验证通过的极速全量转换核心算法
  async function runAutoMentionTurbo() {
    const runBtn = document.getElementById('zero-widget-run-btn');
    const statusText = document.getElementById('zero-widget-status');
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');

    if (!editor) {
      showToast('❌ 未找到提示词文本框！');
      if (statusText) statusText.innerText = '错误：未找到文本框';
      return;
    }

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span>🔄</span> 正在极速关联中...';
    }
    if (statusText) statusText.innerText = '正在扫描并关联标签...';

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
        showToast(`✅ 关联完成！共转换 ${totalProcessed} 个标签`);
        if (statusText) statusText.innerText = `成功转换 ${totalProcessed} 个标签！`;
      } else {
        showToast('ℹ️ 文本框中未发现未关联的 @ 标签');
        if (statusText) statusText.innerText = '未发现未关联标签';
      }
    } catch (err) {
      console.error('[ZeroAIGen Mention Error]', err);
      showToast('⚠️ 处理出错');
      if (statusText) statusText.innerText = '处理过程出现异常';
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<span>⚡</span> <span>一键关联 @标签</span>';
      }
    }
  }

  // 初始化创建悬浮窗
  createFloatingWidget();
})();
