// Import functions to get weather descriptions, icons, and styling based on WMO weather codes
import { getWeatherDescription, getWeatherIcon, getIconStyle, getAuraColor } from './weather-codes.js';

// Cache frequently accessed DOM elements for better performance
// This prevents repeated document.getElementById() calls throughout the code
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

// Store the current temperature values in Celsius for conversion when switching units
let lastTempC = null; 
let lastFeelsLikeC = null; 
// Store API response data for use across multiple rendering functions
let currentWeatherData = null;
let dailyForecastData = null; 
let hourlyForecastData = null;

/**
 * Converts temperature from Celsius to Fahrenheit.
 * Formula: (°C × 9/5) + 32
 *
 * @param {number} celsius - Temperature in degrees Celsius
 * @returns {number} Temperature in degrees Fahrenheit
 */
function toFahrenheit(celsius) {
    // Apply the standard Celsius to Fahrenheit conversion formula
    return (celsius * 9) / 5 + 32;
}

/**
 * Formats an ISO 8601 datetime string into a readable time format (HH:MM).
 * Example: "2024-01-15T14:30:00" becomes "14:30"
 *
 * @param {string} isoString - Full ISO datetime string
 * @returns {string} Formatted time as "HH:MM"
 */
function formatTime(isoString) {
    // Parse the ISO string into a Date object
    let date = new Date(isoString);
    let hours = date.getHours();
    let mins = date.getMinutes();
    // Pad hours and minutes with leading zero if needed
    if (hours < 10) hours = "0" + hours;
    if (mins < 10) mins = "0" + mins;
    return hours + ":" + mins;
}

/**
 * Creates and animates weather effects (rain, snow, or stars) in the background.
 * Dynamically generates DOM elements and positions them across the viewport.
 * Effects are animated to fall/twinkle based on weather conditions.
 *
 * @param {number} code - WMO weather code that determines the type of effect
 * @param {number} isDay - 1 for daytime, 0 for nighttime (affects which effects are shown)
 */
function updateWeatherFX(code, isDay) {
    // Clear any previous effects from the container
    DOM.weatherFx.innerHTML = ""; 
    
    let count = 0;  // Number of particles to generate
    let type = "";  // Type of particle (raindrop, snowflake, star)

    // Determine which effect to display based on WMO code ranges
    if (code >= 51 && code <= 67) { count = 35; type = "raindrop"; }      // Drizzle and rain
    else if (code >= 71 && code <= 86) { count = 35; type = "snowflake"; }  // Snow
    else if (code === 0 && isDay === 0) { count = 25; type = "star"; }      // Clear night sky

    // Create and position each particle element
    for(let i = 0; i < count; i++) {
        let el = document.createElement("div");
        el.className = type;
        // Randomly position horizontally across the viewport
        el.style.left = (Math.random() * 100) + "%";
        
        // Apply different animation timing for stars vs precipitation
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
 * Updates the "living interface" - applies dynamic visual effects based on weather conditions.
 * This includes breathing animation speed based on wind, color aura matching weather type,
 * page title display, and weather particle effects.
 *
 * @param {number} temp - Current temperature in Celsius
 * @param {number} wind - Current wind speed in km/h
 * @param {number} code - WMO weather code
 * @param {string} cityNameText - Name of the city to display in browser title
 * @param {number} isDay - 1 for daytime, 0 for nighttime
 */
function updateLivingInterface(temp, wind, code, cityNameText, isDay) {
    // Calculate pulse animation speed based on wind (faster wind = faster pulse)
    let pulseSeconds = Math.max(1.5, 8 - (wind / 5));
    // Update CSS variables to control animation and color effects
    document.documentElement.style.setProperty('--wind-pulse', pulseSeconds + 's');
    document.documentElement.style.setProperty('--aura-color', getAuraColor(code));
    // Update browser title bar to show current temperature and location
    document.title = Math.round(temp) + "°C | " + cityNameText;
    // Render weather particle effects
    updateWeatherFX(code, isDay);
}

/**
 * Updates all temperature displays on the page (current and forecast temperatures).
 * Converts from Celsius to Fahrenheit or vice versa, and re-renders all forecasts.
 *
 * @param {boolean} isCelsius - True to display in Celsius, false for Fahrenheit
 */
export function updateTemperatureDisplay(isCelsius) {
    // Skip if we don't have temperature data yet
    if (lastTempC === null) return; 

    // Update the main temperature display and feels-like temperature
    if (isCelsius) {
        DOM.temperature.textContent = lastTempC + "°";
        DOM.feelsLikeEl.textContent = lastFeelsLikeC + "°";
    } else {
        // Convert to Fahrenheit and round to nearest degree
        DOM.temperature.textContent = Math.round(toFahrenheit(lastTempC)) + "°";
        DOM.feelsLikeEl.textContent = Math.round(toFahrenheit(lastFeelsLikeC)) + "°";
    }

    // Re-render hourly and daily forecasts with the new temperature unit
    if (dailyForecastData !== null && hourlyForecastData !== null) {
        renderForecasts(isCelsius);
    }
}

/**
 * Main function to display all weather information on the page.
 * This is called after fetching weather data and handles rendering of:
 * - Current conditions (temperature, weather description, icon)
 * - Detailed metrics (humidity, wind, precipitation, UV index, sunrise/sunset)
 * - Dynamic UI effects (color auras, breathing animations, particle effects)
 *
 * @param {object} data - Complete weather data object from Open-Meteo API
 * @param {string} name - City or location name to display
 * @param {boolean} isCelsius - Temperature unit preference
 */
export function displayWeather(data, name, isCelsius) {
    // Hide error messages and show the weather info container
    DOM.error.style.display = "none"; 
    DOM.weatherInfo.style.display = "block"; 
    
    // Store the API response data globally for use in other functions
    currentWeatherData = data.current; 
    dailyForecastData = data.daily;
    hourlyForecastData = data.hourly;
    
    // Display the city/location name
    DOM.cityName.textContent = name;
    
    // Display detailed metrics from current weather data
    DOM.humidityEl.textContent = currentWeatherData.relative_humidity_2m + "%";
    DOM.precipitationEl.textContent = currentWeatherData.precipitation + " mm";
    let currentWind = currentWeatherData.wind_speed_10m;
    DOM.windSpeedEl.textContent = currentWind + " km/h";

    // Display solar metrics from daily forecast
    DOM.uvIndexEl.textContent = dailyForecastData.uv_index_max[0];
    DOM.sunriseEl.textContent = formatTime(dailyForecastData.sunrise[0]);
    DOM.sunsetEl.textContent = formatTime(dailyForecastData.sunset[0]);

    // Store current temperatures for unit conversion later
    lastTempC = Math.round(currentWeatherData.temperature_2m);
    lastFeelsLikeC = Math.round(currentWeatherData.apparent_temperature);
    
    // Update all temperature displays in the current unit
    updateTemperatureDisplay(isCelsius); 

    // Get weather code and day/night flag for visual styling
    let code = currentWeatherData.weather_code;
    let isDay = currentWeatherData.is_day;
    
    // Apply dynamic visual effects based on weather conditions
    updateLivingInterface(lastTempC, currentWind, code, name, isDay);

    // Update weather description and icon
    DOM.weatherCondition.textContent = getWeatherDescription(code);
    DOM.weatherIcon.className = "fas " + getWeatherIcon(code);
    DOM.weatherIcon.setAttribute("style", getIconStyle(code));
}

/**
 * Renders hourly and daily forecasts in the DOM.
 * @param {boolean} isCelsius - True to display temperatures in Celsius, false for Fahrenheit
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
 * Renders clickable history tags for previously searched cities.
 * Users can click a tag to quickly search for that city again.
 *
 * @param {Array<string>} citiesArray - Array of city names to display as tags
 * @param {Function} clickCallback - Callback function executed when a tag is clicked, receives the city name
 */
export function renderHistoryTags(citiesArray, clickCallback) {
    // Clear previous history tags
    DOM.historyContainer.innerHTML = ""; 
    // Create a button for each city in the array
    citiesArray.forEach(function(city) {
        let btn = document.createElement("button");
        btn.className = "history-tag";
        btn.textContent = city;
        // Attach click handler to trigger search for this city
        btn.addEventListener("click", function() {
            clickCallback(city);
        });
        DOM.historyContainer.appendChild(btn);
    });
}

/**
 * Shows loading animation and hides other content.
 */
export function showLoading() {
    DOM.weatherInfo.style.display = "none";
    DOM.error.style.display = "none";
    DOM.loading.style.display = "block";
}

/**
 * Hides the loading animation.
 */
export function hideLoading() {
    DOM.loading.style.display = "none";
}

/**
 * Displays a red box with an error message.
 * @param {string} message - The error text to display
 */
export function showError(message) {
    DOM.weatherInfo.style.display = "none";
    DOM.loading.style.display = "none";
    DOM.error.textContent = message;
    DOM.error.style.display = "block";
}