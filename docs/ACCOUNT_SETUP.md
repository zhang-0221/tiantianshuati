# 账号与云同步部署指南

本文将 GitHub Pages 上的静态学习页面、Vercel 上的账号接口，以及 Supabase 的认证和数据库连接起来。完成后，用户以“用户名 + 密码”注册和登录；题库、学习进度、背诵记录与学习设置按账号同步。DeepSeek API Key 始终只保存在用户当前浏览器。

## 上线前的地址约定

以下示例使用当前仓库的 GitHub Pages 地址。若改用自定义域名，请将下列所有地址替换为同一个最终公开地址。

| 用途 | 值 |
| --- | --- |
| GitHub Pages 页面地址（`SITE_URL`） | `https://zhang-0221.github.io/tiantianshuati/` |
| GitHub Pages 源（`ALLOWED_ORIGIN`） | `https://zhang-0221.github.io` |
| Vercel API 地址（示例） | `https://<your-vercel-project>.vercel.app` |

注意：`SITE_URL` 包含仓库路径与末尾 `/`，`ALLOWED_ORIGIN` 只有协议与域名，不能带 `/tiantianshuati/`。

## 1. 创建 Supabase 项目并执行迁移

1. 在 Supabase 创建一个项目；在 **Connect / API Keys** 复制 Project URL 和 **anon (public)** key。这里的 anon key 是前端可公开使用的 key，不是 service role key。
2. 打开 **SQL Editor**，新建查询；完整复制并执行仓库中的 [`supabase/migrations/20260714_account_auth_and_sync.sql`](../supabase/migrations/20260714_account_auth_and_sync.sql)。
3. 在 **Table Editor** 确认已创建 `profiles` 与 `learning_snapshots`；在 **Authentication > Policies** 确认两表已启用 RLS。不要为了排错而关闭 RLS。
4. 在 **Authentication > Providers > Email** 启用 Email provider，并开启 **Confirm email**。注册完成前必须验证邮箱。
5. 在 **Authentication > URL Configuration** 配置：

   - **Site URL**：`https://zhang-0221.github.io/tiantianshuati/`
   - **Redirect URLs**：
     - `https://zhang-0221.github.io/tiantianshuati/?verified=1`
     - `https://zhang-0221.github.io/tiantianshuati/?reset=1`

   注册邮件会跳转到 `?verified=1`，找回密码邮件会跳转到 `?reset=1`；这两个地址必须同时在允许列表中。
6. 保持 Supabase 的确认注册与找回密码邮件模板中包含 `{{ .ConfirmationURL }}`。可自定义文案，但不要删除该链接。

## 2. 部署 Vercel 账号接口

1. 将本仓库导入 Vercel，或在仓库根目录执行 `vercel` 后再执行 `vercel --prod`。Vercel 负责 `/api/auth/register`、`/api/auth/login` 与 `/api/auth/password-reset`；GitHub Pages 仍只负责静态前端。
2. 在 **Vercel Project > Settings > Environment Variables** 为 **Production** 添加下列变量；若使用 Preview 或 `vercel dev`，也要为对应环境添加同样的值。

| 变量名 | 值 | 是否公开 |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase Project URL，例如 `https://<project-ref>.supabase.co` | 否 |
| `SUPABASE_ANON_KEY` | Supabase 的 anon (public) key | 否（仅供 Vercel 函数使用） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 的 service_role key | **绝对保密** |
| `SITE_URL` | `https://zhang-0221.github.io/tiantianshuati/` | 否 |
| `ALLOWED_ORIGIN` | `https://zhang-0221.github.io` | 否 |

3. 连接 Vercel KV / Upstash Redis 到此 Vercel 项目。`@vercel/kv` 依赖连接后自动注入的 KV 凭据，账号注册、登录和找回密码的限流依赖它；未连接时，账号接口会安全地返回“服务不可用”，不会放开限流。
4. 保存变量后重新部署 Vercel。环境变量仅作用于之后的新部署。
5. 访问 `https://<your-vercel-project>.vercel.app/api/auth/login` 应收到 `405` JSON 响应（该接口只允许 `POST`），说明函数地址已可达。

### 密钥边界

- `SUPABASE_SERVICE_ROLE_KEY` 只能放在 Vercel 环境变量中；**绝不能**写入 `index.html`、GitHub Actions、`TTSK_AUTH_CONFIG`、浏览器控制台、截图或 Git 历史。
- 不要提交 `.env`、`.env.local`、`.vercel/` 或任何包含密钥的文件。若曾泄露 service role key，立即在 Supabase 轮换它并在 Vercel 更新变量后重新部署。
- `SUPABASE_ANON_KEY` 只能作为浏览器的公开配置使用；RLS 才是用户数据隔离的安全边界。

## 3. 为 GitHub Pages 配置公开前端参数

在 `index.html` 中、应用脚本执行前加入下面的配置。它可以被任何访问者看到，因此只允许这五个字段；不要加入 service role key、KV 凭据、DeepSeek API Key、邮箱或任何用户资料。

```html
<script>
  window.TTSK_AUTH_CONFIG = {
    enableGate: true,
    supabaseUrl: "https://<project-ref>.supabase.co",
    supabaseAnonKey: "<Supabase anon public key>",
    apiBase: "https://<your-vercel-project>.vercel.app",
    siteUrl: "https://zhang-0221.github.io/tiantianshuati/"
  };
</script>
```

字段含义：

- `enableGate`：只有明确设置为 `true` 才会显示登录门禁；首次部署可先保留 `false`，完成接口验证后再改为 `true`。
- `supabaseUrl` 与 `supabaseAnonKey`：浏览器用于恢复会话、读取和写入自身 RLS 数据。
- `apiBase`：不带末尾 `/` 的 Vercel 地址。
- `siteUrl`：用于部署记录与页面回跳的一致公开地址。

将该提交推送到 `master` 后，现有 GitHub Actions 会发布到 `gh-pages` 分支。登录门禁会在下一次 Pages 发布后生效；Vercel 环境变量本身不会自动写入 GitHub Pages。

## 4. 数据与免费额度行为

- 账号数据使用 Supabase 的 `profiles` 和 `learning_snapshots`；学习修改先写入当前账号的本地缓存，再异步同步。
- 首次登录时，如果本机或云端已有数据，页面会要求用户选择云端、上传本机或合并；不会静默覆盖云端数据。
- DeepSeek API Key 不进入快照、数据库、Vercel 接口或同步请求，只保存在当前浏览器。
- Supabase Free 项目在低活动状态下可能在约 7 天后暂停；恢复项目后，用户下次联网会重新同步。暂停期间，登录和云同步会显示不可用，本地学习缓存仍保留。
- Vercel 的环境变量变更需要重新部署才生效；Vercel Hobby 适合个人/非商业试用。生产商业使用前请核对当前套餐与额度。

## 手工验收清单

- [ ] GitHub Pages 使用上述 `TTSK_AUTH_CONFIG`，且对象只包含 `enableGate`、`supabaseUrl`、`supabaseAnonKey`、`apiBase`、`siteUrl`。
- [ ] 未登录访问 Pages 时只能操作登录、注册和找回密码卡片，底层学习页面不可点击。
- [ ] 使用合法的用户名（3–24 位小写字母、数字或 `_`）、邮箱和至少 8 位密码注册；收到确认邮件并能回到 `?verified=1`。
- [ ] 未验证邮箱不能完成正常登录；验证后可用用户名和密码登录。
- [ ] 重复用户名、错误密码和连续多次请求分别得到安全的提示、通用的凭据错误和限流提示，且不泄露邮箱是否存在。
- [ ] 用“忘记密码”输入用户名，绑定邮箱收到重置邮件并可经 `?reset=1` 重置密码。
- [ ] 账号 A 导入资料并完成一次刷题后，在另一浏览器登录 A，题库、答题记录、背诵进度与设置会恢复。
- [ ] 同一浏览器退出 A、登录 B：不会短暂显示 A 的题库；B 的数据独立。
- [ ] 首次登录且本机有旧数据时，迁移对话框必须出现；选择云端、上传、合并后结果符合选择。
- [ ] 断网后修改学习数据，再恢复网络，状态由“待同步”变为“已同步”；数据未丢失。
- [ ] 在浏览器开发者工具、已发布 `index.html`、Git 历史和 GitHub Actions 日志中检索不到 `SUPABASE_SERVICE_ROLE_KEY` 的值；仅能看到 anon key。
- [ ] 设置 DeepSeek API Key 后完成学习操作；检查 Supabase `learning_snapshots`，其中不包含该 Key。
