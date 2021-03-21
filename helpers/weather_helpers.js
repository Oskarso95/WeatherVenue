export function getColorByWeather(weather) {
  const snow = "Snow";
  const rain = "Rain";
  const clear = "Clear";
  const clouds = "Clouds";

  if (weather.includes(snow)) {
    return "white";
  }
  if (weather.includes(rain)) {
    return "blue";
  }
  if (weather.includes(clear)) {
    return "red";
  }
  if (weather.includes(clouds)) {
    return "whitesmoke";
  }

  return "white";
}
