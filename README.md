# 喜刷刷

一款把资料导入、AI 出题、刷题复习和错题回顾放在一起的学习工具。现在以 **本地优先** 为主：不登录也能完整使用，学习资料与进度默认保存在当前设备。

> 适合把课件、笔记或文档快速转成自己的练习题库，并在电脑和手机上持续复习。

## 下载与安装

请从 [Releases](https://github.com/zhang-0221/tiantianshuati/releases) 下载对应安装包：

| 平台 | 安装包 | 说明 |
| --- | --- | --- |
| Windows 64 位 | `xishuashua_0.1.0_x64-setup.exe` | 双击安装即可使用。首次打开若出现 SmartScreen 提示，可选择“仍要运行”。 |
| Android ARM64 | `tiantianshuati_0.1.0_arm64.apk` | 下载后允许“安装未知来源应用”，再打开 APK 安装。适用于近年的大多数安卓手机。 |
| macOS Intel | `xishuashua_0.1.0_x64.dmg` | 适用于 Intel 芯片 Mac；首次打开可能需要在“隐私与安全性”中允许。 |
| macOS Apple Silicon | `xishuashua_0.1.0_aarch64.dmg` | 适用于 M 系列芯片 Mac；首次打开可能需要在“隐私与安全性”中允许。 |

## 能做什么

- 导入或粘贴学习资料，支持 `.txt`、`.md`、`.docx`、`.pdf` 等内容；
- 通过 DeepSeek 生成练习题、背诵卡与知识导图；
- 管理题库与试卷，按单选、多选、判断等题型刷题；
- 自动记录正确、错误与学习进度，方便回顾薄弱知识点；
- 提供背诵宝地、情景单词、思维导图等学习视图；
- 内置简洁的 AI 学习助手，可作为日常问答助手使用；
- 一键导出并恢复完整学习备份，换设备时更安心。

## 数据与隐私

喜刷刷默认不要求账号登录，也不会把你的题库自动上传到服务器：

- 资料、题库、答题记录和学习进度保存在本机；
- 需要换电脑或手机时，请先在设置中导出完整备份，再在新设备恢复；
- DeepSeek API Key 只保存在当前设备，**不会**包含在备份中；
- 旧的云端账号相关代码暂时保留，但当前版本不启用，后续如需跨设备云同步再单独开启。

## 使用建议

1. 打开“导入”页面，上传一份资料或直接粘贴文本。
2. 在设置中填写自己的 DeepSeek API Key（如需 AI 出题或问答）。
3. 生成题目后，到“我的题库”选择试卷开始刷题。
4. 定期在设置中导出完整备份，保存到自己信任的位置。

## 本地开发

项目本体是原生 HTML/CSS/JavaScript，桌面与 Android 版本由 Tauri 封装。

```bash
npm install
npm test
npm run desktop:prepare
npm run desktop:build
npm run mobile:build
```

常用要求：

- Windows 桌面打包需要 Rust 与 Visual Studio C++ Build Tools；
- Android 打包需要 Android SDK、NDK、JDK 17 和 Rust Android target；
- `npm run mobile:build` 会生成并签名 ARM64 APK。

## 项目状态

当前版本以稳定、轻量、离线可用为优先。欢迎通过 [Issues](https://github.com/zhang-0221/tiantianshuati/issues) 反馈问题或提出改进建议。
