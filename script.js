const searchForm = document.getElementById("searchForm");
const statusMessage = document.getElementById("status");
const weatherResult = document.getElementById("weatherResult");
const themeToggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("weather-theme");
const initialTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
setTheme(initialTheme);

themeToggle.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

const weatherTypes = {
    0: ["Clear sky", "☀️"],
    1: ["Mostly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Heavy drizzle", "🌧️"],
    56: ["Freezing drizzle", "🌧️"],
    57: ["Freezing drizzle", "🌧️"],
    61: ["Light rain", "🌦️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Freezing rain", "🌧️"],
    67: ["Heavy freezing rain", "🌧️"],
    71: ["Light snow", "🌨️"],
    73: ["Snow", "🌨️"],
    75: ["Heavy snow", "❄️"],
    77: ["Snow grains", "❄️"],
    80: ["Rain showers", "🌦️"],
    81: ["Rain showers", "🌧️"],
    82: ["Heavy showers", "🌧️"],
    85: ["Snow showers", "🌨️"],
    86: ["Heavy snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️"],
    99: ["Thunderstorm with hail", "⛈️"]
};

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    getWeather(document.getElementById("city").value.trim());
});

async function getWeather(city) {
    if (!city) {
        setStatus("Enter a city name to search.", "error");
        return;
    }

    setStatus("Finding your forecast...", "loading");
    document.querySelector(".search-box button").disabled = true;

    try {
        const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
        geocodingUrl.search = new URLSearchParams({ name: city, count: "1", language: "en", format: "json" });
        const placeResponse = await fetch(geocodingUrl);
        if (!placeResponse.ok) throw new Error("Location search is unavailable right now.");
        const placeData = await placeResponse.json();
        const place = placeData.results?.[0];
        if (!place) throw new Error(`No location found for “${city}”. Try another city name.`);

        const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
        forecastUrl.search = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude,
            current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
            daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            forecast_days: "5",
            timezone: "auto"
        });
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) throw new Error("The forecast could not be loaded. Please try again.");
        const forecast = await forecastResponse.json();

        renderWeather(place, forecast);
        setStatus("Forecast updated just now.");
    } catch (error) {
        setStatus(error.message || "Something went wrong. Please try again.", "error");
    } finally {
        document.querySelector(".search-box button").disabled = false;
    }
}

function renderWeather(place, forecast) {
    const current = forecast.current;
    const daily = forecast.daily;
    const [condition, icon] = describeWeather(current.weather_code);
    const location = [place.name, place.admin1, place.country].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(", ");

    document.getElementById("locationName").textContent = location;
    document.getElementById("locationDate").textContent = new Intl.DateTimeFormat("en", {
        weekday: "long", month: "long", day: "numeric", timeZone: forecast.timezone
    }).format(new Date(current.time));
    document.getElementById("currentIcon").textContent = icon;
    document.getElementById("currentTemp").textContent = `${Math.round(current.temperature_2m)}°`;
    document.getElementById("currentCondition").textContent = condition;
    document.getElementById("feelsLike").textContent = `${Math.round(current.apparent_temperature)}°`;
    document.getElementById("humidity").textContent = `${current.relative_humidity_2m}%`;
    document.getElementById("wind").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById("rainChance").textContent = `${daily.precipitation_probability_max[0] ?? 0}%`;

    document.getElementById("forecastList").innerHTML = daily.time.map((date, index) => {
        const [dayCondition, dayIcon] = describeWeather(daily.weather_code[index]);
        const dayName = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
        return `<div class="forecast-row"><span class="forecast-day">${index === 0 ? "Today" : dayName}</span><span class="forecast-icon" aria-label="${dayCondition}">${dayIcon}</span><span class="forecast-condition">${dayCondition}</span><span class="forecast-temps"><span>${Math.round(daily.temperature_2m_max[index])}°</span><span>${Math.round(daily.temperature_2m_min[index])}°</span></span></div>`;
    }).join("");

    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    const bounds = `${longitude - 0.025},${latitude - 0.015},${longitude + 0.025},${latitude + 0.015}`;
    const mapUrl = new URL("https://www.openstreetmap.org/export/embed.html");
    mapUrl.search = new URLSearchParams({ bbox: bounds, layer: "mapnik", marker: `${latitude},${longitude}` });
    document.getElementById("locationMap").src = mapUrl.toString();
    document.getElementById("mapCaption").textContent = `${place.name} · ${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;
    weatherResult.hidden = false;
}

function describeWeather(code) {
    return weatherTypes[code] || ["Conditions unavailable", "🌡️"];
}

function setStatus(message, state = "") {
    statusMessage.textContent = message;
    statusMessage.dataset.state = state;
}

function setTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
    document.getElementById("themeIcon").textContent = isDark ? "☀" : "☾";
    document.getElementById("themeLabel").textContent = isDark ? "Light mode" : "Dark mode";
    document.querySelector('meta[name="theme-color"]').content = isDark ? "#17231f" : "#f3f5f2";
    localStorage.setItem("weather-theme", isDark ? "dark" : "light");
}