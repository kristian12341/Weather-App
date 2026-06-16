// Import weather fetching functions from the API module
import { fetchWeather, fetchWeatherByCoords } from './api.js';
// Import all UI update functions for displaying data on the page
import { displayWeather, updateTemperatureDisplay, showLoading, hideLoading, showError, renderHistoryTags } from './ui.js';

// Cache DOM elements we'll be using repeatedly to improve performance
const DOM = {
    searchForm: document.getElementById("search-form"),
    cityInput: document.getElementById("city-input"),
    toggleBtn: document.getElementById("toggle-temp-btn")
};

// Global flag to track the current temperature unit (true = Celsius, false = Fahrenheit)
let isCelsius = true;

/**
 * Retrieves the search history from browser's local storage.
 * Handles JSON parsing errors gracefully by returning an empty array.
 *
 * @returns {Array<string>} Array of previously searched city names, or empty array if none exist
 */
function getHistory() {
    let saved = localStorage.getItem("searchHistory");
    try {
        // Return the parsed history array, or empty array if nothing was stored
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        // If JSON parsing fails, return empty array to prevent crashes
        return [];
    }
}

/**
 * Saves a newly searched city to the search history.
 * Maintains a unique list of up to 5 most recent searches, removing duplicates.
 * Stores the history in browser's local storage for persistence across sessions.
 *
 * @param {string} newCity - The city name to add to history
 */
function saveToHistory(newCity) {
    let history = getHistory();
    // Remove the city if it already exists (to avoid duplicates)
    history = history.filter(function(city) { return city !== newCity; });
    // Add the city to the beginning of the list
    history.unshift(newCity);
    // Keep only the 5 most recent searches
    history = history.slice(0, 5);
    // Persist the updated history to browser storage
    localStorage.setItem("searchHistory", JSON.stringify(history));
    // Update the UI to reflect the new history
    updateHistoryUI();
}

/**
 * Updates the search history UI by rendering the clickable history tags.
 * Called whenever the history is modified to keep the display in sync with stored data.
 */
function updateHistoryUI() {
    // Pass the current history and a callback function for when a history tag is clicked
    renderHistoryTags(getHistory(), function(clickedCity) {
        // Auto-populate the search input and fetch weather for the clicked city
        DOM.cityInput.value = clickedCity;
        handleCitySearch(clickedCity);
    });
}

/**
 * Handles the city search process: shows loading indicator, fetches weather data,
 * displays results, and saves the search to history.
 * Manages all error cases and cleanup through try-catch-finally.
 *
 * @param {string} city - The name of the city to search for
 */
async function handleCitySearch(city) {
    // Show the loading spinner to indicate data is being fetched
    showLoading();
    try {
        // Fetch weather data for the city and get the normalized city name
        let { data, name } = await fetchWeather(city);
        // Display the weather data on the page in the current temperature unit
        displayWeather(data, name, isCelsius);
        // Add the successfully fetched city to search history
        saveToHistory(name);
    } catch (err) {
        // Show error message to the user (city not found, API error, etc.)
        showError(err.message);
    } finally {
        // Always hide the loading indicator, whether success or error
        hideLoading();
    }
}

/**
 * Attempts to access the device's GPS location and fetches weather for that location.
 * Uses the Geolocation API with fallbacks for browsers that don't support it.
 * Handles both successful location retrieval and permission denial gracefully.
 */
function loadWeatherByLocation() {
    // Check if the browser supports the Geolocation API
    if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser.");
        return;
    }
    showLoading();
    // Request the user's current position
    navigator.geolocation.getCurrentPosition(
        async function(position) {
            try {
                // Use coordinates from geolocation to fetch weather
                let { data, name } = await fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
                displayWeather(data, name, isCelsius);
            } catch (err) {
                showError(err.message);
            } finally {
                hideLoading();
            }
        },
        function(err) {
            // User denied location access
            showError("Location access denied. Please search manually.");
            hideLoading();
        }
    );
}

// ========== EVENT LISTENERS ==========

// Handle the search form submission when user types and clicks search or presses Enter
DOM.searchForm.addEventListener("submit", function(e) {
    e.preventDefault(); // Prevent default form submission and page reload
    let city = DOM.cityInput.value.trim();
    if (city !== "") {
        handleCitySearch(city);
    } else {
        showError("Please enter a city name!");
    }
});

// Handle the temperature unit toggle button clicks
DOM.toggleBtn.addEventListener("click", function() {
    // Switch between Celsius and Fahrenheit
    isCelsius = !isCelsius; 
    // Refresh all displayed temperatures with the new unit
    updateTemperatureDisplay(isCelsius);
    // Update button text to show which unit we're switching to
    DOM.toggleBtn.textContent = isCelsius ? "Switch to °F" : "Switch to °C";
});

// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Render any previously searched cities as clickable tags
    updateHistoryUI(); 
    // Attempt to load weather for the user's current location
    loadWeatherByLocation();
});