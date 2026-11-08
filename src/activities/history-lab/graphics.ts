/** Exact geometry and functional paths; no perspective vehicle illustrations. */
export function mechanismGlyph(kind:string):string {
  const parts:Record<string,string>={
    source:'<rect x="12" y="17" width="66" height="38" rx="3"/><path d="M78 29h7v14h-7M23 26v20m13-20v20m13-20v20m13-20v20"/>',
    conversion:'<circle cx="44" cy="36" r="22"/><path d="M66 36h21M12 36h10m12-12 20 24m0-24L34 48"/>',
    motion:'<circle cx="27" cy="44" r="16"/><circle cx="72" cy="44" r="16"/><path d="M27 44h45m-57 22h70M27 28v32m45-32v32"/>',
    process:'<rect x="9" y="16" width="26" height="31"/><rect x="62" y="16" width="26" height="31"/><path d="M9 57h79M40 31h15m-5-5 6 5-6 5"/>',
    sensing:'<rect x="10" y="24" width="31" height="29" rx="3"/><circle cx="25" cy="38" r="7"/><path d="m48 22 34-12M48 38h37M48 54l34 12"/>',
    analysis:'<rect x="24" y="14" width="48" height="46" rx="3"/><path d="M35 26h26M35 36h26M35 46h14M13 26h11m-11 20h11m48-20h12m-12 20h12"/>',
    action:'<path d="M12 56h73M23 48V25l17-12 17 12v23M23 25h34"/><path d="M71 20v27m-7-7 7 8 7-8"/>',
    appearance:'<rect x="17" y="20" width="63" height="34" rx="8"/><path d="M28 30h42M28 43h26"/>',
  };
  return `<svg class="hl-glyph" viewBox="0 0 96 76" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${parts[kind]??parts.process}</svg>`;
}
export const wagonGeometry='<svg class="hl-wagon" viewBox="0 0 180 42" aria-hidden="true"><path d="M5 4h170v17H5z" fill="currentColor"/><path d="M0 27h180" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="36" cy="26" r="10" fill="#fff" stroke="currentColor" stroke-width="3"/><circle cx="144" cy="26" r="10" fill="#fff" stroke="currentColor" stroke-width="3"/></svg>';
export const futureGeometry='<svg class="hl-future-car" viewBox="0 0 480 160" role="img" aria-label="未来汽车能力标记示意"><path d="m45 105 20-51h270l50 51h38v28H38v-28z" fill="#eaf0ff" stroke="#183153" stroke-width="3"/><path d="M85 55v50h251l-37-50M180 55v50M40 134h389" fill="none" stroke="#183153" stroke-width="3"/><circle cx="113" cy="132" r="23" fill="#fff" stroke="#183153" stroke-width="5"/><circle cx="350" cy="132" r="23" fill="#fff" stroke="#183153" stroke-width="5"/><circle class="hl-capability-mark" cx="235" cy="81" r="16" fill="#2457d6"/><path d="m227 81 6 6 11-12" fill="none" stroke="#fff" stroke-width="3"/></svg>';
