# macOS Release Design

## Goal

在不改变网页版、Windows 安装包和 Android APK 的前提下，为喜刷刷持续产出 Intel 与 Apple Silicon 两个 macOS `.dmg` 安装包，并把它们上传到指定 GitHub Release。

## Scope

- 新增 GitHub Actions macOS 发布工作流。
- 产出两个 `.dmg` 文件：
  - `xishuashua_<version>_x64.dmg`（Intel Mac）
  - `xishuashua_<version>_aarch64.dmg`（Apple Silicon Mac）
- 工作流可手动运行，并通过 `release_tag` 参数把产物上传到已有 Release。
- 对未来 `v*` 标签推送自动创建或更新同名 Release。
- 现有网页端、Windows NSIS 与 Android 打包脚本保持原样。

## Non-goals

- 不构建 iOS、iPadOS、macOS App Store 包或 TestFlight 包。
- 不申请 Apple Developer Program，不配置 Apple 签名证书或公证（notarization）。
- 不修改学习功能、数据存储、登录状态或网页部署流程。

## Architecture

新增一份 macOS 专用 Tauri 覆盖配置，将现有仅面向 Windows 的 `nsis` 打包目标切换为 `dmg`。GitHub Actions 以两个独立的 Apple Silicon macOS runner job 构建 Intel 和 Apple Silicon 版本：一个 job 使用 Rust 的 `x86_64-apple-darwin` target 交叉构建 Intel 包，另一个使用 `aarch64-apple-darwin` target 原生构建。两个 job 均安装 Node、Rust target 与 Tauri CLI，运行现有测试和桌面资源准备步骤，再生成 `.dmg`。

工作流使用 GitHub 提供的 `GITHUB_TOKEN` 和 `contents: write` 权限创建或查找指定标签的 Release。构建完成后将产物重命名为稳定的英文文件名并上传；重复运行时以覆盖方式更新同名附件，避免残留旧包。

## User Flow

1. 维护者在 GitHub Actions 页面手动运行“Build macOS release”，输入 `v0.1.0`。
2. 两个构建 job 并行完成后，工作流向 `v0.1.0` Release 添加两个 `.dmg`。
3. Mac 用户根据设备芯片选择下载：Intel 下载 `x64`，M 系列下载 `aarch64`。
4. 因未签名，用户首次打开可能看到 Gatekeeper 警告；可在系统设置的隐私与安全性页面选择继续打开。

## Error Handling

- 任一架构构建失败时，该 job 失败且不上传其不完整产物；另一个 job 不受影响。
- 若 `release_tag` 不存在，手动工作流创建同名 Release 后再上传。
- 上传使用覆盖模式，同名文件可被新构建替换。
- 发布说明将明确标注包未经过 Apple 开发者签名或公证。

## Testing and Verification

- 新增静态工作流契约测试，验证 macOS 配置、两个架构、DMG 输出名、Release 权限与上传命令均存在。
- 继续运行全部既有 Node 测试。
- 首次在 GitHub Actions 中手动运行 `v0.1.0`，检查 Release 出现两个目标文件。
- 不在 Windows 本地尝试编译 `.dmg`；构建验证以 GitHub 的 macOS runner 结果为准。

## Cost and Compatibility

GitHub Actions 的 macOS runner 会消耗仓库 Actions 分钟数。两个包均不含 Apple 签名或公证，因此只能作为从 GitHub Release 手动下载的个人分发版本，不能直接上架 Mac App Store。
