export const view = `
      <div class="history-paper">
        <div class="paper-masthead">
          <div class="paper-meta"><span>智驾博物馆 / 常设展</span><span>展厅 01 · 中国新能源车</span><span>从科研样车到智能出行</span></div>
          <div class="paper-rule"></div>
          <div class="history-intro">
            <p class="eyebrow">展厅 01 / 中国新能源汽车发展史</p>
            <h1>中国新能源车<br /><em>怎样走到今天</em></h1>
            <div class="intro-copy">
              <p>从科研、公交示范，到今天的电动汽车和智能驾驶。看图认识中国新能源车的成长。</p>
              <button class="text-button" type="button" data-next="explore">去看一辆车里面有什么 <span>↗</span></button>
            </div>
          </div>
          <div class="paper-headline"><strong>一辆车，汇集了能源、工程与智能技术</strong><span>点选年份，跳到对应展品</span></div>
        </div>

        <div class="history-paper-lead">
          <article class="paper-lead-story">
            <span class="timeline-kicker">欢迎来到智驾博物馆</span>
            <h2>从一辆样车，<br /><em>到每一天的出行。</em></h2>
            <p>沿着时间往前走，看看中国怎样把电池、电机、充电和智能技术装进汽车。</p>
            <div class="paper-byline"><span>看图逛展</span><span>每件展品，一眼读懂</span></div>
          </article>
          <aside class="paper-facts">
            <div><span>能源</span><strong>动力电池</strong><small>储存电能</small></div>
            <div><span>动力</span><strong>电机</strong><small>带动车轮</small></div>
            <div><span>智能</span><strong>传感器</strong><small>发现道路情况</small></div>
          </aside>
        </div>

      <div class="timeline-stage">
        <div class="timeline-header">
          <div>
            <span class="timeline-kicker">展览导览</span>
            <h2>沿着年代，开始逛展</h2>
          </div>
          <p>点选时间节点，跳到对应展品。</p>
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
