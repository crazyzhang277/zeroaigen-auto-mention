# ZeroAIGen @主体标签自动关联油猴脚本设计文档

## 1. 概述 (Overview)
在 `aigc.zeroaigen.cn` 平台的 AI 视频提示词编辑器中，当用户粘贴包含 `@图x` 或 `@音频x`（如 `@图1`、`@图6`、`@音频2`）的文本时，编辑器默认将其保留为纯文本。用户必须手动在每个标签后删除字符或敲击回车唤起下拉菜单并回车确认，才能将其转化为平台原生带有预览视轨的实体 Badge 标签（绿标）。

本油猴脚本（Tampermonkey Userscript）旨在为用户提供【⚡ 一键关联 @标签】功能，自动扫描文本框中的所有未转换标记，并串行模拟光标触发与 Enter 确认，快速完成批量标签实体化。

---

## 2. 需求与限制 (Requirements & Scope)
### 2.1 功能需求
1. **自动按钮注入**：在提示词文本框左下角/工具栏动态注入【⚡ 一键关联 @标签】按钮。
2. **文本扫描与识别**：使用正则 `/(?:@|＠)(图\d+|音频\d+)/g` 识别未转化的引用标记。
3. **DOM 仿真回车转换**：
   - 寻找对应的 DOM 文本节点或富文本编辑器选区（Selection / Range）。
   - 将光标移至目标标记结尾。
   - 派发键盘 `keydown/input` 事件唤起组件下拉匹配菜单。
   - 延迟 50-100ms 后派发 `Enter` 键事件完成确认替换。
4. **状态与提示**：转换过程中按钮显示 loading 状态，完成后弹出 toast 提示转换数量。

### 2.2 约束与边缘情况 (Edge Cases)
- **非存素材**：若提示词引用了不存在的素材（如 `@图99`），无法匹配弹出下拉框时，超时（300ms）后自动跳过，避免阻塞后续处理。
- **已转换节点**：区分已转换的富文本 Badge 标签节点（如拥有特定 CSS class 或 DOM 结构）与未转换的纯文本 `@图x`，避免重复操作。
- **动态 DOM 挂载**：支持 SPA 页面路由切换和富文本框重新初始化（通过 `MutationObserver` 监控）。

---

## 3. 技术架构与流程 (Technical Architecture)

```
[ 用户点击 ⚡ 一键关联 @标签 按钮 ]
                 │
                 ▼
     [ 禁用按钮并置为 loading ]
                 │
                 ▼
[ 获取富文本编辑器 / ContentEditable / Textarea ]
                 │
                 ▼
[ 正则扫描所有未转换的 @图x / @音频x ]
                 │
                 ▼
   ┌─────── 循环遍历匹配项 ───────┐
   │                               │
   │ 1. 移动光标定位至标记尾部     │
   │ 2. 触发字符/BackSpace模拟唤起 │
   │ 3. 等待 Candidate Dropdown    │
   │ 4. 派发 Enter 键事件          │
   │ 5. 检查节点转换状态           │
   └───────────────┬───────────────┘
                   │
                   ▼
     [ 恢复按钮 & 弹出 Toast 提示 ]
```

---

## 4. 接口与代码结构 (File & Code Structure)
生成单个油猴脚本文件 `zeroaigen-auto-mention.user.js`，主要结构如下：

- **Metadata Block**:
  ```javascript
  // ==UserScript==
  // @name         ZeroAIGen @主体标签自动关联工具
  // @namespace    http://tampermonkey.net/
  // @version      1.0.0
  // @description  在零一/aigc.zeroaigen.cn 文本框中一键将 @图x 和 @音频x 自动关联为实体标签
  // @author       Antigravity
  // @match        *://aigc.zeroaigen.cn/*
  // @grant        GM_addStyle
  // ==/UserScript==
  ```
- **Main Logic Modules**:
  1. `injectUI()`: UI 挂载与 CSS 样式注入。
  2. `parseUnlinkedMentions(editorEl)`: 获取未转换的标签位置。
  3. `simulateMentionSelection(mentionText)`: 模拟选区定位与按键事件发送。
  4. `processAllMentions()`: 异步串行批处理控制器。

---

## 5. 验证计划 (Verification Plan)
1. **自动化检测**：检查油猴脚本头部 Metadata 规范性及 JavaScript 语法。
2. **场景实测**：
   - 包含单个/多个 `@图x` 和 `@音频x` 的混合段落测试。
   - 带有无效 `@图999` 的容错测试。
   - 频繁连续粘贴文本的 DOM 稳定性测试。
