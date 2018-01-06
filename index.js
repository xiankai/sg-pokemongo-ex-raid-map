const fetchLocal = url =>
  new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.onload = function() {
      resolve(JSON.parse(xhr.responseText));
    };
    xhr.onerror = function() {
      reject(new TypeError("Local request failed"));
    };
    xhr.open("GET", url);
    xhr.send(null);
  });

const renderPopup = layer => {
  const feature = layer.feature;
  const dates = feature.properties.dates;
  let lngLat = feature.geometry.coordinates;
  lngLat = lngLat.map(x => Math.round(x * 1000000) / 1000000);

  let exraidHTML = "";
  if (dates && dates.length > 0) {
    exraidHTML += "<div>EX-raids:<ul>";
    dates.forEach(function(date) {
      exraidHTML += "<li>" + moment(date).format("D MMM") + "</li>";
    });
    exraidHTML += "</ul></div>";
  } else {
    exraidHTML += "<div>No EX-raid yet</div>";
  }

  return `
    <strong>
    ${feature.properties.name}
    </strong>
    ${exraidHTML}
    <div>S2 Cell: ${feature.properties.s2Cell}</div>
    <br/>
    <div>
      <a target="_blank" href="
      https://www.google.com/maps/search/?api=1&query=${lngLat[1]},${lngLat[0]}
      ">
        Google Maps
      </a>
    </div>
    <br/>
    <div>
      <a target="_blank" href="
      https://sgpokemap.com/gym.html#${lngLat[1]},${lngLat[0]}
      ">
        SGPokemap
      </a>
    </div>
    `;
};

const markers = L.markerClusterGroup({
  maxClusterRadius: () => {
    return currentFilter === "raids" ? 0 : 80;
  },
  disableClusteringAtZoom: 14,
  spiderfyOnMaxZoom: false
});
const map = L.map("map", {
  center: [1.358, 103.833],
  zoom: 12,
  minZoom: 10
});
let gyms;
let s2;
let terrains = [];
let dates = [];
let currentFilter = "raids";
let s2TextLayer = L.geoJSON();
const s2PolygonLayer = L.geoJSON();
const s2LayerGroup = L.featureGroup([s2TextLayer, s2PolygonLayer]);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors | <a href="https://goo.gl/forms/jVQOTAdsE9KdGIe52" target="_blank">Missing raid location?</a>'
}).addTo(map);

L.control.locate().addTo(map);

const addToMap = (filter = () => true) => {
  const s2CellCount = {};
  let onEachFeature = () => {};
  const isS2Toggled = map.hasLayer(s2LayerGroup);
  if (isS2Toggled) {
    onEachFeature = feature => {
      if (s2CellCount[feature.properties.s2Cell]) {
        s2CellCount[feature.properties.s2Cell]++;
      } else {
        s2CellCount[feature.properties.s2Cell] = 1;
      }
    };
  }

  const layer = L.geoJSON(gyms, {
    filter,
    pointToLayer: (geoJsonPoint, latLng) =>
      L.marker(latLng, {
        opacity: isS2Toggled ? 0.7 : 1
      }),
    onEachFeature
  });

  if (isS2Toggled) {
    overlayS2Labels(s2CellCount);
  }

  markers.clearLayers();
  markers
    .addLayer(layer)
    .bindPopup(renderPopup, { autoPanPaddingTopLeft: [100, 100] });
  map.addLayer(markers);
  return markers;
};

const overlayS2Labels = s2CellCount => {
  const markers = s2.features.map(feature => {
    const s2Cell = feature.properties.order;
    const count = s2CellCount[s2Cell];
    return L.marker(feature.coordinates[0][3].reverse(), {
      icon: L.divIcon({
        className: "s2-label",
        html: count ? `${s2Cell} (${count})` : ""
      })
    });
  });

  s2LayerGroup.removeLayer(s2TextLayer);
  s2TextLayer = L.featureGroup(markers);
  s2LayerGroup.addLayer(s2TextLayer);
};

fetchLocal(
  "https://cdn.rawgit.com/xiankai/fc4260e305d1339756a3e1a02b495939/raw/2c81f0bb91e80cc14b8fe1fb9e14ba6cfd2a4500/all.geojson"
)
  .then(data => {
    gyms = data;

    terrains = [].concat(
      ...gyms.features.map(feature => feature.properties.terrains)
    );
    terrains = terrains
      .filter((item, pos) => item && terrains.indexOf(item) === pos)
      .sort((a, b) => moment(b) - moment(a));

    dates = [].concat(
      ...gyms.features.map(feature => feature.properties.dates)
    );
    dates = dates
      .filter((item, pos) => item && dates.indexOf(item) === pos)
      .sort((a, b) => moment(b) - moment(a));
    dates.reverse();

    // show submenu at start
    $('#primary-group [value="raids"]').trigger("change");

    return Promise.resolve();
  })
  .then(() =>
    fetchLocal(
      "https://cdn.rawgit.com/xiankai/0f2af25f0cd91d16cb59f846fa2bde36/raw/de48c7b21d497265f2254260bccd6cd464442139/S2.geojson"
    )
  )
  .then(data => {
    s2 = data;
    s2PolygonLayer.addData(data);

    L.control.layers(null, { "S2 L12": s2LayerGroup }).addTo(map);
  });

$("#primary-group").on("change", 'input[type="radio"]', function(e) {
  currentFilter = e.target.value;
  $("#secondary-group").empty();
  let defaultButton;
  let key;
  switch (e.target.value) {
    case "raids":
      key = "dates";
      defaultButton = dates[dates.length - 1];

      dates.forEach(date => {
        $("#secondary-group").prepend(`
          <label class="btn btn-secondary" for="${date}">
            <input type="radio" name="${key}" id="${date}" value="${date}">
            ${moment(date).format("D MMM")}
          </label>
        `);
      });

      // default
      $("#secondary-group").prepend(`
        <label class="btn btn-secondary" for="all">
          <input type="radio" name="${key}" id="all" value="all" checked>
          All
        </label>
      `);
      break;
    case "all":
      addToMap();
      break;
    case "parks":
      key = "terrains";
      defaultButton = "2016-08-01";
      addToMap(
        feature =>
          feature.properties[key] &&
          feature.properties[key].indexOf(defaultButton) > -1
      );

      // default
      $("#secondary-group").append(`
        <label class="btn btn-light" disabled>
          Map date
        </label>
      `);

      terrains.forEach(terrain => {
        $("#secondary-group").append(`
          <label class="btn btn-secondary" for="${terrain}">
            <input type="radio" name="${key}" id="${terrain}" value="${terrain}"
              ${terrain === defaultButton ? "checked" : ""}>
            ${moment(terrain).format("MMM YYYY")}
          </label>
        `);
      });
      break;
  }
  $('#secondary-group input[type="radio"]').button();
  $(`#secondary-group label[for="${defaultButton}"]`).button("toggle");
});

$("#secondary-group").on("change", 'input[type="radio"]', function(e) {
  const key = $(this).prop("name");
  if (e.target.value === "all") {
    addToMap(
      feature => feature.properties[key] && feature.properties[key].length > 0
    );
  } else {
    addToMap(
      feature =>
        feature.properties[key] &&
        feature.properties[key].indexOf(e.target.value) > -1
    );
  }
});
