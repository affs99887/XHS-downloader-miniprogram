// 首页大标题的"拼音打字机"步骤表生成器。
// 每一步 = { l1, l2, comp, cl, d }：两行已定型汉字、正在敲的拼音、拼音落在第几行、本步停留毫秒。
// 节奏：整句停留 6.5s → 逐字删除 → 按拼音逐字母敲出下一句，每敲完一段拼音就整段上屏为汉字。
function buildAllSteps(copySets) {
  const st = [];

  const typeInto = (set) => {
    const f1 = set.l1;
    const f2 = set.l2;
    const combo = f1 + f2;
    const brk = f1.length;
    // 已上屏 n 个汉字时，按第一行长度拆回两行
    const split = (n) => ({ l1: combo.slice(0, Math.min(n, brk)), l2: n > brk ? combo.slice(brk, n) : '' });
    let prev = 0;
    for (const g of set.groups) {
      const sp = split(prev);
      const line = prev < brk ? 1 : 2;
      const p = g.py;
      for (let m = 1; m <= p.length; m++) st.push({ l1: sp.l1, l2: sp.l2, comp: p.slice(0, m), cl: line, d: 70 });
      st.push({ l1: sp.l1, l2: sp.l2, comp: p, cl: line, d: 220 });
      const sp2 = split(g.n);
      st.push({ l1: sp2.l1, l2: sp2.l2, comp: '', cl: line, d: 250 });
      prev = g.n;
    }
  };

  const del = (set) => {
    const f1 = set.l1;
    const f2 = set.l2;
    for (let k = f2.length - 1; k >= 0; k--) st.push({ l1: f1, l2: f2.slice(0, k), comp: '', cl: k > 0 ? 2 : 1, d: 55 });
    for (let j = f1.length - 1; j >= 0; j--) st.push({ l1: f1.slice(0, j), l2: '', comp: '', cl: 1, d: 55 });
    st.push({ l1: '', l2: '', comp: '', cl: 1, d: 420 });
  };

  for (let i = 0; i < copySets.length; i++) {
    const c = copySets[i];
    st.push({ l1: c.l1, l2: c.l2, comp: '', cl: 2, d: 6500 });
    del(c);
    typeInto(copySets[(i + 1) % copySets.length]);
  }
  return st;
}

module.exports = { buildAllSteps };
