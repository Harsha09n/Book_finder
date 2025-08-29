import { useState, useEffect } from 'react';

// Main App component
const App = () => {
    // State variables for UI and data
    const [city, setCity] = useState('');
    const [weatherData, setWeatherData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // State to hold the current weather code for animations
    const [weatherCode, setWeatherCode] = useState(null);
    
    // WMO Weather interpretation codes
    const WMO_CODES = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing rime fog", 51: "Drizzle: Light",
        53: "Drizzle: Moderate", 55: "Drizzle: Dense", 56: "Freezing Drizzle: Light",
        57: "Freezing Drizzle: Dense", 61: "Rain: Slight", 63: "Rain: Moderate",
        65: "Rain: Heavy", 66: "Freezing Rain: Light", 67: "Freezing Rain: Heavy",
        71: "Snow fall: Slight", 73: "Snow fall: Moderate", 75: "Snow fall: Heavy",
        77: "Snow grains", 80: "Rain showers: Slight", 81: "Rain showers: Moderate",
        82: "Rain showers: Violent", 85: "Snow showers: Slight", 86: "Snow showers: Heavy",
        95: "Thunderstorm: Slight or moderate", 96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    };

    // AQI Categories
    const AQI_CATEGORIES = {
        0: { text: 'Good', color: 'bg-green-500' },
        20: { text: 'Good', color: 'bg-green-500' },
        40: { text: 'Fair', color: 'bg-yellow-500' },
        60: { text: 'Moderate', color: 'bg-orange-500' },
        80: { text: 'Poor', color: 'bg-red-500' },
        100: { text: 'Very Poor', color: 'bg-purple-500' },
        101: { text: 'Extremely Poor', color: 'bg-red-900' }
    };

    const getAqiCategory = (aqiValue) => {
        if (aqiValue <= 20) return AQI_CATEGORIES[0];
        if (aqiValue <= 40) return AQI_CATEGORIES[20];
        if (aqiValue <= 60) return AQI_CATEGORIES[40];
        if (aqiValue <= 80) return AQI_CATEGORIES[60];
        if (aqiValue <= 100) return AQI_CATEGORIES[80];
        return AQI_CATEGORIES[101];
    };

    // Function to handle the API call
    const fetchWeatherData = async () => {
        if (!city.trim()) {
            setError("Please enter a city name.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setWeatherData(null);
        
        const systemPrompt = "You are a helpful assistant that provides concise and accurate weather information for a given city. Search for the current temperature, a brief weather description (e.g., 'Sunny', 'Partly Cloudy'), wind speed, air quality index (AQI), today's high and low temperatures, sunrise and sunset times, and the weather code. Provide the data in a clear, formatted JSON object. If you cannot find a specific piece of information, use 'N/A'.";
        const userQuery = `Current weather and AQI for ${city}`;
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const callApiWithRetry = async (url, payload, retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (response.ok) {
                        return await response.json();
                    } else if (response.status === 429 && i < retries - 1) {
                        await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
                    } else {
                        throw new Error(`API call failed with status: ${response.status}`);
                    }
                } catch (error) {
                    if (i === retries - 1) throw error;
                }
            }
        };

        try {
            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                tools: [{ "google_search": {} }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "location": { "type": "STRING" },
                            "temperature": { "type": "STRING" },
                            "weatherDescription": { "type": "STRING" },
                            "windSpeed": { "type": "STRING" },
                            "aqi": { "type": "STRING" },
                            "highTemp": { "type": "STRING" },
                            "lowTemp": { "type": "STRING" },
                            "sunrise": { "type": "STRING" },
                            "sunset": { "type": "STRING" },
                            "weatherCode": { "type": "INTEGER" }
                        }
                    }
                }
            };
            const result = await callApiWithRetry(apiUrl, payload);
            const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            const data = JSON.parse(jsonText);
            
            if (!data || !data.location) {
                throw new Error("Could not find weather data for this location.");
            }

            setWeatherData(data);
            setWeatherCode(data.weatherCode);

        } catch (err) {
            console.error("API Error:", err);
            setError(err.message);
            setWeatherCode(null);
            setWeatherData(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Use a useEffect hook to manage the background animation class on the body
    useEffect(() => {
        const body = document.body;
        body.classList.remove('sunny', 'cloudy', 'rainy', 'stormy');
        
        if (weatherCode !== null) {
            if (weatherCode >= 0 && weatherCode <= 1) {
                body.classList.add('sunny');
            } else if (weatherCode >= 2 && weatherCode <= 3) {
                body.classList.add('cloudy');
            } else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
                body.classList.add('rainy');
            } else if (weatherCode >= 95) {
                body.classList.add('stormy');
            } else {
                body.classList.add('cloudy');
            }
        } else {
            // Default background if no weather data is loaded
            body.classList.add('bg-gray-100');
        }
    }, [weatherCode]);

    // Conditional CSS class for the hover effect
    const getHoverClass = () => {
        if (weatherCode === null) return '';
        if (weatherCode >= 0 && weatherCode <= 1) return 'sunny-hover';
        if (weatherCode >= 2 && weatherCode <= 3) return 'cloudy-hover';
        if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) return 'rainy-hover';
        if (weatherCode >= 95) return 'stormy-hover';
        return 'cloudy-hover';
    };

    return (
        <div className="w-full h-full flex flex-col items-center p-4">
            <header className="w-full flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
                <h1 className="text-3xl font-extrabold text-blue-800 text-center md:text-left order-1">Fast Weather</h1>
                <div className="flex-grow flex justify-center w-full order-3 md:order-2 mt-4 md:mt-0">
                    <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 w-full max-w-sm">
                        <input
                            type="text"
                            id="city-input"
                            placeholder="e.g., New York, Tokyo, London"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') fetchWeatherData(); }}
                            className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-4 focus:ring-blue-300 transition-shadow duration-300"
                        />
                        <button
                            id="get-weather-btn"
                            onClick={fetchWeatherData}
                            className="p-3 bg-blue-600 text-white font-semibold rounded-full transition-colors duration-300 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        >
                            Get Weather
                        </button>
                    </div>
                </div>
            </header>
            
            {error && <div id="status-message" className="text-center mt-4 text-sm text-red-500">{error}</div>}
            
            <div id="weather-display" className={`w-full bg-white p-8 rounded-2xl shadow-xl text-center text-lg hover-effect ${getHoverClass()}`}>
                {isLoading ? (
                    <div id="loading-spinner" className="text-center mt-4">
                        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : weatherData ? (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                            <h2 className="text-2xl font-bold text-gray-800">{weatherData.location}</h2>
                            <p className="text-gray-600 text-sm">Data fetched via Google Search</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                            <div className="flex items-center space-x-4 w-full sm:w-auto">
                                <div className="text-5xl font-extrabold text-blue-600">{weatherData.temperature}</div>
                                <div>
                                    <p className="text-gray-800 text-xl font-semibold">{weatherData.weatherDescription}</p>
                                    <p className="text-gray-500">Wind: {weatherData.windSpeed}</p>
                                </div>
                            </div>
                            <div className="flex-shrink-0 w-full sm:w-auto bg-gray-50 p-4 rounded-2xl shadow-inner">
                                <h3 className="font-semibold text-gray-700">Air Quality Index</h3>
                                <div className="flex items-center space-x-2">
                                    <div className="text-2xl font-bold text-gray-800">{weatherData.aqi}</div>
                                    <div className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${getAqiCategory(parseInt(weatherData.aqi, 10)).color}`}>
                                        {getAqiCategory(parseInt(weatherData.aqi, 10)).text}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-700">Today's Forecast</h3>
                                <p className="text-gray-600">High: {weatherData.highTemp} / Low: {weatherData.lowTemp}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-700">Sun Cycle</h3>
                                <p className="text-gray-600">Sunrise: {weatherData.sunrise}</p>
                                <p className="text-gray-600">Sunset: {weatherData.sunset}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">Enter a city to see the weather forecast.</p>
                )}
            </div>
        </div>
    );
};

export default App;
