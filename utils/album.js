// 相册保存：先把网络图下载成本地临时文件，再写入系统相册

function downloadOne(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (res) => (res.statusCode === 200 ? resolve(res.tempFilePath) : reject(new Error('下载失败'))),
      fail: () => reject(new Error('下载失败')),
    });
  });
}

function saveToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: (e) => {
        const err = new Error('保存失败');
        // errMsg 带 auth 说明用户拒绝过相册授权，调用方据此提示去设置页开启
        err.authDeny = /auth/i.test((e && e.errMsg) || '');
        reject(err);
      },
    });
  });
}

// 逐张"下载 + 存相册"，串行执行让进度平滑；onProgress(已完成张数, 总张数)
function saveImages(urls, onProgress) {
  let chain = Promise.resolve();
  urls.forEach((url, i) => {
    chain = chain
      .then(() => downloadOne(url))
      .then(saveToAlbum)
      .then(() => {
        if (onProgress) onProgress(i + 1, urls.length);
      });
  });
  return chain.then(() => urls.length);
}

module.exports = { saveImages };
