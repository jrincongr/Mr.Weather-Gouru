$(document).ready(function () {

    // declare variables
    var savedCities = [];


    // initalizes the list of cities in search histories from local storage
    function initialize() {
        var cities = JSON.parse(localStorage.getItem("cities"));
        if (cities) {
            $.each(cities, function (index, city) {
                addHistory(city);
            });
        }
        //this allows for everything to be loaded, including the fontawesome, google font to be loaded
        setTimeout(function () {
            $('#body').css("visibility", "visible");
        }, 0);
        // $('#body').css("visibility","visible");
    }


    // function that calls 2 apis to get the current weather and 5 day forecast
    function getCurrentWeather(city) {

        // urls to request data
        var apiKey = "69dc4c13998c8b7a4772ce179c71adcb";
        var requestWeather = 'https://api.openweathermap.org/data/2.5/weather?q=' + city + '&units=metric&APPID=' + apiKey;
        var requestForecast = 'https://api.openweathermap.org/data/2.5/forecast?q=' + city + '&units=metric&APPID=' + apiKey;

        // fetch request for current weather
        fetch(requestWeather)
            .then(function (response) {
                // if the city cannot be found, throw an error to stop the promise
                if (response.status === 404) {
                    $(".feedback").css("visibility", "visible");
                    throw new Error("Invalid city name");
                }
                // else return the response that has been parsed
                else {
                    return response.json();
                }
            })
            .then(function (data) {
                // console.log("current",data)

                //empty the input text field
                $(".feedback").css("visibility", "hidden");
                $("#city").val("");

                //add the name of the city and country to the list using the function addHistory
                addHistory(data.name + ", " + data.sys.country);

                //add the appropriate values for the current weather section
                $("#cityName").text(data.name);
                $("#temperature").text(Math.round(parseInt(data.main.temp)));
                $("#humidity").text(data.main.humidity);
                $("#wind-speed").text((parseFloat(data.wind.speed) * 3.6).toFixed(2));
                $("#date").text(moment.unix(data.dt + data.timezone).utc().format("MM/DD/YYYY"));

                //get the corresponding weather icon from the openwewathermap 
                var iconId = data.weather[0].icon;
                var iconDescription = data.weather[0].description;
                var iconUrl = "http://openweathermap.org/img/wn/" + iconId + "@2x.png";
                $("#iconWeather").empty();
                $("#iconWeather").append("<img src=" + iconUrl + " alt=" + iconDescription + " class='weather-icon-current'>");

                //get the latitude and longitude value that are needed to request the url for uv index
                var lat = data.coord.lat;
                var lon = data.coord.lon;
                var requestUV = 'https://api.openweathermap.org/data/2.5/uvi?lat=' + lat + '&lon=' + lon + '&appid=' + apiKey;

                //request uv index
                return fetch(requestUV);
            })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {

                // console.log('uv',data)
                var uv = data.value;

                $("#uv-index").text(uv);
                if (uv < 3) {
                    $("#uv-index").css("background-color", "green");
                }
                else if (uv < 5) {
                    $("#uv-index").css("background-color", "yellow");
                }
                else if (uv < 7) {
                    $("#uv-index").css("background-color", "orange");
                }
                else if (uv < 10) {
                    $("#uv-index").css("background-color", "red");
                }
                else {
                    $("#uv-index").css("background-color", "fuchsia");
                }
            })
            // catch any unexpected error
            .catch(function (err) {
                console.log(err);
            });

        //fetch request for 5 day forecast/3 hour data
        fetch(requestForecast)
            .then(function (response) {
                // if the city cannot be found, throw an error to stop the promise
                if (response.status === 404) {
                    // console.log('not a city');
                    throw new Error("Invalid city name");
                }
                // else return the response that has been parsed
                else {
                    return response.json();
                }
            })
            .then(function (data) {
                // console.log(data);

                //remove any previous 5 day forecast
                $("#weekly-forecast").empty();

                // set the list of data in to the forecast variable
                var forecast = data.list;

                // set the start date as the first entrie - shifted by the timezone.
                var startDate = moment.unix(forecast[0].dt + data.city.timezone).utc().format("YYYY-MM-DD");

                // initalize an object with properties of the dates in the forecast that will each contain an empty array
                var groupedForecast = {};
                for (var i = 0; i < 6; i++) {
                    groupedForecast[moment(startDate, "YYYY-MM-DD").add(i, 'days').format("YYYY-MM-DD")] = [];
                }

                // goes through the list of forecast and push the array for that date, the important values
                $.each(forecast, function (index, value) {
                    var temperature = value.main.temp;//Math.round(parseFloat(value.main.temp));
                    var humidity = value.main.humidity;
                    var iconId = value.weather[0].icon;
                    var iconDescription = value.weather[0].description;
                    var day = moment.unix(value.dt + data.city.timezone).utc().format("YYYY-MM-DD");
                    var time = moment.unix(value.dt + data.city.timezone).utc().format("HH:mm:ss");
                    var hour = parseInt(moment.unix(value.dt + data.city.timezone).utc().format("HH"));
                    // console.log(value.dt + data.city.timezone);
                    // console.log(day + " " + time);
                    groupedForecast[day].push({
                        temperature: temperature,
                        humidity: humidity,
                        iconId: iconId,
                        iconDescription: iconDescription,
                        time: time,
                        hour: hour
                    });
                });

                // console.log(groupedForecast);

                // check the first if the first entry the time of the day is greater than 12H 
                // if it is greater than 12 H, then the startdate for the 5 day forecast will be the following day
                // if not, the first day of the 5 day forecast will be of the same day. 
                // If we were to try to get the forecast for the 5 following days, the last day would not have pertinent information (e.g. before 9 am)
                if (parseInt(moment.unix(forecast[0].dt + data.city.timezone).utc().format("HH")) > 12) {
                    startDate = moment(startDate, "YYYY-MM-DD").add(1, 'days').format("YYYY-MM-DD");
                }

                // goes through the days of the 5 day forecast using startDate as the first day
                for (var i = 0; i < 5; i++) {
                    // adds i days to the startDate
                    var date = moment(startDate, "YYYY-MM-DD").add(i, 'days').format("YYYY-MM-DD");
                    var dayForecast = groupedForecast[date];

                    // sort the array of object based on how close the time is to 12 in ascending order
                    dayForecast.sort(function (a, b) {
                        return Math.abs(a.hour - 12) - Math.abs(b.hour - 12);
                    });

                    // creates a new element that will contain the information
                    var iconUrl = "http://openweathermap.org/img/wn/" + dayForecast[0].iconId + "@2x.png";
                    var newItem = $("<div>");
                    newItem.addClass("col-5 col-sm-5 col-md-3 col-lg-2 weekly border rounded-lg m-2");
                    newItem.append("<h6>" + moment(date, "YYYY-MM-DD").format("MM/DD/YYYY") + "</h6>");
                    newItem.append("<img src=" + iconUrl + " alt=" + dayForecast[0].iconDescription + " class='weather-icon-weekly'>");
                    newItem.append("<p>Temperature: " + Math.round(parseFloat(dayForecast[0].temperature)) + "\xB0C</p>");
                    newItem.append("<p>Humidity: " + dayForecast[0].humidity + "%</p>");

                    // appends to the weekly-forecast section
                    $("#weekly-forecast").append(newItem);

                }

            })
            //throw any unexpected error
            .catch(function (err) {
                console.log(err);
            });

    }

    // function that adds the city name to the top list of search history
    // if the city already exists, move the item to the top
    // there is a max of 10 cities in the search history
    function addHistory(city) {
        //if city does not exist in the list
        if (savedCities.indexOf(city) === -1) {
            //create a new list item
            var newCity = $("<li>");
            newCity.addClass("list-group-item");
            newCity.attr("data-city", city);
            newCity.text(city);
            //add it to the beginning of the list
            $("#search-history").prepend(newCity);
            //add it to the array of city
            savedCities.push(city);
            //checks if there are are more then 10 using the function exceedNum
            if (savedCities.length > 10) {
                var removedCity = savedCities.splice(0, 1);
                // console.log(removedCity);
                $('[data-city="' + removedCity + '"]').remove();
            }
            //save the array local storage with the key cities
            localStorage.setItem("cities", JSON.stringify(savedCities));
        }

        // if city exists in the list
        else {
            // move the city at the end of the array
            var index = savedCities.indexOf(city);
            savedCities.splice(index, 1);
            savedCities.push(city);
            // move the list item to the top of the list
            $("#search-history").prepend($('[data-city="' + city + '"]'));
            // save the array in local storage with the key cities
            localStorage.setItem("cities", JSON.stringify(savedCities));
        }
    }

    initialize();

    // listens for when the user searches for a city
    $("button").on("click", function (event) {
        event.preventDefault();

        // returns false if nothing was entered
        if (!$("#city").val()) {
            return false;
        }

        //calls the function that will request the api
        getCurrentWeather($("#city").val());

    });

    // listens for when the user clicks and changes to the input field to remove the feedback if any
    $("#city").on('keydown paste input click', function (event) {
        $(".feedback").css("visibility", "hidden");
    });

    // listens when the list is clicked
    $("ul").click(function (event) {

        // if the list item is clicked, call the fuction that will request the api
        if ($(event.target).is("li")) {

            $(".feedback").css("visibility", "hidden");
            getCurrentWeather($(event.target).text());

        }
    });

});