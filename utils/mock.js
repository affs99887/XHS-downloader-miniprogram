// 演示数据层：解析接口尚未接入，所有假数据集中在这里，将来换真实后端时只动这一个文件

// 四套主题配色；bg/bg2 深底、accent 强调色、mint 浅字、cream 米白底、onAccent 强调底上的字色
const palettes = {
  '墨绿·亮绿': { bg: '#0E3A2A', bg2: '#0A2C20', accent: '#2ECE7D', mint: '#BFE9D2', cream: '#F4F4F3', onAccent: '#08291C', ink: '#14241C', inkSoft: '#5C6B63', line: 'rgba(20,40,28,0.10)' },
  '暗夜蓝·柠檬': { bg: '#14213D', bg2: '#0E1830', accent: '#E7F24A', mint: '#C6D2EE', cream: '#F3F4F7', onAccent: '#1A2540', ink: '#161B26', inkSoft: '#5A6275', line: 'rgba(20,30,60,0.10)' },
  '焦糖·奶油': { bg: '#2E2017', bg2: '#241710', accent: '#FF9E45', mint: '#E7D3BC', cream: '#FBF5EC', onAccent: '#2E2017', ink: '#2A1E14', inkSoft: '#6E6056', line: 'rgba(46,32,23,0.10)' },
  '石墨·荧光绿': { bg: '#17191B', bg2: '#101113', accent: '#C3F23D', mint: '#D2DEC6', cream: '#F4F5F2', onAccent: '#17191B', ink: '#16181A', inkSoft: '#5E6468', line: 'rgba(20,22,24,0.10)' },
};

// 首页打字机轮播的 4 组文案：l1/l2 是定型后的两行汉字；
// groups 是打字顺序——py 为该段拼音，n 为敲完这段后已上屏的汉字总数
const copySets = [
  { l1: '笔记图文', l2: '一键带走', groups: [{ py: 'biji', n: 2 }, { py: 'tuwen', n: 4 }, { py: 'yijian', n: 6 }, { py: 'daizou', n: 8 }] },
  { l1: '封面视频', l2: '一并收下', groups: [{ py: 'fengmian', n: 2 }, { py: 'shipin', n: 4 }, { py: 'yibing', n: 6 }, { py: 'shouxia', n: 8 }] },
  { l1: '正文文案', l2: '一键复制', groups: [{ py: 'zhengwen', n: 2 }, { py: 'wenan', n: 4 }, { py: 'yijian', n: 6 }, { py: 'fuzhi', n: 8 }] },
  { l1: '灵感素材', l2: '随手收藏', groups: [{ py: 'linggan', n: 2 }, { py: 'sucai', n: 4 }, { py: 'suishou', n: 6 }, { py: 'shoucang', n: 8 }] },
];

// 剪贴板为空时兜底用的演示链接
const demoPaste = '「秋日通勤穿搭｜通透感氛围拉满」- 小满_studio\nhttp://xhslink.com/a/k9Lm2x';

// 解析结果的演示笔记
const note = {
  author: '小满_studio',
  avatarChar: '满',
  title: '秋日通勤穿搭 ｜ 通透感氛围拉满的 5 套小众搭配',
  body: '姐妹们！这个秋天最爱的 5 套通勤搭配都整理好啦～\n以大地色系为主，叠穿出高级又通透的氛围感。\n\n第 3 套是我回头率最高的一套，温柔又利落，巨显白。\n单品基本都是平价好物，怕迷路的姐妹记得先收藏。\n\n详细链接放在评论区啦，有问题随时问我～',
};

const tags = ['秋日穿搭', '通勤OOTD', '氛围感', '小众设计', '平价好物'];

// 9 张演示图；padTop 是瀑布流里各图"高/宽"比例换算出的 padding-top 百分比
const imgPadTops = [133.34, 100, 125, 133.34, 120, 100, 125, 150, 133.34];

function buildImgs() {
  return imgPadTops.map((padTop, i) => ({
    idx: i + 1,
    src: 'https://picsum.photos/seed/notebox' + (i + 1) + '/600/800',
    sel: false,
    saved: false,
    padTop,
  }));
}

// 历史记录演示数据；group 用于按「今天/更早」分组
const histRaw = [
  { title: '秋日通勤穿搭｜通透感氛围拉满的 5 套小众搭配', imgs: 9, video: false, time: '刚刚', group: 'today', seed: 'notebox1' },
  { title: '周末 citywalk 机位合集｜长沙站必拍', imgs: 12, video: true, time: '今天 14:20', group: 'today', seed: 'cwlsha' },
  { title: 'ins 风房间改造 before & after 全记录', imgs: 6, video: false, time: '昨天', group: 'earlier', seed: 'room31' },
  { title: '平价护肤空瓶记录｜年度回购清单', imgs: 4, video: false, time: '11月3日', group: 'earlier', seed: 'skin44' },
  { title: '月薪三千也能拥有的高级感 ootd', imgs: 8, video: false, time: '11月1日', group: 'earlier', seed: 'ootd5' },
  { title: '露营装备清单｜新手第一次也不踩坑', imgs: 10, video: true, time: '10月28日', group: 'earlier', seed: 'camp6' },
];

function buildHist() {
  return histRaw.map((r, i) => ({
    id: i,
    title: r.title,
    imgsCount: r.imgs,
    video: r.video,
    type: r.video ? '视频' : '图文',
    time: r.time,
    group: r.group,
    cover: 'https://picsum.photos/seed/' + r.seed + '/240/300',
  }));
}

const benefits = ['无限次笔记解析', '批量高清原图下载', '一键智能去水印', '视频原片提取', '文案自动分段整理', '免广告 · 优先解析队列'];

const planDefs = [
  { id: 'month', name: '月卡', price: '¥12', unit: '/月', sub: '灵活体验', tag: '' },
  { id: 'year', name: '年卡', price: '¥88', unit: '/年', sub: '≈¥7.3/月', tag: '立省39%' },
  { id: 'season', name: '季卡', price: '¥30', unit: '/季', sub: '≈¥10/月', tag: '' },
];

const priceMap = { month: '¥12/月', season: '¥30/季', year: '¥88/年' };

// 解析动画的假流程：start 是入场值，steps 每 470ms 走一格，stepLabels 是左侧四个阶段名
const parseFlow = {
  start: [8, '连接笔记…'],
  steps: [[28, '读取笔记内容…'], [55, '提取高清原图…'], [82, '智能去除水印…'], [100, '整理完成']],
  stepLabels: ['连接分享链接', '解析笔记结构', '提取无水印原图', '打包图片与文案'],
};

module.exports = {
  palettes,
  copySets,
  demoPaste,
  note,
  tags,
  buildImgs,
  buildHist,
  benefits,
  planDefs,
  priceMap,
  parseFlow,
};
