// Vega-Lite embed options applied to every chart
const EMBED_OPT = {
  renderer: "svg",
  actions: false,
  theme: "none"
};

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

// ── Act II — Education and Occupations ──────────────────────
// Chart 4 — simple occupations bar chart
embed("bar-occupations", "bar_occupations.json");

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
