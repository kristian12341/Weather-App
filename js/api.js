const cache = {};
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Извлича името на града на базата на географски координати (Reverse Geocoding).
 * * @param {number} lat - Географска ширина (Latitude)
 * @param {number} lon - Географска дължина (Longitude)
 * @returns {Promise<string>} Име на града, населеното място или "Your Location"
 * @throws {Error} Ако заявката към Nominatim API пропадне
 */
export async function getCityNameFromCoords(lat, lon) {
    let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
    let data = await response.json();
    return data.address.city || data.address.town || data.address.village || "Your Location";
}

/**
 * Генерира пълния URL адрес за заявка към Open-Meteo API с всички необходими параметри.
 * * @param {number} lat - Географска ширина
 * @param {number} lon - Географска дължина
 * @returns {string} Форматиран URL адрес
 */
function getApiUrl(lat, lon) {
    return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max&timezone=auto`;
}

/**
 * Взема данни за времето директно чрез подадени GPS координати.
 * * @param {number} lat - Географска ширина
 * @param {number} lon - Географска дължина
 * @returns {Promise<object>} Обект съдържащ данните за времето (data) и името на локацията (name)
 * @throws {Error} Ако Open-Meteo API не върне успешен отговор
 */
export async function fetchWeatherByCoords(lat, lon) {
    let actualCityName = await getCityNameFromCoords(lat, lon);
    let weatherUrl = getApiUrl(lat, lon);
    let weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) throw new Error("Failed to fetch weather data.");

    let weatherData = await weatherResponse.json();
    return { data: weatherData, name: actualCityName };
}

/**
 * Търси град по име, взема координатите му и след това връща данните за времето.
 * Използва in-memory кеширане (TTL 10 минути), за да оптимизира заявките.
 * * @param {string} city - Името на търсения град
 * @returns {Promise<object>} Обект съдържащ current, hourly и daily данни за времето + името на града
 * @throws {Error} Ако градът не е намерен или API заявките пропаднат
 */
export async function fetchWeather(city) {
    const cacheKey = city.toLowerCase();

    if (cache[cacheKey]) {
        const age = Date.now() - cache[cacheKey].timestamp;
        if (age < CACHE_TTL) {
            console.log("⚡ Връщам данни от кеша за:", city);
            return cache[cacheKey].data;
        }
    }

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
    
    const finalResult = { data: weatherData, name: actualCityName };

    cache[cacheKey] = {
        data: finalResult,
        timestamp: Date.now()
    };

    return finalResult;
}