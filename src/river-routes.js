import {ZHONGWEN_CONTENT} from './zhongwen-content.js';

const lesson = ZHONGWEN_CONTENT.find(course => course.book === 2 && course.lesson === 12);

// Normalized points form a classroom schematic, from the western source to the sea.
export const RIVER_ROUTES = [
  {
    id: 'yangtze',
    name: '长江',
    reviewKind: '生字',
    mouth: '东海',
    instruction: '读出字牌上的字，再点字牌开船。',
    arrival: '小船到东海啦！',
    reaches: [[0,'青藏高原 · 长江源区'],[4,'长江上游 · 三峡一带'],[8,'长江中下游 · 林地与平原'],[11,'长江口 · 东海']],
    entries: lesson.characters.map(entry => entry.character),
    points: [[.08,.33],[.15,.36],[.22,.51],[.29,.67],[.37,.63],[.43,.51],[.50,.55],[.57,.65],[.64,.58],[.71,.52],[.77,.58],[.84,.48],[.93,.44]],
  },
  {
    id: 'yellow',
    name: '黄河',
    reviewKind: '词语',
    mouth: '渤海',
    instruction: '读出词牌上的词语，再点词牌开船。',
    arrival: '小船到渤海啦！',
    reaches: [[0,'青藏高原 · 黄河源区'],[4,'黄河「几」字弯 · 河套平原'],[7,'黄河中游 · 黄土高原'],[10,'黄河下游 · 河口湿地']],
    entries: ['河流', '河水', '江水', '古老', '中国', '国家', '一条河', '名字', '最长', '母亲', '亲人', '中华'],
    points: [[.08,.63],[.15,.66],[.23,.69],[.32,.63],[.38,.49],[.42,.27],[.50,.19],[.57,.23],[.60,.45],[.63,.66],[.73,.65],[.81,.54],[.93,.43]],
  },
];
