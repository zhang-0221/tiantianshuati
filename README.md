# 喜刷刷

一个轻量的 AI 刷题工具，直接打开页面即可使用。

上传试卷或复习资料，DeepSeek 自动识别内容：现成试题保留原题与答案，学习资料生成练习题。一题一页机考模式，右侧内置 AI 学习助手。

## 功能

- 上传 .txt / .md / .docx 或粘贴资料
- AI 自动识别原题，无需固定模板；支持单选、多选、判断、简答、论述
- 原题分批提取并核对题干、选项与答案，自动补查异常题，失败后可在当前页面继续重试
- 原文未提供答案的题保留并标记待补充，补充前不自动判分
- 普通学习资料自动生成练习题，可选知识大纲
- 一题一页机考模式，顶部进度条追踪
- 单选点选即判，多选题确认，简答/论述自评
- 内置 AI 学习助手侧边栏，随时提问
- 所有试卷自动保存到浏览器本地题库
- 双击打开页面即可使用，无需安装

## 使用

1. 双击打开 `index.html`
2. 点击左下角「API Key」设置你的 DeepSeek API Key（[免费申请](https://platform.deepseek.com/api_keys)）
3. 上传或粘贴试题、复习资料，点击「AI 识别并导入」
4. 开始刷题

## 依赖

- [DeepSeek API](https://platform.deepseek.com/) — AI 出题和对话
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) — .docx 文件解析
- 无需 Node.js、Python 或任何后端

## 无需 API 版本

如果不想申请 API Key，可以使用 `backup/机考复习工具-本地版.html`，纯本地正则解析出题，功能简化但完全离线可用。

## 注意

- API Key 仅保存在你自己的浏览器中，不会上传
- DeepSeek API 按实际输入和输出 tokens 计费
- 原题识别包含盘点、复核和分批提取，会发起多次 API 请求；重试进度保留在当前页面，刷新后需要重新识别

## 账号与云同步（可选）

账号功能使用“用户名 + 密码”登录，将题库、答题记录、背诵进度与学习设置按账号同步到云端；首次登录会让用户选择如何迁移本机数据。完整的 Supabase、Vercel 和 GitHub Pages 配置见 [docs/ACCOUNT_SETUP.md](docs/ACCOUNT_SETUP.md)。

DeepSeek API Key 不会与账号同步，始终只保存在当前浏览器。
