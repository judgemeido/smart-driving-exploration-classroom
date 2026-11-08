import type { ExperimentFactory } from '../types';
import { normalizeSensorDraft, sensorObservation, type SensorDraft } from './sensor-state';

export const createSensorExperiment: ExperimentFactory = (host, context) => {
  let draft = normalizeSensorDraft(context.initialDraft);
  if (context.activityId !== 'S1') draft.sensor = 'lidar';
  const container = document.createElement('div');
  container.className = 'sensor-experiment';
  const intro = document.createElement('p');
  intro.className = 'lab-note';
  intro.textContent =
    context.activityId === 'S1'
      ? '依次选择三种设备，比较它们能提供的信息。相同道路，不同信息。'
      : context.activityId === 'S2'
        ? '先在预测区写下你的判断，再运行测量。试试16m与60m，然后改变角度或加入遮挡。'
        : '先保存晴朗、无遮挡的一次测量。之后每次只改天气或遮挡中的一项，再比较证据。';
  container.append(intro);
  const listeners: Array<() => void> = [];
  const sync = () =>
    context.setScene({
      kind: 'sensor',
      ...draft,
      sensorView: context.activityId === 'S1' ? 'information' : 'measurement',
    });
  const change = (patch: Partial<SensorDraft>) => {
    draft = normalizeSensorDraft({ ...draft, ...patch });
    sync();
    context.onChange();
  };
  const group = (label: string, help?: string) => {
    const field = document.createElement('fieldset');
    field.className = 'lab-control-group';
    const legend = document.createElement('legend');
    legend.className = 'lab-label';
    legend.textContent = label;
    field.append(legend);
    if (help) {
      const p = document.createElement('p');
      p.className = 'lab-help';
      p.textContent = help;
      field.append(p);
    }
    container.append(field);
    return field;
  };
  const listen = (el: HTMLElement, type: string, fn: () => void) => {
    el.addEventListener(type, fn);
    listeners.push(() => el.removeEventListener(type, fn));
  };
  if (context.activityId === 'S1') {
    const field = group('选择设备', '切换设备后运行观察，保存每种设备的信息证据。');
    const select = document.createElement('select');
    select.className = 'lab-select';
    select.setAttribute('aria-label', '选择设备');
    for (const [value, label] of [
      ['camera', '摄像头'],
      ['radar', '毫米波雷达'],
      ['lidar', '激光雷达'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
    select.value = draft.sensor;
    listen(select, 'change', () => change({ sensor: select.value as SensorDraft['sensor'] }));
    field.append(select);
    const list = document.createElement('ul');
    list.className = 'lab-list';
    for (const text of [
      '摄像头：看图像、颜色和纹理。',
      '毫米波雷达：测距离与相对运动；本实验不模拟测速。',
      '激光雷达：用距离点描述轮廓。',
      '雷达和激光雷达均不直接读取交通灯灯色。',
    ]) {
      const li = document.createElement('li');
      li.textContent = text;
      list.append(li);
    }
    container.append(list);
  } else {
    const range = (
      label: string,
      key: 'distance' | 'angle',
      min: number,
      max: number,
      unit: string,
      help: string,
    ) => {
      const field = group(label, help);
      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'lab-range';
      input.min = String(min);
      input.max = String(max);
      input.step = '1';
      input.value = String(draft[key]);
      input.setAttribute('aria-label', label);
      const output = document.createElement('output');
      output.textContent = `${draft[key]} ${unit}`;
      listen(input, 'input', () => {
        change({ [key]: Number(input.value) });
        output.textContent = `${draft[key]} ${unit}`;
      });
      field.append(input, output);
    };
    range('目标前表面距离', 'distance', 4, 80, 'm', '沿车辆前进方向的距离；光束偏转时，沿射线的路径会更长。');
    range('光束偏转角', 'angle', -30, 30, '°', '目标宽4m。偏转过大时射线会从旁边经过，读数为空。');
    const field = group(
      '环境条件',
      context.activityId === 'S3'
        ? '对照时保持距离与角度相同，每次只改变一个条件。'
        : '遮挡物位于前方8m；只对其后方目标形成遮挡。',
    );
    const select = document.createElement('select');
    select.className = 'lab-select';
    select.setAttribute('aria-label', '天气');
    for (const [value, label] of [
      ['clear', '晴朗'],
      ['rain', '轻雨'],
      ['fog', '浓雾'],
    ]) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = label;
      select.append(o);
    }
    select.value = draft.weather;
    listen(select, 'change', () => change({ weather: select.value as SensorDraft['weather'] }));
    field.append(select);
    const label = document.createElement('label');
    label.className = 'lab-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = draft.occluded;
    listen(checkbox, 'change', () => change({ occluded: checkbox.checked }));
    label.append(checkbox, document.createTextNode(' 加入近处遮挡物（8m）'));
    field.append(label);
  }
  const display = group('模型显示', '显示开关只改变观看方式，不改变实验读数。');
  for (const [key, text] of [
    ['showRay', '显示传播路径'],
    ['cutaway', '剖开传感器'],
  ] as const) {
    const label = document.createElement('label');
    label.className = 'lab-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = draft[key];
    listen(input, 'change', () => change({ [key]: input.checked }));
    label.append(input, document.createTextNode(` ${text}`));
    display.append(label);
  }
  const source = document.createElement('p');
  source.className = 'lab-source';
  source.textContent =
    '原理参考：光脉冲往返时间测距（t = 2d/c）；本页为单束光与平面目标的简化教学模型，天气为定性样例。';
  container.append(source);
  host.append(container);
  sync();
  return {
    getDraft: () => ({ ...draft }),
    observe: () => sensorObservation(context.activityId, draft),
    dispose: () => {
      listeners.forEach((remove) => remove());
      container.remove();
    },
  };
};
