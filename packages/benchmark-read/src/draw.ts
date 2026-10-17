// The page's own script: the chart configuration, and what a reader can move
// (benchmark-view, "The charts" and "The look"; S-201).
//
// It is INLINE in the one document. It is handed its payload in a
// `<script type="application/json">` block the server wrote, and that is now a MEASURED choice
// rather than a check's doing: check 11 used to read this package's whole source — this string
// included — for the four outbound-call spellings, so a `fetch('/data')` here turned it red.
// Since finding 23 that scan is per file and this file may name `fetch(` (the owner, 2026-10-17:
// a call to our own local server is not network access). The block stays because asking for the
// data would not remove it: every figure is ALREADY in the document as a server-rendered table,
// so the numbers travel once as HTML and once as JSON, and a second request splits that second
// copy across two answers instead of saving it — measured on the real record, 2026-10-17: the
// document 249.1 KB, its block 131.6 KB, `/data` 86.1 KB. Only a client that rendered the tables
// itself would make the page smaller, and the tables are what a reader with no script, no colour
// and no pointer reads (Gate 2, "The accessibility floor of a chart beyond colour").
//
// The drawing library arrives with Slice 4 as `vendor/echarts/echarts.min.js`, served at a
// RELATIVE url. **Without it this script draws no chart and says so in each chart's place**,
// which is why no check here needs the file: the page is a document first.

export const PAGE_SCRIPT = `
(function () {
  'use strict';
  var node = document.getElementById('benchmark-data');
  var DATA = JSON.parse(node.textContent);
  var CHARTS = DATA.charts;
  var BY_ID = {};
  DATA.runs.forEach(function (one) { BY_ID[one.runId] = one; });

  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function palette() {
    return [token('--s1'), token('--s2'), token('--s3'), token('--s4'), token('--s5')];
  }
  function at(holder, dotted) {
    var parts = dotted.split('.');
    var here = holder;
    for (var i = 0; i < parts.length; i++) {
      if (here === null || here === undefined) return undefined;
      here = here[parts[i]];
    }
    return here;
  }
  function shown(value) {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ');
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    if (typeof value === 'number') return String(Math.round(value * 10) / 10);
    return String(value);
  }

  // ------------------------------------------------------------ the eight charts

  var drawn = {};

  function common() {
    return {
      backgroundColor: 'transparent',
      textStyle: { color: token('--fg-dim'), fontFamily: token('--body') },
      grid: { left: 54, right: 20, top: 34, bottom: 46, containLabel: true },
      tooltip: { trigger: 'axis' }
    };
  }
  function category(names) {
    return { type: 'category', data: names, axisLabel: { color: token('--fg-dim') },
      axisLine: { lineStyle: { color: token('--line-strong') } } };
  }
  function measured(name) {
    return { type: 'value', name: name, nameTextStyle: { color: token('--fg-faint') },
      axisLabel: { color: token('--fg-dim') },
      splitLine: { lineStyle: { color: token('--line') } } };
  }

  function stagesOption() {
    var points = CHARTS['where-reels-die'].points;
    var option = common();
    option.xAxis = category(points.map(function (p) { return p.label; }));
    option.yAxis = measured('runs');
    option.series = [
      { type: 'bar', name: 'runs that reached it', barWidth: '52%',
        itemStyle: { color: palette()[0], borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: token('--fg') },
        data: points.map(function (p) { return p.runs; }) },
      { type: 'scatter', name: 'not handed on', symbolSize: 1, silent: true,
        label: { show: true, position: 'top', distance: 20, color: token('--critical'),
          formatter: function (one) {
            var drop = points[one.dataIndex].dropped;
            return drop > 0 ? '-' + drop : '';
          } },
        data: points.map(function (p) { return p.runs; }) }
    ];
    return option;
  }

  function scoresOption() {
    var points = CHARTS['scores-over-time'].points;
    var lines = {};
    points.forEach(function (p) {
      if (!lines[p.series]) lines[p.series] = { label: p.label, data: [] };
      lines[p.series].data.push([p.at, p.value]);
    });
    var colours = palette();
    var option = common();
    option.tooltip = { trigger: 'item' };
    option.legend = { top: 0, textStyle: { color: token('--fg-dim') } };
    option.xAxis = { type: 'time', axisLabel: { color: token('--fg-dim') },
      axisLine: { lineStyle: { color: token('--line-strong') } } };
    option.yAxis = measured('rating');
    option.series = Object.keys(lines).map(function (name, i) {
      return { type: 'line', name: lines[name].label, data: lines[name].data,
        showSymbol: true, symbolSize: 6, connectNulls: false,
        lineStyle: { width: name === 'overall' ? 2.6 : 1.6 },
        itemStyle: { color: name === 'overall' ? token('--accent') : colours[i % colours.length] } };
    });
    return option;
  }

  function groupOption(name) {
    var points = CHARTS[name].points;
    var option = common();
    option.tooltip = { trigger: 'item', formatter: function (one) {
      var point = points[one.dataIndex];
      return point.label + '<br/>' + point.share + '% of ' + point.decided +
        ' decided pictures refused' + (point.confident ? '' : ' — fewer than ten, drawn outlined');
    } };
    option.grid = { left: 44, right: 20, top: 22, bottom: 40, containLabel: true };
    option.xAxis = category(points.map(function (p) { return p.label; }));
    option.yAxis = measured('% refused');
    option.series = [{ type: 'bar', barWidth: '52%',
      label: { show: true, position: 'top', color: token('--fg'),
        formatter: function (one) {
          var point = points[one.dataIndex];
          return point.share + '%  (' + point.decided + ')';
        } },
      data: points.map(function (p) {
        var colour = p.aboveSeventy ? token('--critical') : palette()[0];
        return { value: p.share, itemStyle: p.draw === 'outlined'
          ? { color: 'transparent', borderColor: colour, borderWidth: 2, borderType: 'dashed' }
          : { color: colour, borderRadius: [4, 4, 0, 0] } };
      }) }];
    return option;
  }

  function spendOption() {
    var points = CHARTS['cost-and-wall-clock'].points;
    var ports = CHARTS['cost-and-wall-clock'].ports;
    var stages = CHARTS['cost-and-wall-clock'].stages;
    var colours = palette();
    var option = common();
    option.legend = { top: 0, textStyle: { color: token('--fg-dim') } };
    option.xAxis = category(points.map(function (p) { return p.runId.slice(0, 8); }));
    option.yAxis = [measured('cents'), measured('seconds')];
    option.series = [];
    ports.forEach(function (port, i) {
      option.series.push({ type: 'bar', stack: 'cents', name: port.label, yAxisIndex: 0,
        itemStyle: { color: colours[i % colours.length] },
        data: points.map(function (p) { return p.cents[port.key] || 0; }) });
    });
    stages.forEach(function (stage, i) {
      option.series.push({ type: 'bar', stack: 'seconds', name: stage.label, yAxisIndex: 1,
        itemStyle: { color: colours[(i + 2) % colours.length], opacity: 0.55 },
        data: points.map(function (p) { return p.seconds[stage.key] || 0; }) });
    });
    return option;
  }

  function splitOption() {
    var points = CHARTS['run-seconds-and-cents'].points;
    var colours = palette();
    var option = common();
    option.legend = { top: 0, textStyle: { color: token('--fg-dim') } };
    option.grid = { left: 70, right: 24, top: 40, bottom: 30, containLabel: true };
    option.xAxis = { type: 'value', axisLabel: { color: token('--fg-dim') },
      splitLine: { lineStyle: { color: token('--line') } } };
    option.yAxis = category(['seconds', 'cents']);
    option.series = points.map(function (p, i) {
      var cell = p.measure === 'cents' ? [0, p.value] : [p.value, 0];
      return { type: 'bar', stack: p.measure, name: p.label + ' (' + p.measure + ')',
        itemStyle: { color: colours[i % colours.length] },
        label: { show: true, color: token('--fg'), formatter: function (one) {
          return one.value > 0 ? String(Math.round(one.value * 10) / 10) : '';
        } },
        data: cell };
    });
    return option;
  }

  var OPTIONS = {
    'where-reels-die': stagesOption,
    'scores-over-time': scoresOption,
    'group-subjects-in-shot': function () { return groupOption('group-subjects-in-shot'); },
    'group-picture-rule': function () { return groupOption('group-picture-rule'); },
    'group-plan-shots': function () { return groupOption('group-plan-shots'); },
    'group-world': function () { return groupOption('group-world'); },
    'cost-and-wall-clock': spendOption,
    'run-seconds-and-cents': splitOption
  };

  function drawAll() {
    var holders = document.querySelectorAll('[data-chart]');
    for (var i = 0; i < holders.length; i++) {
      var holder = holders[i];
      var name = holder.getAttribute('data-chart');
      if (!window.echarts) {
        holder.innerHTML = '<span class="standin">The drawing file is not here, so this chart is ' +
          'not drawn. Its numbers are in the table below.</span>';
        continue;
      }
      if (!drawn[name]) drawn[name] = window.echarts.init(holder, null, { renderer: 'canvas' });
      drawn[name].setOption(OPTIONS[name](), true);
    }
  }
  function redraw() {
    Object.keys(drawn).forEach(function (name) { drawn[name].resize(); });
  }

  // ------------------------------------------------------------ what a reader can move

  function showView(which) {
    var views = document.querySelectorAll('[data-view]');
    for (var i = 0; i < views.length; i++) {
      views[i].hidden = views[i].getAttribute('data-view') !== which;
    }
    var buttons = document.querySelectorAll('nav.views button');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute('aria-current',
        buttons[j].getAttribute('data-show') === which ? 'true' : 'false');
    }
    redraw();
  }
  document.querySelector('nav.views').addEventListener('click', function (event) {
    var button = event.target.closest('button[data-show]');
    if (button) showView(button.getAttribute('data-show'));
  });

  document.querySelector('.sizer').addEventListener('click', function (event) {
    var button = event.target.closest('button[data-height]');
    if (!button) return;
    document.documentElement.style.setProperty('--chart-h', button.getAttribute('data-height') + 'px');
    var wraps = document.querySelectorAll('.chartwrap');
    for (var i = 0; i < wraps.length; i++) wraps[i].style.height = '';
    var buttons = document.querySelectorAll('.sizer button');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute('aria-current', buttons[j] === button ? 'true' : 'false');
    }
    setTimeout(redraw, 0);
  });

  document.getElementById('theme').addEventListener('click', function () {
    var root = document.documentElement;
    root.setAttribute('data-theme', root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    drawAll();
  });

  // A drag handle on every chart is the wrapper's own resize corner; a ResizeObserver redraws it.
  if (window.ResizeObserver) {
    var watcher = new ResizeObserver(function () { redraw(); });
    var wraps = document.querySelectorAll('.chartwrap');
    for (var w = 0; w < wraps.length; w++) watcher.observe(wraps[w]);
  }

  // ------------------------------------------------------------ the ledger, and what is picked

  var picked = {};
  var ledger = document.getElementById('ledger-body');

  function filterLedger() {
    var world = document.getElementById('f-world').value;
    var ending = document.getElementById('f-ending').value;
    var brief = document.getElementById('f-brief').value;
    var made = document.getElementById('f-made').value;
    var query = document.getElementById('f-q').value.trim().toLowerCase();
    var rows = ledger.querySelectorAll('tr[data-run]');
    var shownCount = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var one = BY_ID[row.getAttribute('data-run')];
      var keep = (!world || one.worldId === world) &&
        (!ending || one.ending.status === ending) &&
        (!brief || one.briefKey === brief) &&
        (!made || (made === 'yes') === one.reel.madeAFile) &&
        (!query || row.textContent.toLowerCase().indexOf(query) !== -1);
      row.hidden = !keep;
      if (keep) shownCount++;
    }
    document.getElementById('ledger-count').textContent = shownCount + ' of ' + rows.length + ' runs';
  }
  ['f-world', 'f-ending', 'f-brief', 'f-made'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', filterLedger);
  });
  document.getElementById('f-q').addEventListener('input', filterLedger);
  document.getElementById('f-clear').addEventListener('click', function () {
    ['f-world', 'f-ending', 'f-brief', 'f-made'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
    document.getElementById('f-q').value = '';
    filterLedger();
  });

  ledger.addEventListener('change', function (event) {
    var box = event.target.closest('input[type=checkbox][data-pick]');
    if (!box) return;
    var id = box.getAttribute('data-pick');
    if (box.checked) picked[id] = true; else delete picked[id];
    var count = Object.keys(picked).length;
    document.getElementById('go-compare').disabled = count === 0;
    document.getElementById('nav-compare').textContent = count === 0 ? '' : ' ' + count;
    fillBoard();
  });
  document.getElementById('go-compare').addEventListener('click', function () { showView('compare'); });
  document.getElementById('cmp-clear').addEventListener('click', function () {
    picked = {};
    var boxes = ledger.querySelectorAll('input[type=checkbox][data-pick]');
    for (var i = 0; i < boxes.length; i++) boxes[i].checked = false;
    document.getElementById('go-compare').disabled = true;
    document.getElementById('nav-compare').textContent = '';
    fillBoard();
  });
  document.getElementById('cmp-differ').addEventListener('change', fillBoard);

  // ------------------------------------------------------------ the comparison board

  function fillBoard() {
    var ids = Object.keys(picked);
    var board = document.getElementById('board');
    var empty = document.getElementById('board-empty');
    empty.hidden = ids.length > 0;
    board.hidden = ids.length === 0;
    if (ids.length === 0) return;
    var onlyDiffer = document.getElementById('cmp-differ').checked;

    var head = document.getElementById('board-head');
    head.innerHTML = '<th class="figure-name">Figure</th>' + ids.map(function (id) {
      return '<th class="fig">' + id.slice(0, 8) + '</th>';
    }).join('');

    var rows = board.querySelectorAll('tr[data-key]');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var key = row.getAttribute('data-key');
      var aim = row.getAttribute('data-aim');
      var values = ids.map(function (id) { return at(BY_ID[id], key); });
      var numbers = values.filter(function (value) { return typeof value === 'number'; });
      var differs = values.some(function (value) {
        return JSON.stringify(value) !== JSON.stringify(values[0]);
      });
      var high = numbers.length > 1 ? Math.max.apply(null, numbers) : null;
      var low = numbers.length > 1 ? Math.min.apply(null, numbers) : null;
      var cells = values.map(function (value) {
        var tint = '';
        if (aim !== 'none' && typeof value === 'number' && high !== low) {
          if (value === (aim === 'high' ? high : low)) tint = ' tint-good';
          if (value === (aim === 'high' ? low : high)) tint = ' tint-critical';
        }
        return '<td class="fig' + tint + '">' + shown(value) + '</td>';
      }).join('');
      row.innerHTML = '<th class="figure-name">' + row.getAttribute('data-label') + '</th>' + cells;
      row.className = differs ? 'differs' : '';
      row.hidden = onlyDiffer && !differs;
    }
  }

  // ------------------------------------------------------------ the run view

  var picker = document.getElementById('r-pick');
  if (picker) {
    picker.addEventListener('change', function () {
      window.location.search = '?run=' + encodeURIComponent(picker.value);
    });
  }

  drawAll();
  filterLedger();
  fillBoard();
  showView(document.querySelector('nav.views button[aria-current=true]').getAttribute('data-show'));
})();
`
