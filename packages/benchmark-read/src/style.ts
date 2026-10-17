// The page's look (benchmark-view, "The look"; S-201, approved against the mockup on 2026-10-17).
//
// True black ground, surfaces lifting by light alone, no hue cast in any neutral, one accent.
// The light theme is the same structure in neutral greys. Full bleed with a 16px gutter and
// NEVER more than two charts across. Four chart-size presets and a drag handle on every chart.
//
// **The chart colours are the VALIDATED categorical palette, in a fixed order** — both themes
// were checked with the colour-blindness and contrast validator, worst adjacent separation 8.4
// against a target of 8. Re-colouring means re-validating, not swapping hexes. The status
// colours are reserved and are never used as a series colour.
//
// **The type is a system stack, and that is a DIFFERENCE from the shape the owner approved**,
// which names Archivo for display and IBM Plex Sans and Mono for body and figures. No font can
// be fetched — check 11 forbids every absolute `http(s)` url in the served HTML, which is how
// the mockup loaded all three — and Gate 2 vendors ECharts and nothing else, so there is no
// font file to serve either. `tabular-nums` carries what the mono face carried: every figure
// lines up in a column. Reported as a finding against those two sentences rather than taken.

export const PAGE_STYLE = `
:root {
  --bg: #f4f4f5;
  --surface: #ffffff;
  --surface-2: #fafafa;
  --surface-3: #f0f0f2;
  --line: #e4e4e7;
  --line-strong: #c8c8cd;
  --fg: #09090b;
  --fg-dim: #52525b;
  --fg-faint: #8a8a93;
  --accent: #a35a00;
  --accent-ink: #ffffff;
  --good: #0ca30c;
  --warning: #fab219;
  --critical: #d03b3b;
  --good-wash: #e2f5e2;
  --critical-wash: #f9e2e2;
  --s1: #2a78d6;
  --s2: #eb6834;
  --s3: #1baf7a;
  --s4: #eda100;
  --s5: #e87ba4;
  --display: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --body: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono: ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Menlo, monospace;
  --r: 14px;
  --r-sm: 9px;
  --chart-h: 520px;
}
:root[data-theme='dark'] {
  --bg: #000000;
  --surface: #0c0c0e;
  --surface-2: #151518;
  --surface-3: #1f1f23;
  --line: #242428;
  --line-strong: #3a3a41;
  --fg: #f7f7f8;
  --fg-dim: #a1a1aa;
  --fg-faint: #6c6c76;
  --accent: #ffb224;
  --accent-ink: #000000;
  --good-wash: #0c240f;
  --critical-wash: #2b1111;
  --s1: #3987e5;
  --s2: #d95926;
  --s3: #199e70;
  --s4: #c98500;
  --s5: #d55181;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { background: var(--bg); }
body {
  margin: 0;
  padding: 0 16px 64px;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--body);
  font-size: 15px;
  line-height: 1.55;
  font-variant-numeric: tabular-nums;
}
h1, h2, h3 { font-family: var(--display); font-weight: 600; margin: 0; letter-spacing: -0.012em; }
h1 { font-size: 20px; }
h2 { font-size: 29px; }
h3 { font-size: 17px; }
a { color: var(--accent); }
code, .num, td.fig, th.fig { font-family: var(--mono); font-variant-numeric: tabular-nums; }

header.bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  margin: 0 -16px 20px;
  padding: 12px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
header.bar .spacer { flex: 1 1 auto; }
nav.views, .sizer { display: flex; gap: 3px; padding: 3px; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-sm); }
nav.views button, .sizer button, button.ghost, button.act {
  font: inherit;
  font-size: 13px;
  color: var(--fg-dim);
  background: transparent;
  border: 0;
  border-radius: 6px;
  padding: 5px 11px;
  cursor: pointer;
}
nav.views button[aria-current='true'] { color: var(--accent-ink); background: var(--accent); }
.sizer button[aria-current='true'] { color: var(--accent); background: var(--surface-3); }
button.ghost, button.act { border: 1px solid var(--line); background: var(--surface-2); }
button.act { color: var(--accent-ink); background: var(--accent); border-color: var(--accent); }
button[disabled] { opacity: 0.45; cursor: default; }

.sec { margin: 30px 0 14px; }
.sec .eyebrow { font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-faint); }
.sec p { margin: 6px 0 0; color: var(--fg-dim); max-width: 95ch; }

.panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; margin-bottom: 16px; }
.panel > .head { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.panel > .head .note { font-size: 12.5px; color: var(--fg-dim); }
.panel > .body { padding: 16px 18px; }
.panel > .body.flush { padding: 0; }

/* Never more than two charts across, at any width. */
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 16px; }
@media (min-width: 1100px) { .grid2 { grid-template-columns: 1fr 1fr; } }

.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.tile { padding: 18px 20px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.tile .k { font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--fg-faint); }
.tile .v { font-family: var(--mono); font-size: 44px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.tile .s { font-size: 12.5px; color: var(--fg-dim); }

.chartwrap { position: relative; resize: vertical; overflow: hidden; min-height: 180px; height: var(--chart-h); border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--surface-2); }
.chart { width: 100%; height: 100%; }
.chart .standin { display: block; padding: 18px; font-size: 13px; color: var(--fg-dim); }
.grip { position: absolute; right: 10px; bottom: 6px; font-size: 11px; color: var(--fg-faint); pointer-events: none; }
.legend-note { margin: 10px 0 0; font-size: 12.5px; color: var(--fg-dim); }

details.numbers { margin-top: 12px; border-top: 1px solid var(--line); padding-top: 10px; }
details.numbers > summary { cursor: pointer; font-size: 12.5px; color: var(--fg-dim); }
details.words > summary { cursor: pointer; font-size: 12.5px; color: var(--fg-dim); }
details.words pre { white-space: pre-wrap; word-break: break-word; font-family: var(--mono); font-size: 12.5px; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-sm); padding: 10px; }

table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 11.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--fg-faint); font-weight: 500; }
td.fig, th.fig { text-align: right; }
tbody tr:hover { background: var(--surface-2); }
.scroll { overflow: auto; max-height: 70vh; }

tr[data-draw='outlined'] td.mark { color: var(--fg-dim); }
td.hot { color: var(--critical); }
.swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: middle; margin-right: 6px; }
.swatch.solid { background: var(--s1); border: 1px solid var(--s1); }
.swatch.outlined { background: transparent; border: 1px dashed var(--line-strong); }

.rail { display: flex; gap: 2px; padding: 0 18px 16px; }
.rail .block { flex: 1 1 0; padding: 10px 12px; background: var(--surface-2); border: 1px solid var(--line); border-top: 3px solid var(--line-strong); border-radius: var(--r-sm); font-size: 12.5px; }
.rail .block[data-reached='true'] { border-top-color: var(--good); }
.rail .block[data-reached='false'] { opacity: 0.5; }

table.board th.figure-name { position: sticky; left: 0; background: var(--surface); min-width: 260px; }
table.board tr.differs td.figure-name, table.board tr.differs th.figure-name { box-shadow: inset 3px 0 0 var(--accent); }
table.board td.tint-good { background: var(--good-wash); }
table.board td.tint-critical { background: var(--critical-wash); }
table.board tbody.group > tr.group-head th { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); background: var(--surface-2); }

.controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.ctl { display: flex; gap: 6px; align-items: center; font-size: 11.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--fg-faint); }
.ctl select, .ctl input { font: inherit; font-size: 13px; text-transform: none; letter-spacing: 0; color: var(--fg); background: var(--surface-2); border: 1px solid var(--line); border-radius: 7px; padding: 5px 8px; }
.empty { padding: 28px 18px; color: var(--fg-dim); }
.pill { display: inline-block; font-size: 11.5px; padding: 1px 8px; border: 1px solid var(--line); border-radius: 999px; color: var(--fg-dim); }
`
