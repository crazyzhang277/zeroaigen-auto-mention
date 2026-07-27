# ZeroAIGen @主体标签自动关联油猴脚本

专门为 **[aigc.zeroaigen.cn](https://aigc.zeroaigen.cn)** AI 视频提示词编辑器打造的油猴扩展脚本。

---

## 💡 背景与功能
在粘贴长篇提示词时，文本中的 `@图1`、`@图6`、`@音频1` 等引用默认只是纯文本，无法自动变成带图文预览的实体标签（绿标）。
本脚本会在文本框下方自动添加一个 **`⚡ 一键关联 @标签`** 按钮。点击后即可一键自动识别并批量回车转换所有主体标签！

---

## 🛠️ 安装与使用步骤

### 步骤 1：安装 Tampermonkey 插件
如果你的浏览器尚未安装 Tampermonkey（油猴），请先前往官网或浏览器扩展商店安装：
- [Chrome / Edge 扩展商店搜索 Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)

### 步骤 2：添加脚本
1. 点击浏览器右上方 Tampermonkey 图标 -> 选择 **“添加新脚本”**。
2. 将文件 [zeroaigen-auto-mention.user.js](./zeroaigen-auto-mention.user.js) 中的所有内容全选复制。
3. 粘贴到油猴编辑器中，按 `Ctrl + S`（或点击左上角文件 -> 保存）。

### 步骤 3：开启体验
1. 打开或刷新目标网页：`https://aigc.zeroaigen.cn/dashboard/universal?projectId=1365&type=VIDEO`
2. 将带有 `@图x` 或 `@音频x` 的文本粘贴进提示词文本框。
3. 点击文本框左下角的 **`⚡ 一键关联 @标签`** 按钮，脚本将自动完成回车转换！
