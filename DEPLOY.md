# 部署 HLF2

游戏是**纯静态站点**（无构建步骤、无后端、无外部请求），任何静态托管都能跑。
仓库根目录的 `index.html` 就是入口，所以大多数平台"选仓库 → 完成"即可。

---

## 方案 A：GitHub Pages（推荐，最省事）

当前 Arena 机器人 token 没有仓库 admin 权限，无法替你打开 Pages 开关，需要你点两下：

1. 打开 <https://github.com/guiwow911/HLF2/settings/pages>
2. **Source** 选 `Deploy from a branch`
3. **Branch** 选 `arena/01a056b9-hlf2`（或合并到 `main` 后选 `main`），目录选 `/ (root)`
4. Save，等约 1 分钟

上线地址：**https://guiwow911.github.io/HLF2/**

> 仓库根已放好 `.nojekyll`，Jekyll 不会干扰静态资源。

### A2：想用 GitHub Actions 部署？

`deploy/github-pages-workflow.yml` 已经写好（会额外产出单文件版 `hlf2-single.html`）。
由于 App 无 `workflows` 权限，需要你手动放置：

```bash
mkdir -p .github/workflows
cp deploy/github-pages-workflow.yml .github/workflows/deploy-pages.yml
git add .github && git commit -m "ci: pages" && git push
```

然后在 Settings → Pages 把 **Source** 改成 `GitHub Actions`。

---

## 方案 B：Netlify

- 网页版：New site → Import from Git → 选本仓库 → 其余留空（`netlify.toml` 已配好）
- 或命令行：

```bash
npx netlify-cli deploy --prod --dir .
```

## 方案 C：Vercel

```bash
npx vercel --prod
```

`vercel.json` 已配置好静态托管与缓存头。

## 方案 D：Cloudflare Pages

New project → 连接仓库 → 构建命令留空 → 输出目录填 `/`。

## 方案 E：单文件版（零托管）

```bash
python3 tools/build.py       # 生成 dist/hlf2.html（约 78 KB，全部内联）
```

`dist/hlf2.html` 双击就能玩，也可以直接拖进任何静态托管 / 发给别人 / 塞进 U 盘。
仓库里已经提交了一份构建产物。

## 方案 F：自托管 Docker

```bash
docker build -t hlf2 .
docker run -d -p 8080:80 hlf2      # http://localhost:8080
```

## 方案 G：本地跑

```bash
python3 -m http.server 3000
# 或 npx serve .
```

---

## 部署后自查清单

- [ ] 打开页面 1 秒内出现主菜单（贴图/音效在本地生成，无网络请求）
- [ ] 点「开始游戏」后画面锁定鼠标（**指针锁定需要 HTTPS 或 localhost**，http 的自定义域名会失效）
- [ ] 声音需要用户先交互才会响（浏览器自动播放策略），点击开始即可
- [ ] F12 控制台无报错；输入 `HLF2.state` 应返回 `play`
