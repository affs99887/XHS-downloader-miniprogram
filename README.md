# 笔记盒子 · 小红书笔记提取小程序

粘贴小红书分享链接，自动提取无水印高清原图与完整文案，整理进你的素材盒子。
本仓库是按设计稿像素级还原的微信小程序实现，交互动效（打字机标题、解析进度、保存进度条、胶囊 tab 展开动画等）全部还原。

## 如何运行

1. 打开微信开发者工具，选择「导入项目」，目录选本仓库根目录。
2. AppID 用测试号即可（project.config.json 里已写 `touristappid`）。
3. 演示图片来自 picsum.photos（一个随机图占位服务），项目已开启「不校验合法域名」（`urlCheck: false`），开发者工具里可直接加载；真机预览需在详情里勾选「不校验合法域名」。

## 架构：单页状态机

整个 app 只有一个页面 `pages/index/index`，六个屏幕（首页 / 解析中 / 解析结果 / 解析记录 / 我的 / 会员中心）靠 `data.screen` 字段切换，而不是六个页面互相跳转。

为什么这样做：设计里底部的悬浮胶囊 tab 栏有"跨屏连贯"的展开动画（激活项的文字从 0 宽度平滑滑出）。如果用原生 tabBar 或多页跳转，每次切页组件都会重建，动画必断。所有屏幕在同一个页面里，tab 栏节点一直活着，切换只改 class，过渡动画才能连续播放。

各屏幕的结构（WXML）和样式（WXSS）拆在 `pages/index/partials/` 里，由主文件 `<include>` / `@import` 拼装，既保持单页运行，又不至于一个文件几千行。

## 目录结构

```
app.json / app.js / app.wxss     全局配置、入口、全局样式（字体/点击态/共用动画）
pages/index/
  index.wxml                     宿主骨架：自定义导航、滚动容器、胶囊 tab 栏、toast
  index.wxss                     宿主样式 + 主题色变量 + @import 各屏样式
  index.js                       状态机：切屏、打字机、解析流程、选图保存、大图预览
  index.json                     页面配置（禁用页面级滚动，滚动交给 scroll-view）
  partials/
    icons.wxss                   图标库：SVG 用 mask 抠形 + currentColor 上色，可随主题变色
    home / parsing / result / history / profile / membership / viewer
                                 每屏一对 wxml+wxss（result 和 membership 各多一个底部条文件）
utils/
  mock.js                        演示数据层：主题色、假笔记、假历史……换真实后端只动这个文件
  typer.js                       首页"拼音打字机"步骤表生成器
  album.js                       下载网络图并保存到系统相册（带进度回调）
```

## 哪些是真的，哪些是演示

| 功能 | 现状 |
| --- | --- |
| 粘贴 | 真的读剪贴板；剪贴板为空时用演示链接兜底 |
| 一键复制文案 | 真的写剪贴板 |
| 保存图片到相册 | 真的下载 + 写相册（需要相册授权），按钮上的进度条走真实下载进度 |
| 解析小红书链接 | 演示流程：按固定节奏走进度动画，结果是假数据。接真实后端时替换 `index.js` 的 `onStartParse` 和 `utils/mock.js` |
| 我的页统计、会员购买 | 纯展示 |

## 主题与布局（有能力，无入口）

设计稿自带 4 套主题（墨绿·亮绿 / 暗夜蓝·柠檬 / 焦糖·奶油 / 石墨·荧光绿）和 3 种结果页图片布局（网格 / 瀑布 / 列表）。代码层面全部支持：

- 换主题：调用页面实例的 `setTheme('暗夜蓝·柠檬')`，整套 CSS 变量热切换；
- 换布局：调用 `setLayout('masonry' | 'list' | 'grid')`。

这两个开关在设计稿里位于"原型控制台"（预览工具），不属于手机端 UI，所以小程序里没有做入口，留作以后的设置页使用。

## 实现要点（给接手的同学）

- **尺寸换算**：设计稿是 390px 宽 iPhone 原型，规则统一为"设计 px × 2 = rpx"。
- **图标**：WXML 不能内联 svg，所有图标在 `icons.wxss` 里用 `-webkit-mask` 把 SVG 形状抠出来、底色 `currentColor`，改 `color` 就能改图标颜色。
- **比例图**：不用 `aspect-ratio`（兼容性差），用 `padding-top` 百分比撑高。
- **自定义导航**：`navigationStyle: custom`，状态栏高度和胶囊按钮位置取真实值计算，状态栏文字颜色随深浅屏用 `wx.setNavigationBarColor` 切换。
- **字体**：设计稿用 Google Fonts 的 Noto Sans SC / Space Mono，小程序里用系统字体栈近似（无需网络加载字体）。
