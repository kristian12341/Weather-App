// Get HTML elements so we can use them later
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
const historyContainer = document.getElementById("search-history"); 

// New elements for the advanced forecast layout
const hourlyContainer = document.getElementById("hourly-forecast");
const dailyContainer = document.getElementById("daily-forecast"); 

// Variables to keep track of state
let isCelsius = true;
let lastTempC = null; 
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
    history = history.filter(city => city !== newCity);
    history.unshift(newCity);
    history = history.slice(0, 5);
    localStorage.setItem("searchHistory", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    let history = getHistory();
    historyContainer.innerHTML = ""; 

    history.forEach(city => {
        let btn = document.createElement("button");
        btn.className = "history-tag";
        btn.textContent = city;
        
        btn.addEventListener("click", () => {
            cityInput.value = city;
            fetchWeather(city);
        });
        
        historyContainer.appendChild(btn);
    });
}

// --- Temperature Functions ---

// Simple math to convert Celsius to Fahrenheit
function toFahrenheit(celsius) {
    return (celsius * 9) / 5 + 32;
}

// Update all temperatures on screen (Main, Hourly, and Daily)
function updateTemperatureDisplay() {
    if (lastTempC === null) return; 

    // Update main temperature
    if (isCelsius) {
        temperature.textContent = `${lastTempC}°C`;
    } else {
        temperature.textContent = `${toFahrenheit(lastTempC).toFixed(1)}°F`;
    }

    // Re-render both forecasts to apply C/F change
    if (dailyForecastData !== null && hourlyForecastData !== null) {
        renderForecasts();
    }
}

// Toggle button logic
toggleBtn.addEventListener("click", () => {
    isCelsius = !isCelsius; 
    updateTemperatureDisplay();
    toggleBtn.textContent = isCelsius ? "Switch to °F" : "Switch to °C";
});

// --- Search and Fetch Functions ---

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
        let city = data.address.city || data.address.town || data.address.village || "Your Location";
        return city;
    } catch (error) {
        return "Unknown Location";
    }
}

// Helper: Generates the full API URL including hourly and daily params
function getApiUrl(lat, lon) {
    return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
}

async function fetchWeatherByCoords(lat, lon) {
    showLoading();
    try {
        let actualCityName = await getCityNameFromCoords(lat, lon);
        let weatherUrl = getApiUrl(lat, lon);
        let weatherResponse = await fetch(weatherUrl);

        if (!weatherResponse.ok) {
            throw new Error("Failed to fetch the weather data.");
        }

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
        (position) => {
            let lat = position.coords.latitude;
            let lon = position.coords.longitude;
            fetchWeatherByCoords(lat, lon);
        },
        (err) => {
            showError("Location access denied. Please search manually.");
        }
    );
}

async function fetchWeather(city) {
    showLoading();
    try {
        let geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + city + "&count=1&language=en";
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

        let weatherUrl = getApiUrl(lat, lon);
        let weatherResponse = await fetch(weatherUrl);

        if (weatherResponse.ok === false) {
            throw new Error("Failed to fetch the weather data.");
        }

        let weatherData = await weatherResponse.json();
        displayWeather(weatherData, actualCityName);
        saveToHistory(actualCityName);

    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

// --- UI Functions ---

function displayWeather(data, name) {
    error.style.display = "none"; 
    weatherInfo.style.display = "block"; 
    
    currentWeatherData = data.current_weather;
    dailyForecastData = data.daily;
    hourlyForecastData = data.hourly;
    
    cityName.textContent = name;
    windSpeed.textContent = `Wind Speed: ${currentWeatherData.windspeed} km/h`;

    lastTempC = Math.round(currentWeatherData.temperature);
    
    // Updates main temp and renders the forecasts
    updateTemperatureDisplay(); 

    let conditionText = getWeatherDescription(currentWeatherData.weathercode);
    let iconClass = getWeatherIcon(currentWeatherData.weathercode);

    weatherCondition.textContent = conditionText;
    weatherIcon.className = "fas " + iconClass;
}

// Render both Hourly and Daily forecasts
function renderForecasts() {
    // 1. Render Hourly Forecast (Horizontal List)
    hourlyContainer.innerHTML = ""; 
    
    // Find the current hour in the array to know where to start
    let currentTimeString = currentWeatherData.time; 
    let currentIndex = hourlyForecastData.time.findIndex(t => t === currentTimeString);
    if (currentIndex === -1) currentIndex = 0; // Fallback

    // Show the next 8 hours
    for (let i = currentIndex; i < currentIndex + 8; i++) {
        let timeString = hourlyForecastData.time[i];
        let dateObj = new Date(timeString);
        let hour = dateObj.getHours();
        
        // Format hour to always look like "15:00" instead of "15:0"
        let displayHour = hour < 10 ? `0${hour}:00` : `${hour}:00`;
        
        let tempC = Math.round(hourlyForecastData.temperature_2m[i]);
        let tempDisplay = isCelsius ? `${tempC}°` : `${Math.round(toFahrenheit(tempC))}°`;
        let iconClass = getWeatherIcon(hourlyForecastData.weathercode[i]);

        hourlyContainer.innerHTML += `
            <div class="hourly-card">
                <p class="hourly-time">${displayHour}</p>
                <i class="fas ${iconClass}"></i>
                <p class="hourly-temp">${tempDisplay}</p>
            </div>
        `;
    }

    // 2. Render Daily Forecast (Vertical List like in the image)
    dailyContainer.innerHTML = ""; 

    // Loop from 1 to 5 (to skip today, which is index 0)
    for (let i = 1; i <= 5; i++) {
        let dateString = dailyForecastData.time[i];
        let dayName = new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' });
        
        let maxTempC = Math.round(dailyForecastData.temperature_2m_max[i]);
        let minTempC = Math.round(dailyForecastData.temperature_2m_min[i]);
        
        let maxDisplay = isCelsius ? `${maxTempC}°` : `${Math.round(toFahrenheit(maxTempC))}°`;
        let minDisplay = isCelsius ? `${minTempC}°` : `${Math.round(toFahrenheit(minTempC))}°`;
        
        let code = dailyForecastData.weathercode[i];
        let iconClass = getWeatherIcon(code);
        let conditionText = getWeatherDescription(code);
        
        dailyContainer.innerHTML += `
            <div class="daily-row">
                <div class="daily-day">${dayName}</div>
                <div class="daily-condition">
                    <i class="fas ${iconClass}"></i>
                    <span>${conditionText}</span>
                </div>
                <div class="daily-temps">
                    <span class="min-temp">${minDisplay}</span> / <span class="max-temp">${maxDisplay}</span>
                </div>
            </div>
        `;
    }
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

document.addEventListener("DOMContentLoaded", () => {
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