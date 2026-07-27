// ==UserScript==
// @name         ZeroAIGen @主体标签一键关联工具(编辑态智能感知与全层级拖拽版)
// @namespace    http://tampermonkey.net/
// @version      5.0.0
// @description  在零一 AIGC 网页上仅在 type=VIDEO 且存在可编辑提示词框时生效，支持大图 Modal 全层级顺畅拖拽，无编辑框时自动静默隐形
// @author       Antigravity
// @match        *://aigc.zeroaigen.cn/*
// @match        *://*.zeroaigen.cn/*
// @match        *://zeroaigen.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[ZeroAIGen Floating Widget v5.0.0] 编辑态智能感知与全层级拖拽版已加载！');

  // 0. 判断当前页面 URL 是否属于 type=VIDEO 模式
  function isVideoMode() {
    return /[?&]type=VIDEO\b/i.test(window.location.href);
  }

  // 获取页面上当前可见且可编辑的提示词编辑器
  function getActiveEditor() {
    const editors = document.querySelectorAll('[contenteditable="true"], textarea');
    for (const ed of editors) {
      if (ed.offsetWidth > 0 && ed.offsetHeight > 0 && !ed.hasAttribute('disabled') && ed.getAttribute('aria-disabled') !== 'true') {
        return ed;
      }
    }
    return null;
  }

  // 1. CSS 样式 (z-index 提升至 99999999，彻底超越任何 Modal/Drawer 遮罩层)
  const style = `
    #zero-floating-widget {
      position: fixed;
      top: 120px;
      right: 40px;
      width: 295px;
      background: rgba(17, 24, 39, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(16, 185, 129, 0.5);
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 99999999;
      user-select: none;
      overflow: hidden;
      transition: box-shadow 0.2s ease;
      touch-action: none;
    }

    #zero-floating-widget:hover {
      box-shadow: 0 20px 48px rgba(16, 185, 129, 0.35);
    }

    .zero-widget-header {
      padding: 10px 14px;
      background: rgba(31, 41, 55, 0.85);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .zero-widget-header:active {
      cursor: grabbing;
    }

    .zero-widget-title {
      font-size: 13px;
      font-weight: 700;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 6px;
      pointer-events: none;
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

    .zero-widget-assets-bar, .zero-widget-missing-bar, .zero-widget-detection-bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: rgba(31, 41, 55, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
    }

    .zero-widget-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .zero-detection-label, .zero-assets-label, .zero-missing-label {
      color: #9ca3af;
      font-size: 11px;
    }

    .zero-missing-label {
      color: #f59e0b;
    }

    .zero-detection-value {
      font-weight: 700;
      color: #10b981;
    }

    .zero-detection-value.empty {
      color: #9ca3af;
    }

    .zero-detection-value.warn {
      color: #f59e0b;
    }

    .zero-assets-tags-wrapper, .zero-missing-tags-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-height: 64px;
      overflow-y: auto;
      margin-top: 2px;
    }

    /* 已上传素材绿胶囊 */
    .zero-asset-pill {
      background: rgba(16, 185, 129, 0.18);
      border: 1px solid rgba(16, 185, 129, 0.45);
      color: #34d399;
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }

    /* 未上传素材橙胶囊 */
    .zero-missing-pill {
      background: rgba(245, 158, 11, 0.18);
      border: 1px solid rgba(245, 158, 11, 0.45);
      color: #fbbf24;
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }

    .zero-asset-pill-empty {
      color: #6b7280;
      font-size: 11px;
      font-style: italic;
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
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      cursor: grab;
      box-shadow: 0 6px 22px rgba(16, 185, 129, 0.5);
      z-index: 99999999;
      user-select: none;
      transition: transform 0.15s ease, box-shadow 0.2s ease;
      touch-action: none;
    }

    #zero-minimized-badge:active {
      cursor: grabbing;
    }

    #zero-minimized-badge:hover {
      transform: scale(1.12);
      box-shadow: 0 8px 28px rgba(16, 185, 129, 0.7);
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
      z-index: 999999999;
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

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const TAG_REGEX = /(?:@|＠)(图\d+|音频\d+|视频\d+|镜头\d+|角色\d+|主体\d+|素材\d+)/g;

  // 2. 严格检索页面顶部【已上传素材栏】
  function getOnlyUploadedAssets() {
    const availableTags = new Set();
    const editor = getActiveEditor();
    const widget = document.getElementById('zero-floating-widget');

    if (!editor) return availableTags;

    const allElems = document.body.querySelectorAll('div, span, p, b, label, strong');

    for (const el of allElems) {
      if (editor && (editor === el || editor.contains(el))) continue;
      if (widget && (widget === el || widget.contains(el))) continue;

      if (el.children.length === 0 && el.innerText) {
        const text = el.innerText.trim();
        const m = /^(?:@|＠)?(图\d+|音频\d+|视频\d+|镜头\d+|角色\d+|主体\d+|素材\d+)$/.exec(text);
        if (m) {
          availableTags.add(m[1]);
        }
      }
    }

    return availableTags;
  }

  // 3. 统计可转换标签及未上传标签
  function detectUnlinkedMentions() {
    const editor = getActiveEditor();
    const uploadedAssets = getOnlyUploadedAssets();
    const hasAssets = uploadedAssets.size > 0;

    if (!editor) {
      return { totalUnlinked: 0, validCount: 0, invalidCount: 0, hasAssets: false, uploadedAssets: new Set(), missingTags: new Set() };
    }

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const validItems = [];
    const invalidItems = [];
    const missingTags = new Set();

    let node;
    while ((node = walker.nextNode())) {
      const val = node.nodeValue || '';
      const matches = Array.from(val.matchAll(TAG_REGEX));
      for (const m of matches) {
        const fullTag = m[0];
        const cleanTag = m[1];

        if (hasAssets && uploadedAssets.has(cleanTag)) {
          validItems.push(fullTag);
        } else {
          invalidItems.push(fullTag);
          missingTags.add(cleanTag);
        }
      }
    }

    return {
      totalUnlinked: validItems.length + invalidItems.length,
      validCount: validItems.length,
      invalidCount: invalidItems.length,
      validItems,
      invalidItems,
      hasAssets,
      uploadedAssets,
      missingTags
    };
  }

  // 4. 更新检测 UI 界面
  function updateDetectionUI() {
    const countValueEl = document.getElementById('zero-detection-count');
    const statusTextEl = document.getElementById('zero-widget-status');
    const runBtn = document.getElementById('zero-widget-action-btn');
    const assetsTagsEl = document.getElementById('zero-assets-tags-wrapper');
    const missingTagsBarEl = document.getElementById('zero-missing-bar');
    const missingTagsWrapperEl = document.getElementById('zero-missing-tags-wrapper');

    if (!countValueEl) return;

    const { totalUnlinked, validCount, invalidCount, hasAssets, uploadedAssets, missingTags } = detectUnlinkedMentions();

    if (assetsTagsEl) {
      if (uploadedAssets && uploadedAssets.size > 0) {
        const sorted = Array.from(uploadedAssets).sort((a, b) =>
          a.localeCompare(b, 'zh-CN', { numeric: true })
        );
        assetsTagsEl.innerHTML = sorted.map((t) => `<span class="zero-asset-pill">@${t}</span>`).join('');
      } else {
        assetsTagsEl.innerHTML = `<span class="zero-asset-pill-empty">未检测到已上传素材</span>`;
      }
    }

    if (missingTagsBarEl && missingTagsWrapperEl) {
      if (missingTags && missingTags.size > 0) {
        missingTagsBarEl.style.display = 'flex';
        const sortedMissing = Array.from(missingTags).sort((a, b) =>
          a.localeCompare(b, 'zh-CN', { numeric: true })
        );
        missingTagsWrapperEl.innerHTML = sortedMissing
          .map((t) => `<span class="zero-missing-pill">@${t}</span>`)
          .join('');
      } else {
        missingTagsBarEl.style.display = 'none';
      }
    }

    if (!hasAssets) {
      if (totalUnlinked > 0) {
        countValueEl.innerText = `未上传素材 (0/${totalUnlinked}可转换)`;
        countValueEl.className = 'zero-detection-value warn';
        if (statusTextEl && (!runBtn || !runBtn.disabled)) {
          statusTextEl.innerText = '⚠️ 页面未上传素材，无法关联';
        }
      } else {
        countValueEl.innerText = '无未关联标签';
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
        countValueEl.innerText += ` (${invalidCount}个未上传不替换)`;
        countValueEl.className = 'zero-detection-value warn';
      }
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = `点击一键转换 ${validCount} 个有效标签`;
      }
    } else if (invalidCount > 0) {
      countValueEl.innerText = `0 可关联 (${invalidCount}个未上传不替换)`;
      countValueEl.className = 'zero-detection-value warn';
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = '提示：未上传素材标签保留原样不替换';
      }
    } else {
      countValueEl.innerText = '0 个 (已全部关联)';
      countValueEl.className = 'zero-detection-value empty';
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = '文本框暂无未关联标签';
      }
    }
  }

  // 5. 模拟弹窗确认与 DOM 物理点击
  async function confirmCandidatePopover(editor, cleanTag) {
    const evDown = new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true });
    editor.dispatchEvent(evDown);
    await sleep(15);

    const evEnter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
    editor.dispatchEvent(evEnter);
    await sleep(15);

    const dropdowns = document.querySelectorAll(
      '[class*="dropdown"], [class*="popover"], [class*="mention"], [class*="select"], [role="listbox"]'
    );
    for (const dd of dropdowns) {
      if (dd.offsetWidth > 0 && dd.offsetHeight > 0) {
        const items = dd.querySelectorAll('li, div, span, p, [role="option"]');
        for (const item of items) {
          if (item.innerText && item.innerText.includes(cleanTag)) {
            item.click();
            return true;
          }
        }
        const active = dd.querySelector('[class*="active"], [class*="selected"], [aria-selected="true"]');
        if (active) {
          active.click();
          return true;
        }
      }
    }
    return false;
  }

  // 6. UI 面板创建与 type=VIDEO + 可编辑框 智能显隐管控
  function checkModeAndUpdateUI() {
    const widget = document.getElementById('zero-floating-widget');
    const minBadge = document.getElementById('zero-minimized-badge');
    const isVideo = isVideoMode();
    const activeEditor = getActiveEditor();

    // 智能隔离条件：非 type=VIDEO 模式 OR 页面不存在可编辑框（比如弹出了视频详情预览 Modal）
    if (!isVideo || !activeEditor) {
      if (widget) widget.style.display = 'none';
      if (minBadge) minBadge.style.display = 'none';
      return;
    }

    // 在处于 type=VIDEO 且有编辑框时显示面板
    if (!widget) {
      createFloatingWidget();
    } else {
      if (minBadge && minBadge.style.display === 'flex') {
        widget.style.display = 'none';
      } else {
        widget.style.display = 'block';
      }
    }

    updateDetectionUI();
  }

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
        <div class="zero-widget-assets-bar">
          <span class="zero-assets-label">已检测到的素材库 (可关联)：</span>
          <div class="zero-assets-tags-wrapper" id="zero-assets-tags-wrapper">
            <span class="zero-asset-pill-empty">扫描中...</span>
          </div>
        </div>
        <div class="zero-widget-missing-bar" id="zero-missing-bar" style="display: none;">
          <span class="zero-missing-label">⚠️ 缺失素材 (保留原样不替换)：</span>
          <div class="zero-missing-tags-wrapper" id="zero-missing-tags-wrapper"></div>
        </div>
        <div class="zero-widget-detection-bar">
          <div class="zero-widget-row">
            <span class="zero-detection-label">待处理标签：</span>
            <span class="zero-detection-value" id="zero-detection-count">检测中...</span>
          </div>
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
    minBadge.title = '打开 @标签关联助手 (可拖拽移动)';
    minBadge.innerHTML = '⚡';
    minBadge.style.display = 'none';

    document.body.appendChild(widget);
    document.body.appendChild(minBadge);

    document.getElementById('zero-widget-action-btn').onclick = () => runAutoMentionStream();

    document.getElementById('zero-widget-min-btn').onclick = (e) => {
      e.stopPropagation();
      widget.style.display = 'none';
      minBadge.style.display = 'flex';
    };

    // 绑定高优先级的顶级 Pointer 拖拽（彻底防止 Modal 遮罩卡住）
    makeUniversalDraggable(widget, document.getElementById('zero-widget-drag-handle'));

    makeUniversalDraggableBadge(minBadge, () => {
      minBadge.style.display = 'none';
      widget.style.display = 'block';
      updateDetectionUI();
    });

    updateDetectionUI();
  }

  // 7. 全层级通用 Pointer 拖拽引擎 (彻底防卡死)
  function makeUniversalDraggable(elmnt, dragHandle) {
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    dragHandle.addEventListener('pointerdown', onPointerDown, { passive: false });

    function onPointerDown(e) {
      if (e.target.closest('.zero-widget-controls')) return;

      e.preventDefault();
      e.stopPropagation();

      startX = e.clientX;
      startY = e.clientY;

      const rect = elmnt.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      elmnt.style.left = initialLeft + 'px';
      elmnt.style.top = initialTop + 'px';
      elmnt.style.right = 'auto';

      dragHandle.setPointerCapture(e.pointerId);

      dragHandle.addEventListener('pointermove', onPointerMove, { passive: false });
      dragHandle.addEventListener('pointerup', onPointerUp, { passive: false });
      dragHandle.addEventListener('pointercancel', onPointerUp, { passive: false });
    }

    function onPointerMove(e) {
      e.preventDefault();
      e.stopPropagation();

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      elmnt.style.left = (initialLeft + dx) + 'px';
      elmnt.style.top = (initialTop + dy) + 'px';
    }

    function onPointerUp(e) {
      e.preventDefault();
      e.stopPropagation();

      try {
        dragHandle.releasePointerCapture(e.pointerId);
      } catch (_) {}

      dragHandle.removeEventListener('pointermove', onPointerMove);
      dragHandle.removeEventListener('pointerup', onPointerUp);
      dragHandle.removeEventListener('pointercancel', onPointerUp);
    }
  }

  // 8. 收起后球形按钮的通用 Pointer 拖拽 + 点击判定
  function makeUniversalDraggableBadge(elmnt, onClickCallback) {
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let isMoved = false;

    elmnt.addEventListener('pointerdown', onPointerDown, { passive: false });

    function onPointerDown(e) {
      e.preventDefault();
      e.stopPropagation();

      isMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = elmnt.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      elmnt.style.left = initialLeft + 'px';
      elmnt.style.top = initialTop + 'px';
      elmnt.style.right = 'auto';

      elmnt.setPointerCapture(e.pointerId);

      elmnt.addEventListener('pointermove', onPointerMove, { passive: false });
      elmnt.addEventListener('pointerup', onPointerUp, { passive: false });
      elmnt.addEventListener('pointercancel', onPointerUp, { passive: false });
    }

    function onPointerMove(e) {
      e.preventDefault();
      e.stopPropagation();

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        isMoved = true;
      }

      elmnt.style.left = (initialLeft + dx) + 'px';
      elmnt.style.top = (initialTop + dy) + 'px';
    }

    function onPointerUp(e) {
      e.preventDefault();
      e.stopPropagation();

      try {
        elmnt.releasePointerCapture(e.pointerId);
      } catch (_) {}

      elmnt.removeEventListener('pointermove', onPointerMove);
      elmnt.removeEventListener('pointerup', onPointerUp);
      elmnt.removeEventListener('pointercancel', onPointerUp);

      if (!isMoved) {
        onClickCallback();
      }
    }
  }

  // 9. 一键全量转换
  async function runAutoMentionStream() {
    const runBtn = document.getElementById('zero-widget-action-btn');
    const statusText = document.getElementById('zero-widget-status');
    const editor = getActiveEditor();

    if (!editor) {
      showToast('❌ 未找到可编辑的提示词文本框！');
      return;
    }

    const { hasAssets, validCount: initialValidCount, uploadedAssets } = detectUnlinkedMentions();

    if (!hasAssets) {
      showToast('⚠️ 未在页面顶部找到上传的素材！请先上传素材后再关联');
      if (statusText) statusText.innerText = '未检测到素材，放弃转换';
      return;
    }

    if (initialValidCount === 0) {
      showToast('ℹ️ 文本框中没有符合素材库的 @标签！(未上传项保持原样)');
      if (statusText.innerText) statusText.innerText = '未上传素材项已全部保留原样';
      return;
    }

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span>🔄</span> 正在一气呵成全量关联中...';
    }

    let totalProcessed = 0;
    let skipValidIndex = 0;

    try {
      while (true) {
        let preCheck = detectUnlinkedMentions();
        let preValidCount = preCheck.validCount;

        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
        let targetNode = null;
        let targetMatch = null;
        let node;

        let currentValidIndex = 0;
        let found = false;

        while ((node = walker.nextNode())) {
          const val = node.nodeValue || '';
          const regex = /(?:@|＠)(图\d+|音频\d+|视频\d+|镜头\d+|角色\d+|主体\d+|素材\d+)/g;
          let m;

          while ((m = regex.exec(val)) !== null) {
            const cleanTag = m[1];

            if (uploadedAssets.size > 0 && !uploadedAssets.has(cleanTag)) {
              continue;
            }

            if (currentValidIndex < skipValidIndex) {
              currentValidIndex++;
              continue;
            }

            targetNode = node;
            targetMatch = m;
            found = true;
            break;
          }
          if (found) break;
        }

        if (!targetNode || !targetMatch) {
          break;
        }

        const matchText = targetMatch[0];
        const cleanTag = targetMatch[1];
        const matchIndex = targetMatch.index;

        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(targetNode, matchIndex);
          range.setEnd(targetNode, matchIndex + matchText.length);
          sel.removeAllRanges();
          sel.addRange(range);

          editor.focus();

          document.execCommand('insertText', false, matchText.slice(0, -1));
          await sleep(20);

          document.execCommand('insertText', false, matchText.slice(-1));
          await sleep(35);

          await confirmCandidatePopover(editor, cleanTag);
          await sleep(40);

          let postCheck = detectUnlinkedMentions();
          if (postCheck.validCount >= preValidCount) {
            console.warn(`[ZeroAIGen] 转换未生效：${matchText}，跳过该处。`);
            skipValidIndex++;
          } else {
            totalProcessed++;
            if (statusText) statusText.innerText = `已连续转换 ${totalProcessed} 个标签...`;
          }
        } catch (err) {
          console.error('[ZeroAIGen] 转换遇到异常:', err);
          skipValidIndex++;
        }
      }

      const finalCheck = detectUnlinkedMentions();
      let msg = `✅ 一键全量关联完成！共转换 ${totalProcessed} 个标签`;

      if (finalCheck.invalidCount > 0) {
        msg += ` (${finalCheck.invalidCount} 个未上传项保持原样)`;
      }

      showToast(msg);
      if (statusText) statusText.innerText = msg;
    } catch (err) {
      console.error('[ZeroAIGen] 处理出错', err);
      showToast('⚠️ 处理出错');
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<span>⚡</span> <span>一键关联 @标签</span>';
      }
      updateDetectionUI();
    }
  }

  // 初始化与 URL + 编辑框状态实时检测
  setInterval(checkModeAndUpdateUI, 1000);
})();
