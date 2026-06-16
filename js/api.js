// Създаваме обект за кеша и настройваме времето на живот (10 минути)
const cache = {};
const CACHE_TTL = 10 * 60 * 1000;

export async function getCityNameFromCoords(lat, lon) {
    let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
    let data = await response.json();
    return data.address.city || data.address.town || data.address.village || "Your Location";
}

function getApiUrl(lat, lon) {
    return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max&timezone=auto`;
}

export async function fetchWeatherByCoords(lat, lon) {
    let actualCityName = await getCityNameFromCoords(lat, lon);
    let weatherUrl = getApiUrl(lat, lon);
    let weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) throw new Error("Failed to fetch weather data.");

    let weatherData = await weatherResponse.json();
    return { data: weatherData, name: actualCityName };
}

export async function fetchWeather(city) {
    const cacheKey = city.toLowerCase();

    // ПРОВЕРКА В КЕША (Стъпка 3.2)
    if (cache[cacheKey]) {
        const age = Date.now() - cache[cacheKey].timestamp;
        if (age < CACHE_TTL) {
            console.log("⚡ Връщам данни от кеша за:", city); // Можеш да го видиш в Console (F12)
            return cache[cacheKey].data;
        }
    }

    // Нормален Fetch, ако нямаме кеш
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

    // ЗАПАЗВАМЕ РЕЗУЛТАТА В КЕША (Стъпка 3.2)
    cache[cacheKey] = {
        data: finalResult,
        timestamp: Date.now()
    };

    return finalResult;
}