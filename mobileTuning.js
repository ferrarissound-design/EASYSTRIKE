export const MOBILE_TUNING = Object.freeze({
  movement: Object.freeze({
    JumpForce: 12.31,
    Gravity: 23,
    AirControl: 18,
    JumpBufferTime: .14,
    CoyoteTime: .1,
    AutoJumpEnabled: true,
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
