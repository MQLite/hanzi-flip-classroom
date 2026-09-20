# Third-party resources

- Three.js: MIT, https://github.com/mrdoob/three.js. Copy in `public/licenses/three-MIT.txt`.
- Hanzi Writer: MIT, https://github.com/chanind/hanzi-writer. Copy in `public/licenses/hanzi-writer-MIT.txt`.
- Character stroke vectors: unchanged selected files from `hanzi-writer-data` 2.0.1, https://github.com/chanind/hanzi-writer-data. Derived from Make Me a Hanzi and Arphic font data; Arphic Public License, full copy in `public/licenses/ARPHICPL.TXT`. Arphic Technology Co., Ltd. (1999); Make Me a Hanzi, Shaunak Kishore (2016). No font/vector data has been modified.
- Source description and stroke-order convention: https://github.com/skishore/makemeahanzi (PRC stroke order). Hanzi Writer API reference: https://hanziwriter.org/docs.html.

Classroom word examples, sentences, difficulty groupings and component explanations are authored for this project. Suggested grades do not claim alignment with any particular textbook. Stroke counts are verified against each supplied vector's ordered stroke list. Local assets are copied reproducibly with `npm run prepare:strokes`.

Teaching metadata convention: 行 uses the modern simplified lookup radical 彳, independently checked at https://zdic.net/hans/行. The vector source uses the Kangxi radical 行; its paths remain unchanged and display highlighting must use the left three strokes for 彳 rather than highlighting the whole character. The reference-check evidence explicitly retains this convention difference.
