// Get HTML elements so we can use them later
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const cityName = document.getElementById("city-name");
const temperature = document.getElementById("temperature");
const weatherCondition = document.getElementById("weather-condition");
const weatherIcon = document.getElementById("weather-icon");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const toggleBtn = document.getElementById("toggle-temp-btn");
const historyContainer = document.getElementById("search-history"); 

// Forecast containers
const hourlyContainer = document.getElementById("hourly-forecast");
const dailyContainer = document.getElementById("daily-forecast"); 

// Specific metric elements
const feelsLikeEl = document.getElementById("feels-like");
const humidityEl = document.getElementById("humidity");
const precipitationEl = document.getElementById("precipitation");
const windSpeedEl = document.getElementById("wind-speed");

// State Variables
let isCelsius = true;
let lastTempC = null; 
let lastFeelsLikeC = null; 
let currentWeatherData = null;
let dailyForecastData = null; 
let hourlyForecastData = null;

// --- History Functions ---

function getHistory() {
    let saved = localStorage.getItem("searchHistory");
    return saved ? JSON.parse(saved) : [];
}

function saveToHistory(newCity) {
    let history = getHistory();
    history = history.filter(function(city) { return city !== newCity; });
    history.unshift(newCity);
    history = history.slice(0, 5);
    localStorage.setItem("searchHistory", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    let history = getHistory();
    historyContainer.innerHTML = ""; 

    history.forEach(function(city) {
        let btn = document.createElement("button");
        btn.className = "history-tag";
        btn.textContent = city;
        
        btn.addEventListener("click", function() {
            cityInput.value = city;
            fetchWeather(city);
        });
        
        historyContainer.appendChild(btn);
    });
}

// --- Premium Gradient Icon Styling ---
function getIconStyle(weatherCode) {
    let gradient = "";
    
    if (weatherCode === 0) {
        // Pure clear sky -> Solid Gold
        gradient = "linear-gradient(135deg, #FDB813, #FF8C00)";
    } else if (weatherCode === 1 || weatherCode === 2) {
        // Partly Cloudy -> Top-left is Yellow (Sun), Bottom-right is Gray (Cloud)
        gradient = "linear-gradient(135deg, #FDB813 30%, #a8b2bd 70%)";
    } else if (weatherCode === 3 || (weatherCode >= 45 && weatherCode <= 48)) {
        // Overcast / Fog -> Solid elegant Grays
        gradient = "linear-gradient(135deg, #cbd5e1, #94a3b8)";
    } else if (weatherCode >= 51 && weatherCode <= 67) {
        // Rain -> Blue gradients
        gradient = "linear-gradient(135deg, #7dd3fc, #0284c7)";
    } else if (weatherCode >= 71 && weatherCode <= 86) {
        // Snow -> White/Ice blue gradients
        gradient = "linear-gradient(135deg, #ffffff, #bae6fd)";
    } else if (weatherCode >= 95) {
        // Thunderstorm -> Dark Slate and Amber Lightning
        gradient = "linear-gradient(135deg, #64748b 40%, #fbbf24 100%)";
    } else {
        gradient = "linear-gradient(135deg, #ffffff, #e2e8f0)";
    }

    return `background: ${gradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;`;
}

// --- Temperature Functions ---

function toFahrenheit(celsius) {
    return (celsius * 9) / 5 + 32;
}

function updateTemperatureDisplay() {
    if (lastTempC === null) return; 

    if (isCelsius) {
        temperature.textContent = `${lastTempC}°`;
        feelsLikeEl.textContent = `${lastFeelsLikeC}°`;
    } else {
        temperature.textContent = `${Math.round(toFahrenheit(lastTempC))}°`;
        feelsLikeEl.textContent = `${Math.round(toFahrenheit(lastFeelsLikeC))}°`;
    }

    if (dailyForecastData !== null && hourlyForecastData !== null) {
        renderForecasts();
    }
}

toggleBtn.addEventListener("click", function() {
    isCelsius = !isCelsius; 
    updateTemperatureDisplay();
    toggleBtn.textContent = isCelsius ? "Switch to °F" : "Switch to °C";
});

// --- Search and Fetch Logic ---

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
        let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
        let data = await response.json();
        return data.address.city || data.address.town || data.address.village || "Your Location";
    } catch (error) {
        return "Unknown Location";
    }
}

function getApiUrl(lat, lon) {
    return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
}

async function fetchWeatherByCoords(lat, lon) {
    showLoading();
    try {
        let actualCityName = await getCityNameFromCoords(lat, lon);
        let weatherUrl = getApiUrl(lat, lon);
        let weatherResponse = await fetch(weatherUrl);

        if (!weatherResponse.ok) throw new Error("Failed to fetch weather data.");

        let weatherData = await weatherResponse.json();
        displayWeather(weatherData, actualCityName);
    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

function loadWeatherByLocation() {
    if (!navigator.geolocation) {
        showError("Your browser doesn't support geolocation.");
        return;
    }
    showLoading();
    navigator.geolocation.getCurrentPosition(
        function(position) {
            fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        },
        function(err) {
            showError("Location access denied. Please search manually.");
        }
    );
}

async function fetchWeather(city) {
    showLoading();
    try {
        let geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + city + "&count=1&language=en";
        let geoResponse = await fetch(geoUrl);
        if (!geoResponse.ok) throw new Error("Failed to connect to location service.");

        let geoData = await geoResponse.json();
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found. Please try again.");
        }

        let lat = geoData.results[0].latitude;
        let lon = geoData.results[0].longitude;
        let actualCityName = geoData.results[0].name;

        let weatherUrl = getApiUrl(lat, lon);
        let weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) throw new Error("Failed to fetch weather data.");

        let weatherData = await weatherResponse.json();
        displayWeather(weatherData, actualCityName);
        saveToHistory(actualCityName);

    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

// --- UI Rendering ---

function displayWeather(data, name) {
    error.style.display = "none"; 
    document.getElementById("weather-info").style.display = "block"; 
    
    currentWeatherData = data.current; 
    dailyForecastData = data.daily;
    hourlyForecastData = data.hourly;
    
    cityName.textContent = name;
    
    humidityEl.textContent = `${currentWeatherData.relative_humidity_2m}%`;
    precipitationEl.textContent = `${currentWeatherData.precipitation} mm`;
    windSpeedEl.textContent = `${currentWeatherData.wind_speed_10m} km/h`;

    lastTempC = Math.round(currentWeatherData.temperature_2m);
    lastFeelsLikeC = Math.round(currentWeatherData.apparent_temperature);
    
    updateTemperatureDisplay(); 

    let code = currentWeatherData.weather_code;
    weatherCondition.textContent = getWeatherDescription(code);
    
    weatherIcon.className = "fas " + getWeatherIcon(code);
    weatherIcon.setAttribute("style", getIconStyle(code));
}

function renderForecasts() {
    // 1. Hourly Forecast
    hourlyContainer.innerHTML = ""; 
    
    // FIXED: Extract only the date and hour part (YYYY-MM-DDTHH) for robust matching
    let currentHourStr = currentWeatherData.time.substring(0, 13); 
    
    let currentIndex = hourlyForecastData.time.findIndex(function(t) { 
        return t.substring(0, 13) === currentHourStr; 
    });
    if (currentIndex === -1) currentIndex = 0; 

    // Show the next 8 hours starting from the correct current hour
    for (let i = currentIndex; i < currentIndex + 8; i++) {
        let timeString = hourlyForecastData.time[i];
        let dateObj = new Date(timeString);
        let hour = dateObj.getHours();
        
        let displayHour = hour < 10 ? `0${hour}:00` : `${hour}:00`;
        let tempC = Math.round(hourlyForecastData.temperature_2m[i]);
        let tempDisplay = isCelsius ? `${tempC}°` : `${Math.round(toFahrenheit(tempC))}°`;
        
        let code = hourlyForecastData.weathercode[i];
        let iconClass = getWeatherIcon(code);
        let iconStyle = getIconStyle(code);

        hourlyContainer.innerHTML += `
            <div class="hourly-card">
                <p class="hourly-time">${displayHour}</p>
                <i class="fas ${iconClass}" style="${iconStyle}"></i>
                <p class="hourly-temp">${tempDisplay}</p>
            </div>
        `;
    }

    // 2. Daily Forecast
    dailyContainer.innerHTML = ""; 

    for (let i = 1; i <= 5; i++) {
        let dateString = dailyForecastData.time[i];
        let dayName = new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' });
        
        let maxTempC = Math.round(dailyForecastData.temperature_2m_max[i]);
        let minTempC = Math.round(dailyForecastData.temperature_2m_min[i]);
        
        let maxDisplay = isCelsius ? `${maxTempC}°` : `${Math.round(toFahrenheit(maxTempC))}°`;
        let minDisplay = isCelsius ? `${minTempC}°` : `${Math.round(toFahrenheit(minTempC))}°`;
        
        let code = dailyForecastData.weathercode[i];
        let iconClass = getWeatherIcon(code);
        let iconStyle = getIconStyle(code);
        let conditionText = getWeatherDescription(code);
        
        dailyContainer.innerHTML += `
            <div class="daily-row">
                <div class="daily-day">${dayName}</div>
                <div class="daily-condition">
                    <i class="fas ${iconClass}" style="${iconStyle}"></i>
                    <span>${conditionText}</span>
                </div>
                <div class="daily-temps">
                    <span class="min-temp">${minDisplay}</span> &nbsp;&nbsp; <span class="max-temp">${maxDisplay}</span>
                </div>
            </div>
        `;
    }
}

function showLoading() {
    document.getElementById("weather-info").style.display = "none";
    error.style.display = "none";
    loading.style.display = "block";
}

function hideLoading() {
    loading.style.display = "none";
}

// UI helper to show errors in red box
function showError(message) {
    document.getElementById("weather-info").style.display = "none";
    loading.style.display = "none";
    error.textContent = message;
    error.style.display = "block";
}

document.addEventListener("DOMContentLoaded", function() {
    renderHistory(); 
    loadWeatherByLocation();
});

// --- Constants ---

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
    96: 'Thunderstorm with hail',
    99: 'Heavy thunderstorm'
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