function candidate(position, direction, distance) {
  return {
    x: position.x + direction.x * distance,
    y: position.y + (direction.y || 0) * distance,
    z: position.z + direction.z * distance,
  };
}

export function resolveEnemyMove(position, direction, distance, isBlocked) {
  const attempts = [
    direction,
    { x: -direction.z, y: 0, z: direction.x },
    { x: direction.z, y: 0, z: -direction.x },
  ];

  // deflected は「まっすぐ進めず横に逃げた（あるいは全く動けなかった）」の意味。
  // 呼び出し側はこれを見て、目の前の段差を登るかどうかを決める。
  for (let index = 0; index < attempts.length; index++) {
    const next = candidate(position, attempts[index], distance);
    if (!isBlocked(next)) return { position: next, moved: true, deflected: index > 0 };
  }

  return { position: { x: position.x, y: position.y, z: position.z }, moved: false, deflected: true };
}
