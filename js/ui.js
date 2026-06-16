import { getWeatherDescription, getWeatherIcon, getIconStyle, getAuraColor } from './weather-codes.js';

const cityName = document.getElementById("city-name");
const temperature = document.getElementById("temperature");
const weatherCondition = document.getElementById("weather-condition");
const weatherIcon = document.getElementById("weather-icon");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const historyContainer = document.getElementById("search-history"); 

const hourlyContainer = document.getElementById("hourly-forecast");
const dailyContainer = document.getElementById("daily-forecast"); 

const feelsLikeEl = document.getElementById("feels-like");
const humidityEl = document.getElementById("humidity");
const precipitationEl = document.getElementById("precipitation");
const windSpeedEl = document.getElementById("wind-speed");

const uvIndexEl = document.getElementById("uv-index");
const sunriseEl = document.getElementById("sunrise-time");
const sunsetEl = document.getElementById("sunset-time");
const weatherInfo = document.getElementById("weather-info");

// Local UI state
let lastTempC = null; 
let lastFeelsLikeC = null; 
let currentWeatherData = null;
let dailyForecastData = null; 
let hourlyForecastData = null;

function toFahrenheit(celsius) {
    return (celsius * 9) / 5 + 32;
}

function formatTime(isoString) {
    let date = new Date(isoString);
    let hours = date.getHours();
    let mins = date.getMinutes();
    if (hours < 10) hours = "0" + hours;
    if (mins < 10) mins = "0" + mins;
    return hours + ":" + mins;
}

function updateWeatherFX(code, isDay) {
    let fxContainer = document.getElementById("weather-fx");
    fxContainer.innerHTML = ""; 
    
    let count = 0;
    let type = "";

    if (code >= 51 && code <= 67) { count = 35; type = "raindrop"; }
    else if (code >= 71 && code <= 86) { count = 35; type = "snowflake"; }
    else if (code === 0 && isDay === 0) { count = 25; type = "star"; }

    for(let i = 0; i < count; i++) {
        let el = document.createElement("div");
        el.className = type;
        el.style.left = (Math.random() * 100) + "%";
        
        if (type === "star") {
            el.style.top = (Math.random() * 50) + "%";
            el.style.animationDuration = (Math.random() * 2 + 1) + "s";
            el.style.animationDelay = (Math.random() * 2) + "s";
        } else {
            el.style.animationDuration = (Math.random() * 0.8 + 0.5) + "s";
            el.style.animationDelay = (Math.random() * 1) + "s";
        }
        
        fxContainer.appendChild(el);
    }
}

function updateLivingInterface(temp, wind, code, cityNameText, isDay) {
    let pulseSeconds = Math.max(1.5, 8 - (wind / 5));
    document.documentElement.style.setProperty('--wind-pulse', pulseSeconds + 's');
    document.documentElement.style.setProperty('--aura-color', getAuraColor(code));
    document.title = Math.round(temp) + "°C | " + cityNameText;
    updateWeatherFX(code, isDay);
}

export function updateTemperatureDisplay(isCelsius) {
    if (lastTempC === null) return; 

    if (isCelsius) {
        temperature.textContent = lastTempC + "°";
        feelsLikeEl.textContent = lastFeelsLikeC + "°";
    } else {
        temperature.textContent = Math.round(toFahrenheit(lastTempC)) + "°";
        feelsLikeEl.textContent = Math.round(toFahrenheit(lastFeelsLikeC)) + "°";
    }

    if (dailyForecastData !== null && hourlyForecastData !== null) {
        renderForecasts(isCelsius);
    }
}

export function displayWeather(data, name, isCelsius) {
    error.style.display = "none"; 
    weatherInfo.style.display = "block"; 
    
    currentWeatherData = data.current; 
    dailyForecastData = data.daily;
    hourlyForecastData = data.hourly;
    
    cityName.textContent = name;
    
    humidityEl.textContent = currentWeatherData.relative_humidity_2m + "%";
    precipitationEl.textContent = currentWeatherData.precipitation + " mm";
    let currentWind = currentWeatherData.wind_speed_10m;
    windSpeedEl.textContent = currentWind + " km/h";

    uvIndexEl.textContent = dailyForecastData.uv_index_max[0];
    sunriseEl.textContent = formatTime(dailyForecastData.sunrise[0]);
    sunsetEl.textContent = formatTime(dailyForecastData.sunset[0]);

    lastTempC = Math.round(currentWeatherData.temperature_2m);
    lastFeelsLikeC = Math.round(currentWeatherData.apparent_temperature);
    
    updateTemperatureDisplay(isCelsius); 

    let code = currentWeatherData.weather_code;
    let isDay = currentWeatherData.is_day;
    
    updateLivingInterface(lastTempC, currentWind, code, name, isDay);

    weatherCondition.textContent = getWeatherDescription(code);
    weatherIcon.className = "fas " + getWeatherIcon(code);
    weatherIcon.setAttribute("style", getIconStyle(code));
}

function renderForecasts(isCelsius) {
    hourlyContainer.innerHTML = ""; 
    
    let currentHourStr = currentWeatherData.time.substring(0, 13); 
    let currentIndex = hourlyForecastData.time.findIndex(function(t) { 
        return t.substring(0, 13) === currentHourStr; 
    });
    if (currentIndex === -1) currentIndex = 0; 

    for (let i = currentIndex; i < currentIndex + 8; i++) {
        let timeString = hourlyForecastData.time[i];
        let dateObj = new Date(timeString);
        let hour = dateObj.getHours();
        
        let displayHour = hour < 10 ? "0" + hour + ":00" : hour + ":00";
        let tempC = Math.round(hourlyForecastData.temperature_2m[i]);
        let tempDisplay = isCelsius ? tempC + "°" : Math.round(toFahrenheit(tempC)) + "°";
        
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

    dailyContainer.innerHTML = ""; 

    for (let i = 1; i <= 5; i++) {
        let dateString = dailyForecastData.time[i];
        let dayName = new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' });
        
        let maxTempC = Math.round(dailyForecastData.temperature_2m_max[i]);
        let minTempC = Math.round(dailyForecastData.temperature_2m_min[i]);
        
        let maxDisplay = isCelsius ? maxTempC + "°" : Math.round(toFahrenheit(maxTempC)) + "°";
        let minDisplay = isCelsius ? minTempC + "°" : Math.round(toFahrenheit(minTempC)) + "°";
        
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

export function renderHistoryTags(citiesArray, clickCallback) {
    historyContainer.innerHTML = ""; 
    citiesArray.forEach(function(city) {
        let btn = document.createElement("button");
        btn.className = "history-tag";
        btn.textContent = city;
        btn.addEventListener("click", function() {
            clickCallback(city);
        });
        historyContainer.appendChild(btn);
    });
}

export function showLoading() {
    weatherInfo.style.display = "none";
    error.style.display = "none";
    loading.style.display = "block";
}

export function hideLoading() {
    loading.style.display = "none";
}

export function showError(message) {
    weatherInfo.style.display = "none";
    loading.style.display = "none";
    error.textContent = message;
    error.style.display = "block";
}