// This sample uses the Place Autocomplete widget to allow the user to search
// for and select a place. The sample then displays an info window containing
// the place ID and other information about the place that the user has
// selected.
// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">
var currentPlace;
var map;
var currentList;
var markers = [];
var autocomplete;
var language = "en";
/*
    variables defined in js_variables.js:
     - styles for Google map styling
     - show_loading() and hide_loading() for loading gif visibility
     - styleItDark() styleItWhite() for altering dom style based on dark mode choice
*/

function initMap() {
  // Instanciate a map. For first visit, there is no search yet and as a result no center, thus we take passsed parameters (language / centerLocation)
  var center = { lat: -33.8688, lng: 151.2195 };
  var scripts = document.getElementsByTagName("script");
  var mapScript = scripts[4];
  language = mapScript.getAttribute("lang");
  var centerLocation = mapScript.getAttribute("centerLocation");
  switch (centerLocation) {
    case "algiers":
      center = { lat: 36.75, lng: 3.05 };
      break;
    case "paris":
      center = { lat: 48.85, lng: 2.35 };
      break;
    case "london":
      center = { lat: 51.5, lng: 0.12 };
      break;
    default:
      break;
  }

  if (currentList && currentList.features && currentList.features.length > 0) {
    const coordinates = currentList.features[0].geometry.coordinates;
    center = {
      lat: coordinates[1],
      lng: coordinates[0],
    };
  }

  if (!map) {
    map = new google.maps.Map(document.getElementById("map"), {
      center: center,
      zoom: 13,
    });
  } else {
    (function (m) {
      m.data.forEach(function (f) {
        m.data.remove(f);
      });
    })(map);
    google.maps.event.trigger(map, "resize");
  }

  // first time visit: map styling if night or regular
  var darkThemeSelected =
    localStorage.getItem("darkSwitch") !== null &&
    localStorage.getItem("darkSwitch") === "dark";
  darkThemeSelected ? styleItDark() : styleItWhite();

  // on toggle.
  google.maps.event.addDomListener(
    document.getElementById("darkSwitch"),
    "click",
    function () {
      var toggle =
        localStorage.getItem("darkSwitch") !== null &&
        localStorage.getItem("darkSwitch") === "dark";
      toggle ? styleItWhite() : styleItDark();
    }
  );

  // Populate current list of cities nearby on the map
  if (currentList && currentList.features && currentList.features.length > 0) {
    map.data.addGeoJson(currentList);
    clearMarkers();
    getMarkers();
    showMarkers();
    map.data.setStyle({
      strokeColor: "blue",
    });
    // Fit map size to its markers
    var bounds = new google.maps.LatLngBounds();
    map.data.forEach(function (feature) {
      feature.getGeometry().forEachLatLng(function (latlng) {
        bounds.extend(latlng);
      });
    });
    map.fitBounds(bounds);
    map.setCenter(center);
    // map.setZoom(20)
    console.log("showalert");
    showAlertsList(currentList);
  }

  // Create the autocompletion search bar
  var input = document.getElementById("pac-input");
  if (input == null) {
    const div = document.createElement("INPUT");
    div.id = "pac-input";
    div.className = "controls";
    div.type = "text";
    div.placeholder = "Enter a location";
    document.body.appendChild(div);
    input = document.getElementById("pac-input");
  }
  if (!autocomplete) {
    autocomplete = new google.maps.places.Autocomplete(
      input,
      autocompleteOptions
    );
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);
    autocomplete.bindTo("bounds", map);
    // Specify just the place data fields that you need.
    autocomplete.setFields(["place_id", "geometry", "name"]);
  }

  var infowindow = new google.maps.InfoWindow();
  var infowindowContent = document.getElementById("infowindow-content");
  const infowindowContentPrime = infowindowContent.cloneNode(true);
  infowindow.setContent(infowindowContent);
  const marker = new google.maps.Marker({
    map: map,
    animation: google.maps.Animation.DROP,
  });
  var latestClicked = "";
  // marker.onclick action: populate the city marker clicked on the HTML cards (renderForecastDays)
  if (markers && markers.length > 0) {
    markers.forEach((marker) => {
      marker.addListener("click", () => {
        console.log(marker.title);
        // Do not render again when the same marker is clicked !
        if (latestClicked === marker.title) {
          return;
        } else {
          latestClicked = marker.title;
        }
        infowindowContentPrime.getElementsByClassName("title")[0].innerHTML =
          marker.title;
        infowindow.close();
        infowindow.setContent(infowindowContentPrime);
        infowindow.open(map, marker);
        toggleBounce();
        if (
          currentList &&
          currentList.features &&
          currentList.features.length > 0
        ) {
          document.getElementById("location").innerHTML = marker.title; // currentList.features[0].properties.name;
          cityWeather = currentList.weather.filter((item) => {
            return item.cityName === marker.title;
          })[0];
          cityPollution = currentList.pollution.filter((item) => {
            return item.cityName === marker.title;
          })[0];
          renderForecastDays(cityWeather.daily);
          renderPollution(cityPollution);
        }
      });
      function toggleBounce() {
        if (marker.getAnimation() !== null) {
          marker.setAnimation(null);
        } else {
          markers.forEach((marker_) => {
            marker_.setAnimation(null);
          });
          marker.setAnimation(google.maps.Animation.BOUNCE);
        }
      }
    });
  }

  // A possible second search (although not well managed and buggy, now)
  autocomplete.addListener("place_changed", () => {
    infowindow.close();
    const place = autocomplete.getPlace();

    if (!place.geometry) return;

    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      // map.setZoom(20)
    }

    // Set the position of the marker using the place ID and location.
    marker.setPlace({
      placeId: place.place_id,
      location: place.geometry.location,
    });
    marker.setVisible(false);
    infowindowContent.children.namedItem("place-name").textContent = place.name;
    // infowindowContent.children.namedItem("place-id").textContent =
    //     place.place_id;
    infowindowContent.children.namedItem("place-address").textContent =
      place.formatted_address;
    // infowindow.open(map, marker);
    currentPlace = place;
    getPicture(place.name);
    nearbyRequest(place)
      .then(function (data) {
        currentList = data;
        setWithExpiry("response_" + place.name, currentList);
        document.getElementById("location").innerHTML =
          currentList.features[0].properties.name;
        renderForecastDays(currentList.weather[0].daily);
        initMap();
        // generateWidgetLink();
        hide_loading(); // Unblock page
      })
      .catch(function (err) {
        console.log(err);
      });
    console.log("Show alert second");
    //showAlertsList(currentList);
  });

  var panButton = document.getElementsByClassName(
    "custom-map-control-button"
  )[0];
  if (panButton) {
    return;
  }
  var infoWindow = new google.maps.InfoWindow();
  const locationButton = document.createElement("button");
  locationButton.textContent = "Go to Current Location";
  locationButton.classList.add("custom-map-control-button");
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(locationButton);
  locationButton.addEventListener("click", () => {
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          infoWindow.setPosition(pos);
          infoWindow.setContent("Location found.");
          infoWindow.open(map);
          map.setCenter(pos);
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
  });

  // Populate current list of cities on a floating HTML panel on the map
  console.log("Show alert ");
  showAlertsList(currentList);
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
  infoWindow.open(map);
}

// Look for weather cached data for today (local user time) for the city, if not found
// create an AJAX request for one place; This is called once the user search for a city.
// "nearby/" is the main API in back-end
async function nearbyRequest(place) {
  return new Promise(function (resolve, reject) {
    show_loading(); // Block page while loading
    var cache = getWithExpiry("response_" + place.name);
    if (cache && cache.length > 0) {
      currentList = cache;
      document.getElementById("location").innerHTML =
        currentList.features[0].properties.name;
      renderForecastDays(currentList.weather[0].daily);
      initMap();
      // generateWidgetLink();
      hide_loading(); // Unblock page
      return;
    }

    grecaptcha.ready(function () {
      grecaptcha
        .execute("6LePZnQaAAAAACdKiEKOMZapuQLaP7BsulHobPQn", {
          action: "submit",
        })
        .then(function (token) {
          // Add your logic to submit to your backend server here.
          const request = new XMLHttpRequest();
          const requestObject = JSON.stringify({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            cityname: place.name,
            language: language,
            token: token,
          });

          request.open("GET", "nearby/" + requestObject);
          request.responseType = "json";
          request.onload = function () {
            if (request.status >= 200 && request.status < 300) {
              resolve(request.response.data);
            } else {
              reject({
                status: this.status,
                message: request.statusText,
              });
            }

            // currentList = request.response.data;
            // setWithExpiry("response_" + place.name, currentList);
            // document.getElementById("location").innerHTML =
            //   currentList.features[0].properties.name;
            // renderForecastDays(currentList.weather[0].daily);
            // initMap();
            // // generateWidgetLink();
            // hide_loading(); // Unblock page
          };
          request.onerror = function () {
            reject({
              status: this.status,
              message: request.statusText,
            });
          };

          request.send();
        });
    });
  });
}

/*Alert panel starts*/

// Creates an HTML panel which is a list of current cities
function showAlertsList(currentList) {
  if (!currentList || currentList.length === 0) {
    return;
  }

  const cityNames = currentList.weather.map((elem) => {
    return elem.cityName;
  });

  const alerts = currentList.weather
    .map((elem, idx) => {
      return elem.alerts
        ? { city: cityNames[idx], alert: elem.alerts[0] }
        : undefined;
    })
    .filter((elem) => {
      return elem;
    });

  //   let panel = document.createElement('ul')
  //   // If the panel already exists, use it. Else, create it and add to the page.
  //   if (document.getElementById('panel')) {
  //     panel = document.getElementById('panel')
  //     // panel.style = "overflow: scroll;"
  //     // If panel is already open, close it
  //     if (panel.classList.contains('open')) {
  //       panel.classList.remove('open')
  //     }
  //   } else {
  //     panel.setAttribute('id', 'panel')
  //     const body = document.body
  //     body.insertBefore(panel, body.childNodes[0])
  //   }
  //   map.controls[google.maps.ControlPosition.BOTTOM_LEFT].clear()
  //   map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(panel)

  var alertModal = document.querySelector("#weatherAlertModal");
  const body = alertModal.querySelector("#alertDataContainer");

  if (alerts.length > 0 && alerts) {
    if (body.hasChildNodes) {
      //clear previous alerts
      while (body.lastChild) {
        body.removeChild(body.lastChild);
      }
    }
    //   if (!alerts || alerts.length === 0) {
    //     panel.style.display = "none";
    //     return;
    //   }
    //panel.style.display = "block";
    //   alerts.forEach((alert) => {
    //     // Add alert details with text formatting
    //     const name = document.createElement("li");
    //     name.classList.add("alert");
    //     name.textContent = alert.city;
    //     panel.appendChild(name);
    //     const alertContent = document.createElement("p");
    //     alertContent.classList.add("alertContent");
    //     alertContent.textContent = alert.alert.event;
    //     panel.appendChild(alertContent);
    //   });

    alerts.forEach((alert) => {
      let city = document.createElement("h3"); //create heading 5 with city name
      city.textContent = alert.city;
      body.appendChild(city);
      let event = document.createElement("h5");
      event.textContent = alert.alert.event;
      event.classList.add("text-muted");
      body.appendChild(event);
      let alertData = document.createElement("p");
      alertData.textContent = alert.alert.description;
      body.appendChild(alertData); //display the alert data
      body.appendChild(document.createElement("hr")); //add separator
    });

    $("#weatherAlertModal").modal();
  }
}

/* Alert Panel code ends*/

// Creates and Updates the HTML list of cards which is a list of weather information for one city in a week
function renderForecastDays(dailies) {
  dailies.sort(function (first, second) {
    return second.dt - first.dt;
  });
  var weekdayNames = getWeekDayNames(language);
  document.getElementById("forecast-items").innerHTML = "";
  document.body.style.backgroundImage = `url(http://openweathermap.org/img/wn/${
    dailies[dailies.length - 1].weather[0].icon || "na"
  }.png), linear-gradient(to bottom, #82addb 0%,#ebb2b1 100%)`;
  document.documentElement.style.backgroundImage = `url(http://openweathermap.org/img/wn/${
    dailies[dailies.length - 1].weather[0].icon || "na"
  }.png), linear-gradient(rgb(235, 178, 177) 0%, rgb(130, 173, 219) 100%)`;
  const maxTemp = Math.max(
    ...dailies.map((item) => {
      return item.temp.max;
    })
  );

  dailies.forEach(function (period) {
    const d = new Date(0);
    d.setUTCSeconds(period.dt);
    const ISODate = d.toISOString().slice(0, 10);
    const dayName = weekdayNames[d.getDay()]; // new Date(period.dateTimeISO).getDay()
    const iconSrc = `http://openweathermap.org/img/wn/${
      period.weather[0].icon || "na"
    }@4x.png`;
    const maxTempF = period.temp.max || "N/A";
    const minTempF = period.temp.min || "N/A";
    const weather = period.weather[0].description || "N/A";
    const hue = (1.0 - maxTempF / maxTemp) * 240;
    let hueColor = `hsl( ${hue} , 90%, 80%)`;

    hueColor = "; background-color: " + hueColor;
    const template = `
          <div class="col-6 col-md-3 d-flex my-2">
            <div class="card w-100 h-100" style="${hueColor}">
                <div class="card-body">
                    <h4 class="card-title text-center">${dayName}</h4>
                    <h5 class="card-title text-center">${ISODate}</h5>
                    <p><img class="card-img mx-auto d-block" style="max-width: 100px;" src="${iconSrc}"></p>
                    <h6 class="card-title text-center">${weather}</h6>
                    <p class="card-text text-center">High: ${maxTempF} <br />Low: ${minTempF}</p>
                </div>
            </div>
          </div>
        `;
    document
      .getElementById("forecast-items")
      .insertAdjacentHTML("afterbegin", template);
  });
}

function renderPollution(pollution) {
  let aqiInterpretation;
  switch (language) {
    case "en":
      aqiInterpretation = {
        1: "Air Quality: Good",
        2: "Air Quality: Fair",
        3: "Air Quality: Moderate",
        4: "Air Quality: Poor",
        5: "Air Quality: Very Poor",
      };
      break;
    case "ar":
      aqiInterpretation = {
        1: "جودة الهواء: جيدة",
        2: "جودة الهواء: مقبولة",
        3: "جودة الهواء: متوسطة",
        4: "جودة الهواء: ضعيفة",
        5: "جودة الهواء: ضعيفة جدا",
      };
      break;
    default:
      break;
  }

  const aqi = pollution.list[0].main.aqi;
  const d = new Date(0);
  d.setUTCSeconds(pollution.list[0].dt);
  const ISODate = d.toISOString().slice(0, 10);
  const { co, no, no2 } = pollution.list[0].components;
  const theme = {
    1: "#4C5273",
    2: "#F2E96B",
    3: "#F2CA50",
    4: "#F2A03D",
    5: "#A67041",
  };
  const aqiColor = "; background-color: " + theme[aqi];
  let coo = 1;
  const template = `
        <div class="card" style="width: 20%${aqiColor}">
          <table style="width:100%">
            <tr>
              <th style= 'background-color: #4C5273; font-size: xx-small'>${aqiInterpretation[
                coo++
              ]
                .split(":")[1]
                .trim()}</th>
              <th style= 'background-color: #F2E96B; font-size: xx-small'>${aqiInterpretation[
                coo++
              ]
                .split(":")[1]
                .trim()}</th>
              <th style= 'background-color: #F2CA50; font-size: xx-small'>${aqiInterpretation[
                coo++
              ]
                .split(":")[1]
                .trim()}</th>
              <th style= 'background-color: #F2A03D; font-size: xx-small'>${aqiInterpretation[
                coo++
              ]
                .split(":")[1]
                .trim()}</th>
              <th style= 'background-color: #A67041; font-size: xx-small'>${aqiInterpretation[
                coo++
              ]
                .split(":")[1]
                .trim()}</th>
            </tr>
          </table> 
          <div class="card-body">
              <h4 class="card-title text-center">${aqiInterpretation[aqi]}</h4>
              <h5 class="card-title text-center">${ISODate}</h5>
              <p class="card-text text-center">CO: ${co} </p>
              <p class="card-text text-center">NO: ${no} </p>
              <p class="card-text text-center">NO2: ${no2} </p>
          </div>
        </div>
    `;

  document
    .getElementById("forecast-items")
    .insertAdjacentHTML("afterbegin", template);
}

function getWeekDayNames(language) {
  switch (language) {
    case "en":
      return [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
    case "ar":
      return [
        "الأحد",
        "الإثنين",
        "الثلثاء",
        "الأربعاء",
        "الخميس",
        "الجمعة",
        "السبت",
      ];
    default:
      return [];
  }
}

// #getMarkers, #setMapOnAll, #clearMarkers, #showMarkers are helpers to refresh markers.
// Detach old features then attach new markers to map
function getMarkers() {
  if (!currentList) {
    return;
  }
  const coordinates = currentList.features[0].geometry.coordinates;
  center = {
    lat: coordinates[1],
    lng: coordinates[0],
  };
  var bounds = new google.maps.LatLngBounds();

  var idx = 0;
  var markersIcons = {};
  markersIcons[0] = "blue";
  markersIcons[1] = "purple";
  markersIcons[2] = "green";
  markersIcons[3] = "yellow";
  markersIcons[4] = "red";

  var maxTemp = Math.max(
    ...currentList.weather.map((item) => {
      return item.daily[0].temp.max;
    })
  );
  map.data.forEach(function (feature) {
    // if (feature.getGeometry().getType() === 'Polygon') {
    //     feature.getGeometry().forEachLatLng(function(latlng) {
    //         bounds.extend(latlng);
    //     });
    // } else
    if (feature.getGeometry().getType() === "Point") {
      var todayTemp = currentList.weather[idx++].daily[0].temp.max;
      var scale = Math.round((todayTemp / maxTemp) * 5) - 1;
      var LatLng = feature.getGeometry().get();
      var marker = new google.maps.Marker({
        position: LatLng,
        map: map,
        animation: google.maps.Animation.DROP,
        title: feature.name,
      });
      scale === -1 ? scale++ : scale;
      scale === 5 ? scale-- : scale;
      marker.setIcon(
        `http://maps.google.com/mapfiles/ms/icons/${markersIcons[scale]}-dot.png`
      );
      markers.push(marker);
      // remove previous markers from map.data
      map.data.remove(feature);
    }
  });
}
// Sets the map on all markers in the array.
function setMapOnAll(map) {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}
// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setVisible(false);
  }
  setMapOnAll(null);
  markers = [];
}
// Shows any markers currently in the array.
function showMarkers() {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setVisible(true);
  }
  setMapOnAll(map);
}

// Generates a link with cityid for searched city (not surrounding ones). The link opens "openweatherwidget" which is an openweathermap "widget"
// function generateWidgetLink () {
//   if (currentList) {
//     document.getElementById('widget').href = 'openweatherwidget.html?cityid=' + currentList.features[0].cityid
//     $('#widget').toggleClass('disabled active')
//   }
// }

function getPicture(place) {
  var cache = myStorage.getItem(place);
  if (cache) {
    cache = JSON.parse(cache);
    document.getElementById("imgGrid").innerHTML = "";
    for (var i = 0; i < cache.photos.length; i++) {
      document.getElementById(
        "imgGrid"
      ).innerHTML += `<div class="featured_pictures">
          <img src="${cache.photos[i]}" alt="${cache.names[i]}" />
        </div>`;
    }
    return;
  }
  var service = new google.maps.places.PlacesService(map);
  var request = {
    location: map.getCenter(),
    radius: "3000",
    query: place,
    type: ["park"], //, 'mosque', 'airport', 'amusement_park', 'art_gallery', 'casino', 'church', 'museum', 'park', 'synagogue', 'tourist_attraction', 'university']
  };
  service.nearbySearch(request, callback);
  // Checks that the PlacesServiceStatus is OK, and adds a marker
  // using the place ID and location from the PlacesService.
  function callback(results, status) {
    document.getElementById("imgGrid").innerHTML = "";
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      var photos = results
        .map((elem) => {
          return elem.photos ? elem.photos[0].getUrl() : undefined;
        })
        .filter((elem) => {
          return elem;
        });
      var names = results.map((elem) => {
        return elem.name;
      });
      if (!photos.length) {
        return;
      }
      myStorage.setItem(
        place,
        JSON.stringify({ photos: photos, names: names })
      );
      for (var i = 0; i < photos.length; i++) {
        document.getElementById("imgGrid").innerHTML +=
          '<div class="featured_pictures"><img src="' +
          photos[i] +
          '" alt="' +
          names[i] +
          '" /></div>';
      }
    }
  }
}
var today = new Date().toDateString();
document.getElementById("date").innerHTML = today;
