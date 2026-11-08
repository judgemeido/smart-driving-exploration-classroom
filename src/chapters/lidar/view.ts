export const view = `
      <div class="lidar-workbench">
        <div class="lidar-stage" data-lidar-stage>
          <canvas data-lidar-canvas aria-label="Velodyne VLP-16 激光雷达三维模型，可拖动旋转并缩放"></canvas>
          <div class="lidar-stage__grid" aria-hidden="true"></div>
          <div class="lidar-stage__topline"><span><i>03</i> 感知实验室</span><span>杭州 · 智驾博物馆</span></div>
          <div class="lidar-stage__specimen" aria-hidden="true"><span>展品编号</span><strong>LD—016</strong><i></i><small>MECHANICAL LIDAR<br />ROTATING SCAN / 360°</small></div>
          <div class="lidar-stage__readout">
            <span class="lidar-stage__live"><i></i><b data-lidar-status>模型载入中</b></span>
            <span>往返时间 <b data-lidar-time>— ns</b></span>
            <span>回波距离 <b data-lidar-range>20.0 m</b></span>
            <span>演示点数 <b data-lidar-points>—</b></span>
          </div>
          <div class="lidar-stage__hint">拖动旋转 · 双指或滚轮缩放 · 点选零件查看作用</div>
          <div class="lidar-stage__notice" data-lidar-hotspot aria-live="polite">
            <span>正在观察</span><strong data-lidar-part-name>旋转式激光雷达</strong>
            <p data-lidar-part-copy>发出光脉冲，接收物体反射回来的光。</p>
            <small data-lidar-part-fact>开放结构模型 · VLP‑16</small>
          </div>
          <div class="lidar-scan-hud" data-lidar-scan-hud aria-hidden="true">
            <span>SCAN IN PROGRESS</span><b><i></i> 360° 水平扫描</b><small data-lidar-target-distance>模拟目标 20 m</small>
          </div>
        </div>

        <aside class="lidar-panel">
          <div class="lidar-panel__intro">
            <p class="eyebrow"><span>第三展厅</span><span>感知 · 01</span></p>
            <h2>激光雷达<em>如何看见路？</em></h2>
            <p>它测量光的往返时间，把距离变成可计算的空间。</p>
          </div>


          <div class="lidar-object-line">
            <span>本次展品 <strong>Velodyne VLP‑16</strong></span>
            <span>旋转式机械雷达</span>
          </div>

          <section class="lidar-section lidar-section--modes" aria-label="选择设备展示状态">
            <div class="lidar-section__heading"><span>观察方式</span><small>点击切换</small></div>
            <div class="lidar-mode-buttons" role="group" aria-label="整机或剖视模式">
              <button class="is-active" type="button" data-lidar-mode="assembly" aria-pressed="true"><i>01</i>整机</button>
              <button type="button" data-lidar-mode="exploded" aria-pressed="false"><i>02</i>爆炸拆解</button>
              <button type="button" data-lidar-mode="cutaway" aria-pressed="false"><i>03</i>透明剖视</button>
            </div>
            <p class="lidar-section__note">内部件按真实工作功能制作，是原理示意，不是该型号官方拆机图；动画为慢速教学演示。</p>
          </section>

          <section class="lidar-section lidar-range" aria-label="调整模拟目标距离">
            <label class="lidar-section__heading" for="lidar-distance"><span>目标距离</span><output data-lidar-distance-value>20 m</output></label>
            <input id="lidar-distance" data-lidar-distance type="range" min="5" max="80" value="20" step="1" />
            <div class="lidar-range__scale"><span>5 m</span><span>80 m</span></div>
            <p>改变距离，观察光的往返时间如何变化。</p>
          </section>

          <section class="lidar-section lidar-lesson" aria-label="激光雷达工作步骤">
            <div class="lidar-section__heading"><span>一束光的旅程</span><small>选择步骤看变化</small></div>
            <div class="lidar-lesson__steps" role="group" aria-label="激光雷达探测步骤">
              <button class="is-active" type="button" data-lidar-step="0"><i>01</i><span>发射</span></button>
              <button type="button" data-lidar-step="1"><i>02</i><span>反射</span></button>
              <button type="button" data-lidar-step="2"><i>03</i><span>接收</span></button>
              <button type="button" data-lidar-step="3"><i>04</i><span>成点云</span></button>
            </div>
            <p class="lidar-lesson__copy" data-lidar-step-copy>16 组激光通道按时序发出短脉冲，旋转扫描头让光线覆盖四周。</p>
          </section>

          <div class="lidar-actions">
            <button class="lidar-scan-button" type="button" data-lidar-scan-toggle aria-pressed="false"><span>↗</span><strong data-lidar-scan-label>开始扫描演示</strong></button>
            <button class="lidar-reset-button" type="button" data-lidar-reset aria-label="重置视角">重置 ↺</button>
          </div>

          <details class="lidar-details">
            <summary>设备参数与模型信息 <span>＋</span></summary>
            <div class="lidar-specs__grid">
              <div><strong>16</strong><span>束激光</span></div><div><strong>360°</strong><span>水平视场</span></div>
              <div><strong>30°</strong><span>垂直视场</span></div><div><strong>5–20</strong><span>圈 / 秒</span></div>
            </div>
            <p class="lidar-specs__note">这是旋转式机械雷达示例，不代表所有量产车载雷达。标称最大测程约 100 m，实际距离受目标反射率与环境影响。<a href="https://ouster.com/downloads/velodyne-downloads" target="_blank" rel="noreferrer">技术资料</a></p>
            <p class="lidar-section__note">外壳来自真实 VLP‑16 模型；内部拆分是原理示意，不代表产品的官方内部结构。</p>
            <div class="lidar-license"><span>开放模型 / BSD‑3‑Clause</span><p>VLP‑16 网格：Kevin Hallenbeck · Dataspeed Inc. · <a href="https://github.com/Eddylib/velodyne_simulator/tree/03e3ce2e1a92991c31463f8935a98aa344f17da2/velodyne_description/meshes" target="_blank" rel="noreferrer">模型来源</a> · <a href="/assets/lidar/LICENSE" target="_blank" rel="noreferrer">许可全文</a></p></div>
          </details>
          <div class="lidar-panel__footer"><button class="text-button" type="button" data-next="explore">返回车辆结构 <span>↗</span></button><button class="text-button" type="button" data-next="traffic">继续安全上路 <span>↗</span></button></div>
        </aside>
      </div>
    `;
