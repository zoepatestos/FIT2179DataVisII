// Vega-Lite embed options applied to every chart
const EMBED_OPT = {
  renderer: "svg",
  actions: false,
  theme: "none"
};

// Define the gradient (starts at top left, ends at bottom right)



// Load a spec from vega/ and embed into the given DOM id
function embed(domId, specFile) {
  const el = document.getElementById(domId);
  if (!el) return;
  vegaEmbed(`#${domId}`, `vega/${specFile}`, EMBED_OPT).catch(err => {
    console.warn(`Could not load ${specFile}:`, err);
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.color = "#8a7e76";
    el.style.fontSize = "0.82rem";
    el.textContent = `Data not yet loaded for ${specFile}`;
  });
}




function drawBrushStroke(ctx, xLeft, xRight, yCentre) {

  let gradient = ctx.createLinearGradient(0, 0, 200, 200);

// Add your colors (replacing your original '#fec93e' base)
  gradient.addColorStop(0, '#fecf57');
  gradient.addColorStop(1, '#feb703'); 

// Apply it to the stroke
  const w = xRight - xLeft;
  ctx.save();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 3;

  ctx.beginPath();
  // Bezier wobble: control points nudge slightly up/down
  ctx.moveTo(xLeft, yCentre);
  ctx.bezierCurveTo(
    xLeft + w * 0.3, yCentre - 2,
    xLeft + w * 0.7, yCentre + 2,
    xRight, yCentre
  );
  ctx.stroke();

  // Highlight streak (semi-transparent, thinner)
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(xLeft + 4, yCentre - 2);
  ctx.bezierCurveTo(
    xLeft + w * 0.3, yCentre - 4,
    xLeft + w * 0.7, yCentre - 3,
    xRight - 4, yCentre - 2
  );
  ctx.stroke();
  ctx.restore();
}

function drawPaintbrush(ctx, cx, cy) {
  ctx.save();
  // Handle
  ctx.fillStyle = '#B8A99A';
  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 0.8;
  roundRect(ctx, cx, cy - 6, 14, 12, 2);
  ctx.fill(); ctx.stroke();

  // Ferrule (metal band)
  ctx.fillStyle = '#888';
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 0.5;
  roundRect(ctx, cx + 14, cy - 7, 5, 14, 1);
  ctx.fill(); ctx.stroke();

  // Bristles (teardrop pointing right)
  ctx.fillStyle = '#857d82';
  ctx.beginPath();
  ctx.moveTo(cx + 19, cy - 7);
  ctx.bezierCurveTo(cx + 28, cy - 6, cx + 32, cy - 2, cx + 30, cy);
  ctx.bezierCurveTo(cx + 32, cy + 2, cx + 28, cy + 6, cx + 19, cy + 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Paintbrush PNG (preloaded once for Chart 5 overlay) ──
var brushImg = new Image();
brushImg.src = "images/paintbrush.png";

function whenBrushReady(cb) {
  if (brushImg.complete && brushImg.naturalWidth) cb();
  else brushImg.addEventListener("load", cb, { once: true });
}

// Replaces the canvas-drawn drawPaintbrush(). Anchors the bristle (right side
// of the PNG) at x, so the brush "head" sits at the end of each painted line
// and the handle trails leftward over the brushstroke.
function drawPaintbrushImage(ctx, x, y, height) {
  if (!brushImg.naturalWidth) return;
  var aspect   = brushImg.naturalWidth / brushImg.naturalHeight;
  var width    = height * aspect;
  var overhang = 4;                          // bristles peek a few px past the bar end
  ctx.save();
  ctx.globalAlpha = 0.92;                    // soften the solid-black silhouette
  ctx.drawImage(brushImg, x - width + overhang, y - height / 2, width, height);
  ctx.restore();
}

// ── Act I — map with custom PNG legend ───────────────────
(function () {
  var el = document.getElementById("map-galleries");
  if (!el) return;

  vegaEmbed("#map-galleries", "vega/map_galleries_dot.json", EMBED_OPT)
    .then(function (result) {
      var view  = result.view;
      var items = document.querySelectorAll("#map-legend .legend-item");

      items.forEach(function (item) {
        item.addEventListener("click", function () {
          var clickedType = item.dataset.type;
          var current     = view.signal("active_type");

          // Toggle: clicking the active filter resets to "all"
          var next = (current === clickedType) ? "all" : clickedType;
          view.signal("active_type", next).run();

          // Sync legend visual state
          items.forEach(function (li) {
            if (next === "all" || li.dataset.type === next) {
              li.classList.remove("legend-dim");
            } else {
              li.classList.add("legend-dim");
            }
          });
        });
      });
    })
    .catch(function (err) {
      console.warn("map_galleries_dot.json failed:", err);
      el.style.cssText = "display:flex;align-items:center;justify-content:center;color:#8a7e76;font-size:.82rem;";
      el.textContent   = "Map could not load — check the browser console.";
    });
}());

embed("bar-venues-state",  "bar_venues_state.json");
embed("bar-venue-types",   "bar_venue_types.json");

// ── Art material imports globe (category + view-angle legends) ──
(function () {
  var el = document.getElementById("imports_globe");
  if (!el) return;

  // Helper: wire an exclusive button group to a named Vega signal
  function wireGroup(selector, signalName, dataAttr, view) {
    var items = document.querySelectorAll(selector);
    items.forEach(function (item) {
      item.addEventListener("click", function () {
        view.signal(signalName, item.dataset[dataAttr]).run();
        items.forEach(function (li) {
          li.classList.remove("legend-active");
          li.classList.add("legend-dim");
        });
        item.classList.remove("legend-dim");
        item.classList.add("legend-active");
      });
    });
  }

  vegaEmbed("#imports_globe", "vega/map_imports_globe.json", EMBED_OPT)
    .then(function (result) {
      var view = result.view;

      // Exclusive button groups
      wireGroup("#imports-legend   .legend-item", "category_selection", "category", view);
      wireGroup("#viewangle-legend .legend-item", "view_angle",         "angle",    view);

      // Year slider + "All years" button (the latter sends the string "All")
      var slider     = document.getElementById("year-slider");
      var display    = document.getElementById("year-display");
      var allYearsBtn = document.getElementById("globe-all-years");

      if (slider) {
        slider.addEventListener("input", function () {
          var yr = parseInt(slider.value, 10);
          view.signal("year_selection", yr).run();
          if (display) display.textContent = yr;
          if (allYearsBtn) allYearsBtn.classList.remove("year-btn--active");
        });
      }
      if (allYearsBtn) {
        allYearsBtn.addEventListener("click", function () {
          view.signal("year_selection", "All").run();
          if (display) display.textContent = "All";
          allYearsBtn.classList.add("year-btn--active");
        });
      }
    })
    .catch(function (err) {
      console.warn("map_imports_globe.json failed:", err);
      el.style.cssText = "display:flex;align-items:center;justify-content:center;color:#8a7e76;font-size:.82rem;";
      el.textContent   = "Globe could not load — check the browser console.";
    });
}());

// ── Act III — revenue + profit area chart + funding "paint-fill" small multiples ─────
embed("area-revenue-profit", "area_revenue_profit.json");
embed("funding-paint",       "custom_funding_chart.vl.json");

// ── Act I — Chart 2 — streamgraph of major arts organisations ──
embed("rose-market-share", "stacked_column_chart_market_share.vl.json");

// ── Act I — Chart 3 — galleries per 100k residents, small multiples ──
embed("bubble-per-capita", "bubble_galleries_per_capita.json");

// ── Act II — Chart 5 — paintbrush lollipop/barchart (canvas overlay over Vega bars) ──
vegaEmbed("#bar-employment", "vega/bar_employment.json", {
  renderer: "canvas",   // must be canvas, not svg
  actions: false
}).then(result => {
  const view = result.view;

  view.runAsync().then(() => {
    const container  = document.getElementById("bar-employment");
    const vegaCanvas = container.querySelector("canvas");
    if (!vegaCanvas) { console.warn("No canvas found in #bar-employment"); return; }

    // ── Find the dataset that carries the .employed field ──
    let data = null;
    for (const name of ["source_0", "data_0", "data_1", "data_2"]) {
      try {
        const d = view.data(name);
        if (d && d.length && d[0].employed != null) { data = d; break; }
      } catch (e) {}
    }
    if (!data) {
      console.warn("bar-employment: no dataset with .employed found. Available:",
        Object.keys(view._runtime.data || {}));
      return;
    }

    // ── Overlay canvas (sits on top of the transparent Vega bars) ──
    const overlay = document.createElement("canvas");
    overlay.style.position      = "absolute";
    overlay.style.left          = "0";
    overlay.style.top           = "0";
    overlay.style.pointerEvents = "none";
    container.style.position    = "relative";
    container.appendChild(overlay);
    const ctx = overlay.getContext("2d");

    // Because width:"container" makes Vega re-layout (and re-scale) whenever the
    // container resizes, we must re-read the scales and redraw the overlay each
    // time the Vega canvas changes size — otherwise the strokes freeze at the
    // first (often pre-layout, near-zero-width) scale and collapse into stubs.
    function render() {
      const dpr  = window.devicePixelRatio || 1;
      const cssW = vegaCanvas.getBoundingClientRect().width;
      const cssH = vegaCanvas.getBoundingClientRect().height;
      if (!cssW || !cssH) return;

      // Match the overlay to the current Vega canvas size (DPR-correct).
      overlay.width        = cssW * dpr;
      overlay.height       = cssH * dpr;
      overlay.style.width  = cssW + "px";
      overlay.style.height = cssH + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // Re-read scales + origin at the CURRENT layout. view.origin() returns
      // [x, y] of the plot's top-left corner (padding + y-axis gutter), so the
      // strokes begin exactly where the cartesian plane starts.
      const xScale   = view.scale("x");
      const yScale   = view.scale("y");
      const [ox, oy] = view.origin();
      const brushReady = brushImg.complete && brushImg.naturalWidth > 0;

      data.forEach(row => {
        const xZero   = ox + xScale(700);  // start a little past zero so the brush head doesn't obscure the axis
        const xRight  = ox + xScale(row.employed);
        const yCentre = oy + yScale(row.occupation) + yScale.bandwidth() / 2;
        drawBrushStroke(ctx, xZero, xRight, yCentre);
        if (brushReady) drawPaintbrushImage(ctx, xRight, yCentre-3, 20);
      });
    }

    render();
    if (!(brushImg.complete && brushImg.naturalWidth > 0)) {
      brushImg.addEventListener("load", render, { once: true });
    }
    // Redraw on any Vega re-layout (responsive container resizes).
    new ResizeObserver(render).observe(vegaCanvas);
  });
});

embed("bar-salary", "bar_salary.json");

// Charts 2 & 3 — enrolments bar (chart 2) wired to universities map (chart 3)
(function () {
  var barEl = document.getElementById("bar-enrolments-faculty");
  var mapEl = document.getElementById("map-universities");
  if (!barEl || !mapEl) return;

  Promise.all([
    vegaEmbed("#bar-enrolments-faculty", "vega/bar_enrolments_faculty.json", EMBED_OPT),
    vegaEmbed("#map-universities",       "vega/map_universities.json",       EMBED_OPT)
  ]).then(function (results) {
    var barView = results[0].view;
    var mapView = results[1].view;

    // ── Horizontal year slider + "All years" button ──
    var yrSlider = document.getElementById("enrol-year-slider");
    var yrOut    = document.getElementById("enrol-year-output");
    var yrAll    = document.getElementById("enrol-year-all");

    function setYear(value, viaAllBtn) {
      barView.signal("year_selection", value).run();
      if (viaAllBtn) {
        yrAll.classList.add("year-btn--active");
        yrOut.textContent = "All";
      } else {
        yrAll.classList.remove("year-btn--active");
        yrOut.textContent = value;
      }
    }

    if (yrSlider) {
      yrSlider.addEventListener("input", function () {
        setYear(yrSlider.value, false);
      });
    }
    if (yrAll) {
      yrAll.addEventListener("click", function () {
        setYear("All", true);
      });
    }

    // ── Map click → barView.signal("selected_university") ──
    var pill   = document.getElementById("enrol-uni-filter");
    var label  = document.getElementById("enrol-uni-label");
    var clear  = document.getElementById("enrol-uni-clear");

    function applyUni(name) {
      barView.signal("selected_university", name || "All").run();
      if (name && name !== "All") {
        label.textContent = name;
        pill.hidden = false;
      } else {
        pill.hidden = true;
      }
    }

    mapView.addEventListener("click", function (event, item) {
      if (item && item.datum && item.datum.institution) {
        applyUni(item.datum.institution);
      }
    });

    clear.addEventListener("click", function () {
      // Clear the map's point selection AND reset the bar
      mapView.signal("uni_select_tuple", null).runAsync();
      applyUni("All");
    });

  }).catch(function (err) {
    console.warn("Act II charts failed:", err);
  });
}());

// ── Act III — Money ──────────────────────────────────────
embed("line-funding",         "line_funding.json");
embed("bar-ticket-revenue",   "bar_ticket_revenue.json");
embed("bar-import-commodity", "bar_import_commodity.json");
