import { getWeatherDescription, getWeatherIcon, getIconStyle, getAuraColor } from './weather-codes.js';

export const DOM = {
    cityName: document.getElementById("city-name"),
    temperature: document.getElementById("temperature"),
    weatherCondition: document.getElementById("weather-condition"),
    weatherIcon: document.getElementById("weather-icon"),
    loading: document.getElementById("loading"),
    error: document.getElementById("error"),
    historyContainer: document.getElementById("search-history"),
    hourlyContainer: document.getElementById("hourly-forecast"),
    dailyContainer: document.getElementById("daily-forecast"),
    feelsLikeEl: document.getElementById("feels-like"),
    humidityEl: document.getElementById("humidity"),
    precipitationEl: document.getElementById("precipitation"),
    windSpeedEl: document.getElementById("wind-speed"),
    uvIndexEl: document.getElementById("uv-index"),
    sunriseEl: document.getElementById("sunrise-time"),
    sunsetEl: document.getElementById("sunset-time"),
    weatherInfo: document.getElementById("weather-info"),
    weatherFx: document.getElementById("weather-fx")
};

let lastTempC = null; 
let lastFeelsLikeC = null; 
let currentWeatherData = null;
let dailyForecastData = null; 
let hourlyForecastData = null;

/**
 * Конвертира градуси по Целзий във Фаренхайт.
 * * @param {number} celsius - Температура в градуси по Целзий
 * @returns {number} Температура в градуси по Фаренхайт
 */
function toFahrenheit(celsius) {
    return (celsius * 9) / 5 + 32;
}

/**
 * Форматира ISO дата в четим час (напр. "06:45").
 * * @param {string} isoString - Дата и час в ISO формат
 * @returns {string} Форматиран час и минути
 */
function formatTime(isoString) {
    let date = new Date(isoString);
    let hours = date.getHours();
    let mins = date.getMinutes();
    if (hours < 10) hours = "0" + hours;
    if (mins < 10) mins = "0" + mins;
    return hours + ":" + mins;
}

/**
 * Генерира и визуализира метеорологични ефекти (дъжд, сняг, звезди) в UI.
 * * @param {number} code - WMO метеорологичен код
 * @param {number} isDay - 1 за ден, 0 за нощ
 */
function updateWeatherFX(code, isDay) {
    DOM.weatherFx.innerHTML = ""; 
    
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
        
        DOM.weatherFx.appendChild(el);
    }
}

/**
 * Обновява "Живия интерфейс" - пулсации, светеща аура и тайтъла на браузъра.
 * * @param {number} temp - Текуща температура
 * @param {number} wind - Текуща скорост на вятъра
 * @param {number} code - WMO код за състоянието на времето
 * @param {string} cityNameText - Име на града
 * @param {number} isDay - 1 за ден, 0 за нощ
 */
function updateLivingInterface(temp, wind, code, cityNameText, isDay) {
    let pulseSeconds = Math.max(1.5, 8 - (wind / 5));
    document.documentElement.style.setProperty('--wind-pulse', pulseSeconds + 's');
    document.documentElement.style.setProperty('--aura-color', getAuraColor(code));
    document.title = Math.round(temp) + "°C | " + cityNameText;
    updateWeatherFX(code, isDay);
}

/**
 * Обновява визуализацията на всички температури на екрана (°C или °F).
 * * @param {boolean} isCelsius - Показва дали системата е в режим Целзий
 */
export function updateTemperatureDisplay(isCelsius) {
    if (lastTempC === null) return; 

    if (isCelsius) {
        DOM.temperature.textContent = lastTempC + "°";
        DOM.feelsLikeEl.textContent = lastFeelsLikeC + "°";
    } else {
        DOM.temperature.textContent = Math.round(toFahrenheit(lastTempC)) + "°";
        DOM.feelsLikeEl.textContent = Math.round(toFahrenheit(lastFeelsLikeC)) + "°";
    }

    if (dailyForecastData !== null && hourlyForecastData !== null) {
        renderForecasts(isCelsius);
    }
}

/**
 * Показва всички данни за времето в DOM структурата на приложението.
 * * @param {object} data - Обект с отговора от Open-Meteo API
 * @param {string} name - Форматирано име на града
 * @param {boolean} isCelsius - Флаг за мерната единица на температурата
 */
export function displayWeather(data, name, isCelsius) {
    DOM.error.style.display = "none"; 
    DOM.weatherInfo.style.display = "block"; 
    
    currentWeatherData = data.current; 
    dailyForecastData = data.daily;
    hourlyForecastData = data.hourly;
    
    DOM.cityName.textContent = name;
    
    DOM.humidityEl.textContent = currentWeatherData.relative_humidity_2m + "%";
    DOM.precipitationEl.textContent = currentWeatherData.precipitation + " mm";
    let currentWind = currentWeatherData.wind_speed_10m;
    DOM.windSpeedEl.textContent = currentWind + " km/h";

    DOM.uvIndexEl.textContent = dailyForecastData.uv_index_max[0];
    DOM.sunriseEl.textContent = formatTime(dailyForecastData.sunrise[0]);
    DOM.sunsetEl.textContent = formatTime(dailyForecastData.sunset[0]);

    lastTempC = Math.round(currentWeatherData.temperature_2m);
    lastFeelsLikeC = Math.round(currentWeatherData.apparent_temperature);
    
    updateTemperatureDisplay(isCelsius); 

    let code = currentWeatherData.weather_code;
    let isDay = currentWeatherData.is_day;
    
    updateLivingInterface(lastTempC, currentWind, code, name, isDay);

    DOM.weatherCondition.textContent = getWeatherDescription(code);
    DOM.weatherIcon.className = "fas " + getWeatherIcon(code);
    DOM.weatherIcon.setAttribute("style", getIconStyle(code));
}

/**
 * Рендира почасовата и дневната прогноза в DOM.
 * * @param {boolean} isCelsius - Показва дали температурите да се рендират в Целзий
 */
function renderForecasts(isCelsius) {
    DOM.hourlyContainer.innerHTML = ""; 
    
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

        DOM.hourlyContainer.innerHTML += `
            <div class="hourly-card">
                <p class="hourly-time">${displayHour}</p>
                <i class="fas ${iconClass}" style="${iconStyle}"></i>
                <p class="hourly-temp">${tempDisplay}</p>
            </div>
        `;
    }

    DOM.dailyContainer.innerHTML = ""; 

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
        
        DOM.dailyContainer.innerHTML += `
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

/**
 * Рендира бутоните за история на търсенията.
 * * @param {Array<string>} citiesArray - Масив с имената на последните търсени градове
 * @param {Function} clickCallback - Функция, която се изпълнява при клик на таг
 */
export function renderHistoryTags(citiesArray, clickCallback) {
    DOM.historyContainer.innerHTML = ""; 
    citiesArray.forEach(function(city) {
        let btn = document.createElement("button");
        btn.className = "history-tag";
        btn.textContent = city;
        btn.addEventListener("click", function() {
            clickCallback(city);
        });
        DOM.historyContainer.appendChild(btn);
    });
}

/**
 * Показва лоудинг анимация и скрива останалото съдържание.
 */
export function showLoading() {
    DOM.weatherInfo.style.display = "none";
    DOM.error.style.display = "none";
    DOM.loading.style.display = "block";
}

/**
 * Скрива лоудинг анимацията.
 */
export function hideLoading() {
    DOM.loading.style.display = "none";
}

/**
 * Показва червено каре със съобщение за грешка.
 * * @param {string} message - Текстът на грешката, която трябва да се покаже
 */
export function showError(message) {
    DOM.weatherInfo.style.display = "none";
    DOM.loading.style.display = "none";
    DOM.error.textContent = message;
    DOM.error.style.display = "block";
}