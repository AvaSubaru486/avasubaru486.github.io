# HelloDeng · AvaSubaru486

安和昴主题的个人项目集合。纯 HTML / CSS / JavaScript，免费部署到 GitHub Pages。

主页采用 GBC 五人合照背景、左侧个人栏及半透明项目卡片。图片来自站主提供的素材，仅发布压缩后的 `assets/gbc-background.webp`。像素格是 GBC 字样和音乐装饰，不是 GitHub 提交统计。手机端会将个人栏收为顶部名片；个人简介和两个项目内部页面保持不变。

网站：https://avasubaru486.github.io/

## 本地与部署

运行 `python build.py` 生成 `dist/`。推送至 `main` 后由 GitHub Actions 发布，仓库 Settings → Pages 的 Source 应设置为 GitHub Actions。

两个项目使用独立仓库与 Pages 地址，通过主页中的 iframe 打开；所有项目应部署在同一个 `avasubaru486.github.io` 域名下。本地预览也应按同样的路径同时挂载三个网站。

## 添加项目

编辑 `projects.js`，设置唯一 id、显示标题、简介、相对域名根路径的 url、仓库名称、封面类型、标签和 `musicEnabled`。地图使用 `musicEnabled: false`，进入时暂停播放器，离开后恢复之前的状态。

## 播放器

组件入口为 `shared/player.js`，歌单位于 `assets/playlist.json`。文件地址相对 `assets/`。首次会话默认 ED；同一会话保留曲目、进度和暂停状态，音量单独存储。浏览器禁止有声自动播放时，等待用户点击。独立项目可导入 `/shared/player.js` 的 `createPlayer()`，嵌入主页时不要创建重复播放器。

公开网站不包含私人联系方式、密码或令牌。第三方角色与音乐不纳入原创代码许可，详见网站的素材与致谢页面。
