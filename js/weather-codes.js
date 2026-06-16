export const weatherConditions = {
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

/**
 * Превежда WMO метеорологичен код до текстов формат на английски език.
 * * @param {number} code - WMO метеорологичен код (напр. 0, 3, 61)
 * @returns {string} Текстово описание на състоянието (напр. "Clear sky")
 */
export function getWeatherDescription(code) {
    return weatherConditions[code] || "Unknown Condition";
}

/**
 * Съпоставя WMO метеорологичен код с Font Awesome CSS клас за иконка.
 * * @param {number} weathercode - WMO метеорологичен код
 * @returns {string} CSS клас за иконката (напр. "fa-sun")
 */
export function getWeatherIcon(weathercode) {
    const iconMap = {
        0: 'fa-sun', 1: 'fa-cloud-sun', 2: 'fa-cloud-sun', 3: 'fa-cloud', 
        45: 'fa-smog', 48: 'fa-smog', 51: 'fa-cloud-rain', 53: 'fa-cloud-rain', 
        55: 'fa-cloud-rain', 56: 'fa-cloud-rain', 57: 'fa-cloud-rain', 
        61: 'fa-cloud-showers-heavy', 63: 'fa-cloud-showers-heavy', 65: 'fa-cloud-showers-heavy', 
        66: 'fa-cloud-meatball', 67: 'fa-cloud-meatball', 71: 'fa-snowflake', 
        73: 'fa-snowflake', 75: 'fa-snowflake', 77: 'fa-snowflake', 
        80: 'fa-cloud-showers-heavy', 81: 'fa-cloud-showers-heavy', 82: 'fa-cloud-showers-heavy', 
        85: 'fa-snowflake', 86: 'fa-snowflake', 95: 'fa-bolt', 96: 'fa-bolt', 99: 'fa-bolt'
    };
    return iconMap[weathercode] || 'fa-question';
}

/**
 * Връща CSS inline стил за преливка (градиент) базиран на състоянието на времето.
 * * @param {number} weatherCode - WMO метеорологичен код
 * @returns {string} CSS стринг с дефиниран linear-gradient за текста (иконата)
 */
export function getIconStyle(weatherCode) {
    let gradient = "";
    if (weatherCode === 0) gradient = "linear-gradient(135deg, #FDB813, #FF8C00)";
    else if (weatherCode === 1 || weatherCode === 2) gradient = "linear-gradient(135deg, #FDB813 30%, #a8b2bd 70%)";
    else if (weatherCode === 3 || (weatherCode >= 45 && weatherCode <= 48)) gradient = "linear-gradient(135deg, #cbd5e1, #94a3b8)";
    else if (weatherCode >= 51 && weatherCode <= 67) gradient = "linear-gradient(135deg, #7dd3fc, #0284c7)";
    else if (weatherCode >= 71 && weatherCode <= 86) gradient = "linear-gradient(135deg, #ffffff, #bae6fd)";
    else if (weatherCode >= 95) gradient = "linear-gradient(135deg, #64748b 40%, #fbbf24 100%)";
    else gradient = "linear-gradient(135deg, #ffffff, #e2e8f0)";
    
    return `background: ${gradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;`;
}

/**
 * Връща rgba цвят за външната аура (box-shadow) на основния контейнер.
 * * @param {number} weatherCode - WMO метеорологичен код
 * @returns {string} RGBA цветови код
 */
export function getAuraColor(weatherCode) {
    if (weatherCode === 0) return "rgba(253, 184, 19, 0.35)"; 
    if (weatherCode >= 1 && weatherCode <= 3) return "rgba(255, 255, 255, 0.15)"; 
    if (weatherCode >= 51 && weatherCode <= 67) return "rgba(2, 132, 199, 0.35)"; 
    if (weatherCode >= 95) return "rgba(251, 191, 36, 0.3)"; 
    return "rgba(255, 255, 255, 0.15)";
}