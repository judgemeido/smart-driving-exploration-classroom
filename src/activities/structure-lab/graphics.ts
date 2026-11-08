import { relationLabels, type DiagramBoard, type DiagramEdge, type DiagramNode } from './content';
export interface StructureNodeBounds {
  width: number;
  height: number;
}
export function getMobileEdgeEndpoints(
  source: Pick<DiagramNode, 'x' | 'y'>,
  target: Pick<DiagramNode, 'x' | 'y'>,
  width: number,
  sourceBounds?: StructureNodeBounds,
  targetBounds?: StructureNodeBounds,
) {
  const dx = target.x - source.x,
    dy = target.y - source.y,
    length = Math.hypot(dx, dy),
    ux = dx / length,
    uy = dy / length;
  const fallback = { width: width / 2 - 16, height: 120 };
  const distance = (bounds: StructureNodeBounds) =>
    Math.min(
      bounds.width / 2 / Math.max(Math.abs(ux), 0.00001),
      bounds.height / 2 / Math.max(Math.abs(uy), 0.00001),
    ) + 2;
  const startDistance = distance(sourceBounds ?? fallback),
    endDistance = distance(targetBounds ?? fallback);
  return {
    start: { x: source.x + ux * startDistance, y: source.y + uy * startDistance },
    end: { x: target.x - ux * endDistance, y: target.y - uy * endDistance },
  };
}
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function getMobileStructureLayout(board: DiagramBoard, width: number) {
  const rowHeight = 180;
  const nodes = board.nodes.map((node, index) => ({
    ...node,
    x: width * (index % 2 === 0 ? 0.25 : 0.75),
    y: 90 + Math.floor(index / 2) * rowHeight,
  }));
  const sockets = board.sockets.map((socket) => {
    const originalNode = board.nodes.find((node) => node.x === socket.x && node.y === socket.y)!;
    const node = nodes.find((node) => node.id === originalNode.id)!;
    return { ...socket, x: node.x, y: node.y };
  });
  return { ...board, width, height: Math.ceil(nodes.length / 2) * rowHeight + 50, nodes, sockets };
}
export function mobileSceneGraphic(layout: ReturnType<typeof getMobileStructureLayout>): string {
  const { width: w, height: h } = layout;
  return `<svg class="structure-scene structure-mobile-scene" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><marker id="structure-arrow" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" refX="8" refY="4.5" orient="auto"><path d="M0 0 9 4.5 0 9z" fill="#2457d6"/></marker></defs><path d="M12 ${h - 64}V60l28-35h${w - 80}l28 35v${h - 124}" fill="#edf4fb" stroke="#9badbf" stroke-width="3"/><path d="M20 20h${w - 40}M${w / 2} 26v${h - 94}" stroke="#b1c2d4" stroke-width="2"/><circle cx="43" cy="${h - 63}" r="23" fill="#e5edf5" stroke="#6e8298" stroke-width="3"/><circle cx="${w - 43}" cy="${h - 63}" r="23" fill="#e5edf5" stroke="#6e8298" stroke-width="3"/><path d="M8 ${h - 36}h${w - 16}" stroke="#6e8298" stroke-width="3"/><text x="16" y="${h - 12}" font-size="16" fill="#4c627a">${layout.title} · 局部功能剖面</text><g data-structure-svg-edges></g></svg>`;
}
/** Deliberately flat functional geometry, not a rendering of any actual vehicle. */
export function partGraphic(partId: string): string {
  const id = partId.replace('part-', '');
  const art: Record<string, string> = {
    battery:
      '<rect x="8" y="14" width="68" height="30" rx="3"/><path d="M76 23h5v12h-5M20 19v20m12-20v20m12-20v20m12-20v20"/><path class="structure-energy" d="m46 17-8 13h9l-8 12"/>',
    motor:
      '<rect x="15" y="12" width="46" height="36" rx="8"/><circle cx="38" cy="30" r="12"/><path d="M61 30h21M8 20h7M8 40h7M22 50v4m30-4v4"/><path class="structure-energy" d="m35 22 8 8-8 8"/>',
    transmission:
      '<path d="m21 12 7 3 7-3 3 7 7 3-3 7 3 7-7 3-3 7-7-3-7 3-3-7-7-3 3-7-3-7 7-3z"/><circle cx="28" cy="29" r="8"/><path d="m53 22 6 2 6-2 3 5 6 3-2 6 2 6-6 2-3 6-6-2-6 2-2-6-6-2 2-6-2-6 6-3z"/><circle cx="59" cy="36" r="6"/>',
    wheel:
      '<circle cx="43" cy="28" r="22"/><circle cx="43" cy="28" r="13"/><path d="M43 15v26M30 28h26M33 19l20 18M53 19 33 37M10 52h66"/>',
    body: '<path d="M8 43V27l15-5L34 9h23l13 17h11v17zM24 24h43M34 9v34M57 9v34M8 35h73"/><path d="m34 24 23 19m0-19L34 43"/>',
    suspension:
      '<path d="M18 7h51M18 52h51M44 7v8l-15 5 30 7-30 7 30 7-15 5v6"/><path d="M20 14v31M68 14v31"/>',
    brakes:
      '<circle cx="39" cy="29" r="22"/><circle cx="39" cy="29" r="7"/><path d="M51 10h17v33H51M57 15v23M24 18l5 4m-8 8h6m-2 11 5-5"/>',
    'camera-front':
      '<path d="M12 19h44v27H12zM56 25l20-10v33L56 38M22 19l5-8h16l5 8"/><circle cx="34" cy="32" r="9"/>',
    'camera-surround':
      '<path d="M12 19h44v27H12zM56 25l20-10v33L56 38M22 19l5-8h16l5 8"/><circle cx="34" cy="32" r="9"/><path d="m4 7 5-4m68 49 6 4"/>',
    lidar:
      '<rect x="20" y="24" width="48" height="24" rx="4"/><path d="M20 30h48M32 18h24M23 13q21-16 42 0M16 5q28-18 56 0"/><path d="M12 51h64"/>',
    'millimeter-teaching':
      '<rect x="13" y="14" width="32" height="34" rx="3"/><path d="M45 23q16 8 0 16M53 15q27 16 0 32M64 8q33 23 0 46"/>',
    ultrasonic:
      '<circle cx="28" cy="30" r="18"/><circle cx="28" cy="30" r="10"/><path d="M53 20q12 10 0 20M63 12q23 18 0 36M75 5q26 25 0 50"/>',
    road: '<path d="M6 12h76M6 48h76M8 30h16m12 0h16m12 0h16"/>',
    processor:
      '<rect x="23" y="10" width="42" height="40" rx="3"/><path d="M32 3v7m12-7v7m12-7v7M32 50v7m12-7v7m12-7v7M15 20h8m-8 10h8m-8 10h8m42-20h8m-8 10h8m-8 10h8M33 22h22v16H33z"/>',
    'driver-action':
      '<path d="M8 40h72M15 40V23h18v17m8 0V16h18v24m8 0V8h12v32M24 51h50"/><path d="m24 10 8-5 8 5m-8-5v9"/>',
  };
  return `<svg class="structure-part-art" viewBox="0 0 88 60" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${art[id] ?? ''}</svg>`;
}
export function sceneGraphic(board: DiagramBoard): string {
  return `<svg class="structure-scene" viewBox="0 0 900 400" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="structure-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z" fill="#2457d6"/></marker></defs><path d="M75 284V202l98-24 85-92h264l123 92h125l55 56v50" fill="#edf4fb" stroke="#9badbf" stroke-width="3"/><path d="M264 104h117v76H197m198-76h118l102 76H395z" fill="#fff" stroke="#b1c2d4" stroke-width="2"/><path d="M92 300h733M80 322h750" stroke="#6e8298" stroke-width="3"/><circle cx="194" cy="284" r="40" fill="#e5edf5" stroke="#9badbf" stroke-width="3"/><circle cx="755" cy="284" r="40" fill="#e5edf5" stroke="#9badbf" stroke-width="3"/><path d="M238 285h468" stroke="#b1c2d4" stroke-width="6"/><text x="70" y="375" font-size="18" fill="#4c627a">几何功能剖面 · 车头朝右</text><g data-structure-svg-edges></g></svg>`;
}
export function edgeGraphic(
  board: DiagramBoard,
  edges: readonly (DiagramEdge & { id: string })[],
  checked: boolean,
  mobile = false,
  bounds: ReadonlyMap<string, StructureNodeBounds> = new Map(),
): string {
  return edges
    .map((e, index) => {
      const source = board.nodes.find((n) => n.id === e.sourceId)!,
        target = board.nodes.find((n) => n.id === e.targetId)!;
      const valid = board.requiredEdges.some(
        (r) => r.sourceId === e.sourceId && r.targetId === e.targetId && r.relationId === e.relationId,
      );
      const y = (source.y + target.y) / 2 - (mobile ? 0 : 14 + (index % 2) * 12);
      const midX = (source.x + target.x) / 2;
      // End at the outside of each object's hit rectangle so the arrow is visible.
      const dx = target.x - source.x,
        dy = target.y - source.y;
      const inset = Math.min(80 / Math.max(Math.abs(dx), 0.001), 44 / Math.max(Math.abs(dy), 0.001), 0.46);
      const desktop = {
        start: { x: source.x + dx * inset, y: source.y + dy * inset },
        end: { x: target.x - dx * inset, y: target.y - dy * inset },
      };
      const { start, end } = mobile
        ? getMobileEdgeEndpoints(
            source,
            target,
            (board as DiagramBoard & { width: number }).width,
            bounds.get(source.id),
            bounds.get(target.id),
          )
        : desktop;
      return `<g class="structure-flow ${checked && !valid ? 'is-wrong' : ''}"><path d="M${start.x} ${start.y} Q${midX} ${y} ${end.x} ${end.y}" fill="none" stroke="${checked && !valid ? '#ad3445' : '#2457d6'}" stroke-width="3" ${checked && !valid ? 'stroke-dasharray="7 5"' : ''} marker-end="url(#structure-arrow)"/><title>${escapeHtml(source.label)} → ${escapeHtml(target.label)}：${relationLabels[e.relationId]}</title></g>`;
    })
    .join('');
}
