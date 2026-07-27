// ==UserScript==
// @name         ZeroAIGen @主体标签一键关联工具(连续流畅+精准素材防护版)
// @namespace    http://tampermonkey.net/
// @version      3.5.0
// @description  在零一/aigc.zeroaigen.cn 网页上提供流畅连续的 @标签自动关联，准确判定素材上传状态，一键全量转换不间断
// @author       Antigravity
// @match        *://aigc.zeroaigen.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[ZeroAIGen Floating Widget v3.5.0] 连续流畅+精准素材防护版已加载！');

  // 1. CSS 样式
  const style = `
    #zero-floating-widget {
      position: fixed;
      top: 120px;
      right: 40px;
      width: 270px;
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

    .zero-widget-option-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #d1d5db;
      padding: 2px 4px;
    }

    .zero-widget-option-row label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
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

  const TAG_REGEX = /(?:@|＠)(图\d+|音频\d+|视频\d+|镜头\d+|角色\d+|主体\d+|素材\d+)/g;

  // 2. 精准定位当前提示词区域内的素材栏（排除右侧的历史记录视频网格）
  function checkPromptAssetUploadState() {
    // 寻找包含“本地上传”或“资产导入”按钮的专属素材区域
    const allBtns = document.querySelectorAll('button, div, span, p');
    let assetArea = null;

    for (const el of allBtns) {
      if (el.children.length === 0 && el.innerText && el.innerText.trim().includes('本地上传')) {
        assetArea = el.closest('div[class*="asset"], div[class*="upload"], div[class*="media"]') || el.parentElement?.parentElement?.parentElement;
        break;
      }
    }

    const availableTags = new Set();

    if (assetArea) {
      // 仅在该素材容器内部查找 图1, 图2, 音频1 等真正上传的缩略图标签
      const areaText = assetArea.innerText || '';
      const matches = areaText.match(/(?:图|音频|视频|镜头|角色|主体|素材)\d+/g);
      if (matches) {
        matches.forEach(t => availableTags.add(t));
      }
    }

    const hasAssets = availableTags.size > 0;
    return { hasAssets, availableTags, assetAreaFound: !!assetArea };
  }

  // 3. 扫描文本框未转换项
  function detectUnlinkedMentions() {
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
    const { hasAssets, availableTags } = checkPromptAssetUploadState();
    const strictCheck = document.getElementById('zero-strict-asset-check')?.checked ?? true;

    if (!editor) {
      return { totalUnlinked: 0, validCount: 0, hasAssets, availableTags };
    }

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const validItems = [];
    const invalidItems = [];

    let node;
    while ((node = walker.nextNode())) {
      const val = node.nodeValue || '';
      const matches = Array.from(val.matchAll(TAG_REGEX));
      for (const m of matches) {
        const fullTag = m[0];
        const cleanTag = m[1];

        // 严格模式下要求素材库必须上传且包含该编号；非严格模式下直接允许转换
        if (!strictCheck || (hasAssets && availableTags.has(cleanTag))) {
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
      hasAssets,
      availableTags
    };
  }

  // 4. 实时更新悬浮面板检测状态
  function updateDetectionUI() {
    const countValueEl = document.getElementById('zero-detection-count');
    const statusTextEl = document.getElementById('zero-widget-status');
    const runBtn = document.getElementById('zero-widget-action-btn');
    const strictCheck = document.getElementById('zero-strict-asset-check')?.checked ?? true;

    if (!countValueEl) return;

    const { totalUnlinked, validCount, invalidCount, hasAssets } = detectUnlinkedMentions();

    if (strictCheck && !hasAssets) {
      if (totalUnlinked > 0) {
        countValueEl.innerText = `未上传素材 (0/${totalUnlinked}可转换)`;
        countValueEl.className = 'zero-detection-value warn';
        if (statusTextEl && (!runBtn || !runBtn.disabled)) {
          statusTextEl.innerText = '⚠️ 素材库为空，取消勾选“校验素材”可强制转换';
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
      countValueEl.innerText = `${validCount} 个待关联`;
      countValueEl.className = 'zero-detection-value';
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = `点击按钮一键连续转换 ${validCount} 个标签`;
      }
    } else if (invalidCount > 0 && strictCheck) {
      countValueEl.innerText = `0 可关联 (${invalidCount}个超界)`;
      countValueEl.className = 'zero-detection-value warn';
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = '提示：检测到的标签不在已上传素材中';
      }
    } else {
      countValueEl.innerText = '0 个 (已全部关联)';
      countValueEl.className = 'zero-detection-value empty';
      if (statusTextEl && (!runBtn || !runBtn.disabled)) {
        statusTextEl.innerText = '文本框暂无未关联标签';
      }
    }
  }

  // 5. 模拟弹窗确认辅助函数
  async function confirmCandidatePopover(editor, cleanTag) {
    const evEnter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
    editor.dispatchEvent(evEnter);

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
      }
    }
    return false;
  }

  // 6. UI 面板创建
  function createFloatingWidget() {
    if (document.getElementById('zero-floating-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'zero-floating-widget';
    widget.innerHTML = `
      <div class="zero-widget-header" id="zero-widget-drag-handle">
        <div class="zero-widget-title">
          <span>⚡</span>
          <span>@标签流畅关联助手</span>
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
        <div class="zero-widget-option-row">
          <label>
            <input type="checkbox" id="zero-strict-asset-check" checked />
            <span>严格校验已上传素材</span>
          </label>
        </div>
        <button class="zero-widget-action-btn" id="zero-widget-action-btn">
          <span>⚡</span>
          <span>一键连续关联 @标签</span>
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

    document.getElementById('zero-widget-action-btn').onclick = () => runAutoMentionStream();

    document.getElementById('zero-strict-asset-check').onchange = () => updateDetectionUI();

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

  // 7. 一键流畅连续全量关联算法（解决中途断开问题）
  async function runAutoMentionStream() {
    const runBtn = document.getElementById('zero-widget-action-btn');
    const statusText = document.getElementById('zero-widget-status');
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
    const strictCheck = document.getElementById('zero-strict-asset-check')?.checked ?? true;

    if (!editor) {
      showToast('❌ 未找到提示词文本框！');
      return;
    }

    const { hasAssets, validCount } = detectUnlinkedMentions();

    if (strictCheck && !hasAssets) {
      showToast('⚠️ 未在文本框上方发现上传的素材！(取消勾选“严格校验已上传素材”可强行转换)');
      if (statusText) statusText.innerText = '未检测到素材，已安全拦截';
      return;
    }

    if (validCount === 0) {
      showToast('ℹ️ 当前文本框中没有可以关联的 @标签！');
      if (statusText) statusText.innerText = '无需关联处理';
      return;
    }

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span>🔄</span> 正在连续流畅关联中...';
    }

    let totalProcessed = 0;
    let consecutiveFailures = 0;
    const maxTotalItems = 100;

    try {
      while (totalProcessed < maxTotalItems && consecutiveFailures < 3) {
        // 动态抓取当前 DOM 树中【第一个】未转换的 @ 标签
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
        let targetNode = null;
        let targetMatch = null;
        let node;

        while ((node = walker.nextNode())) {
          const val = node.nodeValue || '';
          const m = /(?:@|＠)(图\d+|音频\d+|视频\d+|镜头\d+|角色\d+|主体\d+|素材\d+)/.exec(val);
          if (m) {
            targetNode = node;
            targetMatch = m;
            break; // 始终从第一个标签开始，转换完一个立刻接下一个！
          }
        }

        // 如果文本框里已经完全没有未转换的 @ 标签了，说明全部连续完成！
        if (!targetNode || !targetMatch) {
          break;
        }

        const matchText = targetMatch[0];
        const cleanTag = targetMatch[1];
        const matchIndex = targetMatch.index;

        if (matchIndex + matchText.length > targetNode.nodeValue.length) {
          consecutiveFailures++;
          continue;
        }

        try {
          // 精确定位选区
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(targetNode, matchIndex);
          range.setEnd(targetNode, matchIndex + matchText.length);
          sel.removeAllRanges();
          sel.addRange(range);

          editor.focus();

          // 触发退格与重新输入
          document.execCommand('insertText', false, matchText.slice(0, -1));
          await new Promise((r) => setTimeout(r, 15));

          document.execCommand('insertText', false, matchText.slice(-1));
          await new Promise((r) => setTimeout(r, 25));

          // 发送 Enter 或直接点击弹窗选项
          await confirmCandidatePopover(editor, cleanTag);
          await new Promise((r) => setTimeout(r, 35));

          totalProcessed++;
          consecutiveFailures = 0; // 成功重置连续失败计数
          if (statusText) statusText.innerText = `已连续转换 ${totalProcessed} 个标签...`;
        } catch (err) {
          console.error('单项转换失败，重试...', err);
          consecutiveFailures++;
          await new Promise((r) => setTimeout(r, 30));
        }
      }

      showToast(`✅ 连续流畅关联完成！本次共转换 ${totalProcessed} 个标签`);
      if (statusText) statusText.innerText = `成功转换 ${totalProcessed} 个标签！`;
    } catch (err) {
      console.error('[ZeroAIGen Mention Error]', err);
      showToast('⚠️ 处理出错');
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<span>⚡</span> <span>一键连续关联 @标签</span>';
      }
      updateDetectionUI();
    }
  }

  // 初始化并开启状态轮询
  createFloatingWidget();
  setInterval(() => updateDetectionUI(), 1000);
})();
