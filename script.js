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
const forecastContainer = document.getElementById("forecast"); // Forecast element

// Variables to keep track of temperature state
let isCelsius = true;
let lastTempC = null; 
let dailyForecastData = null; // Save forecast data for the toggle button

// --- History Functions ---

// Get saved array from LocalStorage or return empty array
function getHistory() {
    let saved = localStorage.getItem("searchHistory");
    return saved ? JSON.parse(saved) : [];
}

// Save a new city to history
function saveToHistory(newCity) {
    let history = getHistory();
    
    // Remove city if it's already in the list to avoid duplicates
    history = history.filter(function(city) {
        return city !== newCity;
    });
    
    // Add to the front of the array
    history.unshift(newCity);
    
    // Keep only the last 5 searches
    history = history.slice(0, 5);
    
    // Save back to LocalStorage
    localStorage.setItem("searchHistory", JSON.stringify(history));
    
    // Update the screen
    renderHistory();
}

// Show history tags on screen
function renderHistory() {
    let history = getHistory();
    historyContainer.innerHTML = ""; // Clear current tags

    // Create a button for each city
    history.forEach(function(city) {
        let btn = document.createElement("button");
        btn.className = "history-tag";
        btn.textContent = city;
        
        // When clicked, fill input and search directly
        btn.addEventListener("click", function() {
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

// Check which temp format is selected and update text
function updateTemperatureDisplay() {
    if (lastTempC === null) return; 

    // Update main temperature
    if (isCelsius) {
        temperature.textContent = `${lastTempC}°C`;
    } else {
        temperature.textContent = `${toFahrenheit(lastTempC).toFixed(1)}°F`;
    }

    // Re-render forecast if we have data, so it changes to C or F
    if (dailyForecastData !== null) {
        renderForecast(dailyForecastData);
    }
}

// When I click the toggle button, change temp format
toggleBtn.addEventListener("click", function() {
    isCelsius = !isCelsius; 
    updateTemperatureDisplay();
    toggleBtn.textContent = isCelsius ? "Switch to °F" : "Switch to °C";
});

// --- Search and Fetch Functions ---

// Search weather when user submits the form
searchForm.addEventListener("submit", function(e) {
    e.preventDefault(); 
    let city = cityInput.value.trim();
    
    if (city !== "") {
        fetchWeather(city);
    } else {
        showError("Please enter a city name!");
    }
});

// Function to get city name from coordinates (Reverse Geocoding)
async function getCityNameFromCoords(lat, lon) {
    try {
        // Enforce English language in API response
        let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
        let data = await response.json();
        let city = data.address.city || data.address.town || data.address.village || "Your Location";
        return city;
    } catch (error) {
        return "Unknown Location";
    }
}

// Fetch weather using exact GPS location
async function fetchWeatherByCoords(lat, lon) {
    showLoading();

    try {
        let actualCityName = await getCityNameFromCoords(lat, lon);
        
        // Added daily forecast parameters to the URL
        let weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
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

// Ask browser for GPS permission
function loadWeatherByLocation() {
    if (!navigator.geolocation) {
        showError("Your browser doesn't support geolocation.");
        return;
    }

    showLoading();

    navigator.geolocation.getCurrentPosition(
        function(position) {
            let lat = position.coords.latitude;
            let lon = position.coords.longitude;
            fetchWeatherByCoords(lat, lon);
        },
        function(err) {
            showError("Location access denied. Please search manually.");
        }
    );
}

// Standard fetch function for city search
async function fetchWeather(city) {
    showLoading();

    try {
        // Enforce English language in geocoding search
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

        // Added daily forecast parameters to the URL
        let weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
        let weatherResponse = await fetch(weatherUrl);

        if (weatherResponse.ok === false) {
            throw new Error("Failed to fetch the weather data.");
        }

        let weatherData = await weatherResponse.json();

        displayWeather(weatherData, actualCityName);
        
        // Save the correct, capitalized english city name to history
        saveToHistory(actualCityName);

    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

// --- UI Functions ---

// Put the data into the HTML elements
function displayWeather(data, name) {
    error.style.display = "none"; 
    weatherInfo.style.display = "block"; 
    
    let current = data.current_weather;
    
    cityName.textContent = name;
    windSpeed.textContent = `Wind Speed: ${current.windspeed} km/h`;

    lastTempC = Math.round(current.temperature);
    
    // Save daily data and call update
    dailyForecastData = data.daily;
    updateTemperatureDisplay(); 

    let conditionText = getWeatherDescription(current.weathercode);
    let iconClass = getWeatherIcon(current.weathercode);

    weatherCondition.textContent = conditionText;
    weatherIcon.className = "fas " + iconClass;
}

// Render the 5-day forecast cards
function renderForecast(dailyData) {
    forecastContainer.innerHTML = ""; // Clear old forecast

    // Loop starting from 1 to skip today (index 0) and get next 5 days
    for (let i = 1; i <= 5; i++) {
        let dateString = dailyData.time[i];
        
        // Use 'en-US' for English days (Mon, Tue, Wed...)
        let dayName = new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' });
        
        let maxTempC = Math.round(dailyData.temperature_2m_max[i]);
        let minTempC = Math.round(dailyData.temperature_2m_min[i]);
        
        // Format temps based on toggle state
        let maxTempDisplay = isCelsius ? `${maxTempC}°C` : `${Math.round(toFahrenheit(maxTempC))}°F`;
        let minTempDisplay = isCelsius ? `${minTempC}°C` : `${Math.round(toFahrenheit(minTempC))}°F`;
        
        let iconClass = getWeatherIcon(dailyData.weathercode[i]);
        
        // Build the HTML for the card
        let cardHTML = `
            <div class="day-card">
                <p class="day-name">${dayName}</p>
                <i class="fas ${iconClass}"></i>
                <p class="temp-max">${maxTempDisplay}</p>
                <p class="temp-min">${minTempDisplay}</p>
            </div>
        `;
        
        forecastContainer.innerHTML += cardHTML;
    }
}

// UI helper to show loading text
function showLoading() {
    weatherInfo.style.display = "none";
    error.style.display = "none";
    loading.style.display = "block";
}

// UI helper to hide loading
function hideLoading() {
    loading.style.display = "none";
}

// UI helper to show errors in red box
function showError(message) {
    weatherInfo.style.display = "none";
    loading.style.display = "none";
    error.textContent = message;
    error.style.display = "block";
}

// Run history and location check as soon as page loads
document.addEventListener("DOMContentLoaded", function() {
    renderHistory(); // Show tags from local storage
    loadWeatherByLocation();
});

// --- Constants ---

// List of weather descriptions by WMO code
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

// Returns the text for the weather condition
function getWeatherDescription(code) {
    return weatherConditions[code] || "Unknown Condition";
}

// Maps WMO codes to Font Awesome classes
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