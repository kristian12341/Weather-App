import { fetchWeather, fetchWeatherByCoords } from './api.js';
import { displayWeather, updateTemperatureDisplay, showLoading, hideLoading, showError, renderHistoryTags } from './ui.js';

// Стъпка 3.3 - Организираме и тези елементи
const DOM = {
    searchForm: document.getElementById("search-form"),
    cityInput: document.getElementById("city-input"),
    toggleBtn: document.getElementById("toggle-temp-btn")
};

let isCelsius = true;

// --- History Logic ---

function getHistory() {
    let saved = localStorage.getItem("searchHistory");
    try {
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function saveToHistory(newCity) {
    let history = getHistory();
    history = history.filter(function(city) { return city !== newCity; });
    history.unshift(newCity);
    history = history.slice(0, 5);
    localStorage.setItem("searchHistory", JSON.stringify(history));
    updateHistoryUI();
}

function updateHistoryUI() {
    renderHistoryTags(getHistory(), function(clickedCity) {
        DOM.cityInput.value = clickedCity;
        handleCitySearch(clickedCity);
    });
}

// --- App Logic ---

async function handleCitySearch(city) {
    showLoading();
    try {
        let { data, name } = await fetchWeather(city);
        displayWeather(data, name, isCelsius);
        saveToHistory(name);
    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

function loadWeatherByLocation() {
    if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser.");
        return;
    }
    showLoading();
    navigator.geolocation.getCurrentPosition(
        async function(position) {
            try {
                let { data, name } = await fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
                displayWeather(data, name, isCelsius);
            } catch (err) {
                showError(err.message);
            } finally {
                hideLoading();
            }
        },
        function(err) {
            showError("Location access denied. Please search manually.");
            hideLoading();
        }
    );
}

// --- Event Listeners ---

DOM.searchForm.addEventListener("submit", function(e) {
    e.preventDefault(); 
    let city = DOM.cityInput.value.trim();
    if (city !== "") {
        handleCitySearch(city);
    } else {
        showError("Please enter a city name!");
    }
});

DOM.toggleBtn.addEventListener("click", function() {
    isCelsius = !isCelsius; 
    updateTemperatureDisplay(isCelsius);
    DOM.toggleBtn.textContent = isCelsius ? "Switch to °F" : "Switch to °C";
});

document.addEventListener("DOMContentLoaded", function() {
    updateHistoryUI(); 
    loadWeatherByLocation();
});