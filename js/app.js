import { fetchWeather, fetchWeatherByCoords } from './api.js';
import { displayWeather, updateTemperatureDisplay, showLoading, hideLoading, showError, renderHistoryTags } from './ui.js';

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const toggleBtn = document.getElementById("toggle-temp-btn");

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

// Подаваме данните към UI модула заедно с функция, която да се извика при клик
function updateHistoryUI() {
    renderHistoryTags(getHistory(), function(clickedCity) {
        cityInput.value = clickedCity;
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

searchForm.addEventListener("submit", function(e) {
    e.preventDefault(); 
    let city = cityInput.value.trim();
    if (city !== "") {
        handleCitySearch(city);
    } else {
        showError("Please enter a city name!");
    }
});

toggleBtn.addEventListener("click", function() {
    isCelsius = !isCelsius; 
    updateTemperatureDisplay(isCelsius);
    toggleBtn.textContent = isCelsius ? "Switch to °F" : "Switch to °C";
});

document.addEventListener("DOMContentLoaded", function() {
    updateHistoryUI(); 
    loadWeatherByLocation();
});