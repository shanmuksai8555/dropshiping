// Procedural "Lumen One" concept smartwatch. Rendered offline into public/frames/*.webp.
// three.js is only used here (devDependency of the render script), never in the site bundle.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1600, H = 1000;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// --- backdrop: radial gradient on a far plane, edges fade to a flat colour (#060608) so the site can letterbox seamlessly
function gradientTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#060608'; g.fillRect(0, 0, 1024, 640);
  const r = g.createRadialGradient(512, 300, 10, 512, 320, 520);
  r.addColorStop(0, '#26231f'); r.addColorStop(0.35, '#15130f'); r.addColorStop(1, '#060608');
  g.fillStyle = r; g.fillRect(0, 0, 1024, 640);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const bg = new THREE.Mesh(new THREE.PlaneGeometry(160, 100), new THREE.MeshBasicMaterial({ map: gradientTex(), toneMapped: false }));
bg.position.z = -40; scene.add(bg);

const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 200);

// --- lights: soft key from front-top, two strong warm/cool rims from behind
scene.add(new THREE.HemisphereLight(0xbfc6d0, 0x0a0a0c, 0.25));
const key = new THREE.DirectionalLight(0xfff1e0, 1.6); key.position.set(-6, 9, 12); scene.add(key);
const rimL = new THREE.DirectionalLight(0xffc89a, 5.5); rimL.position.set(-14, 4, -10); scene.add(rimL);
const rimR = new THREE.DirectionalLight(0x9fc2ff, 3.2); rimR.position.set(14, -2, -9); scene.add(rimR);
const top = new THREE.DirectionalLight(0xffffff, 1.2); top.position.set(0, 14, -4); scene.add(top);

// --- materials
const titanium = new THREE.MeshPhysicalMaterial({ color: 0x8a8782, metalness: 1, roughness: 0.32, envMapIntensity: 0.9 });
const polished = new THREE.MeshPhysicalMaterial({ color: 0xd8d2c8, metalness: 1, roughness: 0.14, envMapIntensity: 1.1 });
const brass = new THREE.MeshPhysicalMaterial({ color: 0xc9a46a, metalness: 1, roughness: 0.25 });
const rubber = new THREE.MeshPhysicalMaterial({ color: 0x141518, metalness: 0, roughness: 0.55, sheen: 0.35, sheenColor: 0x3a3f46, envMapIntensity: 0.45 });
const ceramic = new THREE.MeshPhysicalMaterial({ color: 0x121214, metalness: 0.1, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.5, envMapIntensity: 0.12 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0d10, metalness: 0, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.38, envMapIntensity: 1.6 });
const pcbMat = new THREE.MeshPhysicalMaterial({ color: 0x0f1a16, metalness: 0.2, roughness: 0.5 });
const chipMat = new THREE.MeshPhysicalMaterial({ color: 0x1d1e21, metalness: 0.4, roughness: 0.35 });
const battMat = new THREE.MeshPhysicalMaterial({ color: 0x5a5854, metalness: 0.7, roughness: 0.6, envMapIntensity: 0.22 });
const panelMat = new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: 0.3, roughness: 0.2 });

function rrShape(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function rrPath(w, h, r) { const p = new THREE.Path(); const s = rrShape(w, h, r); p.curves = s.curves; return p; }

// face texture
function faceTex() {
  const c = document.createElement('canvas'); c.width = 600; c.height = 720; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 600, 720);
  const cx = 300, cy = 340;
  g.lineCap = 'round';
  [[235, '#2a2622', 10], [205, '#c9a46a', 10], [175, '#7fa6d9', 8]].forEach(([r, col, lw], i) => {
    g.strokeStyle = '#151515'; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    if (i) { g.strokeStyle = col; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * (i === 1 ? 1.35 : 0.8)); g.stroke(); }
  });
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; const l = i % 5 ? 8 : 20; g.strokeStyle = i % 5 ? '#3a3a3a' : '#bdb6aa'; g.lineWidth = i % 5 ? 2 : 4; g.beginPath(); g.moveTo(cx + Math.sin(a) * 250, cy - Math.cos(a) * 250); g.lineTo(cx + Math.sin(a) * (250 - l), cy - Math.cos(a) * (250 - l)); g.stroke(); }
  g.fillStyle = '#efe9df'; g.font = '200 120px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('10:08', cx, cy + 4);
  g.fillStyle = '#8b857b'; g.font = '500 24px Helvetica, Arial, sans-serif'; g.fillText('T U E   1 0', cx, cy - 92);
  g.fillStyle = '#c9a46a'; g.font = '600 20px Helvetica, Arial, sans-serif'; g.fillText('L U M E N', cx, cy + 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// sweep a rounded-rect cross-section along a curve lying in the YZ plane (binormal fixed to X)
function band(curve, width, thick, segs = 90) {
  const prof = []; const n = 6; const hw = width / 2, ht = thick / 2, rr = thick * 0.45;
  const corners = [[hw - rr, ht - rr, 0], [-hw + rr, ht - rr, Math.PI / 2], [-hw + rr, -ht + rr, Math.PI], [hw - rr, -ht + rr, Math.PI * 1.5]];
  corners.forEach(([cx, cy, a0]) => { for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; prof.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } });
  const P = prof.length; const pos = []; const idx = [];
  const X = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const p = curve.getPointAt(t); const T = curve.getTangentAt(t);
    const N = new THREE.Vector3().crossVectors(T, X).normalize();
    for (const [px, py] of prof) { pos.push(p.x + X.x * px + N.x * py, p.y + X.y * px + N.y * py, p.z + X.z * px + N.z * py); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < P; j++) { const a = i * P + j, b = i * P + (j + 1) % P, c = (i + 1) * P + j, d = (i + 1) * P + (j + 1) % P; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

const CW = 3.6, CH = 4.3, CD = 0.8;
const watch = new THREE.Group(); scene.add(watch);
const parts = {};
function part(name, obj) { const g = new THREE.Group(); g.add(obj); watch.add(g); parts[name] = g; return g; }

// case: frame with hole (so the core is visible when it leaves)
{
  const s = rrShape(CW, CH, 1.0); s.holes.push(rrPath(CW - 0.42, CH - 0.42, 0.8));
  const geo = new THREE.ExtrudeGeometry(s, { depth: CD, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.14, bevelSegments: 6, curveSegments: 24 });
  geo.translate(0, 0, -CD / 2);
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, titanium));
  // lugs
  for (const sy of [1, -1]) for (const sx of [1, -1]) {
    const lug = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.7, 0.7, 3, 0.12), titanium); lug.position.set(sx * 1.32, sy * (CH / 2 + 0.2), -0.05); g.add(lug);
  }
  // crown + pusher
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 40), polished); crown.rotation.z = Math.PI / 2; crown.position.set(CW / 2 + 0.32, 0.55, 0);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16), polished); stem.rotation.z = Math.PI / 2; stem.position.set(CW / 2 + 0.12, 0.55, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 40), brass); ring.rotation.y = Math.PI / 2; ring.position.set(CW / 2 + 0.5, 0.55, 0);
  const crownG = new THREE.Group(); crownG.add(crown, stem, ring); parts.crown = crownG; watch.add(crownG);
  const push = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.75, 0.32, 3, 0.09), polished); push.position.set(CW / 2 + 0.17, -0.65, 0); g.add(push);
  part('case', g);
}
// display stack
{
  const pan = new THREE.Mesh(new RoundedBoxGeometry(CW - 0.5, CH - 0.5, 0.1, 4, 0.04), panelMat);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(CW - 0.7, (CW - 0.7) * 1.2), new THREE.MeshBasicMaterial({ map: faceTex(), toneMapped: false }));
  scr.position.z = 0.056; const g = new THREE.Group(); g.add(pan, scr); g.position.z = 0.42; part('screen', g);
}
// glass
{
  const geo = new THREE.ExtrudeGeometry(rrShape(CW - 0.1, CH - 0.1, 0.95), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 6, curveSegments: 24 });
  const m = new THREE.Mesh(geo, glassMat); const g = new THREE.Group(); g.add(m); g.position.z = 0.6; part('glass', g);
}
// logic board
{
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(CW - 0.75, CH - 0.85, 0.07, 3, 0.03), pcbMat));
  const chips = [[0, 0.5, 1.2, 1.0, 0.14], [-0.85, -0.6, 0.6, 0.6, 0.1], [0.75, -0.7, 0.7, 0.45, 0.1], [-0.9, 1.25, 0.5, 0.35, 0.08], [0.9, 1.3, 0.45, 0.45, 0.08], [0, -1.35, 1.4, 0.3, 0.08]];
  chips.forEach(([x, y, w, h, d]) => { const c = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.02), chipMat); c.position.set(x, y, 0.06 + d / 2 - 0.02); g.add(c); });
  const lid = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.8, 0.02, 2, 0.01), polished); lid.position.set(0, 0.5, 0.14); g.add(lid);
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), brass); p.rotation.x = Math.PI / 2; p.position.set(-0.9 + i * 0.3, -1.0, 0.06); g.add(p); }
  g.position.z = 0.15; part('board', g);
}
// battery + haptic
{
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(CW - 0.95, CH - 1.5, 0.26, 4, 0.1), battMat));
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshPhysicalMaterial({ color: 0x1a1a1c, roughness: 0.6 })); label.position.z = -0.135; label.rotation.y = Math.PI; g.add(label);
  const hap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 32), polished); hap.rotation.x = Math.PI / 2; hap.position.set(0, -(CH - 1.5) / 2 - 0.35, 0); g.add(hap);
  g.position.z = -0.12; part('battery', g);
}
// back cover with sensor dome
{
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(rrShape(CW - 0.25, CH - 0.25, 0.9), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4, curveSegments: 24 });
  g.add(new THREE.Mesh(geo, ceramic));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 24, 0, Math.PI * 2, 0, 0.55), new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.05, clearcoat: 1, metalness: 0.2 }));
  dome.rotation.x = -Math.PI / 2; dome.position.z = -0.85; g.add(dome);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.03, 8, 64), brass); ringM.position.z = -0.2; g.add(ringM);
  [[0.25, 0, 0x6aff9a], [-0.25, 0, 0xff5050], [0, 0.25, 0x6aff9a], [0, -0.25, 0xff5050]].forEach(([x, y, c]) => { const s = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), new THREE.MeshBasicMaterial({ color: c })); s.position.set(x, y, -0.235); s.rotation.y = Math.PI; g.add(s); });
  g.position.z = -0.5; part('back', g);
}
// straps
function strapGroup(sign) {
  const g = new THREE.Group();
  const y0 = CH / 2 + 0.25;
  const pts = [[0, y0, -0.05], [0, y0 + 1.0, -0.25], [0, y0 + 1.9, -0.9], [0, y0 + 2.5, -1.9], [0, y0 + 2.75, -3.1], [0, y0 + 2.7, -4.3]].map(([x, y, z]) => new THREE.Vector3(x, sign * y, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const geo = band(curve, 2.5, 0.24, 120); if (sign < 0) { geo.index.array.reverse(); geo.computeVertexNormals(); }
  g.add(new THREE.Mesh(geo, rubber));
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.62, 16), polished); bar.rotation.z = Math.PI / 2; bar.position.set(0, sign * y0, -0.05); g.add(bar);
  if (sign > 0) { // buckle
    const end = curve.getPointAt(1);
    const bk = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 10, 4, Math.PI * 2), polished); bk.scale.set(1.45, 0.55, 1); bk.rotation.set(Math.PI / 2, 0, Math.PI / 4); bk.position.copy(end); g.add(bk);
  } else { // holes
    for (let i = 0; i < 6; i++) { const t = 0.42 + i * 0.09; const p = curve.getPointAt(t); const T = curve.getTangentAt(t); const N = new THREE.Vector3().crossVectors(T, new THREE.Vector3(1, 0, 0)).normalize();
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16), new THREE.MeshBasicMaterial({ color: 0x050505 })); h.position.copy(p).addScaledVector(N, -0.125); h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), N); g.add(h); }
  }
  return g;
}
parts.strapTop = strapGroup(1); watch.add(parts.strapTop);
parts.strapBot = strapGroup(-1); watch.add(parts.strapBot);

// ---------- animation -------------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
const seg = (f, a, b) => ease(clamp((f - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;

// explode amount for each part (0..1) at frame f, with reassembly 180..225
function amt(f, a, b) { const out = seg(f, a, b); const back = seg(f, 182, 226); return out * (1 - back); }

window.renderFrame = (f) => {
  // global pose: slow turn 0-59, open to 3/4 during explode, settle to hero 180-239
  const turn = lerp(-0.55, -0.15, seg(f, 0, 59));
  const open = seg(f, 60, 110) * (1 - seg(f, 178, 228));
  const yaw = turn + open * 1.2 + seg(f, 178, 239) * 0.0;
  const hero = seg(f, 190, 239);
  watch.rotation.set(lerp(0.12, 0.05, hero) + open * 0.12 - 0.05 * (1 - seg(f, 0, 59)), yaw + hero * (-0.25 + 0.15), lerp(0, -0.12, hero) + open * -0.05);
  // explode chapters
  const sA = amt(f, 60, 100);   // straps
  const sB = amt(f, 95, 135);   // glass + display
  const sC = amt(f, 130, 165);  // board + battery
  const sD = amt(f, 145, 179);  // back + crown
  parts.strapTop.position.set(0, sA * 1.5, -sA * 0.4);
  parts.strapTop.rotation.x = -sA * 0.18;
  parts.strapBot.position.set(0, -sA * 1.5, -sA * 0.4);
  parts.strapBot.rotation.x = sA * 0.18;
  parts.glass.position.z = 0.6 + sB * 4.4;
  parts.screen.position.z = 0.42 + sB * 2.6;
  parts.board.position.z = 0.15 - sC * 1.5;
  parts.battery.position.z = -0.12 - sC * 3.4;
  parts.back.position.z = -0.5 - sD * 5.2;
  parts.crown.position.x = sD * 1.6;
  parts.case.position.set(0, 0, 0);
  // camera: dolly back while exploded so everything stays in frame
  const dist = lerp(25.5, 32, Math.max(sA * 0.9, open));
  camera.position.set(0, 0.6, dist); camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
};
window.ready = true;
