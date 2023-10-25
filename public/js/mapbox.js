/*eslint-disable*/

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiYm90ZWdhIiwiYSI6ImNsazFzeXB1aTA3djUzY3BveG0yY3p3N3EifQ.ZjFN_mul01rt4IozNWXFWQ";

  var map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/botega/cll49wstt008r01p88jmb34qg",
    scrollZoom: true,

    // center: [-43.345637, -21.814538], // starting position [lng, lat]
    // zoom: 10,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement("div"); //creates a div in the document
    el.className = "marker"; //I already have a class in css script called "marker"

    // Add popup
    const popup = new mapboxgl.Popup({
      offset: 30,
    }).setText(`Day ${loc.day}: ${loc.description}`);

    // Add marker
    new mapboxgl.Marker({
      element: el, //DOM element to use as a marker. The default is a light blue, droplet-shaped SVG marker.
      anchor: "bottom", //A string indicating the part of the Marker that should be positioned closest to the coordinate set via Marker#setLngLat
    })
      .setLngLat(loc.coordinates)
      .setPopup(popup)
      .addTo(map);

    // Extends the map bounds to include the current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};

/*
// A simple line from origin to destination.
const origin = locations[0].coordinates;
const destination = locations[1].coordinates;
const route = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [origin, destination],
      },
    },
  ],
};

// A single point that animates along the route.
// Coordinates are initially set to origin.
const point = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: origin,
      },
    },
  ],
};

// Calculate the distance in kilometers between route start/end point.
const lineDistance = turf.length(route.features[0]);

const arc = [];

// Number of steps to use in the arc and animation, more steps means
// a smoother arc and animation, but too many steps will result in a
// low frame rate
const steps = 500;

// Draw an arc between the `origin` & `destination` of the two points
for (let i = 0; i < lineDistance; i += lineDistance / steps) {
  const segment = turf.along(route.features[0], i);
  arc.push(segment.geometry.coordinates);
}

// Update the route with calculated arc coordinates
route.features[0].geometry.coordinates = arc;

// Used to increment the value of the point measurement against the route.
let counter = 0;

// Add a source and layer displaying a point which will be animated in a circle.
map.addSource("route", {
  type: "geojson",
  data: route,
});

map.addSource("point", {
  type: "geojson",
  data: point,
});

map.addLayer({
  id: "route",
  source: "route",
  type: "line",
  paint: {
    "line-width": 2,
    "line-color": "#007cbf",
  },
});

map.addLayer({
  id: "point",
  source: "point",
  type: "symbol",
  layout: {
    // This icon is a part of the Mapbox Streets style.
    // To view all images available in a Mapbox style, open
    // the style in Mapbox Studio and click the "Images" tab.
    // To add a new image to the style at runtime see
    // https://docs.mapbox.com/mapbox-gl-js/example/add-image/
    "icon-image": "airport",
    "icon-size": 1.5,
    "icon-rotate": ["get", "bearing"],
    "icon-rotation-alignment": "map",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
});
let running = false;
function animate() {
  running = true;
  document.getElementById("replay").disabled = true;
  const start =
    route.features[0].geometry.coordinates[
      counter >= steps ? counter - 1 : counter
    ];
  const end =
    route.features[0].geometry.coordinates[
      counter >= steps ? counter : counter + 1
    ];
  if (!start || !end) {
    running = false;
    document.getElementById("replay").disabled = false;
    return;
  }
  // Update point geometry to a new position based on counter denoting
  // the index to access the arc
  point.features[0].geometry.coordinates =
    route.features[0].geometry.coordinates[counter];

  // Calculate the bearing to ensure the icon is rotated to match the route arc
  // The bearing is calculated between the current point and the next point, except
  // at the end of the arc, which uses the previous point and the current point
  point.features[0].properties.bearing = turf.bearing(
    turf.point(start),
    turf.point(end)
  );

  // Update the source with this new data
  map.getSource("point").setData(point);

  // Request the next frame of animation as long as the end has not been reached
  if (counter < steps) {
    requestAnimationFrame(animate);
  }

  counter = counter + 1;
}

document.getElementById("replay").addEventListener("click", () => {
  if (running) {
    void 0;
  } else {
    // Set the coordinates of the original point back to origin
    point.features[0].geometry.coordinates = origin;

    // Update the source layer
    map.getSource("point").setData(point);

    // Reset the counter
    counter = 0;

    // Restart the animation
    animate(counter);
  }
});

// Start the animation
animate(counter);
*/
