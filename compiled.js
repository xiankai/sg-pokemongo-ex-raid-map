"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function fetchLocal(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(JSON.parse(xhr.responseText));
    };
    xhr.onerror = function () {
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
  lngLat = lngLat.map(function (x) {
    return Math.round(x * 1000000) / 1000000;
  });

  var exraidHTML = "";
  if (dates && dates.length > 0) {
    exraidHTML += "<div>EX-raids:<ul>";
    dates.forEach(function (date) {
      exraidHTML += "<li>" + moment(date).format("D MMM") + "</li>";
    });
    exraidHTML += "</ul></div>";
  } else {
    exraidHTML += "<div>No EX-raid yet</div>";
  }

  return "\n    <strong>\n    " + feature.properties.name + "\n    </strong>\n    " + exraidHTML + "\n    <div>S2 Cell: " + feature.properties.s2Cell + "</div>\n    <br/>\n    <div>\n      <a target=\"_blank\" href=\"\n      https://www.google.com/maps/search/?api=1&query=" + lngLat[1] + "," + lngLat[0] + "\n      \">\n        Google Maps\n      </a>\n    </div>\n    <br/>\n    <div>\n      <a target=\"_blank\" href=\"\n      https://sgpokemap.com/gym.html#" + lngLat[1] + "," + lngLat[0] + "\n      \">\n        SGPokemap\n      </a>\n    </div>\n    ";
}

var markers = L.markerClusterGroup({
  maxClusterRadius: function maxClusterRadius() {
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
  attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors | <a href="https://goo.gl/forms/jVQOTAdsE9KdGIe52" target="_blank">Missing raid location?</a>'
}).addTo(map);

L.control.locate().addTo(map);

L.Control.S2 = L.Control.extend({
  onAdd: function onAdd() {
    return $("\n      <div class=\"leaflet-bar leaflet-control-s2\">\n        <a>S2</a>\n      </div>\n    ").get(0);
  }
});

function addToMap(layer) {
  markers.clearLayers();
  markers.addLayer(layer).bindPopup(renderPopup, { autoPanPaddingTopLeft: [100, 100] });
  map.addLayer(markers);
  return markers;
}

fetchLocal("https://cdn.rawgit.com/xiankai/fc4260e305d1339756a3e1a02b495939/raw/3378ac114ea737c9c1acc74c6b2e23b13b5640a3/all.geojson").then(function (data) {
  var _ref, _ref2;

  gyms = data;

  terrains = (_ref = []).concat.apply(_ref, _toConsumableArray(gyms.features.map(function (feature) {
    return feature.properties.terrains;
  })));
  terrains = terrains.filter(function (item, pos) {
    return item && terrains.indexOf(item) === pos;
  }).sort(function (a, b) {
    return moment(b) - moment(a);
  });

  dates = (_ref2 = []).concat.apply(_ref2, _toConsumableArray(gyms.features.map(function (feature) {
    return feature.properties.dates;
  })));
  dates = dates.filter(function (item, pos) {
    return item && dates.indexOf(item) === pos;
  }).sort(function (a, b) {
    return moment(b) - moment(a);
  });
  dates.reverse();

  // show submenu at start
  $('#primary-group [value="raids"]').trigger("change");

  addToMap(L.geoJSON(gyms, {
    filter: function filter(feature) {
      return feature.properties.dates && feature.properties.dates.length > 0;
    }
  }));

  fetchLocal("https://cdn.rawgit.com/xiankai/0f2af25f0cd91d16cb59f846fa2bde36/raw/de48c7b21d497265f2254260bccd6cd464442139/S2.geojson").then(function (data) {
    var s2Layer = L.geoJSON(data, {});
    L.control.layers(null, {
      "S2 L12": s2Layer
    }).addTo(map);
  });
});

$("#primary-group").on("change", 'input[type="radio"]', function (e) {
  currentFilter = e.target.value;
  $("#secondary-group").empty();
  var defaultButton;
  switch (e.target.value) {
    case "raids":
      var key = "dates";
      defaultButton = "all";
      addToMap(L.geoJSON(gyms, {
        filter: function filter(feature) {
          return feature.properties[key] && feature.properties[key].length > 0;
        }
      }));

      dates.forEach(function (date) {
        $("#secondary-group").prepend("\n          <label class=\"btn btn-secondary\" for=\"" + date + "\">\n            <input type=\"radio\" name=\"" + key + "\" id=\"" + date + "\" value=\"" + date + "\">\n            " + moment(date).format("D MMM") + "\n          </label>\n        ");
      });

      // default
      $("#secondary-group").prepend("\n        <label class=\"btn btn-secondary\" for=\"all\">\n          <input type=\"radio\" name=\"" + key + "\" id=\"all\" value=\"" + defaultButton + "\" checked>\n          All\n        </label>\n      ");
      break;
    case "all":
      addToMap(L.geoJSON(gyms));
      break;
    case "parks":
      var key = "terrains";
      defaultButton = "2016-08-01";
      addToMap(L.geoJSON(gyms, {
        filter: function filter(feature) {
          return feature.properties[key] && feature.properties[key].indexOf(defaultButton) > -1;
        }
      }));

      // default
      $("#secondary-group").append("\n        <label class=\"btn btn-light\" disabled>\n          Map date\n        </label>\n      ");

      terrains.forEach(function (terrain) {
        $("#secondary-group").append("\n          <label class=\"btn btn-secondary\" for=\"" + terrain + "\">\n            <input type=\"radio\" name=\"" + key + "\" id=\"" + terrain + "\" value=\"" + terrain + "\"\n              " + (terrain === defaultButton ? "checked" : "") + ">\n            " + moment(terrain).format("MMM YYYY") + "\n          </label>\n        ");
      });
      break;
  }
  $('#secondary-group input[type="radio"]').button();
  $("#secondary-group label[for=\"" + defaultButton + "\"]").button("toggle");
});

$("#secondary-group").on("change", 'input[type="radio"]', function (e) {
  var key = $(this).prop("name");
  if (e.target.value === "all") {
    addToMap(L.geoJSON(gyms, {
      filter: function filter(feature) {
        return feature.properties[key] && feature.properties[key].length > 0;
      }
    }));
  } else {
    addToMap(L.geoJSON(gyms, {
      filter: function filter(feature) {
        return feature.properties[key] && feature.properties[key].indexOf(e.target.value) > -1;
      }
    }));
  }
});
