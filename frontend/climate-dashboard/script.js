//Select the HTML elements that will be contain the graphs

var chartTempDom = document.getElementById("chartTemperature");
var chartTemp = echarts.init(chartTempDom);

var chartPrecipDom = document.getElementById("chartPrecipitation");
var chartPrecip = echarts.init(chartPrecipDom);

var chartPressDom = document.getElementById("chartPressureAndHumity");
var chartPress = echarts.init(chartPressDom);

/*Temperature Graph*/
d3.csv("temperatura.csv").then(function(data) {

    const geocodes = Array.from(new Set(data.map(d => d.geocode)));

    const select = document.getElementById("municipalitySelect");
    geocodes.forEach(g => {
        let option = document.createElement("option");
        option.value = g;
        option.textContent = g;
        select.appendChild(option);
    });

    // Display the graph the first time using the first municipality listed
    updateGraph(geocodes[0]);

    select.addEventListener("change", function()
        {const geocode = select.value;
         updateGraph(geocode);
        });

    //Function to display the graph whenever a municipality is selected
    function updateGraph(selectedGeocode)
    {
        const filteredData = data.filter(d => d.geocode === selectedGeocode);
        
        //Object dates to calculate the difference in weeks between the start and end dates
        const obj_dates = filteredData.map(d => new Date(d.date));
        obj_dates.sort((a, b) => a - b);
        const diff_weeks = (obj_dates[obj_dates.length -1] - obj_dates[0]) / (1000 * 60 * 60 * 24 * 7);
    
        const dates = filteredData.map(d => d.date.split(" ")[0]);
        const week = filteredData.map(d => d.epiweek);
        const temp_min = filteredData.map(d => +d.temp_min);
        const temp_med = filteredData.map(d => +d.temp_med);
        const temp_max = filteredData.map(d => +d.temp_max);
        const show_month = diff_weeks > 6;

        const option = 
        {
            title: {text: `Temperaturas diárias - ${selectedGeocode}`,
                    left: "center"},
            tooltip: {
                    trigger: "axis",
                    formatter: function (params) {
                        let result = params[0].axisValueLabel + "<br/>";
                        params.forEach(function (item) {
                            const value = parseFloat(item.data);
                            const formatted = (value % 1 === 0) ? value.toFixed(0) : value.toFixed(1);
                            result += item.marker + item.seriesName + ": " + formatted + "<br/>";
                        });
                        return result;
                    }
            },

            legend: {data: ["Máxima", "Média", "Mínima"],
                     orient: "horizontal",
                     top: 35
                    },
            xAxis: {name:show_month ? "Mês" : "Semana Epidemiológica",
                    nameLocation: "middle",
                    nameGap: 40,
                    nameTextStyle: {fontSize: 18, fontWeight: "bond"},
                    type: "category",
                    data: dates,
                    axisTick: {show: false},
                    axisLabel: {interval: 0,
                        formatter: function(value, index)
                        {
                            if (show_month)
                                {const month = new Date(value + "T00:00:00").toLocaleString("pt-BR", {month: "short"}); //using the local time
                                const prevMonth = index > 0
                                                    ? new Date(dates[index - 1] + "T00:00:00").toLocaleString("pt-BR", {month: "short"})
                                                    : null;
                                const year = value.split("-")[0];  //Dates are like 2025-12-02, so using split we can get the year
                                const prevYear = index > 0 ? dates[index - 1].split("-")[0] : null;
                                if (month !== prevMonth)
                                {
                                    return year !== prevYear ? `${month}\n${year}` : month;
                                }
                                else {return "";}
                            }
                            else{
                                if (index === 0 || week[index] !== week[index - 1])
                                    {return (week[index]);}
                                else {return "";}
                            }
                        },
                        fontSize: 13,
                        margin: 10
                    }},
            yAxis: {name: "Temperatura (ºC)",
                    nameLocation: "middle",
                    nameGap: "40",
                    nameTextStyle: {fontSize: 16,fontWeight: "bold"},
                    type: "value"
            },
            series: [{name: "Máxima", type: "line", data: temp_max, lineStyle: {width: 1.5, opacity: 0.7, color: "#6A75B7"}, itemStyle: {color: "#6A75B7"}, showSymbol: false},
                     {name: "Média", type: "line", data: temp_med, lineStyle: {width: 3.5, opacity: 2, color: "#90BE10"}, itemStyle: {color: "#90BE10"}, showSymbol: false},
                     {name: "Mínima", type: "line", data: temp_min, lineStyle: {width: 1.5, opacity: 0.7, color: "#41BAC5"}, itemStyle: {color: "#41BAC5"}, showSymbol: false}],
            dataZoom: [
                {
                type: 'inside',
                throttle: 50
                },
                {
                type: 'slider',
                show: true,
                bottom: 7,
                height: 10
                }
            ]
        };
        
        chartTemp.setOption(option);
    }
});


/*Precipitation Graph*/
d3.csv("precipitacao.csv").then(function(data) {
    const geocodes = Array.from(new Set(data.map(d => d.geocode)));

    const select = document.getElementById("municipalitySelect");

    //Display the graph the first time using the first municipality listed
    updateGraph(geocodes[0]);

    select.addEventListener("change", function()
        {const geocode = select.value;
         updateGraph(geocode);
        });
    
    //Function to display the graph whenever a municipality is selected
    function updateGraph(selectedGeocode)
    {
        const filteredData = data.filter(d => d.geocode === selectedGeocode);

        //Object dates to calculate the difference in weeks between the start and end dates
        const obj_dates = filteredData.map(d => new Date(d.date));
        obj_dates.sort((a, b) => a - b);
        const diff_weeks = (obj_dates[obj_dates.length - 1] - obj_dates[0]) / (1000 * 60 * 60 * 24 * 7);
        
        const dates = filteredData.map(d => d.date.split(" ")[0]);
        const week = filteredData.map(d => d.epiweek);
        const total_precipitation = filteredData.map(d => +d.precip_tot);
        const mean_precipitation = filteredData.map(d => d.precip_med);
        const show_month = diff_weeks > 6;

        const option = 
        {
            title: {text: `Precipitação diária - ${selectedGeocode}`,
                    left: "center"},
            tooltip: {
                    trigger: "axis",
                    formatter: function (params) {
                        let result = params[0].axisValueLabel + "<br/>";
                        params.forEach(function (item) {
                            const value = parseFloat(item.data);
                            const formatted = (value % 1 === 0) ? value.toFixed(0) : value.toFixed(1);
                            result += item.marker + item.seriesName + ": " + formatted + "<br/>";
                        });
                        return result;
                    }
            },
            legend: {data: ["Precipitação Total", "Precipitação Média"],
                     top: 35
                    },
            xAxis: {name: show_month ? "Mês" : "Semana Epidemiológica",
                    nameLocation: "middle",
                    nameGap: 40,
                    nameTextStyle: {fontSize: 18, fontWeight: "bond"},
                    type: "category",
                    data: dates,
                    axisTick: {show: false},
                    axisLabel: { interval: 0,
                        formatter: function(value, index)
                        {   
                            if (show_month)
                                {const month = new Date(value + "T00:00:00").toLocaleString("pt-BR", {month: "short"});  //using the local time
                                const prevMonth = index > 0
                                                    ? new Date(dates[index - 1] + "T00:00:00").toLocaleString("pt-BR", {month: "short"})
                                                    : null;
                                const year = value.split("-")[0];  //Dates are like 2025-12-02, so using split we can get the year
                                const prevYear = index > 0 ? dates[index - 1].split("-")[0] : null;
                                if (month !== prevMonth)
                                {
                                    return year !== prevYear ? `${month}\n${year}` : month;
                                }
                                else {return "";}
                            }
                            else{
                                if (index === 0 || week[index] !== week[index -1])
                                    {return (week[index]);}
                                else {return "";}
                            }
                        },
                        fontSize: 13,
                        margin: 12
                    }},
            yAxis: {name: "Precipitação (mm)",
                    nameLocation: "middle",
                    nameGap: "40",
                    nameTextStyle: {fontSize: 16, fontWeight: "bold"},
                    type: "value",
                    splitNumber: 4
                    },
            series: [
                    {name: "Precipitação Média",
                     type: "bar",
                     data: mean_precipitation,
                     barWidth: "100%",
                     stack: 'two',
                     barGap: "40",
                     itemStyle: {color: "#2FDDEC"}
                    },
                    {name: "Precipitação Total",
                      type: "bar",
                      data: total_precipitation,
                      barWidth: "100%",
                      barGap: "0%",
                      stack: 'two',
                      itemStyle: {color: "#0F646B"}}],
            dataZoom: [
                {
                type: 'inside',
                throttle: 50
                },
                {
                type: 'slider',
                show: true,
                bottom: 7,
                height: 10
                }
            ]
        };
        chartPrecip.setOption(option);
    }
});

/*Air Pressure and Humity Graph*/
d3.csv("pressao_e_umidade.csv").then(function(data)
{
    const geocodes = Array.from(new Set(data.map(d => d.geocode)));
    const select = document.getElementById("municipalitySelect");

    // Display the graph the first time using the first municipality listed
    updateGraph(geocodes[0]);

    select.addEventListener("change", function()
    {
        const geocode = select.value;
        updateGraph(geocode);
    });

    //Function to display the graph whenever a municipality is selected
    function updateGraph(selectedGeocode)
    {
        const filteredData = data.filter(d => d.geocode === selectedGeocode);
        
        //Object dates to calculate the difference in weeks between the start and end dates
        const obj_dates = filteredData.map(d => new Date(d.date));
        obj_dates.sort((a, b) => a - b);
        const diff_weeks = (obj_dates[obj_dates.length - 1] - obj_dates[0])/ (1000 * 60 * 60 * 24 * 7);
        
        const dates = filteredData.map(d => d.date.split(" ")[0]);
        const week = filteredData.map(d => d.epiweek);
        const air_pressure = filteredData.map(d => d.pressao_med);
        const humidity = filteredData.map(d => d.umid_med);
        const show_month = diff_weeks > 6;

        const option =
        {
            title: {text: `Umidade Relativa do Ar e Pressão do Ar Médias - ${selectedGeocode}`,
                    left: "center"},
            tooltip: {
                    trigger: "axis",
                    formatter: function (params) {
                        let result = params[0].axisValueLabel + "<br/>";
                        params.forEach(function (item) {
                            const value = parseFloat(item.data);
                            const formatted = (value % 1 === 0) ? value.toFixed(0) : value.toFixed(3);
                            result += item.marker + item.seriesName + ": " + formatted + "<br/>";
                        });
                        return result;
                    }
            },
            legend: {data: ["Umidade relativa do ar média", "Pressão do ar média"],
                     top: 33
                    },
            xAxis: {name: show_month ? "Mês" : "Semana Epidemiológica",
                    nameLocation: "middle",
                    nameGap: 40,
                    nameTextStyle: {fontSize: 18, fontWeight: "bond"},
                    type: "category",
                    data: dates,
                    axisTick: {show: false},
                    axisLabel: { interval: 0,
                        formatter: function(value, index)
                        {
                            if (show_month)
                            {
                                const month = new Date(value + "T00:00:00").toLocaleString("pt-BR", {month: "short"});  //using the local time
                                const prevMonth = index > 0
                                                    ? new Date(dates[index - 1] + "T00:00:00").toLocaleString("pt-BR", {month: "short"})
                                                    : null;
                                const year = value.split("-")[0];   //Dates are like 2025-12-02, so using split we can get the year
                                const prevYear = index > 0 ? dates[index - 1].split("-")[0] : null;
                                if (month !== prevMonth)
                                {
                                    return year !== prevYear ? `${month}\n${year}` : month;
                                }
                                else {return "";}
                            }
                            else{
                                if (index === 0 || week[index] !== week[index - 1])
                                    {return (week[index]);}
                                else {return "";}
                            }
                        },
                        fontSize: 13,
                        margin: 12
                    }},
            yAxis: [
                {
                    //left y-axis
                    name: "Pressão do ar média (atm)",
                    min: "dataMin",
                    max: Math.max(...air_pressure) + 0.02,
                    nameLocation: "middle",
                    nameGap: "40",
                    nameTextStyle: {fontSize: 16, fontWeight: "bold"},
                    type: "value",
                    splitLine: {show: false}
                },
                {
                    //right y-axis
                    name: "Umidade relativa do ar média (%)",
                    nameLocation: "middle",
                    nameGap: "40",
                    nameTextStyle: {fontSize: 16, fontWeight: "bold"},
                    type: "value",
                    axisLabel: {formmatter: function(value)
                                    {return Number.isInteger(value) ? value: value.toFixed(1);}
                    }
                }],
            series: [
                    {name: "Umidade relativa do ar média",
                      type: "line",
                      data: humidity,
                      barWidth: "100%",
                      barGap: "0%",
                      itemStyle: {color: "#81B863"},
                      showSymbol: false,
                      yAxisIndex: 1
                    },
                    {name: "Pressão do ar média",
                      type: "bar",
                      data: air_pressure,
                      barWidth: "100%",
                      barGap: "0%",
                      itemStyle: {color: "#8D9ECE"},
                      yAxisIndex: 0
                    }],
            dataZoom: [
                {
                type: 'inside',
                throttle: 50
                },
                {
                type: 'slider',
                show: true,
                bottom: 7,
                height: 10,
                dataBackground: {
                    lineStyle: { color: 'transparent' },
                    areaStyle: { color: 'transparent' }
                    },
                }
            ]
            };
            chartPress.setOption(option);
        }
});