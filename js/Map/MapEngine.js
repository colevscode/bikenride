const GoogleMapsLoader = require('google-maps');

const MAX_MILES_BIKED = 20;

// These constants are all defined on the google instance
// I've duplicated them so that I don't need an instance 
// to access them.
const GENERIC_OK = "OK";
const TRAVEL_TRANSIT = "TRANSIT";
const TRAVEL_WALKING = "WALKING";
const TRAVEL_BIKING = "BICYCLING";
const TRANSIT_RAIL = "RAIL";
const UNITS_METRIC = 0;
const UNITS_IMPERIAL = 1; 
const SUITABLE_TRANSIT = [
  "RAIL",
  "METRO_RAIL",
  "SUBWAY",
  "TRAM",
  "MONORAIL",
  "HEAVY_RAIL",
  "COMMUTER_TRAIN",
  "HIGH_SPEED_TRAIN",
  "FERRY"
]

function _isSuitable(step) {
  return step.travel_mode === TRAVEL_TRANSIT &&
       SUITABLE_TRANSIT.indexOf(step.transit.line.vehicle.type) >= 0;
}

function _shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

class MapEngine {

  constructor() {
    GoogleMapsLoader.KEY = 'AIzaSyA_bj9GdczKiAbF0fS2o5yNzEMXgrCepeE';
    GoogleMapsLoader.LIBRARIES = ['geometry', 'places'];
  }

  _goog() {
    this._googleProm = this._googleProm || new Promise(resolve => {
      GoogleMapsLoader.load(g => resolve({
        mapService: g.maps,
        directionsDisplay: new g.maps.DirectionsRenderer(),
        directionsService: new g.maps.DirectionsService(),
        geocoderService: new g.maps.Geocoder(),
        distanceService: new g.maps.DistanceMatrixService(),
        placesService: null,
        map: null,
        markers: []
      }));
    });
    return this._googleProm;    
  }
  
  drawMap(DOMNode, address, zoom) {    
    let mapOptions = {
      center: {lat: 0, lng: 0},
      zoom: zoom
    };
    this._goog().then(g => {
      this._getLocation(address).then(result => {
        mapOptions.center = result;
        g.map = new g.mapService.Map(DOMNode, mapOptions);;
        g.directionsDisplay.setMap(g.map);
        g.placesService = new g.mapService.places.PlacesService(g.map);        
      });
    });
  }

  _compareRoutes(route1, route2) {
    return 0;
  }

  _displayRoute(route, request) {
    this._goog().then(g => 
      g.directionsDisplay.setDirections({routes:[route], request})
    );
  }

  _processRoutes(routeObj) {
    // let jobs = routes.map(this._convertRoute, this);
    // return Promise.all(jobs).then(results => {
    routeObj.routes.sort(this._compareRoutes);
    routeObj.routes = routeObj.routes.map((route, index) => {
      return {
        title: index === 0 ? "Bike Leg" : ("Transit Option "+(index+1)), 
        displayFn: () => this._displayRoute(route, routeObj.request)
      };
    });
    return routeObj;
  }

  _getRoutes(start, finish, mode, alternatives) {
    let request = {
      origin: start,
      destination: finish,
      travelMode: mode,
      provideRouteAlternatives: alternatives,
      transitOptions: { modes: [TRANSIT_RAIL] }      
    };
    return this._goog().then(g => 
      new Promise((resolve, reject) => {
        g.directionsService.route(request, (result, status) => {
          if (status == g.mapService.DirectionsStatus.OK) {
            resolve({routes: result.routes, request});
          } else {
            reject(status);
          }
        });
      })
    );
  }

  _getStations(finish, radius) {
    let radiusMeters = radius * 1609.34;
    let request = {
      location: finish,
      radius: radiusMeters,
      types: ['subway_station', 'train_station'],
      rankBy: "DISTANCE"
    };

    return this._goog().then(g => 
      new Promise((resolve, reject) => {
        g.placesService.radarSearch(request, (result, status) => {
          if (status == g.mapService.places.PlacesServiceStatus.OK) {
            resolve(result);
          } else {
            reject(status);
          }
        });
      })
    );
  }

  _getDistances(origins, destinations, travelMode) {
    let request = {
      origins,
      destinations,
      travelMode,
      unitSystem: UNITS_IMPERIAL,
      transitOptions: { modes: [TRANSIT_RAIL] }
    }
    return this._goog().then(g => 
      new Promise((resolve, reject) => {
        g.distanceService.getDistanceMatrix(request, (result, status) => {
          if (status == g.mapService.DistanceMatrixStatus.OK) {
            let distances = [];
            let rows = result.rows
            for (let r = 0; r < rows.length; r++) {
              for (let e = 0; e < rows[r].elements.length; e++) {
                let el = rows[r].elements[e];
                let i = distances.length;
                let value = el.status === GENERIC_OK ? {
                  duration: el.duration.text,
                  distance: el.distance.text,
                  location: origins.length > 1 ? origins[i] : destinations[i]
                } : null;
                distances.push(value);
              }
            }
            resolve(distances);
          } else {
            reject(status);
          }
        });
      })
    );
  }

  _getLocation(address) {
    return this._goog().then(g =>
      new Promise((resolve, reject) => {
        g.geocoderService.geocode( { 'address': address}, (results, status) => {
          if (status == g.mapService.GeocoderStatus.OK) {
            resolve(results[0].geometry.location);
          } else {
            reject(status);
          }
        });
      })
    );
  }

  _createMarker(options, circle=false, onClick=()=>{}, content=null) {
    if (!options.position) {
      options = {
        position: options
      }
    }
    return this._goog().then(g => {
      if (circle) {
        options.icon.path = g.mapService.SymbolPath.CIRCLE
      }
      let marker = new g.mapService.Marker(options);
      marker.setMap(g.map);
      g.markers.push(marker);
      g.mapService.event.addListener(marker, 'click', onClick);

      if (content) {
        let infowindow = new g.mapService.InfoWindow({
          content: content
        });
        let timeout = null;
        g.mapService.event.addListener(marker, 'mouseover', function() {
          infowindow.open(g.map, marker);
          if (timeout) {
            window.clearTimeout(timeout);
            timeout = null;
          }
        });
        g.mapService.event.addListener(marker, 'mouseout', function() {
          timeout = window.setTimeout(() => infowindow.close(), 200);
        });
      }
      return marker;
    });
  }

  _createRouteMarker(location, onClick, content=null) {
    let options = {
      position: location,
      icon: {
        fillColor: "red",
        scale: content ? 5 : 3,
        fillOpacity: 1,
        strokeOpacity: 0
      }
    };
    return this._createMarker(options, true, onClick, content);   
  }

  _setCenter(location) {
    return this._goog().then(g => g.map.panTo(location));
  }

  _clearMarkers() {
    return this._goog().then(g => {
      g.markers.map(marker => marker.setMap(null));
      g.markers = []
    });
  }

  _createHybridLabel(biking, transit) {
    if (transit && biking) {
      if (biking.location != transit.location) {
        console.log("Yikes! biking and transit points don't match");
      }
      const template = (label, val) =>
        `<div>${label}: ${val.distance} (${val.duration})</div>`;
      let content = template('biking', biking);
      content += template('transit', transit);
      return content;
    }
    return null;
  }

  _createHybridRoutes(start, mid, end) {
    let routePromises = [];
    let firstLegProm = this._getRoutes(start, mid, TRAVEL_TRANSIT, true);
    let lastLegProm = this._getRoutes(mid, end, TRAVEL_BIKING, false);
    return Promise.all([firstLegProm, lastLegProm]).then(results => {
      let returnVal = results.shift();
      let routes = returnVal.routes;
      let bikeRoute = results[0].routes[0];
      returnVal.routes.unshift(bikeRoute);
      return returnVal;
    });
  }

  _combineRoutes(route, leg) {
    route.legs.push(leg);
    return route;
  }

  _mkClickFn(start, waypoint, finish, clickHandler) {
    return () =>
      this._createHybridRoutes(start, waypoint, finish)
        .then(result => this._processRoutes(result))
        .then(result => {
          result.routes[0].displayFn();
          clickHandler(result.routes);
        });
  }

  calcRoute(start, finish, maxBike, clickHandler) {
    const transitOptions = {
      modes: [TRANSIT_RAIL]
    };

    const startLocProm = this._getLocation(start);
    const finishLocProm = this._getLocation(finish);

    const stationsProm = finishLocProm.then(loc => {
      this._clearMarkers();
      this._setCenter(loc);
      this._createMarker(loc);
      return this._getStations(loc, maxBike);
    }).then(stations => _shuffle(stations));

    const bikingProm = Promise.all([finishLocProm, stationsProm])
      .then(results => {
        const [loc, stations] = results;
        const origins = stations.slice(0, 25).map(s => s.geometry.location);
        return this._getDistances(origins, [loc], TRAVEL_BIKING);
      });

    const transitProm = Promise.all([startLocProm, stationsProm])
      .then(results => {
        const [loc, stations] = results;
        const dests = stations.slice(0, 25).map(s => s.geometry.location);
        return this._getDistances([loc], dests, TRAVEL_TRANSIT);
      });

    Promise.all([
      bikingProm, 
      transitProm, 
      stationsProm,
      startLocProm,
      finishLocProm
    ]).then(results => {
      const [biking, transit, stations, startLoc, finishLoc] = results;

      // make big labels for the first 25
      for (let i=0; i<biking.length; i++) {
        const label = this._createHybridLabel(biking[i], transit[i]);
        if (label) {
          const waypoint = biking[i].location;
          const onClick = this._mkClickFn(startLoc, waypoint, finishLoc, clickHandler);
          this._createRouteMarker(waypoint, onClick, label);
        }
      }

      // make simple markers for the rest
      stations.slice(25).map(place => {
        const waypoint = place.geometry.location;
        const onClick = this._mkClickFn(startLoc, waypoint, finishLoc, clickHandler);
        this._createRouteMarker(waypoint, onClick);
      });
    });
  }

}


module.exports = MapEngine