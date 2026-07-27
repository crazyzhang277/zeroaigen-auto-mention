// ==UserScript==
// @name         ZeroAIGen @主体标签一键关联工具(Slate物理事件与React18渲染适配版)
// @namespace    http://tampermonkey.net/
// @version      6.1.0
// @description  在零一 AIGC 网页上精准触发 Slate.js 物理 mousedown/mouseup 事件并适配 React18 渲染延迟，确保一键成功关联所有@标签
// @author       Antigravity
// @match        *://aigc.zeroaigen.cn/*
// @match        *://*.zeroaigen.cn/*
// @match        *://zeroaigen.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[ZeroAIGen Floating Widget v6.1.0] Slate物理事件与React18适配版已加载！');

  // 0. 判断当前页面 URL 是否属于 type=VIDEO 模式
  function isVideoMode() {
    return /[?&]type=VIDEO\b/i.test(window.location.href);
  }

  // 获取当前可见且可编辑的提示词输入框
  function getActiveEditor() {
    const editors = document.querySelectorAll('[contenteditable="true"], textarea');
    for (let i = 0; i < editors.length; i++) {
      const ed = editors[i];
      if (ed.offsetWidth > 0 && ed.offsetHeight > 0 && !ed.hasAttribute('disabled') && ed.getAttribute('aria-disabled') !== 'true') {
        return ed;
      }
    }
    return null;
  }

  // 精准判断用户是否正处于大图视频放大预览 Modal 界面
  function isVideoPreviewModalOpen() {
    const hasModalOrDrawer = document.querySelector('.ant-modal, .ant-drawer, [class*="modal"], [class*="drawer"], [class*="viewer"]') !== null;
    const hasVideoPlayer = document.querySelector('video') !== null;
    return hasModalOrDrawer && hasVideoPlayer;
  }

  // 1. CSS 样式 (保持最顶层 z-index 与 isolation，支持顺畅拖拽)
  const style = `
    #zero-floating-widget {
      position: fixed;
      top: 120px;
      right: 40px;
      width: 295px;
      background: rgba(17, 24, 39, 0.95) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      border: 1px solid rgba(16, 185, 129, 0.5) !important;
      border-radius: 14px !important;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65) !important;
      color: #f3f4f6 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      z-index: 2147483647 !important;
      isolation: isolate !important;
      pointer-events: auto !important;
      user-select: none;
      overflow: hidden;
      transition: box-shadow 0.2s ease;
      touch-action: none;
    }

    #zero-floating-widget:hover {
      box-shadow: 0 20px 48px rgba(16, 185, 129, 0.35) !important;
    }

    .zero-widget-header {
      padding: 10px 14px;
      background: rgba(31, 41, 55, 0.85);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: space-between;
      touch-action: none;
      pointer-events: auto !important;
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
      pointer-events: auto !important;
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
      pointer-events: auto !important;
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
      cursor: not-allowed !important;
      transform: none !important;
      background: #374151 !important;
      box-shadow: none !important;
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
      box-shadow: 0 6px 22px rgba(16, 185, 129, 0.5) !important;
      z-index: 2147483647 !important;
      isolation: isolate !important;
      pointer-events: auto !important;
      user-select: none;
      transition: transform 0.15s ease, box-shadow 0.2s ease;
      touch-action: none;
    }

    #zero-minimized-badge:active {
      cursor: grabbing;
    }

    #zero-minimized-badge:hover {
      transform: scale(1.12);
      box-shadow: 0 8px 28px rgba(16, 185, 129, 0.7) !important;
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
      z-index: 2147483647 !important;
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

  // 2. 检索页面顶部【已上传素材栏】
  function getOnlyUploadedAssets() {
    const availableTags = new Set();
    const editor = getActiveEditor();
    const widget = document.getElementById('zero-floating-widget');

    const allElems = document.body.querySelectorAll('div, span, p, b, label, strong');

    for (let i = 0; i < allElems.length; i++) {
      const el = allElems[i];
      if (editor && (editor === el || editor.contains(el))) continue;
      if (widget && (widget === el || widget.contains(el))) continue;

      if (el.children.length === 0 && el.innerText) {
        const text = el.innerText.trim();
        if (text.length <= 12) {
          const m = /^(?:@|＠)?(图\d+|音频\d+|视频\d+|镜头\d+|角色\d+|主体\d+|素材\d+)$/.exec(text);
          if (m) {
            availableTags.add(m[1]);
          }
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
      return { totalUnlinked: 0, validCount: 0, invalidCount: 0, hasAssets, uploadedAssets, missingTags: new Set() };
    }

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const validItems = [];
    const invalidItems = [];
    const missingTags = new Set();

    let node;
    while ((node = walker.nextNode())) {
      const val = node.nodeValue || '';
      const matches = Array.from(val.matchAll(TAG_REGEX));
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
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

    // 1. 展示已上传素材（绿色胶囊）
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

    // 2. 展示未上传素材（橙色警告胶囊）
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

    // 3. 正常状态指示
    if (!hasAssets) {
      if (totalUnlinked > 0) {
        countValueEl.innerText = `未上传素材 (0/${totalUnlinked}可转换)`;
        countValueEl.className = 'zero-detection-value warn';
        if (statusTextEl) statusTextEl.innerText = '⚠️ 页面未上传素材，无法关联';
      } else {
        countValueEl.innerText = '无未关联标签';
        countValueEl.className = 'zero-detection-value empty';
        if (statusTextEl) statusTextEl.innerText = '提示：请先在页面上传素材';
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
      if (statusTextEl && runBtn && !runBtn.disabled) {
        statusTextEl.innerText = `点击一键转换 ${validCount} 个有效标签`;
      }
    } else if (invalidCount > 0) {
      countValueEl.innerText = `0 可关联 (${invalidCount}个未上传不替换)`;
      countValueEl.className = 'zero-detection-value warn';
      if (statusTextEl && runBtn && !runBtn.disabled) {
        statusTextEl.innerText = '提示：未上传素材标签保留原样不替换';
      }
    } else {
      countValueEl.innerText = '0 个 (已全部关联)';
      countValueEl.className = 'zero-detection-value empty';
      if (statusTextEl && runBtn && !runBtn.disabled) {
        statusTextEl.innerText = '文本框暂无未关联标签';
      }
    }
  }

  // 5. 模拟弹窗确认与 DOM 物理事件 (适配 Slate.js 的 mousedown + React18 异步渲染)
  async function confirmCandidatePopover(editor, cleanTag) {
    // 给予 React 18 充分的时间 (70ms) 渲染 Mention 候选下拉框
    await sleep(70);

    const dropdowns = document.querySelectorAll(
      '[class*="dropdown"], [class*="popover"], [class*="mention"], [class*="select"], [class*="listbox"], [role="listbox"], [role="menu"]'
    );
    for (let i = 0; i < dropdowns.length; i++) {
      const dd = dropdowns[i];
      if (dd.offsetWidth > 0 && dd.offsetHeight > 0) {
        const items = dd.querySelectorAll('li, div, span, p, [role="option"]');
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          if (item.innerText && item.innerText.includes(cleanTag)) {
            // Slate.js 必须要派发物理 mousedown + mouseup + click 才能选中选项！
            const mouseOpts = { bubbles: true, cancelable: true, view: window };
            item.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
            item.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
            item.dispatchEvent(new MouseEvent('click', mouseOpts));
            await sleep(60);
            return true;
          }
        }
        const active = dd.querySelector('[class*="active"], [class*="selected"], [aria-selected="true"]');
        if (active) {
          const mouseOpts = { bubbles: true, cancelable: true, view: window };
          active.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
          active.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
          active.dispatchEvent(new MouseEvent('click', mouseOpts));
          await sleep(60);
          return true;
        }
      }
    }

    // 备用方案：模拟键盘下箭头 + 回车确认
    const evDown = new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true, cancelable: true });
    editor.dispatchEvent(evDown);
    await sleep(35);

    const evEnter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true });
    editor.dispatchEvent(evEnter);
    await sleep(50);

    return false;
  }

  // 6. UI 面板创建与 type=VIDEO 模式纯净管控
  function checkModeAndUpdateUI() {
    const widget = document.getElementById('zero-floating-widget');
    const minBadge = document.getElementById('zero-minimized-badge');
    const isVideo = isVideoMode();

    if (!isVideo) {
      if (widget) widget.style.display = 'none';
      if (minBadge) minBadge.style.display = 'none';
      return;
    }

    if (!widget) {
      createFloatingWidget();
    } else {
      if (document.body.lastElementChild !== widget && document.body.lastElementChild !== minBadge) {
        document.body.appendChild(widget);
        if (minBadge) document.body.appendChild(minBadge);
      }

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

    makeUltimateTopDraggable(widget, document.getElementById('zero-widget-drag-handle'));

    makeUltimateTopDraggableBadge(minBadge, () => {
      minBadge.style.display = 'none';
      widget.style.display = 'block';
      updateDetectionUI();
    });

    updateDetectionUI();
  }

  // 7. 终极 DOM 重叠提升 + Window Capture 拖拽引擎
  function makeUltimateTopDraggable(elmnt, dragHandle) {
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    dragHandle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.zero-widget-controls')) return;

      e.preventDefault();
      e.stopPropagation();

      document.body.appendChild(elmnt);

      startX = e.clientX;
      startY = e.clientY;

      const rect = elmnt.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      elmnt.style.left = initialLeft + 'px';
      elmnt.style.top = initialTop + 'px';
      elmnt.style.right = 'auto';

      try {
        dragHandle.setPointerCapture(e.pointerId);
      } catch (_) {}

      const onPointerMove = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        elmnt.style.left = (initialLeft + dx) + 'px';
        elmnt.style.top = (initialTop + dy) + 'px';
      };

      const onPointerUp = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          dragHandle.releasePointerCapture(ev.pointerId);
        } catch (_) {}
        window.removeEventListener('pointermove', onPointerMove, true);
        window.removeEventListener('pointerup', onPointerUp, true);
        window.removeEventListener('pointercancel', onPointerUp, true);
      };

      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('pointerup', onPointerUp, true);
      window.addEventListener('pointercancel', onPointerUp, true);
    }, true);
  }

  // 8. 收起球形按钮的终极 DOM 重叠提升 + Window Capture 拖拽引擎
  function makeUltimateTopDraggableBadge(elmnt, onClickCallback) {
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let isMoved = false;

    elmnt.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      document.body.appendChild(elmnt);

      isMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = elmnt.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      elmnt.style.left = initialLeft + 'px';
      elmnt.style.top = initialTop + 'px';
      elmnt.style.right = 'auto';

      try {
        elmnt.setPointerCapture(e.pointerId);
      } catch (_) {}

      const onPointerMove = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          isMoved = true;
        }

        elmnt.style.left = (initialLeft + dx) + 'px';
        elmnt.style.top = (initialTop + dy) + 'px';
      };

      const onPointerUp = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          elmnt.releasePointerCapture(ev.pointerId);
        } catch (_) {}
        window.removeEventListener('pointermove', onPointerMove, true);
        window.removeEventListener('pointerup', onPointerUp, { capture: true, once: true });
        window.removeEventListener('pointercancel', onPointerUp, { capture: true, once: true });

        if (!isMoved) {
          onClickCallback();
        }
      };

      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('pointerup', onPointerUp, { capture: true, once: true });
      window.addEventListener('pointercancel', onPointerUp, { capture: true, once: true });
    }, true);
  }

  // 9. 一键全量转换 (一次点击连续完成所有有效标签关联)
  async function runAutoMentionStream() {
    const runBtn = document.getElementById('zero-widget-action-btn');
    const statusText = document.getElementById('zero-widget-status');

    if (isVideoPreviewModalOpen()) {
      showToast('ℹ️ 当前处于视频放大预览界面，请先关闭大图预览再关联！');
      if (statusText) statusText.innerText = '⚠️ 大图预览中，已安全阻断点击';
      return;
    }

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
          await sleep(25);

          document.execCommand('insertText', false, matchText.slice(-1));

          // 调用全新的 Slate 物理 mousedown/mouseup/click 事件确认引擎
          await confirmCandidatePopover(editor, cleanTag);
          await sleep(50);

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

  // 1 秒轮询
  setInterval(checkModeAndUpdateUI, 1000);
})();
