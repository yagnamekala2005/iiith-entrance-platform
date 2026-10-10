"use client";

export function LoginMotionScene() {
  return (
    <div className="login-motion-scene" aria-label="Animated mock test interface preview" role="img">
      <div className="login-motion-orbit login-motion-orbit-one" aria-hidden="true" />
      <div className="login-motion-orbit login-motion-orbit-two" aria-hidden="true" />
      <div className="login-motion-node login-motion-node-one" aria-hidden="true" />
      <div className="login-motion-node login-motion-node-two" aria-hidden="true" />
      <div className="login-motion-node login-motion-node-three" aria-hidden="true" />

      <div className="login-motion-topline">
        <span className="login-motion-live"><i /> LIVE PREVIEW</span>
        <span className="login-motion-index">01 / PREPARE</span>
      </div>

      <div className="login-motion-question">
        <div className="login-motion-card-heading">
          <span className="login-motion-icon">Q.</span>
          <span>QUICK PRACTICE</span>
          <span className="login-motion-card-dot" />
        </div>
        <p>If x² − 5x + 6 = 0, what are the roots?</p>
        <div className="login-motion-option login-motion-option-active"><span>A</span> 2 and 3 <b>✓</b></div>
        <div className="login-motion-option"><span>B</span> 1 and 6</div>
        <div className="login-motion-option"><span>C</span> −2 and −3</div>
        <div className="login-motion-feedback"><span>✓</span> Correct — keep going!</div>
      </div>

      <div className="login-motion-progress">
        <div className="login-motion-card-heading">
          <span className="login-motion-progress-symbol">↗</span>
          <span>YOUR PROGRESS</span>
        </div>
        <div className="login-motion-progress-number">78<span>%</span></div>
        <div className="login-motion-progress-track"><i /></div>
        <div className="login-motion-progress-caption"><span>Weekly target</span><b>On track</b></div>
        <div className="login-motion-bars" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i />
        </div>
      </div>

      <div className="login-motion-focus">
        <span className="login-motion-focus-icon">✦</span>
        <span><b>Focus mode</b><small>One question at a time</small></span>
        <span className="login-motion-focus-status" />
      </div>

      <div className="login-motion-bottomline">
        <span className="login-motion-bottom-dot" />
        PRACTICE <i /> REVIEW <i /> IMPROVE
      </div>
    </div>
  );
}
