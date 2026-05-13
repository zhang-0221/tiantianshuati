# 天天刷题

一个 HTML 文件全搞定的 AI 刷题工具。

上传复习资料，DeepSeek 自动生成单选、多选、简答、论述题，一题一页机考模式，答完秒判对错。右侧内置 AI 学习助手，不懂随时问。

## 功能

- 上传 .txt / .md / .docx 或粘贴资料
- AI 自动生成四种题型（单选、多选、简答、论述）
- 一题一页机考模式，顶部进度条追踪
- 单选点选即判，多选题确认，简答/论述自评
- 内置 AI 学习助手侧边栏，随时提问
- 所有试卷自动保存到浏览器本地题库
- 单文件 HTML，双击即用，无需安装

## 使用

1. 双击打开 `天天刷题.html`
2. 点击左下角「API Key」设置你的 DeepSeek API Key（[免费申请](https://platform.deepseek.com/api_keys)）
3. 上传或粘贴复习资料，点击「AI 生成试卷」
4. 开始刷题

## 依赖

- [DeepSeek API](https://platform.deepseek.com/) — AI 出题和对话
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) — .docx 文件解析
- 无需 Node.js、Python 或任何后端

## 无需 API 版本

如果不想申请 API Key，可以使用 `backup/机考复习工具-本地版.html`，纯本地正则解析出题，功能简化但完全离线可用。

## 注意

- API Key 仅保存在你自己的浏览器中，不会上传
- DeepSeek API 按量计费，生成一次试卷约消耗几千 tokens
