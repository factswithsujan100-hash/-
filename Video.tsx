import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/google-fonts/NotoSansBengali';

const {fontFamily} = loadFont('normal', {weights: ['600', '700'], subsets: ['bengali']});
const FPS = 30, W = 1080, H = 1920;
export const DURATION = Math.ceil(123.04 * FPS);

// ---- map engine (raster tiles, 2D only) ----
const wx = (lon: number) => (lon + 180) / 360;
const wy = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};
type Cam = {x: number; y: number; z: number};
const K = (t: number, lat: number, lon: number, z: number) => ({t, x: wx(lon), y: wy(lat), z});
const KEYS = [
  K(0, 23.7, 90.3, 6.3), K(3, 24.9, 91.87, 9.8), K(7, 24.95, 91.95, 10.4),
  K(12, 25.09, 92.11, 11.6), K(14, 25.09, 92.11, 12), K(30, 25.09, 92.11, 12.6), K(44, 25.09, 92.11, 12.2),
  K(48, 24.95, 91.93, 10.9), K(60, 24.96, 91.95, 11.2), K(62.5, 25.12, 91.95, 10.6), K(68, 25.13, 91.95, 11),
  K(73, 25.185, 92.024, 13.6), K(76, 25.185, 92.024, 14.2), K(91, 25.186, 92.026, 14.3),
  K(95, 24.95, 92.1, 9.2), K(104, 24.9, 92.2, 9.4), K(109, 24.9, 92.2, 9.4),
  K(114, 25.09, 92.11, 11.4), K(123.04, 25.09, 92.11, 12.4),
];
const camAt = (t: number): Cam => {
  let i = KEYS.findIndex((k, j) => t >= k.t && (j === KEYS.length - 1 || t < KEYS[j + 1].t));
  if (i < 0 || i === KEYS.length - 1) return KEYS[KEYS.length - 1];
  const a = KEYS[i], b = KEYS[i + 1];
  const p = Easing.inOut(Easing.quad)((t - a.t) / (b.t - a.t));
  return {x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, z: a.z + (b.z - a.z) * p};
};
const proj = (lat: number, lon: number, c: Cam): [number, number] => {
  const s = 256 * 2 ** c.z;
  return [W / 2 + (wx(lon) - c.x) * s, H / 2 + (wy(lat) - c.y) * s];
};
const Tiles: React.FC<{c: Cam}> = ({c}) => {
  const zi = Math.max(3, Math.min(16, Math.round(c.z)));
  const n = 2 ** zi, ts = 256 * 2 ** (c.z - zi);
  const cx = c.x * n, cy = c.y * n;
  const out: React.ReactNode[] = [];
  for (let ty = Math.floor(cy - H / 2 / ts); ty <= Math.floor(cy + H / 2 / ts); ty++)
    for (let tx = Math.floor(cx - W / 2 / ts); tx <= Math.floor(cx + W / 2 / ts); tx++) {
      if (ty < 0 || ty >= n) continue;
      const sub = 'abcd'[(tx + ty) % 4];
      out.push(
        <Img key={`${zi}-${tx}-${ty}`} src={`https://${sub}.basemaps.cartocdn.com/dark_nolabels/${zi}/${tx}/${ty}@2x.png`}
          style={{position: 'absolute', left: Math.floor(W / 2 + (tx - cx) * ts), top: Math.floor(H / 2 + (ty - cy) * ts), width: Math.ceil(ts) + 1, height: Math.ceil(ts) + 1}} />
      );
    }
  return <>{out}</>;
};

// ---- palette: one mode (dark), one font ----
const C = {amber: '#FFB020', cyan: '#3DDBD9', violet: '#B79CFF', rose: '#FF5C8A', lime: '#B6F36A', white: '#FFFFFF'};

type Pin = {lat: number; lon: number; label: string; color: string; from: number; to: number; side?: 'l' | 'r'; ring?: number};
const PINS: Pin[] = [
  {lat: 24.8949, lon: 91.8687, label: 'সিলেট', color: C.white, from: 2.2, to: 11.5},
  {lat: 25.09, lon: 92.11, label: 'হরিপুর', color: C.amber, from: 11.2, to: 49, ring: 3},
  {lat: 24.93, lon: 91.93, label: 'জালালাবাদ · শেভরন', color: C.cyan, from: 51.3, to: 66, side: 'l', ring: 3},
  {lat: 24.99, lon: 91.98, label: 'কৈলাশ টিলা', color: C.violet, from: 55.5, to: 66, side: 'r', ring: 3},
  {lat: 25.165, lon: 92.018, label: 'জাফলং', color: C.violet, from: 65.5, to: 73, side: 'r'},
  {lat: 25.12, lon: 91.84, label: 'ভোলাগঞ্জ', color: C.amber, from: 66.4, to: 73, side: 'l'},
  {lat: 25.15, lon: 91.95, label: 'বিছনাকান্দি', color: C.lime, from: 67.4, to: 73, side: 'l'},
  {lat: 25.183, lon: 92.021, label: 'তামাবিল', color: C.rose, from: 75, to: 92, side: 'l'},
  {lat: 25.19, lon: 92.03, label: 'ডাউকি', color: C.lime, from: 77, to: 92, side: 'r'},
  {lat: 24.869, lon: 92.359, label: 'করিমগঞ্জ', color: C.lime, from: 101.3, to: 109.5, side: 'r'},
  {lat: 25.09, lon: 92.11, label: 'হরিপুর', color: C.amber, from: 114.5, to: 123.1, ring: 3},
];
type Badge = {text: string; color: string; from: number; to: number; row?: number};
const BADGES: Badge[] = [
  {text: '১৯৮৬', color: C.amber, from: 14.2, to: 19.5},
  {text: '১৯৯৪', color: C.rose, from: 21.2, to: 26},
  {text: 'প্রায় ৫.৬ লাখ ব্যারেল', color: C.amber, from: 26.2, to: 30},
  {text: '১৫ দিনের চাহিদা', color: C.cyan, from: 30, to: 34},
  {text: '২০২৩ ডিসেম্বর', color: C.amber, from: 34, to: 38.5},
  {text: 'আশা: ৫০০–৬০০ ব্যারেল/দিন', color: C.lime, from: 38.5, to: 43.5},
  {text: '২০২৬ এপ্রিল', color: C.cyan, from: 44.7, to: 49.5},
  {text: '২০২৪ পর্যন্ত: ৯২%', color: C.violet, from: 57, to: 60.5},
  {text: 'প্রায় ১/৩ · এলএনজি', color: C.cyan, from: 60.5, to: 65.5},
  {text: '২০১৯', color: C.amber, from: 81.8, to: 84},
  {text: '২০ লাখ টনের বেশি', color: C.rose, from: 84, to: 90},
  {text: '১৯৪৭ · আসাম', color: C.white, from: 93.2, to: 97},
  {text: 'পূর্ব বাংলা: প্রায় ২.৪ লাখ', color: C.cyan, from: 97.6, to: 103.5, row: 0},
  {text: 'আসাম: প্রায় ১.৮৪ লাখ', color: C.amber, from: 99.4, to: 103.5, row: 1},
  {text: 'সাড়ে ৩ থানা', color: C.rose, from: 105, to: 110},
  {text: 'লাইক · সাবস্ক্রাইব', color: C.lime, from: 120.2, to: 123.1},
];

const life = (t: number, from: number, to: number, fps = FPS, frame = 0) => {
  if (t < from || t > to) return 0;
  const a = spring({frame: frame - from * fps, fps, config: {damping: 200}});
  return a * interpolate(t, [to - 0.5, to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camAt(t);
  const mpp = (lat: number) => (156543.03 * Math.cos((lat * Math.PI) / 180)) / 2 ** cam.z;
  const [sx, sy] = proj(24.8949, 91.8687, cam);
  const [hx, hy] = proj(25.09, 92.11, cam);
  const routeLen = Math.hypot(hx - sx, hy - sy);
  const routeP = interpolate(t, [9, 12.2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const routeO = life(t, 9, 13.8, FPS, frame) > 0 ? interpolate(t, [13.3, 13.8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;

  return (
    <AbsoluteFill style={{background: '#0b0d12', fontFamily}}>
      <Audio src={staticFile('voice.wav')} />
      <Tiles c={cam} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)'}} />

      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <line x1={sx} y1={sy} x2={hx} y2={hy} stroke={C.amber} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={`${routeLen}`} strokeDashoffset={routeLen * (1 - routeP)} opacity={routeO} />
        {PINS.filter((p) => p.ring).map((p, i) => {
          const a = life(t, p.from, p.to, FPS, frame);
          if (!a) return null;
          const [x, y] = proj(p.lat, p.lon, cam);
          const r = (p.ring! * 1000) / mpp(p.lat);
          const pulse = 1 + 0.06 * Math.sin(t * 3);
          return <circle key={i} cx={x} cy={y} r={r * pulse * a} fill={p.color} fillOpacity={0.18} stroke={p.color} strokeWidth={4} strokeOpacity={0.9 * a} />;
        })}
      </svg>

      {PINS.map((p, i) => {
        const a = life(t, p.from, p.to, FPS, frame);
        if (!a) return null;
        const [x, y] = proj(p.lat, p.lon, cam);
        const left = p.side === 'l';
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, opacity: a, transform: `scale(${0.6 + 0.4 * a})`}}>
            <div style={{position: 'absolute', left: -16, top: -16, width: 32, height: 32, borderRadius: 16, background: p.color, border: '5px solid #0b0d12', boxShadow: `0 0 28px ${p.color}`}} />
            <div style={{position: 'absolute', top: -34, [left ? 'right' : 'left']: 30, whiteSpace: 'nowrap', padding: '8px 22px', borderRadius: 40, background: 'rgba(11,13,18,0.82)', border: `3px solid ${p.color}`, color: '#fff', fontSize: 44, fontWeight: 700}}>
              {p.label}
            </div>
          </div>
        );
      })}

      {BADGES.map((b, i) => {
        const a = life(t, b.from, b.to, FPS, frame);
        if (!a) return null;
        return (
          <div key={i} style={{position: 'absolute', top: 230 + (b.row || 0) * 130, left: 0, width: W, display: 'flex', justifyContent: 'center', opacity: a, transform: `translateY(${(1 - a) * 30}px)`}}>
            <div style={{padding: '18px 44px', borderRadius: 28, background: 'rgba(11,13,18,0.85)', border: `5px solid ${b.color}`, color: b.color, fontSize: 76, fontWeight: 700, boxShadow: `0 0 40px ${b.color}55`}}>{b.text}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', bottom: 24, width: W, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 22}}>© OpenStreetMap · © CARTO</div>
    </AbsoluteFill>
  );
};
