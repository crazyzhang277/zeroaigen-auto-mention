// ==UserScript==
// @name         ZeroAIGen @主体标签一键关联工具(素材精确隔离与检测修正版)
// @namespace    http://tampermonkey.net/
// @version      4.4.0
// @description  在零一/aigc.zeroaigen.cn 网页上精准区分已上传素材与未上传素材，修复误将文本框内容当作素材库的检测 Bug
// @author       Antigravity
// @match        *://aigc.zeroaigen.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[ZeroAIGen Floating Widget v4.4.0] 精确隔离与检测修正版已加载！');

  // 1. CSS 样式
  const style = `
    #zero-floating-widget {
      position: fixed;
      top: 120px;
      right: 40px;
      width: 275px;
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
      color: #f59e0b;
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

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const TAG_REGEX = /(?:@|＠)(图\d+|音频\d+|视频\d+|镜头\d+|角色\d+|主体\d+|素材\d+)/g;

  // 2. 严格检索页面顶部【已上传素材栏】，绝对避开文本框与悬浮窗
  function getOnlyUploadedAssets() {
    const availableTags = new Set();
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
    const widget = document.getElementById('zero-floating-widget');
    
    // 获取页面除文本框和插件面板外的所有 DOM 节点
    const allElems = document.body.querySelectorAll('div, span, p, b, label');

    for (const el of allElems) {
      // 严格排除文本框内部节点和悬浮控件内部节点
      if (editor && (editor === el || editor.contains(el))) continue;
      if (widget && (widget === el || widget.contains(el))) continue;

      // 仅检查叶子节点（即纯文字节点，防止把长文章容器包含进来）
      if (el.children.length === 0 && el.innerText) {
        const text = el.innerText.trim();
        // 匹配仅包含 "图1", "音频2" 等素材徽章字样的元素
        const m = /^(?:@|＠)?(图\d+|音频\d+|视频\d+|镜头\d+|角色\d+|主体\d+|素材\d+)$/.exec(text);
        if (m) {
          availableTags.add(m[1]);
        }
      }
    }

    return availableTags;
  }

  // 3. 统计可转换标签
  function detectUnlinkedMentions() {
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
    const uploadedAssets = getOnlyUploadedAssets();
    const hasAssets = uploadedAssets.size > 0;

    if (!editor) {
      return { totalUnlinked: 0, validCount: 0, invalidCount: 0, hasAssets, uploadedAssets };
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

        // 只有已上传的素材才算“有效”，未上传的算“未上传项”
        if (hasAssets && uploadedAssets.has(cleanTag)) {
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
      uploadedAssets
    };
  }

  // 4. 更新检测 UI
  function updateDetectionUI() {
    const countValueEl = document.getElementById('zero-detection-count');
    const statusTextEl = document.getElementById('zero-widget-status');
    const runBtn = document.getElementById('zero-widget-action-btn');

    if (!countValueEl) return;

    const { totalUnlinked, validCount, invalidCount, hasAssets } = detectUnlinkedMentions();

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

  // 6. UI 面板
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

    document.getElementById('zero-widget-action-btn').onclick = () => runAutoMentionStream();

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

  // 7. 一键全量转换（采用智能游标验证机制）
  async function runAutoMentionStream() {
    const runBtn = document.getElementById('zero-widget-action-btn');
    const statusText = document.getElementById('zero-widget-status');
    const editor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');

    if (!editor) {
      showToast('❌ 未找到提示词文本框！');
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

            // 未上传素材直接忽略
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

  // 初始化
  createFloatingWidget();
  setInterval(() => updateDetectionUI(), 1000);
})();
