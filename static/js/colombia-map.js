/* =====================================================================
   colombia-map.js -- Mapa coropletico interactivo - Observatorio LP
   Dependencias: Leaflet.js (cargado en el HTML via CDN)
   ===================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. GeoJSON simplificado de departamentos de Colombia
        Poligonos rectangulares centrados en cada departamento.
        DEPT_NAME coincide con los valores del Excel (tildes UTF-8).
     ------------------------------------------------------------------ */
  var DEPTS = [
    ['ANTIOQUIA',          -75.5, 6.7,   3.5, 2.8],
    ['CALDAS',             -75.2, 5.3,   1.0, 0.8],
    ['RISARALDA',          -75.8, 5.0,   0.9, 0.7],
    ['QUIND\u00cdO',       -75.7, 4.5,   0.6, 0.5],
    ['CUNDINAMARCA',       -74.0, 4.8,   2.5, 2.0],
    ['BOYAC\u00c1',        -73.4, 5.6,   2.8, 2.5],
    ['SANTANDER',          -73.0, 6.8,   2.5, 2.5],
    ['NORTE DE SANTANDER', -72.5, 7.7,   2.0, 2.0],
    ['TOLIMA',             -75.2, 3.8,   2.0, 2.0],
    ['HUILA',              -75.3, 2.2,   2.0, 2.5],
    ['NARI\u00d1O',        -77.2, 1.2,   2.5, 2.5],
    ['CAUCA',              -76.5, 2.3,   2.2, 2.5],
    ['VALLE',              -76.5, 3.8,   1.8, 2.5],
    ['C\u00d3RDOBA',       -75.6, 8.3,   2.0, 2.0],
    ['CHOC\u00d3',         -76.8, 6.0,   1.5, 3.5],
    ['ATL\u00c1NTICO',     -74.9, 10.7,  1.0, 0.8],
    ['BOL\u00cdVAR',       -75.0, 8.8,   2.5, 3.0],
    ['MAGDALENA',          -74.3, 10.3,  2.3, 2.5],
    ['CESAR',              -73.5, 9.7,   2.2, 2.5],
    ['GUAJIRA',            -72.5, 11.3,  2.0, 1.8],
    ['SUCRE',              -75.4, 9.2,   1.2, 1.2],
    ['CASANARE',           -71.5, 5.4,   2.5, 2.5],
    ['ARAUCA',             -71.0, 6.8,   2.5, 1.5],
    ['META',               -73.0, 3.5,   3.5, 4.0],
    ['VICHADA',            -69.5, 4.5,   4.0, 4.0],
    ['AMAZONAS',           -71.5, -2.0,  5.0, 4.5],
    ['CAQUET\u00c1',       -74.0, 0.5,   3.5, 3.5],
    ['PUTUMAYO',           -76.0, 0.0,   2.5, 2.0],
    ['GUAIN\u00cdA',       -68.5, 2.5,   4.0, 4.0],
    ['VAUP\u00c9S',        -70.5, 0.5,   4.0, 4.0],
    ['GUAVIARE',           -72.5, 2.0,   3.5, 3.0],
    ['SAN ANDR\u00c9S',    -81.7, 12.5,  0.3, 0.3]
  ];

  var COLOMBIA_GEOJSON = {
    type: 'FeatureCollection',
    features: DEPTS.map(function(d) {
      var name = d[0], lon = d[1], lat = d[2], dw = d[3], dh = d[4];
      return {
        type: 'Feature',
        properties: { DEPT_NAME: name },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lon - dw/2, lat - dh/2],
            [lon + dw/2, lat - dh/2],
            [lon + dw/2, lat + dh/2],
            [lon - dw/2, lat + dh/2],
            [lon - dw/2, lat - dh/2]
          ]]
        }
      };
    })
  };

  function normDept(name) {
    var normalized = (name || '').trim().toUpperCase();
    var aliases = {
      'VALLE DEL CAUCA': 'VALLE',
      'LA GUAJIRA': 'GUAJIRA',
      'SAN ANDRES Y PROVIDENCIA': 'SAN ANDRÉS',
      'SAN ANDRÉS Y PROVIDENCIA': 'SAN ANDRÉS',
      'BOGOTA': 'BOGOTÁ'
    };
    return aliases[normalized] || normalized;
  }

  /* ------------------------------------------------------------------
     2. Paleta de colores por intensidad
     ------------------------------------------------------------------ */
  var PALETTE = ['#fef0d9','#fdd49e','#fdbb84','#fc8d59','#e34a33','#b30000'];

  function getColor(value, max) {
    if (!value || max === 0) return '#e8ede6';
    var ratio = value / max;
    if (ratio < 0.05) return PALETTE[0];
    if (ratio < 0.15) return PALETTE[1];
    if (ratio < 0.30) return PALETTE[2];
    if (ratio < 0.50) return PALETTE[3];
    if (ratio < 0.75) return PALETTE[4];
    return PALETTE[5];
  }

  /* ------------------------------------------------------------------
     3. Estado del mapa
     ------------------------------------------------------------------ */
  var mapInstance  = null;
  var geojsonLayer = null;
  var currentData  = {};
  var currentMax   = 0;
  var currentTotal = 0;
  var currentDeptTotals = {};
  var currentMapTotal = 0;
  var countryBounds = null;

  function initMap() {
    var container = document.getElementById('colombia-map-container');
    if (!container || mapInstance) return;

    mapInstance = L.map('colombia-map-container', {
      center: [4.5, -74.3],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false
    });

    buildLegend();
    fetch('/static/data-colombia.geojson')
      .then(function(response) {
        if (!response.ok) throw new Error('No se pudo cargar la geometría del mapa');
        return response.json();
      })
      .then(function(geojson) {
        var features = (geojson.features || []).filter(function(feature) {
          var props = feature.properties || {};
          return props.adm0_a3 === 'COL' || props.iso_a2 === 'CO' || props.admin === 'Colombia';
        });
        geojsonLayer = L.geoJSON({ type: 'FeatureCollection', features: features }, {
          style: defaultStyle,
          onEachFeature: bindFeatureEvents
        }).addTo(mapInstance);
        countryBounds = geojsonLayer.getBounds();
        mapInstance.fitBounds(countryBounds, { padding: [12, 12] });
        loadMapData();
      })
      .catch(function(error) {
        console.warn('map geometry error:', error);
        geojsonLayer = L.geoJSON(COLOMBIA_GEOJSON, {
          style: defaultStyle,
          onEachFeature: bindFeatureEvents
        }).addTo(mapInstance);
        countryBounds = geojsonLayer.getBounds();
        mapInstance.fitBounds(countryBounds, { padding: [12, 12] });
        loadMapData();
      });
  }

  function defaultStyle(feature) {
    var properties = feature.properties || {};
    var name = normDept(properties.DEPT_NAME || properties.name || properties.name_en || properties.gn_name);
    var value = currentData[name] || 0;
    return {
      fillColor: getColor(value, currentMax),
      weight: 1,
      opacity: 0.9,
      color: '#1a2420',
      fillOpacity: 0.82
    };
  }

  /* ------------------------------------------------------------------
     4. Tooltip interactivo
     ------------------------------------------------------------------ */
  function getTooltip() {
    return document.getElementById('map-tooltip');
  }

  function featureName(feature) {
    var properties = feature.properties || {};
    return normDept(properties.DEPT_NAME || properties.name || properties.name_en || properties.gn_name);
  }

  function bindFeatureEvents(feature, layer) {
    layer.on({
      mousemove: onFeatureMouseMove,
      mouseout:  onFeatureMouseOut,
      click:     onFeatureClick
    });
  }

  function onFeatureMouseMove(e) {
    var name  = featureName(e.target.feature);
    var value = currentDeptTotals[name] || 0;
    var pct   = currentMapTotal > 0 ? ((value / currentMapTotal) * 100).toFixed(1) : '0.0';
    var tip   = getTooltip();
    if (tip) {
      tip.style.display = 'block';
      tip.style.left    = (e.originalEvent.offsetX + 14) + 'px';
      tip.style.top     = (e.originalEvent.offsetY + 10) + 'px';
      tip.innerHTML     =
        '<strong>' + titleCase(name) + '</strong>' +
        '<span>' + value.toLocaleString('es-CO') + ' v\u00edctimas</span>' +
        '<small>' + pct + '% del total sin filtrar por departamento</small>';
    }
    e.target.setStyle({ weight: 2.5, color: '#c9ed57', fillOpacity: 0.95 });
    e.target.bringToFront();
  }

  function onFeatureMouseOut(e) {
    var tip = getTooltip();
    if (tip) tip.style.display = 'none';
    geojsonLayer.resetStyle(e.target);
  }

  function onFeatureClick(e) {
    var name = featureName(e.target.feature);
    var sel  = document.getElementById('map-filter-dept');
    if (sel) {
      sel.value = (sel.value === name) ? '' : name;
      zoomToSelectedDepartment(sel.value);
      applyFilters();
    }
  }

  function zoomToSelectedDepartment(name) {
    if (!mapInstance || !geojsonLayer) return;
    if (!name) {
      if (countryBounds) mapInstance.fitBounds(countryBounds, { padding: [12, 12], animate: true });
      return;
    }
    geojsonLayer.eachLayer(function(layer) {
      if (featureName(layer.feature) === name) {
        mapInstance.fitBounds(layer.getBounds(), { padding: [48, 48], maxZoom: 8, animate: true });
        layer.setStyle({ weight: 3, color: '#c9ed57', fillOpacity: 1 });
        layer.bringToFront();
      }
    });
  }

  /* ------------------------------------------------------------------
     5. Actualizar visualizacion
     ------------------------------------------------------------------ */
  function refreshLayer() {
    if (!geojsonLayer) return;
    geojsonLayer.setStyle(defaultStyle);
    var el = document.getElementById('map-total-counter');
    if (el) el.textContent = currentTotal.toLocaleString('es-CO');
  }

  /* ------------------------------------------------------------------
     6. Leyenda del mapa
     ------------------------------------------------------------------ */
  function buildLegend() {
    var container = document.getElementById('map-legend');
    if (!container) return;
    var labels = ['Muy bajo','Bajo','Moderado','Alto','Muy alto','Cr\u00edtico'];
    var html = '';
    for (var i = 0; i < PALETTE.length; i++) {
      html += '<span class="legend-swatch" style="background:' + PALETTE[i] + '"></span>' + labels[i] + '&nbsp;&nbsp;';
    }
    html += '<span class="legend-swatch" style="background:#e8ede6"></span>Sin datos';
    container.innerHTML = html;
  }

  /* ------------------------------------------------------------------
     7. Carga de datos desde /api/mapa/
     ------------------------------------------------------------------ */
  function buildQueryString() {
    var params = new URLSearchParams();
    var fields = ['year','month','region','dept','sex','age'];
    var ids    = ['map-filter-year','map-filter-month','map-filter-region',
                  'map-filter-dept','map-filter-sex','map-filter-age'];
    for (var i = 0; i < fields.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.value) params.set(fields[i], el.value);
    }
    var query = params.toString();
    var url = new URL(window.location.href);
    ['year','month','region','dept','sex','age'].forEach(function(field) { url.searchParams.delete(field); });
    params.forEach(function(value, key) { if (value) url.searchParams.set(key, value); });
    window.history.replaceState({}, '', url);
    return query;
  }

  function updateActiveFilters() {
    var target = document.getElementById('map-active-filters');
    if (!target) return;
    var actions = document.querySelector('.map-filter-group:last-child');
    if (actions) actions.scrollLeft = 0;
    var labels = ['Año', 'Mes', 'Región', 'Departamento', 'Sexo', 'Edad'];
    var ids = ['map-filter-year','map-filter-month','map-filter-region','map-filter-dept','map-filter-sex','map-filter-age'];
    var active = [];
    ids.forEach(function(id, index) {
      var select = document.getElementById(id);
      if (select && select.value) active.push(labels[index] + ': ' + select.options[select.selectedIndex].text);
    });
    target.textContent = active.length ? active.join(' · ') : 'Vista nacional · sin filtros activos';
  }

  function loadMapData() {
    var qs      = buildQueryString();
    var url     = '/api/mapa/' + (qs ? '?' + qs : '');
    var spinner = document.getElementById('map-loading');
    if (spinner) spinner.style.display = 'flex';

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        currentData = {};
        var selectedTotals = data.dept_totals || {};
        var mapTotals = data.map_dept_totals || selectedTotals;
        currentDeptTotals = {};
        Object.keys(selectedTotals).forEach(function(k) {
          currentData[normDept(k)] = selectedTotals[k];
        });
        Object.keys(mapTotals).forEach(function(k) {
          currentDeptTotals[normDept(k)] = mapTotals[k];
        });
        var vals = Object.values(currentData);
        currentMax   = vals.length ? Math.max.apply(null, vals) : 1;
        currentTotal = data.total || 0;
        currentMapTotal = data.map_total || data.total || 0;
        refreshLayer();
        renderDeptTable(data.dept_totals || {});
        renderMapReading(data.dept_totals || {});
        populateSelects(data.filters || {});
        zoomToSelectedDepartment(document.getElementById('map-filter-dept')?.value || '');
      })
      .catch(function(err) { console.warn('map_api error:', err); })
      .finally(function() {
        if (spinner) spinner.style.display = 'none';
      });
  }

  /* ------------------------------------------------------------------
     8. Poblar selectores de filtros
     ------------------------------------------------------------------ */
  function populateSelects(filters) {
    populateSelect('map-filter-year',   filters.years   || [], function(y) { return {value:y, label:y}; });
    populateSelect('map-filter-month',  filters.months  || [], function(m) { return {value:m.num, label:m.name}; });
    populateSelect('map-filter-region', filters.regions || [], function(r) { return {value:r, label:titleCase(r)}; });
    populateSelect('map-filter-dept',   filters.depts   || [], function(d) { return {value:d, label:titleCase(d)}; });
    populateSelect('map-filter-sex',    filters.genders || [], function(g) { return {value:g, label:titleCase(g)}; });
    populateSelect('map-filter-age',    filters.ages    || [], function(a) { return {value:a, label:titleCase(a)}; });
  }

  function defaultSelectText(id) {
    var labels = {
      'map-filter-year': 'Todos los años',
      'map-filter-month': 'Todos los meses',
      'map-filter-region': 'Todas las regiones',
      'map-filter-dept': 'Todos los departamentos',
      'map-filter-sex': 'Todos',
      'map-filter-age': 'Todos los grupos'
    };
    return labels[id] || 'Seleccione una opción';
  }

  function populateSelect(id, items, mapper) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var fieldMap = {
      'map-filter-year': 'year', 'map-filter-month': 'month', 'map-filter-region': 'region',
      'map-filter-dept': 'dept', 'map-filter-sex': 'sex', 'map-filter-age': 'age'
    };
    var selectedValue = sel.value || new URLSearchParams(window.location.search).get(fieldMap[id]) || '';
    sel.innerHTML = '<option value="">' + defaultSelectText(id) + '</option>';
    items.forEach(function(item) {
      var mapped = mapper(item);
      var opt = document.createElement('option');
      opt.value = mapped.value;
      opt.textContent = mapped.label;
      sel.appendChild(opt);
    });
    if (selectedValue && Array.prototype.some.call(sel.options, function(option) {
      return option.value === selectedValue;
    })) {
      sel.value = selectedValue;
    } else {
      sel.value = '';
    }
  }

  /* ------------------------------------------------------------------
     9. Tabla ranking por departamento
     ------------------------------------------------------------------ */
  function renderDeptTable(deptTotals) {
    var tbody = document.getElementById('dept-table-body');
    if (!tbody) return;
    var entries = Object.entries(deptTotals)
      .sort(function(a, b) { return b[1] - a[1]; })
      .slice(0, 33);
    if (!entries.length) {
      tbody.innerHTML = '<tr class="dept-ranking-empty"><td colspan="5">No hay departamentos para estos filtros.</td></tr>';
      return;
    }
    var total  = entries.reduce(function(s, e) { return s + e[1]; }, 0);
    var maxVal = entries.length ? entries[0][1] : 1;

    tbody.innerHTML = entries.map(function(entry, i) {
      var dept  = entry[0];
      var value = entry[1];
      var pct   = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
      var bar   = Math.round((value / maxVal) * 100);
      return '<tr>' +
        '<td><span class="rank-badge">' + (i + 1) + '</span></td>' +
        '<td>' + titleCase(dept) + '</td>' +
        '<td class="value-cell">' + value.toLocaleString('es-CO') + '</td>' +
        '<td class="pct-cell">' + pct + '%</td>' +
        '<td class="bar-cell"><div class="mini-bar" style="width:' + bar + '%"></div></td>' +
        '</tr>';
    }).join('');
  }

  function renderMapReading(deptTotals) {
    var target = document.getElementById('map-reading');
    if (!target) return;
    var entries = Object.entries(deptTotals).sort(function(a, b) { return b[1] - a[1]; });
    if (!entries.length) {
      target.textContent = 'No hay registros para esta combinación de filtros.';
      return;
    }
    var leader = entries[0];
    target.textContent = 'Lectura automática: ' + titleCase(leader[0]) + ' lidera la selección con ' + leader[1].toLocaleString('es-CO') + ' víctimas; el mapa muestra ' + currentTotal.toLocaleString('es-CO') + ' en total.';
  }

  /* ------------------------------------------------------------------
     10. Control de filtros
     ------------------------------------------------------------------ */
  function applyFilters() { updateActiveFilters(); loadMapData(); }

  function resetFilters() {
    ['map-filter-year','map-filter-month','map-filter-region',
     'map-filter-dept','map-filter-sex','map-filter-age'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    if (countryBounds && mapInstance) mapInstance.fitBounds(countryBounds, { padding: [12, 12], animate: true });
    loadMapData();
    updateActiveFilters();
  }

  function exportDeptCsv() {
    var rows = ['Departamento,Victimas'];
    Object.entries(currentDeptTotals).sort(function(a, b) { return b[1] - a[1]; }).forEach(function(entry) {
      rows.push('"' + entry[0].replace(/"/g, '""') + '",' + entry[1]);
    });
    var blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    var link = document.createElement('a');
    link.download = 'ranking-departamentos-filtrado.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function exportMapPng() {
    var target = document.querySelector('.map-section');
    if (!target || !window.html2canvas) return;
    var previousCenter = mapInstance ? mapInstance.getCenter() : null;
    var previousZoom = mapInstance ? mapInstance.getZoom() : null;
    var button = document.getElementById('map-image-btn');
    if (button) { button.disabled = true; button.textContent = 'Generando PNG...'; }
    try {
      if (mapInstance && countryBounds) {
        mapInstance.fitBounds(countryBounds, { padding: [80, 80], maxZoom: 5, animate: false });
        mapInstance.invalidateSize(false);
        await new Promise(function(resolve) { setTimeout(resolve, 350); });
      }
      var canvas = await html2canvas(target, { backgroundColor: '#17211f', scale: 2, useCORS: true, logging: false });
      var link = document.createElement('a');
      link.download = 'informe-territorial-filtrado.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      if (mapInstance && previousCenter && previousZoom !== null) {
        mapInstance.setView(previousCenter, previousZoom, { animate: false });
      }
      if (button) { button.disabled = false; button.textContent = '▧ Descargar PNG'; }
    }
  }

  function titleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s)\S/g, function(c) { return c.toUpperCase(); });
  }

  /* ------------------------------------------------------------------
     11. Arranque: init Leaflet cuando la seccion sea visible
     ------------------------------------------------------------------ */
  function bootstrap() {
    ['map-filter-year','map-filter-month','map-filter-region',
     'map-filter-dept','map-filter-sex','map-filter-age'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', applyFilters);
    });

    var resetBtn = document.getElementById('map-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    var exportBtn = document.getElementById('map-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportDeptCsv);
    var imageBtn = document.getElementById('map-image-btn');
    if (imageBtn) imageBtn.addEventListener('click', exportMapPng);
    updateActiveFilters();

    var section = document.getElementById('mapa-colombia');
    if (!section) return;

    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        initMap();
      }
    }, { threshold: 0.1 });
    observer.observe(section);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();
