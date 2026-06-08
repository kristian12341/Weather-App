const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const cityName = document.getElementById("city-name");
const temperature = document.getElementById("temperature");
const weatherCondition = document.getElementById("weather-condition");
const weatherIcon = document.getElementById("weather-icon");
const windSpeed = document.getElementById("wind-speed");
const weatherInfo = document.getElementById("weather-info");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const toggleBtn = document.getElementById("toggle-temp-btn");

let isCelsius = true;
let lastTempC = null;

function toFahrenheit(celsius) {
    return (celsius * 9) / 5 + 32;
}

function updateTemperatureDisplay() {
    if (lastTempC === null) return; 

    if (isCelsius) {
        temperature.textContent = `${lastTempC}°C`;
    } else {
        temperature.textContent = `${toFahrenheit(lastTempC).toFixed(1)}°F`;
    }
}

toggleBtn.addEventListener("click", () => {
    isCelsius = !isCelsius; 
    updateTemperatureDisplay();
    toggleBtn.textContent = isCelsius ? "Switch to °F" : "Switch to °C";
});

searchForm.addEventListener("submit", function(e) {
    e.preventDefault(); 
    let city = cityInput.value.trim();
    
    if (city !== "") {
        fetchWeather(city);
    } else {
        showError("Please enter a city name!");
    }
});

async function getCityNameFromCoords(lat, lon) {
    try {
        let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        let data = await response.json();
        let city = data.address.city || data.address.town || data.address.village || "Your Location";
        return city;
    } catch (error) {
        return "Unknown Location";
    }
}

async function fetchWeatherByCoords(lat, lon) {
    showLoading();

    try {
        let actualCityName = await getCityNameFromCoords(lat, lon);
        let weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        let weatherResponse = await fetch(weatherUrl);

        if (!weatherResponse.ok) {
            throw new Error("Failed to fetch the weather data.");
        }

        let weatherData = await weatherResponse.json();
        displayWeather(weatherData.current_weather, actualCityName);

    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

function loadWeatherByLocation() {
    if (!navigator.geolocation) {
        showError("Браузърът не поддържа геолокация");
        return;
    }

    showLoading();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            let lat = position.coords.latitude;
            let lon = position.coords.longitude;
            fetchWeatherByCoords(lat, lon);
        },
        (err) => {
            showError("Достъпът до локацията беше отказан");
        }
    );
}

// Зареди при старт на страницата
document.addEventListener("DOMContentLoaded", loadWeatherByLocation);

async function fetchWeather(city) {
    showLoading();

    try {
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

        let weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        let weatherResponse = await fetch(weatherUrl);

        if (weatherResponse.ok === false) {
            throw new Error("Failed to fetch the weather data.");
        }

        let weatherData = await weatherResponse.json();

        displayWeather(weatherData.current_weather, actualCityName);

    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

function displayWeather(weather, name) {
    error.style.display = "none";
    weatherInfo.style.display = "block"; 
    
    cityName.textContent = name;
    windSpeed.textContent = `Wind Speed: ${weather.windspeed} km/h`;

    lastTempC = Math.round(weather.temperature);
    updateTemperatureDisplay();

    let conditionText = getWeatherDescription(weather.weathercode);
    let iconClass = getWeatherIcon(weather.weathercode);

    weatherCondition.textContent = conditionText;
    weatherIcon.className = "fas " + iconClass;
}

function showLoading() {
    weatherInfo.style.display = "none";
    error.style.display = "none";
    loading.style.display = "block";
}

function hideLoading() {
    loading.style.display = "none";
}

function showError(message) {
    weatherInfo.style.display = "none";
    loading.style.display = "none";
    error.textContent = message;
    error.style.display = "block";
}

const weatherConditions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
};

function getWeatherDescription(code) {
    return weatherConditions[code] || "Unknown Condition";
}

function getWeatherIcon(weathercode) {
    const iconMap = {
        0: 'fa-sun', 
        1: 'fa-cloud-sun', 
        2: 'fa-cloud-sun', 
        3: 'fa-cloud', 
        45: 'fa-smog', 
        48: 'fa-smog', 
        51: 'fa-cloud-rain', 
        53: 'fa-cloud-rain', 
        55: 'fa-cloud-rain', 
        56: 'fa-cloud-rain', 
        57: 'fa-cloud-rain', 
        61: 'fa-cloud-showers-heavy', 
        63: 'fa-cloud-showers-heavy', 
        65: 'fa-cloud-showers-heavy', 
        66: 'fa-cloud-meatball', 
        67: 'fa-cloud-meatball', 
        71: 'fa-snowflake', 
        73: 'fa-snowflake', 
        75: 'fa-snowflake', 
        77: 'fa-snowflake', 
        80: 'fa-cloud-showers-heavy', 
        81: 'fa-cloud-showers-heavy', 
        82: 'fa-cloud-showers-heavy', 
        85: 'fa-snowflake', 
        86: 'fa-snowflake', 
        95: 'fa-bolt', 
        96: 'fa-bolt', 
        99: 'fa-bolt'
    };

    return iconMap[weathercode] || 'fa-question';
}