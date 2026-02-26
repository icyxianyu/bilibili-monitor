import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/index.js';

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52,
];

let cachedMixinKey: string | null = null;
let mixinKeyExpiry = 0;

function getMixinKey(imgKey: string, subKey: string): string {
  const raw = imgKey + subKey;
  return MIXIN_KEY_ENC_TAB.map((i) => raw[i])
    .join('')
    .slice(0, 32);
}

async function fetchMixinKey(): Promise<string> {
  const now = Date.now();
  if (cachedMixinKey && now < mixinKeyExpiry) {
    return cachedMixinKey;
  }

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: 'https://www.bilibili.com/',
  };
  if (config.BILIBILI_COOKIE) {
    headers['Cookie'] = config.BILIBILI_COOKIE;
  }

  const res = await axios.get('https://api.bilibili.com/x/web-interface/nav', { headers });
  const wbi = res.data?.data?.wbi_img;
  if (!wbi?.img_url || !wbi?.sub_url) {
    throw new Error('Failed to get Wbi keys from nav API');
  }

  const imgKey = wbi.img_url.split('/').pop()!.replace('.png', '');
  const subKey = wbi.sub_url.split('/').pop()!.replace('.png', '');

  cachedMixinKey = getMixinKey(imgKey, subKey);
  // Cache for 6 hours
  mixinKeyExpiry = now + 6 * 60 * 60 * 1000;

  return cachedMixinKey;
}

export async function signWbi(params: Record<string, string | number>): Promise<string> {
  const mixinKey = await fetchMixinKey();
  const wts = Math.floor(Date.now() / 1000);

  const sorted = Object.entries({ ...params, wts })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const w_rid = crypto.createHash('md5').update(sorted + mixinKey).digest('hex');

  return `${sorted}&w_rid=${w_rid}`;
}
