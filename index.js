function fetchLocal(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      resolve(JSON.parse(xhr.responseText));
    };
    xhr.onerror = function() {
      reject(new TypeError("Local request failed"));
    };
    xhr.open("GET", url);
    xhr.send(null);
  });
}

function renderPopup(layer) {
  var feature = layer.feature;
  var dates = feature.properties.dates;
  var lngLat = feature.geometry.coordinates;
  lngLat = lngLat.map(x => Math.round(x * 1000000) / 1000000);

  var exraidHTML = "";
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
}

var markers = L.markerClusterGroup({
  maxClusterRadius: () => {
    return currentFilter === "raids" ? 0 : 80;
  },
  disableClusteringAtZoom: 14,
  spiderfyOnMaxZoom: false
});
var map = L.map("map", {
  center: [1.358, 103.833],
  zoom: 12,
  minZoom: 10
});
var gyms;
var terrains = [];
var dates = [];
var currentFilter = "raids";

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors | <a href="https://github.com/xiankai/sg-pokemongo-ex-raid-map/issues/new">Leave comments here</a>'
}).addTo(map);

L.control.locate().addTo(map);

function addToMap(layer) {
  markers.clearLayers();
  markers
    .addLayer(layer)
    .bindPopup(renderPopup, { autoPanPaddingTopLeft: [100, 100] });
  map.addLayer(markers);
  return markers;
}

fetchLocal(
  "https://cdn.rawgit.com/xiankai/fc4260e305d1339756a3e1a02b495939/raw/03dd7315b0e18b795bdd64e1b551a4c7a9a660f7/all.geojson"
).then(data => {
  gyms = data;

  terrains = [].concat(
    ...gyms.features.map(feature => feature.properties.terrains)
  );
  terrains = terrains
    .filter((item, pos) => item && terrains.indexOf(item) === pos)
    .sort((a, b) => moment(b) - moment(a));

  dates = [].concat(...gyms.features.map(feature => feature.properties.dates));
  dates = dates
    .filter((item, pos) => item && dates.indexOf(item) === pos)
    .sort((a, b) => moment(b) - moment(a));
  dates.reverse();

  // show submenu at start
  $('#primary-group [value="raids"]').trigger("change");

  addToMap(
    L.geoJSON(gyms, {
      filter: feature =>
        feature.properties.dates && feature.properties.dates.length > 0
    })
  );
});

$("#primary-group").on("change", 'input[type="radio"]', function(e) {
  currentFilter = e.target.value;
  $("#secondary-group").empty();
  var defaultButton;
  switch (e.target.value) {
    case "raids":
      var key = "dates";
      defaultButton = "all";
      addToMap(
        L.geoJSON(gyms, {
          filter: feature =>
            feature.properties[key] && feature.properties[key].length > 0
        })
      );

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
          <input type="radio" name="${key}" id="all" value="${defaultButton}" checked>
          All
        </label>
      `);
      break;
    case "all":
      addToMap(L.geoJSON(gyms));
      break;
    case "parks":
      var key = "terrains";
      defaultButton = "2016-08-01";
      addToMap(
        L.geoJSON(gyms, {
          filter: function(feature) {
            return (
              feature.properties[key] &&
              feature.properties[key].indexOf(defaultButton) > -1
            );
          }
        })
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
  var key = $(this).prop("name");
  if (e.target.value === "all") {
    addToMap(
      L.geoJSON(gyms, {
        filter: feature =>
          feature.properties[key] && feature.properties[key].length > 0
      })
    );
  } else {
    addToMap(
      L.geoJSON(gyms, {
        filter: feature =>
          feature.properties[key] &&
          feature.properties[key].indexOf(e.target.value) > -1
      })
    );
  }
});
