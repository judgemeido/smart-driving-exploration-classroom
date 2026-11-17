export const view = `
      <div class="history-paper">
        <div class="paper-masthead">
          <div class="paper-meta"><span>智驾博物馆 / 常设展</span><span>展厅 01 · 中国新能源车</span><span>鸿蒙智行主线 · 中国车企同行</span></div>
          <div class="paper-rule"></div>
          <div class="history-intro">
            <p class="eyebrow">展厅 01 / 中国新能源汽车发展史</p>
            <h1>沿着鸿蒙智行<br /><em>看中国新能源车</em></h1>
            <div class="intro-copy">
              <p>跟着华为与中国车企的合作历程，认识鸿蒙智行。也看看蔚来、比亚迪等车企怎样各展所长。</p>
              <button class="text-button" type="button" data-next="explore">去看一辆车里面有什么 <span>↗</span></button>
            </div>
          </div>
          <div class="paper-headline"><strong>一条合作主线，看见中国车企百花齐放</strong><span>点选年份，跳到对应展品</span></div>
        </div>

        <div class="history-paper-lead">
          <article class="paper-lead-story">
            <span class="timeline-kicker">这次，我们这样逛展</span>
            <h2>鸿蒙智行，<br /><em>与中国车企同行。</em></h2>
            <p>华为提供智能技术，合作车企负责造车。看它们携手，再认识其他中国车企的创新。</p>
            <div class="paper-byline"><span>看图逛展</span><span>每件展品，一眼读懂</span></div>
          </article>
          <aside class="paper-facts">
            <div><span>主线</span><strong>鸿蒙智行</strong><small>车企与智能技术携手</small></div>
            <div><span>补能</span><strong>蔚来换电</strong><small>探索另一种补电方式</small></div>
            <div><span>能源</span><strong>比亚迪电池</strong><small>钻研车里的能量仓</small></div>
          </aside>
        </div>

        <nav class="history-mainline" aria-label="鸿蒙智行主线导览">
          <div class="history-mainline__heading"><span class="timeline-kicker">先看这条主线</span><p>从问界起步，认识鸿蒙智行的合作伙伴。</p></div>
          <div class="history-mainline__stops" data-history-mainline></div>
        </nav>

      <div class="timeline-stage">
        <div class="timeline-header">
          <div>
            <span class="timeline-kicker">展览导览</span>
            <h2>沿着年代，开始逛展</h2>
          </div>
          <p>金色节点是鸿蒙智行主线，沿途也能认识其他中国车企。</p>
        </div>
        <div class="timeline-grid timeline-grid--chronology">
          <div class="timeline-rail" data-rail="chronology">
            <div class="rail-meta"><span class="rail-dot rail-dot--amber"></span><span>从早期探索到未来出行</span></div>
            <div class="event-list" data-history-timeline></div>
          </div>
        </div>
        <div class="timeline-note"><span>—</span> 按时间从早到晚排列；相近的节点合并在同一件展品中。</div>
      </div>

      <div class="history-archive" data-history-archive>
        <div class="archive-header">
          <div>
            <span class="timeline-kicker">常设展 / 全部展品</span>
            <h2>中国新能源车，<em>一路向前。</em></h2>
          </div>
          <p>每张照片只出现一次，每件展品用一两句话讲清楚。</p>
        </div>
        <div class="archive-list" data-history-archive-list></div>
      </div>

      </div>

      <div class="history-footer">
        <span>WALK THE EXHIBITION</span>
        <span class="scroll-line"></span>
        <span>01</span>
      </div>
    `;
