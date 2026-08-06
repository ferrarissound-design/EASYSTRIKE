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

  for (const attempt of attempts) {
    const next = candidate(position, attempt, distance);
    if (!isBlocked(next)) return { position: next, moved: true };
  }

  return { position: { x: position.x, y: position.y, z: position.z }, moved: false };
}
