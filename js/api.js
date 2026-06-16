// Simple in-memory cache to store weather data and reduce API calls
const cache = {};
// Cache expires after 10 minutes to keep data fresh while reducing requests
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Retrieves the city name for given geographic coordinates using OpenStreetMap's Nominatim service.
 * Performs reverse geocoding to convert latitude/longitude into a readable location name.
 *
 * @param {number} lat - Latitude coordinate
 * @param {number} lon - Longitude coordinate
 * @returns {Promise<string>} City or location name, or "Your Location" as fallback
 * @throws {Error} If the Nominatim API request fails or times out
 */
export async function getCityNameFromCoords(lat, lon) {
    // Call Nominatim API to reverse geocode coordinates
    let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
    let data = await response.json();
    
    // Try to get city, town, or village name in order of preference; fallback to "Your Location"
    return data.address.city || data.address.town || data.address.village || "Your Location";
}

/**
 * Constructs the full Open-Meteo API URL with all required weather parameters.
 * Includes current conditions, hourly and daily forecast data, plus special metrics like UV index.
 *
 * @param {number} lat - Latitude coordinate
 * @param {number} lon - Longitude coordinate
 * @returns {string} Complete API URL with query parameters
 */
function getApiUrl(lat, lon) {
    // Build the full API request with all data we need: current, hourly, and daily forecasts
    return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max&timezone=auto`;
}

/**
 * Fetches weather data directly using GPS coordinates without geocoding.
 * Useful for location-based searches (e.g., when user clicks "use my location").
 *
 * @param {number} lat - Latitude coordinate
 * @param {number} lon - Longitude coordinate
 * @returns {Promise<object>} Object containing weather data and location name
 * @throws {Error} If the API request fails or returns an error response
 */
export async function fetchWeatherByCoords(lat, lon) {
    // Get the readable city name from coordinates
    let actualCityName = await getCityNameFromCoords(lat, lon);
    let weatherUrl = getApiUrl(lat, lon);
    let weatherResponse = await fetch(weatherUrl);

    // Check for network or API errors
    if (!weatherResponse.ok) throw new Error("Failed to fetch weather data.");

    let weatherData = await weatherResponse.json();
    return { data: weatherData, name: actualCityName };
}

/**
 * Main weather fetching function: searches for a city by name, gets its coordinates, and retrieves weather data.
 * Implements intelligent caching to minimize API calls and improve app performance.
 * The 10-minute cache TTL balances freshness with reduced API request costs.
 *
 * @param {string} city - City name to search for (case-insensitive)
 * @returns {Promise<object>} Object with current, hourly, and daily weather data plus the normalized city name
 * @throws {Error} If city is not found or if any API request fails
 */
export async function fetchWeather(city) {
    // Normalize the city name for consistent cache lookups
    const cacheKey = city.toLowerCase();

    // Check if we have fresh data in the cache
    if (cache[cacheKey]) {
        const age = Date.now() - cache[cacheKey].timestamp;
        if (age < CACHE_TTL) {
            console.log("⚡ Returning cached data for:", city);
            return cache[cacheKey].data;
        }
    }

    // Step 1: Convert city name to geographic coordinates using geocoding API
    let geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + city + "&count=1&language=en";
    let geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error("Failed to connect to location service.");

    let geoData = await geoResponse.json();
    if (!geoData.results || geoData.results.length === 0) {
        throw new Error("City not found. Please try again.");
    }

    // Extract coordinates from the first matching result
    let lat = geoData.results[0].latitude;
    let lon = geoData.results[0].longitude;
    let actualCityName = geoData.results[0].name;

    // Step 2: Fetch weather data using the coordinates
    let weatherUrl = getApiUrl(lat, lon);
    let weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) throw new Error("Failed to fetch weather data.");

    let weatherData = await weatherResponse.json();
    
    // Prepare the result object with both weather data and location name
    const finalResult = { data: weatherData, name: actualCityName };

    // Store in cache with current timestamp for TTL checking
    cache[cacheKey] = {
        data: finalResult,
        timestamp: Date.now()
    };

    return finalResult;
}