# /metrics 页面 UI 规范（版本A · Clinical Precision 临床诊疗风）

> 来源：`/Users/roryyu/WorkBuddy/soulmate/emotion-healing-ui/版本A-UI规范.md`
> 适用范围：`app/metrics` + `components/metrics`（独立于 /qawf，样式改 `app/metrics/globals.css`）
> 设计定位：冷静、精准、数据驱动 —— 情绪感知呈现为"精准的情绪诊断仪器"。不制造情绪，只呈现数据。

## 1. 设计 Token

```css
--bg: #F0F4F3;            /* 页面背景（浅灰绿） */
--card: #FFFFFF;          /* 卡片底 */
--ink: #1A2B2B;           /* 主文字 */
--text2: #4A6060;         /* 次级文字 */
--muted: #6B8080;         /* 标签/辅助 */
--muted2: #8A9A9A;        /* 最弱文字/占位 */
--line: #E2EAE8;          /* 分割线/边框 */
--track: #E8EDEE;         /* 进度轨道 */
--primary: #1A4A4A;       /* 品牌主色（深青）：主按钮、选中态、数据主色 */
--primary2: #2D6A6A;      /* 品牌次色 */
--accent: #3DB8A0;        /* 薄荷绿强调：链接、状态点、扫描线、正增量 */
--accent-light: #A8E6D8;  /* 渐变高光、深底文字 */
--ok: #2D7A6B;            /* 完成/正向 */
--warn: #E8902C;          /* 警示/待办，底 #FFF3E0 */
--danger: #E07070;        /* 必填/错误 */
--scan-bg: #0D1F1F;       /* 扫描视口深底 */
--shadow: 0 2px 8px rgba(26,74,74,.04);   /* 卡片常规阴影，克制 */
```

渐变：主渐变 `linear-gradient(90deg,#3DB8A0,#2D7A6B)`；深色主视觉卡 `linear-gradient(135deg,#1A4A4A,#2D6A6A)`。

## 2. 字体

- 中文：Noto Sans SC（300/400/500/700/900），回退 PingFang SC / system-ui。
- **数字一律 JetBrains Mono**（指标值、计时、FPS、状态码），强化"仪器读数"质感；回退 SF Mono / Menlo。
- 字号阶梯：超大数字 48/900 · 大数字 24/700（指标值）· 中大 22/700 · 页面主标题 20/700 · 卡片标题 14/600 · 标签 11/400–600 · 最小 10。
- 标签字距 `letter-spacing: .04em`，状态码 `.06em`。

## 3. 布局与圆角

- 4px 基准栅格；移动端内容边距 16px；容器 max-width 460px。
- 圆角：扫描视口/大容器 20px · 主卡片 16px · 常规卡/指标卡 12px · 图标容器 10px · 按钮 10–12px · 标签徽标 6px · 进度条 2px（半高）。

## 4. 组件映射（/metrics 现有 class → 规范）

| class | 规范化要求 |
|---|---|
| `.topbar` | 白底、下边框 `--line`；`.ver` 做成状态徽标（11px Mono / `--accent` 字 / `#E0F0EC` 底 / 圆角 6px） |
| `.steps` / `.step` | 白底条；序号方块 Mono；选中 `--primary` 底白字、文字 `--primary` 700 |
| `.card` | 白底、16px 圆角、1px `--line` 边框 + 常规阴影，内边距 18–20px |
| `.sec-title` | 15px/700 `--ink`，**前置 3px 薄荷绿竖条**（圆角 2px） |
| `.grid2` | 表单单列；输入框底 `#F7FAF9`、边框 `--line`、圆角 10px，focus 边框 `--accent` |
| `.btn` | 圆角 12px、高≥44px；`.primary` = `--primary` 底白字（hover `--primary2`）；`.ghost` 透明底 `--accent` 字 |
| `.disclaimer` / `.tips` | 警示条：`#FFF3E0` 底 `--warn` 字；tips 标题 `--primary` |
| `.video-box` | 深色扫描视口：`--scan-bg` 底、20px 圆角、3:4；`.face-hint` = 11px Mono `--accent` 字、深色胶囊 |
| `.rec-status.on` | 录制中 = `--accent` 700 |
| `.timer b` / `.m b` | JetBrains Mono 700，数值色 `--primary`（24px） |
| `.wave` | `--scan-bg` 深底、12px 圆角，波形线 `#37d0a8` |
| `.metrics` / `.m` | 两列 10px 间距；白底 12px 圆角 `--line` 边框；标签 11px `--muted2` + .04em 字距 |
| `.live-line` / `.note` / `.result-head` | 11–12px `--muted`，数字 Mono `--primary` |
| `.foot` | 11px `--muted2` 居中 |

## 5. 交互与状态

- 单选/选中态：底色 `#E0F0EC` 高亮，文字 `--primary` 700，过渡 0.15–0.2s。
- 进行中：Mono 等宽状态码表达（如 SCANNING…），不花哨。
- 点击目标高≥44px；正文最小 10px、主内容≥12px；语义色不作为唯一信息载体（必须带文字）。
- 动效克制：仅呼吸点（1.5s）、扫描线（2.5s）、点击反馈，不做重转场。

## 6. 约定

- /metrics 样式只改 `app/metrics/globals.css` 与 `components/metrics/*`，**不得回改 /qawf 的同名文件**。
- 新增界面元素优先复用上表 class 与 Token，避免引入新的硬编码色值。
