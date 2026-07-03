// 单页状态机：整个 app 只有这一个页面，data.screen 决定当前显示哪个屏幕。
// 不拆多页的原因：底部胶囊 tab 有跨屏连贯的展开动画，多页切换会重建组件、动画必断。
const mock = require('../../utils/mock');
const typer = require('../../utils/typer');
const album = require('../../utils/album');

// 各屏幕的导航标题；记录页走"大标题"模式、我的页不显示标题，所以留空
const TITLES = { home: '', parsing: '解析中', result: '解析结果', history: '', profile: '', membership: '会员中心' };
// 深色 chrome 的屏幕：导航区用主题深底白字，其余用米白底深字
const DARK_SCREENS = { home: true, parsing: true, membership: true };

Page({
  data: {
    appName: '笔记盒子',
    // 状态栏/导航条是真实设备尺寸，单位 px（不是 rpx）
    statusBarH: 47,
    navH: 46,
    chromeH: 93,

    screen: 'home',
    tab: 'home',
    chromeDark: true,
    navTitle: '笔记盒子',
    navLarge: false,
    showBack: false,
    histSummary: '',
    scrollTop: 0,
    themeStyle: '',

    // 首页打字机当前帧：两行定型汉字 + 正在敲的拼音 + 光标在哪行
    disp: { l1: '笔记图文', l2: '一键带走', compL1: '', compL2: '', cur1: false, cur2: true },
    pasted: '',

    parse: { url: 'xhslink.com/a/k9Lm2x', pct: 0, step: '', steps: [] },

    note: mock.note,
    tags: mock.tags,
    imgs: [],
    layout: 'grid',
    selN: 0,
    allSel: false,
    // 保存按钮的进度覆盖层状态机：idle 空闲 / running 保存中 / done 完成定格 / fade 淡出收尾
    dl: { state: 'idle', progress: 0, width: '0%', label: '保存全部 · 9 张', checked: false },

    hist: { filter: 'all', groups: [] },

    plans: [],
    benefits: mock.benefits,
    buyLabel: '',

    viewer: { open: false, index: 0, src: '', pos: 1, count: 9, sel: false, saved: false, saveLabel: '保存到相册' },
    // ok=false 时不显示对勾图标（失败类提示配对勾会造成误解）
    toast: { show: false, text: '', ok: true },
  },

  onLoad() {
    this._timers = [];
    this._theme = mock.palettes['墨绿·亮绿'];
    this._st = 0;
    this._measureChrome();
    this.setData({
      navTitle: this.data.appName,
      imgs: mock.buildImgs(),
      plans: this._buildPlans('year'),
      buyLabel: '立即开通 · ' + mock.priceMap.year,
    });
    this._plan = 'year';
    this._applyHistFilter('all');
    this._startTyper();
    this._syncStatusFront();
  },

  onShow() {
    if (this.data.screen === 'home') this._startTyper();
  },

  onHide() {
    this._stopTyper();
  },

  onUnload() {
    this._stopTyper();
    (this._timers || []).forEach(clearTimeout);
    this._timers = [];
    if (this._toastTimer) clearTimeout(this._toastTimer);
  },

  /* ============ 基础设施 ============ */

  _measureChrome() {
    // 自定义导航：状态栏取真实高度；导航条高度按微信胶囊按钮的上下留白推算，保证和胶囊垂直对齐
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusBarH = win.statusBarHeight || 44;
    let navH = 46;
    try {
      const menu = wx.getMenuButtonBoundingClientRect();
      if (menu && menu.height) navH = (menu.top - statusBarH) * 2 + menu.height;
    } catch (e) {
      // 个别环境拿不到胶囊位置，用默认高度即可
    }
    this.setData({ statusBarH, navH, chromeH: statusBarH + navH });
  },

  _later(fn, ms) {
    const id = setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  },

  // 统一的切屏入口：更新屏幕相关的导航状态，并处理打字机启停和状态栏文字颜色
  _applyScreen(screen, patch) {
    const chromeDark = !!DARK_SCREENS[screen];
    const base = {
      screen,
      chromeDark,
      navTitle: screen === 'home' ? this.data.appName : TITLES[screen],
      navLarge: screen === 'history',
      showBack: screen === 'result' || screen === 'membership',
      scrollTop: this._flipScroll(),
    };
    this.setData(Object.assign(base, patch || {}));
    if (screen === 'home') this._startTyper();
    else this._stopTyper();
    this._syncStatusFront();
  },

  _flipScroll() {
    // scroll-top 传相同值不会触发滚动，这里在 0 和 0.1 之间交替，保证每次切屏都回到顶部
    this._st = this._st === 0 ? 0.1 : 0;
    return this._st;
  },

  _syncStatusFront() {
    // 状态栏文字颜色只能白/黑二选一：深色屏和大图预览用白字
    const dark = this.data.chromeDark || this.data.viewer.open;
    wx.setNavigationBarColor({
      frontColor: dark ? '#ffffff' : '#000000',
      backgroundColor: dark ? this._theme.bg : this._theme.cream,
      fail: () => {},
    });
  },

  _showToast(text, ok) {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this.setData({ toast: { show: true, text, ok: ok !== false } });
    this._toastTimer = setTimeout(() => this.setData({ 'toast.show': false }), 1700);
  },

  /* ============ 首页打字机 ============ */

  _startTyper() {
    this._stopTyper();
    if (!this._typerSteps) this._typerSteps = typer.buildAllSteps(mock.copySets);
    // 每次回到首页都从第一句整句停留重新播，不接着上次离开的进度
    this._ti = 0;
    this._typeTick();
  },

  _stopTyper() {
    if (this._typer) {
      clearTimeout(this._typer);
      this._typer = null;
    }
  },

  _typeTick() {
    const s = this._typerSteps[this._ti % this._typerSteps.length];
    this.setData({
      disp: {
        l1: s.l1,
        l2: s.l2,
        compL1: s.cl === 1 ? s.comp : '',
        compL2: s.cl === 2 ? s.comp : '',
        cur1: s.cl === 1,
        cur2: s.cl === 2,
      },
    });
    this._ti++;
    this._typer = setTimeout(() => this._typeTick(), s.d);
  },

  /* ============ 首页：粘贴与解析 ============ */

  onPaste() {
    // 真读剪贴板；内容为空时用演示链接兜底，保证流程随时能跑通
    wx.getClipboardData({
      success: (res) => {
        const text = (res.data || '').trim();
        this.setData({ pasted: text || mock.demoPaste });
        this._showToast('已粘贴链接');
      },
      fail: () => {
        this.setData({ pasted: mock.demoPaste });
        this._showToast('已粘贴链接');
      },
    });
  },

  onClearPaste() {
    this.setData({ pasted: '' });
  },

  onStartParse() {
    if (!this.data.pasted) {
      this._showToast('请先粘贴笔记链接');
      return;
    }
    // 从粘贴内容里抠出链接做展示；抠不到就用演示短链
    const m = this.data.pasted.match(/https?:\/\/(\S+)/);
    const url = m ? m[1] : 'xhslink.com/a/k9Lm2x';
    this._resetSelection();
    this._applyScreen('parsing', {
      parse: { url, pct: mock.parseFlow.start[0], step: mock.parseFlow.start[1], steps: this._calcSteps(mock.parseFlow.start[0]) },
      dl: { state: 'idle', progress: 0, width: '0%', label: '保存全部 · ' + this.data.imgs.length + ' 张', checked: false },
    });
    // 解析是演示流程：按固定节奏推进度，将来接真实接口时替换这段即可
    const flow = mock.parseFlow.steps;
    let i = 0;
    const run = () => {
      if (this.data.screen !== 'parsing') return;
      if (i >= flow.length) {
        this._later(() => this._applyScreen('result', { tab: 'home' }), 400);
        return;
      }
      const s = flow[i++];
      this.setData({ 'parse.pct': s[0], 'parse.step': s[1], 'parse.steps': this._calcSteps(s[0]) });
      this._later(run, 470);
    };
    this._later(run, 440);
  },

  _calcSteps(pct) {
    // 4 个阶段各占 25%：过了门槛算完成，进入本段区间算进行中
    return mock.parseFlow.stepLabels.map((label, i) => {
      const done = pct >= (i + 1) * 25;
      const active = !done && pct >= i * 25;
      return { folio: ('0' + (i + 1)).slice(-2), label, done, active };
    });
  },

  /* ============ 结果页：选图与保存 ============ */

  // 图片数组变动后的统一收口：重算选中数/全选态/按钮文案，并同步大图预览的角标
  _patchSelection(imgs) {
    const selN = imgs.filter((im) => im.sel).length;
    const allSel = imgs.length > 0 && selN === imgs.length;
    const patch = { imgs, selN, allSel };
    if (this.data.dl.state === 'idle') {
      patch['dl.label'] = selN > 0 ? '保存选中 · ' + selN + ' 张' : '保存全部 · ' + imgs.length + ' 张';
    }
    if (this.data.viewer.open) {
      const im = imgs[this.data.viewer.index] || {};
      patch['viewer.sel'] = !!im.sel;
      patch['viewer.saved'] = !!im.saved;
      patch['viewer.saveLabel'] = im.saved ? '已保存到相册' : '保存到相册';
    }
    this.setData(patch);
  },

  _resetSelection() {
    // 新一轮解析前调用：选中和已保存标记都清掉，上一轮的保存状态不该带进新结果
    this._patchSelection(this.data.imgs.map((im) => Object.assign({}, im, { sel: false, saved: false })));
  },

  onToggleImg(e) {
    const i = Number(e.currentTarget.dataset.index);
    const imgs = this.data.imgs.slice();
    imgs[i] = Object.assign({}, imgs[i], { sel: !imgs[i].sel });
    this._patchSelection(imgs);
  },

  onSelectAll() {
    // 已全选则清空，否则（包括部分选中）全部选上
    const toAll = this.data.selN !== this.data.imgs.length;
    this._patchSelection(this.data.imgs.map((im) => Object.assign({}, im, { sel: toAll })));
  },

  onBulkSave() {
    if (this.data.dl.state !== 'idle') return;
    const sel = this.data.imgs.filter((im) => im.sel);
    const targets = sel.length ? sel : this.data.imgs;
    const ids = targets.map((im) => im.idx);
    this.setData({ dl: { state: 'running', progress: 0, width: '0%', label: '保存中 0%', checked: false } });
    album
      .saveImages(targets.map((im) => im.src), (done, total) => {
        if (this.data.dl.state !== 'running') return;
        const p = Math.round((done / total) * 100);
        this.setData({ 'dl.progress': p, 'dl.width': p + '%', 'dl.label': '保存中 ' + p + '%' });
      })
      .then(() => {
        // 期间若重新解析过，dl 已被重置，旧的保存流程到这里直接作废，别污染新结果页
        if (this.data.dl.state !== 'running') return;
        this.setData({ dl: { state: 'done', progress: 100, width: '100%', label: '已保存到相册', checked: true } });
        this._patchSelection(this.data.imgs.map((im) => (ids.indexOf(im.idx) >= 0 ? Object.assign({}, im, { saved: true }) : im)));
        this._showToast('已保存 ' + targets.length + ' 张图片到相册');
        // 完成后定格 1.1s，再 0.5s 淡出回空闲，节奏和进度条动画衔接
        this._later(() => this.setData({ 'dl.state': 'fade' }), 1100);
        this._later(() => {
          this.setData({ dl: { state: 'idle', progress: 0, width: '0%', label: '', checked: false } });
          this._patchSelection(this.data.imgs.map((im) => Object.assign({}, im, { sel: false })));
        }, 1620);
      })
      .catch((err) => {
        if (this.data.dl.state !== 'running') return;
        this.setData({ dl: { state: 'idle', progress: 0, width: '0%', label: '', checked: false } });
        this._patchSelection(this.data.imgs.slice());
        this._showToast(err && err.authDeny ? '未获得相册权限，请在设置中开启' : '保存失败，请重试', false);
      });
  },

  onCopyText() {
    const n = this.data.note;
    const text = n.title + '\n\n' + n.body + '\n\n' + this.data.tags.map((t) => '#' + t).join(' ');
    wx.setClipboardData({
      data: text,
      success: () => {
        // 盖掉微信自带的"内容已复制"提示，换成本项目风格的 toast
        wx.hideToast({ fail: () => {} });
        this._showToast('文案已复制到剪贴板');
      },
    });
  },

  onReParse() {
    this._applyScreen('home', { tab: 'home', pasted: '' });
  },

  /* ============ 大图预览 ============ */

  _setViewer(index) {
    const im = this.data.imgs[index] || {};
    this.setData({
      viewer: {
        open: true,
        index,
        src: im.src || '',
        pos: index + 1,
        count: this.data.imgs.length,
        sel: !!im.sel,
        saved: !!im.saved,
        saveLabel: im.saved ? '已保存到相册' : '保存到相册',
      },
    });
    this._syncStatusFront();
  },

  onOpenViewer(e) {
    this._setViewer(Number(e.currentTarget.dataset.index));
  },

  onViewerClose() {
    this.setData({ 'viewer.open': false });
    this._syncStatusFront();
  },

  onViewerPrev() {
    this._setViewer(Math.max(0, this.data.viewer.index - 1));
  },

  onViewerNext() {
    this._setViewer(Math.min(this.data.imgs.length - 1, this.data.viewer.index + 1));
  },

  onViewerToggleSel() {
    const i = this.data.viewer.index;
    const imgs = this.data.imgs.slice();
    imgs[i] = Object.assign({}, imgs[i], { sel: !imgs[i].sel });
    this._patchSelection(imgs);
  },

  onViewerSave() {
    const i = this.data.viewer.index;
    album
      .saveImages([this.data.imgs[i].src])
      .then(() => {
        const imgs = this.data.imgs.slice();
        imgs[i] = Object.assign({}, imgs[i], { saved: true });
        this._patchSelection(imgs);
        this._showToast('已保存到相册');
      })
      .catch((err) => {
        this._showToast(err && err.authDeny ? '未获得相册权限，请在设置中开启' : '保存失败，请重试', false);
      });
  },

  /* ============ 记录页 ============ */

  _applyHistFilter(filter) {
    const all = mock.buildHist();
    const filtered = all.filter((r) => filter === 'all' || (filter === 'video' ? r.video : !r.video));
    const groups = [
      ['today', '今天'],
      ['earlier', '更早'],
    ]
      .map((d) => {
        const items = filtered.filter((r) => r.group === d[0]);
        return { label: d[1], count: items.length + ' 条', items };
      })
      .filter((g) => g.items.length > 0);
    const total = all.reduce((a, r) => a + r.imgsCount, 0);
    const videos = all.filter((r) => r.video).length;
    this.setData({
      hist: { filter, groups },
      histSummary: '共 ' + all.length + ' 条 · ' + total + ' 张图片 · ' + videos + ' 段视频',
    });
  },

  onSetHistFilter(e) {
    this._applyHistFilter(e.currentTarget.dataset.filter);
  },

  onOpenHistItem() {
    this._applyScreen('result');
  },

  /* ============ 导航与 tab ============ */

  _switchTab(t) {
    this._applyScreen(t, { tab: t, 'viewer.open': false });
  },

  onSwitchTab(e) {
    this._switchTab(e.currentTarget.dataset.tab);
  },

  onGoHistory() {
    this._switchTab('history');
  },

  onBack() {
    if (this.data.screen === 'result') this._applyScreen('home', { tab: 'home' });
    else this._applyScreen('profile', { tab: 'profile' });
  },

  /* ============ 我的 / 会员 ============ */

  onOpenMembership() {
    this._applyScreen('membership');
  },

  _buildPlans(activeId) {
    return mock.planDefs.map((p) => Object.assign({}, p, { active: p.id === activeId }));
  },

  onSelectPlan(e) {
    const id = e.currentTarget.dataset.plan;
    this._plan = id;
    this.setData({ plans: this._buildPlans(id), buyLabel: '立即开通 · ' + mock.priceMap[id] });
  },

  onBuy() {
    this._showToast('开通成功，会员已生效');
  },

  onClearCache() {
    this._showToast('缓存已清除，释放 28.6 MB');
  },

  onSoon() {
    this._showToast('该功能即将上线');
  },

  /* ============ 预留能力（暂无入口，调试/后续设置页可用） ============ */

  // 切主题：把整套颜色变量拼成内联 style 盖到根节点，比默认主题优先生效
  setTheme(name) {
    const pal = mock.palettes[name];
    if (!pal) return;
    this._theme = pal;
    const vars = [
      '--bg:' + pal.bg,
      '--bg2:' + pal.bg2,
      '--accent:' + pal.accent,
      '--mint:' + pal.mint,
      '--cream:' + pal.cream,
      '--onAccent:' + pal.onAccent,
      '--ink:' + pal.ink,
      '--inkSoft:' + pal.inkSoft,
      '--line:' + pal.line,
    ].join(';');
    this.setData({ themeStyle: vars });
    this._syncStatusFront();
  },

  // 切结果页图片布局：grid 三列网格 / masonry 两列瀑布 / list 大图列表
  setLayout(id) {
    if (id === 'grid' || id === 'masonry' || id === 'list') this.setData({ layout: id });
  },
});
