# λ HLF2 · 网页版《半条命》极速版

一个纯前端、零依赖的浏览器 FPS —— 用射线投射（raycasting）引擎从零手写，
所有贴图、怪物、音效都在运行时**程序化生成**，没有任何外部图片/音频资源。
整个游戏约 130 KB 源码，打开网页 30ms 内即可开玩。

```
HLF2/
├── index.html          # 页面 + HEV 风格 HUD
├── css/style.css
└── js/
    ├── textures.js     # 10 种墙面贴图，预烘焙 32 级明暗 LUT
    ├── sprites.js      # 怪物 / 道具精灵，10 级明暗
    ├── audio.js        # WebAudio 合成音效（枪声、爆炸、嘶吼…）
    ├── maps.js         # 3 张手工 ASCII 关卡
    └── game.js         # 引擎：光线投射、精灵排序、AI、武器、HUD
```

## 立即游玩

**<https://guiwow911.github.io/HLF2/>** —— 已部署在 GitHub Pages，浏览器打开即可玩，
无需安装、无需联网下载资源。

## 本地运行

```bash
cd HLF2
python3 -m http.server 3000      # 或任意静态服务器
# 浏览器打开 http://localhost:3000
```

## 部署

纯静态站点，仓库根目录的 `index.html` 就是入口，任何静态托管开箱即用。

| 方式 | 操作 |
| --- | --- |
| GitHub Pages | ✅ 已开启（`main` 分支 / 根目录）→ <https://guiwow911.github.io/HLF2/> |
| Netlify | 导入仓库即可（`netlify.toml` 已配好） |
| Vercel | `npx vercel --prod`（`vercel.json` 已配好） |
| Docker | `docker build -t hlf2 . && docker run -p 8080:80 hlf2` |
| 单文件 | `python3 tools/build.py` → `dist/hlf2.html`（78 KB，双击即玩） |

详见 [DEPLOY.md](DEPLOY.md)。

## 玩法

戈登·弗里曼在黑山研究所遭遇共振级联事故。穿过三个区域活着出去。

| 操作 | 键位 |
| --- | --- |
| 移动 | `W A S D` |
| 视角 | 鼠标（点击画面锁定指针） |
| 开火 | 鼠标左键 / `空格` |
| 疾跑 / 蹲下 | `Shift` / `Ctrl` |
| 换武器 | `1`–`4` / 滚轮 / `Q` `E` |
| 换弹 | `R` |
| 手电（视野亮度） | `F` |
| 静音 / 暂停 | `M` / `Esc` |

### 内容

* **3 个关卡**：异常物质实验室 → 生化污染区 → Lambda 核心
* **4 种武器**：撬棍、GLOCK 17、SPAS-12 霰弹枪（8 弹丸扩散）、MP5 全自动
* **4 种敌人**：头蟹（高速扑咬）、僵尸（高血量近战）、HECU 士兵（三连点射、会走位）、Vortigaunt（蓄力电击）
* 爆炸桶连锁爆炸、范围伤害、血液/火花粒子
* 医疗包、HEV 电池、三种弹药、武器拾取
* 生命 / 护甲 / 弹药 HUD、实时小地图、三档难度、计分与计时

## 技术要点

* **渲染**：480×270 内部缓冲区，DDA 光线投射写 `Uint32Array` 像素，再放大到全屏（像素风）。
  贴图预先烘焙 32 级明暗，运行时零光照计算。
* **精灵**：逆相机矩阵变换 + z-buffer 逐列裁剪，连续可见区段合并成一次 `drawImage`。
* **音效**：全部由振荡器 + 噪声缓冲 + 滤波器实时合成。
* **调试接口**：控制台 `HLF2.god()` / `HLF2.give()` / `HLF2.load(1)` / `HLF2.tp(x,y)`。

> 本项目为致敬性质的同人小游戏，与 Valve 无关，不含任何原作素材。
