// Pose planar aproximada: QR com largura 1, câmera pinhole sem calibração de lente.
// O referencial retornado é o do Three.js (câmera olha para -Z).
function solve(rows) {
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    if (Math.abs(rows[pivot][col]) < 1e-10) return null;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    for (let j = col; j < 9; j++) rows[col][j] /= divisor;
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const factor = rows[row][col];
      for (let j = col; j < 9; j++) rows[row][j] -= factor * rows[col][j];
    }
  }
  return rows.map(row => row[8]);
}
const norm = v => Math.hypot(...v);
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];

export function estimateQrPose(corners, width, height, fov = 60) {
  if (corners.length !== 4 || width <= 0 || height <= 0 || corners.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const focal = height / (2 * Math.tan(fov * Math.PI / 360));
  const plane = [[-.5,.5],[.5,.5],[.5,-.5],[-.5,-.5]];
  const rows = [];
  plane.forEach(([x,y], i) => {
    const u = (corners[i].x - width/2) / focal, v = (corners[i].y - height/2) / focal;
    rows.push([x,y,1,0,0,0,-u*x,-u*y,u], [0,0,0,x,y,1,-v*x,-v*y,v]);
  });
  const h = solve(rows);
  if (!h) return null;
  let a = [h[0],h[3],h[6]], b = [h[1],h[4],h[7]];
  const na = norm(a), nb = norm(b);
  if (na < 1e-8 || nb < 1e-8 || Math.max(na,nb)/Math.min(na,nb) > 1.5 || Math.abs(dot(a,b)/(na*nb)) > .4) return null;
  const scale = 2/(na+nb);
  a = a.map(n => n/na);
  const ab = dot(a,b);
  b = b.map((n,i) => n-ab*a[i]);
  const lengthB = norm(b);
  b = b.map(n => n/lengthB);
  const c = cross(a,b), t = [h[2]*scale,h[5]*scale,scale];
  if (t[2] < .3 || t[2] > 100) return null;
  return [a[0],-a[1],-a[2],0, b[0],-b[1],-b[2],0,
          c[0],-c[1],-c[2],0, t[0],-t[1],-t[2],1];
}

export function isRitualQr(value, origin) {
  try { return new URL(value).href === new URL('/ra.html', origin).href; }
  catch { return false; }
}
