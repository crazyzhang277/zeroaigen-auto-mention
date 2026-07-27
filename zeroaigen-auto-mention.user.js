// ==UserScript==
// @name         ZeroAIGen @主体标签一键关联工具(空资产防死锁极速版)
// @namespace    http://tampermonkey.net/
// @version      3.3.0
// @description  在零一/aigc.zeroaigen.cn 网页上自动校验已上传素材，无素材时安全提醒，全自动单次死锁防御
// @author       Antigravity
// @match        *://aigc.zeroaigen.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[ZeroAIGen Floating Widget v3.3.0] 已载入未上传资产防死锁版！');

  // 1. 注入 CSS 样式
  const style = `
    #zero-floating-widget {
      position: fixed;
      top: 120px;
      right: 40px;
      width: 260px;
      background: rgba(17, 24, 39, 0.94);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(16, 185, 129, 0.45);
      border-radius: 14px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 9999999;
      user-select: none;
      overflow: hidden;
      transition: box-shadow 0.2s ease;
    }

    #zero-floating-widget:hover {
      box-shadow: 0 16px 44px rgba(16, 185, 129, 0.3);
    }

    .zero-widget-header {
      padding: 10px 14px;
      background: rgba(31, 41, 55, 0.8);
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
      color: #9ca3af;
    }

    .zero-detection-value.warn {
      color: #ef4444;
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
      line-height: 1.4;
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
      animation: zeroToastFade 3s forwards;
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
    setTimeout(() => toast.remove(), 3000);
  }

  // 2. 准确扫描页面上方“已上传素材”标签列表
  function getAvailableAssets() {
    const availableTags = new Set();
    const allElems = document.querySelectorAll('div, span, p, b');

    for (const el of allElems) {
      if (el.children.length === 0 && el.innerText) {
        const text = el.innerText.trim();
        // 匹配 图1, 图2... 音频1, 音频2 等素材标签
        if (/^(图\d+|音频\d+)$/.test(text)) {
          availableTags.add(text);
        }
      }
    }
    return availableTags;
  }

  // 3. 统计文本框中未转换的标签，区分【有效存在素材】与【无素材项】
  function detectUnlinkedMentions() {
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
    const availableAssets = getAvailableAssets();
    const hasAssetsUploaded = availableAssets.size > 0;

    if (!editor) {
      return { totalUnlinked: 0, validCount: 0, invalidCount: 0, hasAssetsUploaded, availableAssets };
    }

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const validItems = [];
    const invalidItems = [];

    let node;
    while ((node = walker.nextNode())) {
      const val = node.nodeValue || '';
      const matches = Array.from(val.matchAll(/(?:@|＠)(图\d+|音频\d+)/g));
      for (const m of matches) {
        const fullTag = m[0];
        const cleanTag = m[1];

        // 关键逻辑：如果未上传任何素材 (hasAssetsUploaded == false)，所有 @图x 都是无效无素材项
        if (hasAssetsUploaded && availableAssets.has(cleanTag)) {
          validItems.push(fullTag);
        } else {
          invalidItems.push(fullTag);
        }
      }
    }

    return {
      totalUnlinked: validItems.length + invalidItems.length,
      validCount: validItems.length,
      invalidCount: invalidItems.length,
      validItems,
      invalidItems,
      hasAssetsUploaded,
      availableAssets
    };
  }

  // 4. 实时更新悬浮面板检测状态
  function updateDetectionUI() {
    const countValueEl = document.getElementById('zero-detection-count');
    const statusTextEl = document.getElementById('zero-widget-status');
    const runBtn = document.getElementById('zero-widget-action-btn');

    if (!countValueEl) return;

    const { totalUnlinked, validCount, invalidCount, hasAssetsUploaded, invalidItems } = detectUnlinkedMentions();

    if (!hasAssetsUploaded) {
      if (totalUnlinked > 0) {
        countValueEl.innerText = `未上传素材 (0/${totalUnlinked}可转换)`;
        countValueEl.className = 'zero-detection-value warn';
        if (statusTextEl && (!runBtn || !runBtn.disabled)) {
          statusTextEl.innerText = '⚠️ 页面未上传任何图片或音频素材';
        }
      } else {
        countValueEl.innerText = '无未关联标签 (未上传素材)';
        countValueEl.className = 'zero-detection-value empty';
        if (statusTextEl && (!runBtn || !runBtn.disabled)) {
          statusTextEl.innerText = '提示：请先在页面上传素材';
        }
      }
      return;
    }

    if (validCount > 0) {
      countValueEl.innerText = `${validCount} 个可关联`;
      countValueEl.className = 'zero-detection-value';
      if (invalidCount > 0) {
        countValueEl.innerText += ` (${invalidCount}个未找到素材)`;
        countValueEl.className = 'zero-detection-value warn';
      }
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = `发现 ${validCount} 个可转换标签`;
      }
    } else if (invalidCount > 0) {
      countValueEl.innerText = `0 可关联 (${invalidCount}个超界)`;
      countValueEl.className = 'zero-detection-value warn';
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = `素材未匹配: ${invalidItems.slice(0, 3).join(', ')}`;
      }
    } else {
      countValueEl.innerText = '0 个 (已全部关联)';
      countValueEl.className = 'zero-detection-value empty';
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = '文本框暂无未关联标签';
      }
    }
  }

  // 5. 创建悬浮窗 UI
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
          <span class="zero-detection-label">检测：</span>
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

  // 6. 核心处理逻辑：单次尝试强保护 (防任何死循环与无素材卡死)
  async function runAutoMentionTurbo() {
    const runBtn = document.getElementById('zero-widget-action-btn');
    const statusText = document.getElementById('zero-widget-status');
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');

    if (!editor) {
      showToast('❌ 未找到提示词文本框！');
      return;
    }

    const { totalUnlinked, validCount, invalidCount, hasAssetsUploaded, invalidItems, availableAssets } = detectUnlinkedMentions();

    // 关键卡关：未上传任何素材时阻止运行
    if (!hasAssetsUploaded) {
      showToast('⚠️ 当前页面尚未上传任何素材！请先在页面【+ 本地上传】素材');
      if (statusText) statusText.innerText = '拦截：未上传素材无法关联';
      return;
    }

    if (validCount === 0) {
      if (invalidCount > 0) {
        showToast(`⚠️ 提示词中的 ${invalidItems.join(', ')} 在素材库中未找到！`);
        if (statusText) statusText.innerText = `素材缺失: ${invalidItems.slice(0, 2).join(', ')}`;
      } else {
        showToast('ℹ️ 文本框中当前没有未关联的 @标签！');
        if (statusText) statusText.innerText = '无需关联处理';
      }
      return;
    }

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span>🔄</span> 正在极速关联中...';
    }
    if (statusText) statusText.innerText = `正在处理 ${validCount} 个有效标签...`;

    let totalProcessed = 0;
    let skippedCount = 0;
    const maxLoops = 50;
    const triedSet = new Set(); // 单次尝试集合：绝对不允许任何标签尝试 2 次！死锁防护！
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
            const fullTag = m[0];  // "@图1"
            const cleanTag = m[1]; // "图1"

            // 防死锁硬要求：尝试过的标签绝对不再尝试
            if (triedSet.has(fullTag)) {
              continue;
            }

            // 素材库校验
            if (!availableAssets.has(cleanTag)) {
              console.warn(`[ZeroAIGen] 素材库中未找到 ${fullTag}，已安全跳过`);
              triedSet.add(fullTag);
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

        // 标记为已尝试
        triedSet.add(matchText);

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
          console.error('单项关联失败:', err);
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      let msg = `✅ 关联完成！成功转换 ${totalProcessed} 个标签`;
      if (skippedCount > 0) {
        msg += ` (跳过 ${skippedCount} 个未找到素材的标签)`;
      }
      showToast(msg);
      if (statusText) statusText.innerText = msg;
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

  // 初始化
  createFloatingWidget();
  setInterval(() => updateDetectionUI(), 1000);
})();
