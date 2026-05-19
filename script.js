// 1. Select all the DOM elements we need 
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const cityName = document.getElementById("city-name");
const temperature = document.getElementById("temperature");
const weatherCondition = document.getElementById("weather-condition");
const weatherIcon = document.getElementById("weather-icon");
const windSpeed = document.getElementById("wind-speed");
const weatherInfo = document.getElementById("weather-info");

// 2. Add event listener for the search form
searchBtn.addEventListener("click", function() {
    let city = cityInput.value;
    
    if (city !== "") {
        fetchWeather(city);
    } else {
        showError("Please enter a city name!");
    }
});

// 3. Create a function to fetch the weather with try-catch
async function fetchWeather(city) {
    showLoading();

    try {
        // Step A: Hit the geocoding endpoint to get Latitude and Longitude
        let geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + city + "&count=1";
        let geoResponse = await fetch(geoUrl);

        if (geoResponse.ok === false) {
            throw new Error("Failed to connect to the location service.");
        }

        let geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found. Please try again.");
        }

        let lat = geoData.results[0].latitude;
        let lon = geoData.results[0].longitude;
        let actualCityName = geoData.results[0].name;

        // Step B: Get the actual weather data from the received lat and lon
        let weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current_weather=true";
        let weatherResponse = await fetch(weatherUrl);

        if (weatherResponse.ok === false) {
            throw new Error("Failed to fetch the weather data.");
        }

        let weatherData = await weatherResponse.json();

        // Call the display function with our new data
        displayWeather(weatherData.current_weather, actualCityName);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 4. Display Weather Function
function displayWeather(weather, name) {
    weatherInfo.style.display = "block"; 
    
    cityName.textContent = name;
    temperature.textContent = Math.round(weather.temperature) + "°C";
    windSpeed.textContent = "Wind Speed: " + weather.windspeed + " km/h";

    // Extract if it is day (1) or night (0) from the API
    let isDay = weather.is_day;

    // Call our functions to get text and icons based on code and time of day
    let conditionText = getWeatherDescription(weather.weathercode);
    let iconUrl = getWeatherIcon(weather.weathercode, isDay);

    weatherCondition.textContent = conditionText;
    weatherIcon.src = iconUrl;
    weatherIcon.style.display = "block"; 
}

// 5. UI Methods for Loading and Errors
function showLoading() {
    cityName.textContent = "Loading...";
    temperature.textContent = "";
    weatherCondition.textContent = "";
    windSpeed.textContent = "";
    weatherIcon.style.display = "none";
}

function hideLoading() {
    // Automatically handled by our display logic
}

function showError(message) {
    weatherInfo.style.display = "block";
    cityName.textContent = "Error";
    weatherCondition.textContent = message;
    
    temperature.textContent = "";
    windSpeed.textContent = "";
    weatherIcon.style.display = "none";
}

// 6. Complete WMO Weather Mapping Object (56 variations covering Day/Night!)
const weatherMap = {
    0:  { desc: "Clear sky", iconDay: "01d", iconNight: "01n" },
    1:  { desc: "Mainly clear", iconDay: "02d", iconNight: "02n" },
    2:  { desc: "Partly cloudy", iconDay: "03d", iconNight: "03n" },
    3:  { desc: "Overcast", iconDay: "04d", iconNight: "04n" },
    45: { desc: "Fog", iconDay: "50d", iconNight: "50n" },
    48: { desc: "Depositing rime fog", iconDay: "50d", iconNight: "50n" },
    51: { desc: "Light Drizzle", iconDay: "09d", iconNight: "09n" },
    53: { desc: "Moderate Drizzle", iconDay: "09d", iconNight: "09n" },
    55: { desc: "Dense Drizzle", iconDay: "09d", iconNight: "09n" },
    56: { desc: "Light Freezing Drizzle", iconDay: "09d", iconNight: "09n" },
    57: { desc: "Dense Freezing Drizzle", iconDay: "09d", iconNight: "09n" },
    61: { desc: "Slight Rain", iconDay: "10d", iconNight: "10n" },
    63: { desc: "Moderate Rain", iconDay: "10d", iconNight: "10n" },
    65: { desc: "Heavy Rain", iconDay: "10d", iconNight: "10n" },
    66: { desc: "Light Freezing Rain", iconDay: "13d", iconNight: "13n" },
    67: { desc: "Heavy Freezing Rain", iconDay: "13d", iconNight: "13n" },
    71: { desc: "Slight Snowfall", iconDay: "13d", iconNight: "13n" },
    73: { desc: "Moderate Snowfall", iconDay: "13d", iconNight: "13n" },
    75: { desc: "Heavy Snowfall", iconDay: "13d", iconNight: "13n" },
    77: { desc: "Snow Grains", iconDay: "13d", iconNight: "13n" },
    80: { desc: "Slight Rain Showers", iconDay: "09d", iconNight: "09n" },
    81: { desc: "Moderate Rain Showers", iconDay: "09d", iconNight: "09n" },
    82: { desc: "Violent Rain Showers", iconDay: "09d", iconNight: "09n" },
    85: { desc: "Slight Snow Showers", iconDay: "13d", iconNight: "13n" },
    86: { desc: "Heavy Snow Showers", iconDay: "13d", iconNight: "13n" },
    95: { desc: "Thunderstorm", iconDay: "11d", iconNight: "11n" },
    96: { desc: "Thunderstorm with slight hail", iconDay: "11d", iconNight: "11n" },
    99: { desc: "Thunderstorm with heavy hail", iconDay: "11d", iconNight: "11n" }
};

// 7. Get Weather Condition Text
function getWeatherDescription(code) {
    if (weatherMap[code]) {
        return weatherMap[code].desc;
    } else {
        return "Unknown Condition";
    }
}

// 8. Get Weather Icon URL
function getWeatherIcon(code, isDay) {
    let iconCode = "01d"; // Default to clear day

    if (weatherMap[code]) {
        if (isDay === 1) {
            iconCode = weatherMap[code].iconDay; // Use day icon
        } else {
            iconCode = weatherMap[code].iconNight; // Use night icon
        }
    }

    return "https://openweathermap.org/img/wn/" + iconCode + "@2x.png";
}