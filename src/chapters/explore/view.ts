import { disassemblyTasks } from './data';

export const view = `
      <div class="explore-workbench">
        <div class="model-viewer" data-model-viewer>
          <canvas id="model-canvas" aria-label="曜境 S9 三维模型交互视图"></canvas>
          <div class="viewer-vignette" aria-hidden="true"></div>
          <div class="viewer-topline"><span>YJ / S9</span><span>LIVE STRUCTURE STUDY</span></div>
          <div class="model-loading" data-model-loading>
            <span class="model-loading__label" data-model-loading-label>正在载入结构数据</span>
            <span class="model-loading__percent" data-model-loading-percent>0%</span>
            <span class="model-loading__bar"><i data-model-loading-bar></i></span>
          </div>
          <section class="powerflow-story" data-powerflow-story aria-hidden="true" aria-live="polite">
            <div class="powerflow-story__eyebrow"><span data-powerflow-step>01 / ENERGY SUPPLY</span><b data-powerflow-time>00.0 / 05.0 SEC</b></div>
            <div class="powerflow-story__content">
              <h3 data-powerflow-title>能量，从电池开始</h3>
              <p data-powerflow-copy>动力电池释放电能，送入车辆的高压系统。</p>
            </div>
            <div class="powerflow-story__footer">
              <span class="powerflow-story__progress"><i data-powerflow-progress></i></span>
              <button type="button" data-powerflow-skip>跳过动画 <span>↗</span></button>
            </div>
          </section>
          <button class="powerflow-replay" type="button" data-powerflow-replay aria-hidden="true">
            <span>↻</span> 重播 5 秒动力链
          </button>
          <div class="model-hint">拖拽旋转 · 滚轮缩放 · 点击右侧模块聚焦</div>
          <div class="model-status" data-model-status>等待模型</div>
          <div class="explode-hud" data-explode-hud aria-hidden="true">
            <span>EXPLODED ASSEMBLY</span><b>24 GROUPS / PICK ANY PART</b>
          </div>
          <aside class="part-popup" data-part-popup aria-hidden="true">
            <button class="part-popup__close" type="button" data-part-popup-close aria-label="关闭零件信息">×</button>
            <div class="part-popup__eyebrow">PICKED PART / NODE</div>
            <h3 data-popup-part-name>点击模型中的零件</h3>
            <p data-popup-part-copy>点击任意可见零件查看它所属的系统与结构作用。</p>
            <div class="part-popup__facts" data-popup-part-facts><span>等待选择</span></div>
          </aside>
          <div class="adas-overlay" data-adas-overlay aria-hidden="true">
            <div class="adas-overlay__status"><span class="adas-pulse-dot"></span><span>RADAR PULSE / ACTIVE</span></div>
            <div class="adas-overlay__legend"><span><i class="legend-mark legend-mark--cyan"></i>超声波</span><span><i class="legend-mark legend-mark--amber"></i>毫米波雷达</span><span><i class="legend-mark legend-mark--white"></i>目标回波</span></div>
            <div class="adas-overlay__metrics"><div><b data-adas-metric="distance">18.4</b><span>距离 / M</span></div><div><b data-adas-metric="direction">+12°</b><span>方向 / DEG</span></div><div><b data-adas-metric="target">03</b><span>目标 / COUNT</span></div></div>
          </div>
        </div>
        <aside class="explore-panel">
          <div class="explore-panel__intro">
            <p class="eyebrow">展厅 02 / 新能源汽车结构</p>
            <h2>把车身打开，<br /><em>看见它如何感知。</em></h2>
            <p>曜境 S9 是一个结构概念模型。选择一个系统，观察它在整车中的位置与作用。</p>
          </div>
          <section class="explore-learning-launch" aria-label="汽车结构学习">
            <p>观察真实模型，完成三组拆解任务；也可以观看四步归位演示。</p>
            <button type="button" data-assembly-open>把结构放回去 · 四步演示</button>
            <button type="button" data-explore-review-open hidden>复习三组系统的功能</button>
          </section>
          <section class="explore-learning-card" data-explore-review hidden aria-label="三组系统功能复习"></section>
          <section class="explore-learning-card" data-explore-assembly hidden aria-label="分组归位教学演示"></section>
          <div class="explore-controls" role="tablist" aria-label="模型结构模块">
            <button class="explore-control is-active" type="button" data-focus="all" role="tab" aria-selected="true"><span>01</span><strong>整车</strong><small>完整结构</small></button>
            <button class="explore-control" type="button" data-focus="battery" role="tab" aria-selected="false"><span>02</span><strong>电池系统</strong><small>能量底座</small></button>
            <button class="explore-control" type="button" data-focus="cabin" role="tab" aria-selected="false"><span>03</span><strong>座舱系统</strong><small>人与机器</small></button>
            <button class="explore-control" type="button" data-focus="adas" role="tab" aria-selected="false"><span>04</span><strong>智驾感知</strong><small>机器的眼睛</small></button>
          </div>
          <div class="model-actions" aria-label="车辆交互控制">
            <button class="model-action" type="button" data-model-action="doors" aria-pressed="false">
              <span class="model-action__glyph">↔</span><span><strong>车门</strong><small data-action-label="doors">打开</small></span>
            </button>
            <button class="model-action" type="button" data-model-action="tailgate" aria-pressed="false">
              <span class="model-action__glyph">↥</span><span><strong>后备箱</strong><small data-action-label="tailgate">打开</small></span>
            </button>
            <button class="model-action" type="button" data-model-action="lights" aria-pressed="false">
              <span class="model-action__glyph">◉</span><span><strong>车灯</strong><small data-action-label="lights">打开</small></span>
            </button>
          </div>
          <div class="explode-controls" aria-label="爆炸图控制">
            <button class="explode-toggle" type="button" data-explode-toggle aria-pressed="false">
              <span class="explode-toggle__eyebrow">STRUCTURE / EXPLODE</span>
              <strong data-explode-label>打开爆炸图</strong>
              <small>按装配层级展开，点击零件查询信息</small>
            </button>
            <button class="explode-reset" type="button" data-explode-reset aria-label="重置爆炸图">↺</button>
          </div>
          <div class="disassembly-launch">
            <button class="disassembly-launch__button" type="button" data-disassembly-start>
              <span class="disassembly-launch__eyebrow">MISSION / DISASSEMBLY</span>
              <strong data-disassembly-start-label>开始拆解任务</strong>
              <small>按提示找到三个核心系统，完成一场 3D 拆解任务</small>
            </button>
          </div>
          <section class="disassembly-task" data-disassembly-panel aria-hidden="true">
            <div class="disassembly-task__topline"><span>拆解任务 · 进行中</span><b data-disassembly-progress>0 / 3</b></div>
            <h3 data-disassembly-title>找出第一组核心部件</h3>
            <p data-disassembly-task>点击模型中的目标零件。每次点击都会保留零件信息卡片，方便边玩边认识结构。</p>
            <div class="disassembly-task__target"><span>当前目标</span><strong data-disassembly-target>动力电池包</strong></div>
            <div class="disassembly-task__steps" aria-label="任务进度">
              ${disassemblyTasks.map((_task, index) => `<i data-disassembly-step="${index}"></i>`).join('')}
            </div>
            <button class="disassembly-task__exit" type="button" data-disassembly-exit>退出任务</button>
          </section>
          <section class="part-filter" aria-label="爆炸图零件分类">
            <div class="part-filter__header"><span>零件分类</span><b data-part-filter-count>全部 / 24 组</b></div>
            <div class="part-filter__buttons" role="tablist" aria-label="选择零件分类">
              <button class="part-filter__button is-active" type="button" data-part-filter="all" role="tab" aria-selected="true">全部零件</button>
              <button class="part-filter__button" type="button" data-part-filter="body" role="tab" aria-selected="false">车身外观</button>
              <button class="part-filter__button" type="button" data-part-filter="energy" role="tab" aria-selected="false">能源系统</button>
              <button class="part-filter__button" type="button" data-part-filter="drive" role="tab" aria-selected="false">电驱系统</button>
              <button class="part-filter__button" type="button" data-part-filter="chassis" role="tab" aria-selected="false">底盘系统</button>
              <button class="part-filter__button" type="button" data-part-filter="cabin" role="tab" aria-selected="false">座舱人机</button>
              <button class="part-filter__button" type="button" data-part-filter="adas" role="tab" aria-selected="false">智驾感知</button>
              <button class="part-filter__button" type="button" data-part-filter="opening" role="tab" aria-selected="false">开合部件</button>
            </div>
          </section>
          <div class="explore-detail" data-focus-detail>
            <div class="explore-detail__index" data-focus-index>SYSTEM 01 / 04</div>
            <h3 data-focus-title>整车结构</h3>
            <p data-focus-copy>先从完整形态观察曜境 S9：外部车身、座舱、电池与感知组件被组织在同一个移动系统里。</p>
            <dl class="explore-facts" data-focus-facts>
              <div><dt>模型</dt><dd>EV SUV</dd></div>
              <div><dt>节点</dt><dd>802</dd></div>
              <div><dt>材质</dt><dd>19 组</dd></div>
            </dl>
          </div>
          <div class="part-inspector" data-part-inspector aria-live="polite" aria-hidden="true">
            <div class="part-inspector__eyebrow">PICKED PART / NODE</div>
            <h3 data-part-name>点击模型中的零件</h3>
            <p data-part-copy>打开爆炸图后，点击任意零件查看它所属的系统与结构作用。</p>
            <dl class="explore-facts" data-part-facts>
              <div><dt>系统</dt><dd>等待选择</dd></div>
              <div><dt>装配</dt><dd>—</dd></div>
              <div><dt>材质</dt><dd>—</dd></div>
            </dl>
          </div>
          <div class="explore-footer"><div><button class="text-button" type="button" data-next="history">返回发展历史 <span>↗</span></button><button class="text-button" type="button" data-next="lidar">继续了解激光雷达 <span>↗</span></button></div><span class="model-credit">GLB / CC BY 4.0 + original systems</span></div>
        </aside>
      </div>
      <div class="history-footer"><span>INTERACTIVE MODEL / COMING NEXT</span><span class="scroll-line"></span><span>02</span></div>
    `;
