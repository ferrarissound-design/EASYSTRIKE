// 縦方向の当たり判定。プレイヤーとライバルが同じ規則で床・段差・天井を扱えるよう、
// 判定はここに集約する。各コライダーはワールド軸に沿ったTHREE.Box3。
export const FLOOR_Y = 0;

// ジャンプせずに乗り越えられる段差。これより高いものは飛ばないと登れない。
export const STEP_HEIGHT = .55;

// 足元から届くジャンプの高さ。JumpForce^2 / (2 * Gravity) と一致させている。
export function jumpReach(jumpForce, gravity) {
  return jumpForce * jumpForce / (2 * gravity);
}

function overlapsFootprint(collider, x, z, radius) {
  return collider.max.x > x - radius && collider.min.x < x + radius
    && collider.max.z > z - radius && collider.min.z < z + radius;
}

// (x, z) に立つ直立した体が minY〜maxY の範囲で何かにめり込むか。
export function bodyBlocked(colliders, x, z, minY, maxY, radius) {
  return colliders.some(collider =>
    collider.max.y > minY && collider.min.y < maxY && overlapsFootprint(collider, x, z, radius));
}

// reach 以下で最も高い足場の高さ。何もなければ床を返す。
export function supportBelow(colliders, x, z, reach, radius) {
  let top = FLOOR_Y;
  for (const collider of colliders) {
    if (collider.max.y > reach || collider.max.y <= top) continue;
    if (overlapsFootprint(collider, x, z, radius)) top = collider.max.y;
  }
  return top;
}

// from より上で最も低い天井。何もなければ Infinity。
export function ceilingAbove(colliders, x, z, from, radius) {
  let bottom = Infinity;
  for (const collider of colliders) {
    if (collider.min.y < from || collider.min.y >= bottom) continue;
    if (overlapsFootprint(collider, x, z, radius)) bottom = collider.min.y;
  }
  return bottom;
}

// (x, z) が「登れる足場」かどうか。reach 内に天面があり、その上に体が収まる高さがある場合だけ真。
export function climbableTop(colliders, x, z, feetY, reach, height, radius) {
  const top = supportBelow(colliders, x, z, feetY + reach, radius);
  if (top <= feetY + STEP_HEIGHT) return 0;
  return bodyBlocked(colliders, x, z, top + .05, top + height, radius) ? 0 : top;
}
