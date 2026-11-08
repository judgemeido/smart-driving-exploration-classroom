import { sensorLearningContent } from './source';
export const gameView=`
<section class="sensor-lab" aria-label="回波侦探实验台">
  <ol class="sensor-steps" aria-label="实验顺序"><li data-step="pulse" aria-current="step">发射与接收</li><li data-step="scan">扫描与测量</li><li data-step="weather">天气与行动</li></ol>
  <div class="sensor-workbench">
    <div class="sensor-field-wrap"><div class="sensor-field" data-sensor-field></div><div class="sensor-legend"><span><i class="sensor-legend-marker"></i>教学反射点</span><span><i class="sensor-legend-out"></i>发射</span><span><i class="sensor-legend-back"></i>回波</span></div><p class="sensor-caption" data-stage-caption>俯视原理图 · 光程动画已放慢</p></div>
    <div class="sensor-side">
    <aside class="sensor-evidence" aria-label="本局测量证据"><h2>观察记录</h2><div data-sensor-readings></div></aside>
  <div class="sensor-tools" data-sensor-stage="pulse">
    <div class="sensor-tool"><label for="sensor-direction">发射方向 <output data-angle-output>0°</output></label><div class="sensor-range-row"><button type="button" data-command="angle-minus" aria-label="方向减少">−</button><input id="sensor-direction" aria-label="发射方向" type="range" min="-40" max="40" step="4" value="0"><button type="button" data-command="angle-plus" aria-label="方向增加">+</button></div></div>
    <fieldset class="sensor-receiver" data-receiver-tools disabled><legend>把回波接到接收器</legend><div class="sensor-lead-row"><button type="button" data-command="receiver-lead" aria-pressed="false">接收线头</button><span class="sensor-connection-line" aria-hidden="true"></span><button type="button" data-port="tx" aria-pressed="false">Tx 发射口</button><button type="button" data-port="rx" aria-pressed="false">Rx 接收口</button></div><p data-port-status class="sensor-caption">命中目标后解锁接收接线。</p></fieldset>
  </div>
  <div class="sensor-tools" data-sensor-stage="scan" hidden>
    <div class="sensor-tool" data-scan-tools><label for="sensor-scan">扫描方向 <output data-scan-output>−40°</output></label><div class="sensor-range-row"><button type="button" data-command="scan-minus" aria-label="扫描减少">−</button><input id="sensor-scan" aria-label="扫描方向" type="range" min="-40" max="40" step="4" value="-40"><button type="button" data-command="scan-plus" aria-label="扫描增加">+</button></div><button type="button" data-command="sample">采样当前方向</button></div>
    <div class="sensor-tool" data-ruler-tools hidden><label for="sensor-ruler">距离标尺 <output data-ruler-output>16m</output></label><div class="sensor-range-row"><button type="button" data-command="ruler-minus" aria-label="标尺向设备移动">−</button><input id="sensor-ruler" aria-label="距离标尺" type="range" min="0" max="32" step="1" value="16"><button type="button" data-command="ruler-plus" aria-label="标尺远离设备">+</button></div><p class="sensor-caption">0–32m 径向距离尺，与回波使用同一米制基准。</p></div>
  </div>
  <div class="sensor-weather-tools" data-sensor-stage="weather" hidden>
    <fieldset data-evidence-tools><legend>选择线头，再点一个证据位</legend><div class="sensor-sensor-leads"><button type="button" data-sensor="lidar" aria-pressed="false">激光雷达线头</button><button type="button" data-sensor="radar" aria-pressed="false">毫米波雷达线头</button><button type="button" data-sensor="camera" aria-pressed="false">摄像头线头</button></div><div class="sensor-evidence-sockets"><button type="button" data-evidence-slot="0">证据位 1 · 空</button><button type="button" data-evidence-slot="1">证据位 2 · 空</button></div></fieldset>
    <fieldset data-action-tools hidden><legend>封闭测试道的观察方案</legend><div class="sensor-action-lever" role="group" aria-label="测试车行动杆"><button type="button" data-plan="continue" aria-pressed="true">继续</button><button type="button" data-plan="slow" aria-pressed="false">慢行</button><button type="button" data-plan="stop" aria-pressed="false">停下</button><label class="sensor-signal-toggle"><input type="checkbox" data-signal>打开提示灯</label></div><p class="sensor-caption">4m 是游戏观察位置，不是现实制动距离。</p></fieldset>
  </div>
    </div>
  </div>
  <div class="sensor-result-note" data-sensor-feedback>转动方向，让光束覆盖教学反射点。</div>
  <footer class="sensor-action-bar"><div class="sensor-secondary-actions"><button type="button" data-command="cancel" hidden>取消选择</button><button type="button" data-command="hint">这一步的答案提示</button></div><button type="button" class="sensor-primary" data-command="primary">发射一次</button></footer>
  <details class="sensor-science"><summary>科学资料与操作方法</summary><p>点击线头，再点插口；也可拖动线头。Tab 选择控件，Enter 或空格操作，方向键调节旋钮和标尺，Escape 取消未接入的线头。扫描跳过的角度也会逐槽采样，重复槽不增加证据。</p><p>时间来自光速 299792458m/s；距离计算用往返路程的一半。</p><p>教学光束宽度、反射点、轮廓、天气样点和观察线都是本游戏的示意参数，不代表真实设备性能。</p><ol>${sensorLearningContent.steps.map(step=>`<li><strong>${step.title}</strong>：${step.copy}</li>`).join('')}</ol><dl>${sensorLearningContent.sensorCards.map(card=>`<dt>${card.name}</dt><dd>${card.helps} ${card.limits}</dd>`).join('')}</dl></details>
</section>`;
export const view='<div class="activity-game"></div>';
