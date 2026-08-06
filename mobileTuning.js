export const MOBILE_TUNING = Object.freeze({
  movement: Object.freeze({
    // JumpForce と Gravity はライバルの跳躍・落下に使う従来値。プレイヤーの
    // ジャンプを変えてもCPUの挙動が変わらないよう、ここは据え置いている。
    JumpForce: 12.31,
    Gravity: 23,
    AirControl: 18,
    JumpBufferTime: .14,
    CoyoteTime: .1,
    AutoJumpEnabled: true,
  }),
  // プレイヤーのジャンプ。上昇・頂点付近・落下で重力を変えて、高さを出しつつ
  // 滞空を短く保つ。最高到達点は Force^2/(2*RiseGravity) に頂点補正を足した約5.0。
  playerJump: Object.freeze({
    Force: 14.1,          // 初速。従来の12.31から約+15%で、押した瞬間の伸びを出す。
    RiseGravity: 19.2,    // 上昇中。到達点を約5.0に合わせる。
    ApexSpeed: 3.2,       // この速度を下回ったら頂点扱い。
    ApexGravity: 26,      // 頂点付近。滞空を切り上げてフワつきを消す。
    FallGravity: 27,      // 落下。上昇より速くして着地までのテンポを作る。
    SlideGrace: .2,       // スライド終了後、この秒数内のジャンプはスライドジャンプ扱い。
    SlideBoost: 1.06,     // スライドジャンプの前方向への上乗せ。
    SlideSpeedCap: 12.5,  // 空中で維持する速度の上限。連打しても際限なく伸びない。
    SlideDecay: 1.8,      // 維持速度の減衰（毎秒）。
  }),
  aim: Object.freeze({
    AssistAngle: 13,
    AssistStrength: 5.2,
    SlowdownMultiplier: .68,
    MaxAssistDistance: 34,
    TargetRetentionTime: .2,
    TargetSearchInterval: .08,
    TargetReleaseTime: .1,
    SwipeBreakThreshold: .036,
    SwipeBreakDuration: .13,
    CloseRangeAssistMultiplier: 1.28,
    TrackingStrength: .82,
    FiringMultiplier: 1.1,
  }),
});
