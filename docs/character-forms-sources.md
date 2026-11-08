# 部件与笔画资料

本页记录“汉字拼图”“笔画很忙”的教学资料来源和编校口径。数据是本项目的教学整理，不代表教育部逐字认可本网站的全部精细名称或切分。

## 规范与字形

- [GF0013-2009 现代常用独体字规范（教育部门完整扫描）](https://edu.sh.gov.cn/cmsres/cc/cc76a4a1bbf44271bbc8cf8b47b29289/50476d9ab398dd13a7459af90778d693.pdf)：独体字保护，不为了拼图强拆“我、中、木、果、本”等。
- [GF0014-2009 现代常用字部件及部件名称规范（Unicode IRG完整扫描）](https://www.unicode.org/irg/docs/n2739-GF0014-2009.pdf)，[教育部发布页](https://www.moe.gov.cn/jyb_sjzl/ziliao/A19/201001/t20100115_75696.html)：部件下限、名称、形体变体和组合部件。图形以实际笔画子集展示；围字框的封口笔画可以不连续。可使用较大的组合部件，不声称每张卡都是最小部件。
- [GF0023-2020 通用规范汉字笔顺规范（北京市教委教育部文件镜像）](https://jw.beijing.gov.cn/language/bzgf/202105/P020210512414220837538.pdf)：498个现收录字均与官方文件的笔画数及五类笔顺数字串核对一致。五类序列相同不能单独证明精细笔画名称或同类相邻笔画的身份。
- [教育部2013《中小学书法教育指导纲要》](https://hudong.moe.gov.cn/srcsite/A26/s8001/201301/t20130125_147389.html)及[附录1汉字笔画名称](https://hudong.moe.gov.cn/ewebeditor/uploadfile/2013/02/06/20130206145800854.jpg)：常用教学笔名；并参考[GF2001-2001折笔规范](https://hudong.moe.gov.cn/ewebeditor/uploadfile/2015/01/12/20150112170016626.pdf)的横斜钩等名称。复习页提供28种教学笔名与横斜钩，不把“折”或“钩”泛称为一笔。
- 字形路径及顺序沿用 `hanzi-writer-data@2.0.1`，已存在本项目的 Arphic 许可另见 `public/licenses/`。卡片不依赖电脑字体显示罕见部件。

## 衍生数据与编校

[Make Me a Hanzi](https://github.com/skishore/makemeahanzi/tree/bddc96d41bef78427ed0e034e9f7e31d71fd1b92)字典提供候选IDS和逐笔匹配；固定提交 `bddc96d41bef78427ed0e034e9f7e31d71fd1b92`，dictionary.txt SHA256 `744bb05d5b0742e9ee35c37791f94d56a173349b3367569e7ca11e510364d203`。这些候选经独体字/规范部件保护和逐字图审后才进入游戏；未明确的拆分保留为不出题。部件名称与英文介绍是形状或常见作用的简短说明，不从现代形状推测字源。字典衍生部件数据遵循 LGPL-3.0-or-later；原始字典可从上述固定提交直接取得，修改后的可编辑数据随源代码一同提供。

[cnchar-order](https://github.com/theajack/cnchar/tree/b8397db3e08e88ebbf8acf92b5cbab1a7e4c1550)提供初始精细名称映射，固定提交 `b8397db3e08e88ebbf8acf92b5cbab1a7e4c1550`，MIT许可。其合并笔名经矢量图、规范示例及相同构件审校后分开：山/区等为竖折，四/西相应笔为竖弯；九/几为横折弯钩，风/飞/气为横斜钩；心底为卧钩，奶右部首笔为横折折折钩。

名称口径差异保留在 `aliases`：手/拿末笔主称竖钩，兼容弯钩；女字旁末笔按当前字形及五类笔顺主称横，兼容书写教学中的提。界面说明差异，课堂不因合理称法误判。其余名称采用附录名称及同构件对应，并不宣称每个字都有官方精细笔名表。

## 更新和读音

可编辑源是 `scripts/data/character-forms-review.json`，包含逐字笔名、规范五类串、审校通过的分组、例字和来源。修改后运行 `node scripts/prepare-construction-data.mjs`，编译器拒绝缺笔、重叠或未知部件。新增课本的未审校字会提示覆盖范围，不自动推断。

运行 `powershell -File scripts/prepare-stroke-audio.ps1` 制作静态普通话WAV（Microsoft Huihui Desktop，zh-CN，语速-2），生成记录见 `public/audio/stroke-names/manifest.json`。网页直接播放站点内的录音，不向外部语音服务上传学生信息。
