// import * as helpers from "./helpers";
// 0 /////////////////////////////////////////////////////////////////////////////////////
const dotenv = require('dotenv');
dotenv.config();
console.log(`Your port is ${process.env.NODE_PORT}`); // 8626
const express = require('express');
const helmet = require("helmet");
const axios = require('axios');
const redis = require('redis');
const nearbyCities = require("nearby-cities");
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
const rateLimit = require("express-rate-limit");
// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
// app.set('trust proxy', 1);
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30 // limit each IP to 100 requests per windowMs
});
//  apply to all requests
app.use(limiter);
const nodePort = process.env.NODE_PORT;
const redisPort = process.env.REDIS_PORT;
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

app.listen(nodePort, () => {
    console.log(`Server running on port ${nodePort}`);
});
app.use(express.static(__dirname + "/"));
app.use(express.static(__dirname + "/", {
    etag: true, // Just being explicit about the default.
    lastModified: true,  // Just being explicit about the default.
    setHeaders: (res, path) => {
        const hashRegExp = new RegExp('\\.[0-9a-f]{8}\\.');

        if (path.endsWith('.html')) {
            // All of the project's HTML files end in .html
            res.setHeader('Cache-Control', 'no-cache');
        } else if (hashRegExp.test(path)) {
            // If the RegExp matched, then we have a versioned URL.
            res.setHeader('Cache-Control', 'max-age=31536000');
        }
    },
}));
app.get('/ar/', (req, res) => {
    res.redirect("/index_ar.html");
});
app.get('/weather_map_view/', (req, res) => {
    res.redirect("/Weather_map_view.html");
});
// make a connection to the local instance of redis
const client = redis.createClient(redisPort);
client.on("error", (error) => {
    console.error(error);
});



// 1 /////////////////////////////////////////////////////////////////////////////////////
// const fs = require('fs');
// let rawdata = fs.readFileSync('city.list.min.json');
// let citiesIds = JSON.parse(rawdata);
function getCityId(coord) {
    // return undefined;
    toPrecision = x => Number.parseFloat(x).toPrecision(3)
    coord.lon = toPrecision(coord.lon);
    coord.lat = toPrecision(coord.lat);
    onecity = citiesIds.filter((item) => {
        lon = toPrecision(item.coord.lon);
        lat = toPrecision(item.coord.lat);
        return lon == coord.lon && lat == coord.lat;
    })[0]
    if (onecity) {
        return onecity.id;
    } else {
        console.log("getCityId called: \n city not found :(");
        return undefined;
    }
}

// 2 /////////////////////////////////////////////////////////////////////////////////////
// get data from openweathermap API 
var language = "en";
async function fetchWeather(city) {
    return new Promise(async (resolve, reject) => {
        API_Url_weather = `https://api.openweathermap.org/data/2.5/onecall?lat=${city["lat"]}&lon=${city["lon"]}&lang=${language}&exclude=hourly,minutely,hourly&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
        const body0 = await axios.get(API_Url_weather);
        const data0 = await body0.data;
        API_Url_pollution = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${city["lat"]}&lon=${city["lon"]}&appid=${OPENWEATHERMAP_API_KEY}`;
        const body1 = await axios.get(API_Url_pollution);
        const data1 = await body1.data;
        resolve({ weather: data0, pollution: data1 });
    });
}

// 3 /////////////////////////////////////////////////////////////////////////////////////
app.get('/nearby/:city', (req, res) => {
    try {
        if (!req.params.city) {
            return res.status(400).send({
                error: true,
                message: 'Bad request',
                data: 'Bad request'
            })
        }

        var geometry = JSON.parse(req.params.city);
        var cityname = geometry.cityname;
        language = geometry.language;

        // Check the redis store for the data first
        client.get(cityname, async (err, result) => {
            // redis unexpected errors
            if (err) {
                console.error(err);
                return res.status(500).send({
                    error: true,
                    message: 'Server error',
                    data: 'Server error'
                })
            }
            if (result) {
                return res.status(200).send({
                    error: false,
                    message: `Weather data for nearby cities for ${cityname} from the cache`,
                    data: JSON.parse(result)
                })
            } else {
                const query = {
                    latitude: geometry.lat,
                    longitude: geometry.lng
                };
                var cities = nearbyCities(query).slice(0, 10);
                var actions = cities.map(fetchWeather)
                Promise.all(actions).then(function (forecasts) {
                    weathers = forecasts.map(elem => { return elem.weather });
                    pollutions = forecasts.map(elem => { return elem.pollution });
                    var result = formatCities(cities, weathers, pollutions);
                    client.setex(cityname, 1440, JSON.stringify(result));
                    return res.status(200).send({
                        error: false,
                        message: `Weather data for nearby cities from the server`,
                        data: result
                    });
                });
            }
        });

    } catch (error) {
        console.log(error)
    }

});

// 4 /////////////////////////////////////////////////////////////////////////////////////
function formatCities(cities, weathers, pollutions) {
    var newVar = {
        "type": "FeatureCollection",
        "features": [],
        "weather": [],
        "pollution": []
    };
    cities.forEach(function (city, index) {
        var feature = { 
            "cityid": undefined, //getCityId({ lon: city["lon"], lat: city["lat"] })
            "geometry": {
                "type": "Point",
                "coordinates": [city["lon"], city["lat"]]
            },
            "type": "Feature",
            "properties": {
                "category": "Town",
                "hours": "--",
                "description": "--",
                "name": city.name,
                "phone": "--",
                "storeid": "--"
            }
        };
        newVar.features.push(feature);
        weathers[index]['cityName'] = city.name;
        pollutions[index]['cityName'] = city.name;
    });

    newVar.weather = weathers;
    newVar.pollution = pollutions;
    return newVar;
}

var dns = require('dns');

app.use(function (req, res, next) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip.substr(0, 7) == "::ffff:") {
        ip = ip.substr(7)
    }

    if (process.env.NODE_ENV == "dev" || ip.split('.')[0] == "127")
        return next();
    var reversed_ip = ip.split('.').reverse().join('.');
    dns.resolve4([process.env.HONEYPOT_KEY, reversed_ip, 'dnsbl.httpbl.org'].join('.'), function (err, addresses) {
        if (!addresses)
            return next();
        var _response = addresses.toString().split('.').map(Number);
        var test = (_response[0] === 127 && _response[3] > 0); //visitor_type[_response[3]]
        if (test)
            res.send({ msg: 'we hate spam to begin with!' });
        return next();
    });
});


module.exports = app;
