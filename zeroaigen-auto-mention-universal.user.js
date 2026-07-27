// ==UserScript==
// @name         AI 视频提示词 @主体标签通用一键关联工具
// @namespace    http://tampermonkey.net/
// @version      4.0.0
// @description  通用支持各大 AI 视频/图片生成平台（即梦、零一、可灵、智谱等），一键将提示词中 @图x 与 @音频x 自动关联为原生实体标签
// @author       Antigravity
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // 1. 注入通用悬浮窗面板样式
  const style = `
    #universal-mention-widget {
      position: fixed;
      top: 120px;
      right: 30px;
      width: 260px;
      background: rgba(17, 24, 39, 0.94);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(16, 185, 129, 0.45);
      border-radius: 14px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 99999999;
      user-select: none;
      overflow: hidden;
      transition: all 0.25s ease;
    }

    #universal-mention-widget:hover {
      box-shadow: 0 16px 44px rgba(16, 185, 129, 0.3);
    }

    .universal-widget-header {
      padding: 10px 14px;
      background: rgba(31, 41, 55, 0.8);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      cursor: move;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .universal-widget-title {
      font-size: 13px;
      font-weight: 700;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .universal-widget-controls {
      display: flex;
      gap: 6px;
    }

    .universal-widget-btn-icon {
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

    .universal-widget-btn-icon:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.15);
    }

    .universal-widget-body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .universal-widget-detection-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(31, 41, 55, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
    }

    .universal-detection-label {
      color: #9ca3af;
    }

    .universal-detection-value {
      font-weight: 700;
      color: #10b981;
    }

    .universal-detection-value.empty {
      color: #6b7280;
    }

    .universal-detection-value.warn {
      color: #f59e0b;
    }

    .universal-widget-action-btn {
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

    .universal-widget-action-btn:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
    }

    .universal-widget-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      background: #374151;
      box-shadow: none;
    }

    .universal-widget-status {
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
      line-height: 1.4;
    }

    #universal-minimized-badge {
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
      z-index: 99999999;
      transition: transform 0.2s ease;
    }

    #universal-minimized-badge:hover {
      transform: scale(1.1);
    }

    .universal-toast {
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
      z-index: 999999999;
      animation: universalToastFade 2.8s forwards;
    }

    @keyframes universalToastFade {
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
    toast.className = 'universal-toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  // 2. 通用资产查找与文本框扫描（支持中英文 @图x, @音频x, @ImageX, @AudioX, @imgX）
  const MENTION_REGEX = /(?:@|＠)(图\d+|音频\d+|Image\d+|Audio\d+|img\d+)/gi;

  function findActiveEditor() {
    // 优先匹配当前获得焦点的编辑器，或页面上的富文本框
    const active = document.activeElement;
    if (active && (active.isContentEditable || active.tagName === 'TEXTAREA')) {
      return active;
    }
    return (
      document.querySelector('[contenteditable="true"]') ||
      document.querySelector('textarea') ||
      document.querySelector('input[type="text"]')
    );
  }

  function getAvailableAssets() {
    const assetElems = document.querySelectorAll('div, span, p, b, button');
    const availableTags = new Set();

    for (const el of assetElems) {
      if (el.children.length === 0 && el.innerText) {
        const text = el.innerText.trim();
        if (/^(图|音频|Image|Audio|img)\d+$/i.test(text)) {
          availableTags.add(text.toLowerCase());
        }
      }
    }
    return availableTags;
  }

  function detectUnlinkedMentions() {
    const editor = findActiveEditor();
    if (!editor) return { count: 0, validItems: [], invalidItems: [], availableAssets: new Set() };

    const availableAssets = getAvailableAssets();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const validItems = [];
    const invalidItems = [];

    let node;
    while ((node = walker.nextNode())) {
      const val = node.nodeValue || '';
      const matches = Array.from(val.matchAll(MENTION_REGEX));
      for (const m of matches) {
        const tagText = m[1].toLowerCase();
        if (availableAssets.size === 0 || availableAssets.has(tagText)) {
          validItems.push(m[0]);
        } else {
          invalidItems.push(m[0]);
        }
      }
    }

    return {
      count: validItems.length + invalidItems.length,
      validCount: validItems.length,
      invalidCount: invalidItems.length,
      validItems,
      invalidItems,
      availableAssets
    };
  }

  function updateDetectionUI() {
    const countValueEl = document.getElementById('universal-detection-count');
    const statusTextEl = document.getElementById('universal-widget-status');
    const runBtn = document.getElementById('universal-widget-action-btn');

    if (!countValueEl) return;

    const { validCount, invalidCount, invalidItems } = detectUnlinkedMentions();

    if (validCount > 0) {
      countValueEl.innerText = `${validCount} 个可关联`;
      countValueEl.className = 'universal-detection-value';
      if (invalidCount > 0) {
        countValueEl.innerText += ` (${invalidCount}个未找到素材)`;
        countValueEl.className = 'universal-detection-value warn';
      }
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = `找到 ${validCount} 个未转换标签`;
      }
    } else if (invalidCount > 0) {
      countValueEl.innerText = `0 可关联 (${invalidCount}个超界)`;
      countValueEl.className = 'universal-detection-value warn';
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = `素材未匹配: ${invalidItems.join(', ')}`;
      }
    } else {
      countValueEl.innerText = '0 个 (已全部关联)';
      countValueEl.className = 'universal-detection-value empty';
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = '文本框暂无未关联标签';
      }
    }
  }

  // 3. 通用 UI 悬浮窗面板
  function createFloatingWidget() {
    if (document.getElementById('universal-mention-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'universal-mention-widget';
    widget.innerHTML = `
      <div class="universal-widget-header" id="universal-widget-drag-handle">
        <div class="universal-widget-title">
          <span>⚡</span>
          <span>AI @标签通用关联助手</span>
        </div>
        <div class="universal-widget-controls">
          <button class="universal-widget-btn-icon" id="universal-widget-min-btn" title="最小化">一</button>
        </div>
      </div>
      <div class="universal-widget-body">
        <div class="universal-widget-detection-bar">
          <span class="universal-detection-label">未关联检测：</span>
          <span class="universal-detection-value" id="universal-detection-count">检测中...</span>
        </div>
        <button class="universal-widget-action-btn" id="universal-widget-action-btn">
          <span>⚡</span>
          <span>一键关联 @标签</span>
        </button>
        <div class="universal-widget-status" id="universal-widget-status">通用模式就绪</div>
      </div>
    `;

    const minBadge = document.createElement('div');
    minBadge.id = 'universal-minimized-badge';
    minBadge.title = '展开 @标签通用关联助手';
    minBadge.innerHTML = '⚡';
    minBadge.style.display = 'none';

    document.body.appendChild(widget);
    document.body.appendChild(minBadge);

    document.getElementById('universal-widget-action-btn').onclick = () => runUniversalAutoMention();

    document.getElementById('universal-widget-min-btn').onclick = () => {
      widget.style.display = 'none';
      minBadge.style.display = 'flex';
    };

    minBadge.onclick = () => {
      minBadge.style.display = 'none';
      widget.style.display = 'block';
      updateDetectionUI();
    };

    makeDraggable(widget, document.getElementById('universal-widget-drag-handle'));
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

  // 4. 通用极速全量转换引擎
  async function runUniversalAutoMention() {
    const runBtn = document.getElementById('universal-widget-action-btn');
    const statusText = document.getElementById('universal-widget-status');
    const editor = findActiveEditor();

    if (!editor) {
      showToast('❌ 未找到提示词文本框！请点击激活文本框');
      return;
    }

    const { validCount, invalidCount, invalidItems, availableAssets } = detectUnlinkedMentions();

    if (validCount === 0) {
      if (invalidCount > 0) {
        showToast(`⚠️ ${invalidItems.join(', ')} 在当前页面素材库中未找到`);
        if (statusText) statusText.innerText = `超界素材: ${invalidItems.join(', ')}`;
      } else {
        showToast('ℹ️ 页面未检测到待关联的 @标签！');
        if (statusText) statusText.innerText = '无需处理';
      }
      return;
    }

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span>🔄</span> 正在关联中...';
    }
    if (statusText) statusText.innerText = `正在处理 ${validCount} 个标签...`;

    let totalProcessed = 0;
    let skippedCount = 0;
    const maxLoops = 60;
    const failedOrInvalidTags = new Set();
    const evEnter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });

    try {
      for (let i = 0; i < maxLoops; i++) {
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
        let targetNode = null;
        let targetMatch = null;
        let node;

        while ((node = walker.nextNode())) {
          const val = node.nodeValue || '';
          const m = /(?:@|＠)(图\d+|音频\d+|Image\d+|Audio\d+|img\d+)/i.exec(val);
          if (m) {
            const fullTag = m[0];
            const cleanTag = m[1].toLowerCase();

            if (failedOrInvalidTags.has(fullTag)) continue;

            if (availableAssets.size > 0 && !availableAssets.has(cleanTag)) {
              console.warn(`[AI Mention Universal] 安全忽略未在页面中找到的素材 ${fullTag}`);
              failedOrInvalidTags.add(fullTag);
              skippedCount++;
              continue;
            }

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
          failedOrInvalidTags.add(matchText);
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      let msg = `✅ 关联完成！成功转换 ${totalProcessed} 个标签`;
      if (skippedCount > 0) {
        msg += ` (跳过 ${skippedCount} 个未寻得素材的标签)`;
      }
      showToast(msg);
      if (statusText) statusText.innerText = msg;
    } catch (err) {
      console.error('[AI Mention Universal Error]', err);
      showToast('⚠️ 处理出错');
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<span>⚡</span> <span>一键关联 @标签</span>';
      }
      updateDetectionUI();
    }
  }

  // 初始化并在页面持续进行智能扫描
  createFloatingWidget();
  setInterval(() => updateDetectionUI(), 1000);
})();
