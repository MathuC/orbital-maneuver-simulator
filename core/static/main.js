const EARTH_RADIUS = 6371;
const orbitTypeColorMap = {"start": "rgba(30, 144, 255, 1)", "transfer1": "rgba(255, 0, 255, 1)", 
    "transfer2": "rgba(255, 140, 0, 1)", "end": "rgba(255, 255, 0, 1)"};
const orbitTypeTitleMap = {"start": "Initial Orbit", "transfer1": "Transfer Orbit 1", 
    "transfer2": "Transfer Orbit 2", "end": "Final Orbit"};
const stratAlgs = [
    "<b>1.</b> Current apoapsis := Final apoapsis <b>2.</b> Circularize orbit to reach final argument of periapsis <b>3.</b> Radius := Final periapsis",
    "<b>1.</b> Current periapsis := Final apoapsis <b>2.</b> Circularize orbit to reach final argument of periapsis <b>3.</b> Radius := Final periapsis",
    "<b>1.</b> Current periapsis := Final periapsis <b>2.</b> Circularize orbit to reach final argument of periapsis <b>3.</b> Radius := Final apoapsis",
    "<b>1.</b> Current apoapsis := Final periapsis <b>2.</b> Circularize orbit to reach final argument of periapsis <b>3.</b> Radius := Final apoapsis",
    "<b>1.</b> Circularize orbit at the current periapsis to reach final argument of periapsis <b>2.</b> Radius := Final apoapsis <b>3.</b> Remaining apsis := Final periapsis",
    "<b>1.</b> Circularize orbit at the current apoapsis to reach final argument of periapsis <b>2.</b> Radius := Final apoapsis <b>3.</b> Remaining apsis := Final periapsis",
    "<b>1.</b> Circularize orbit at the current periapsis to reach final argument of periapsis <b>2.</b> Radius := Final periapsis <b>3.</b> Remaining apsis := Final apoapsis",
    "<b>1.</b> Circularize orbit at the current apoapsis to reach final argument of periapsis <b>2.</b> Radius := Final periapsis <b>3.</b> Remaining apsis := Final apoapsis"
];

// toggles
document.getElementById("play-pause-btn").addEventListener('click', () => {
    if (typeof simulation !== 'undefined') {
        if (simulation.isRunning) {
            simulation.stop();
        } else {
            if (!loadingScreen.isRunning) {
                simulation.start();
            }
        }
    } else {
        window.onload = document.getElementById("orbit-submit-btn").click(); //initial simulation
    }
});

const speedSlider = document.getElementById("speed-slider");
const speedValue = document.getElementById("speed-value");
speedSlider.addEventListener("input", () => {
    if (typeof simulation !== "undefined") {
        if (speedSlider.value == "24") {
            speedValue.innerHTML = "1 day/s"
        } else {
            speedValue.innerHTML = speedSlider.value + " h/s";
        }
        simulation.speedMultiplier = parseInt(speedSlider.value);
        if (!simulation.isRunning){
            simulation.draw();
        }
    } else {
        speedSlider.value = 1;
    }
});

const orbitalPathCheckbox = document.getElementById("orbital-path-checkbox");
const velocityCheckbox = document.getElementById("velocity-checkbox");
const accelerationCheckbox = document.getElementById("acceleration-checkbox");

orbitalPathCheckbox.addEventListener('change', () => {
    if (typeof simulation !== "undefined") {
        if (orbitalPathCheckbox.checked) {
            simulation.showOrbitalPath = true;
        } else {
            simulation.showOrbitalPath = false;
        }
        if (!simulation.isRunning){
            simulation.draw();
        }
    }
});

velocityCheckbox.addEventListener('change', () => {
    if (typeof simulation !== "undefined") {
        if (velocityCheckbox.checked) {
            simulation.showVelocity = true;
        } else {
            simulation.showVelocity = false;
        }
        if (!simulation.isRunning){
            simulation.draw();
        }
    }
});

accelerationCheckbox.addEventListener('change', () => {
    if (typeof simulation !== "undefined") {
        if (accelerationCheckbox.checked) {
            simulation.showAcceleration = true;
        } else {
            simulation.showAcceleration = false;
        }
        if (!simulation.isRunning){
            simulation.draw();
        }
    }
});

// tabs
const orbitTabBtn = document.getElementById("orbit-tab-btn");
const maneuverTabBtn = document.getElementById("maneuver-tab-btn");
const orbitForm = document.getElementById("orbit-form-container");
const maneuverForm = document.getElementById("maneuver-form-container");


function handleOrbitTabClick() {
    if (!orbitTabBtn.classList.contains("active-tab")) {
        orbitTabBtn.classList.add("active-tab");
        maneuverTabBtn.classList.remove("active-tab");
        orbitForm.style.display = "block";
        maneuverForm.style.display = "none";
    }
}

function handlemaneuverTabClick() {
    if (!maneuverTabBtn.classList.contains("active-tab")) {
        maneuverTabBtn.classList.add("active-tab");
        orbitTabBtn.classList.remove("active-tab");
        maneuverForm.style.display = "block";
        orbitForm.style.display = "none";
    }
}

// forms
// syncs slider and value next to it
function syncSliderAndInput(id) {
    const slider = document.getElementById(id + "-slider");
    const value = document.getElementById(id + "-value");

    slider.addEventListener('input', () => {
        value.value = slider.value;
    });

    value.addEventListener('input', () => {
        slider.value = value.value.replace(/\.$/, ''); // so that eg. 12345. (decimal point without anything after) isn't NaN
    });

    value.addEventListener('blur', () => {
        clamp(id);
    });
}

// restricts value so it doesn't go out of bounds and puts values to min when inputs are empty
function clamp(id) {
    const slider = document.getElementById(id + "-slider");
    const value = document.getElementById(id + "-value");
    const min = parseFloat(document.getElementById(id + "-slider").min);
    const max = parseFloat(document.getElementById(id + "-slider").max);

    if (id == "orbit-arg" || id == "maneuver-arg-1" || id == "maneuver-arg-2") { //angle periodicity
        if (value.value == '') {
            value.value = 0;
            slider.value = 0;
        } else {
            let angle = parseFloat(value.value) % 360;
            angle = angle >= 0 ? angle : 360 + angle;
            value.value = angle;
            slider.value = angle;
        }
    } else {
        if (parseFloat(value.value) < min || value.value == '') {
            value.value = min;
            slider.value = min;
        }
        if (parseFloat(value.value) > max) {
            value.value = max;
            slider.value = max;
        }
    }
}

const sliderInputIds = ["orbit-axis", "orbit-ecc", "orbit-arg", "maneuver-axis-1", "maneuver-axis-2",
    "maneuver-ecc-1", "maneuver-ecc-2", "maneuver-arg-1", "maneuver-arg-2"
];
sliderInputIds.forEach((id) => {
    syncSliderAndInput(id);
});


// change eccentricity max so that periapsis is at least bigger than earth's radius + 160km which is the lowest altitude a satellite can be at
function changeMaxEcc(axisId, eccId) {
    orbitAxisValue = parseFloat(document.getElementById(axisId + "-value").value);
    if (!isNaN(orbitAxisValue)){
        eccMax = maxEcc(orbitAxisValue);
        document.getElementById(eccId + "-slider").max = Math.floor(eccMax * 1000) / 1000;
        clamp(eccId);
    }
}
function maxEcc(semiMajorAxis) {
    return 1 - (EARTH_RADIUS + 160)/semiMajorAxis;
}

function triggerChangeMaxEcc(axisId, eccId) {
    document.getElementById(axisId + "-slider").addEventListener('input', () => {
        changeMaxEcc(axisId, eccId);
    });
    document.getElementById(axisId+"-value").addEventListener('blur', () => {
        changeMaxEcc(axisId, eccId);
    });
    changeMaxEcc(axisId, eccId); //for the default values after the html loads
}

// orbit
triggerChangeMaxEcc("orbit-axis", "orbit-ecc");

// maneuvers
triggerChangeMaxEcc("maneuver-axis-1", "maneuver-ecc-1");
triggerChangeMaxEcc("maneuver-axis-2", "maneuver-ecc-2");

// save

const optToggle = document.getElementById("optimization-toggle");
const timeLabel = document.getElementById("time-label");
const fuelLabel = document.getElementById("fuel-label");

optToggle.addEventListener("mousedown", optToggleHandleEvent);
optToggle.addEventListener("touchstart", optToggleHandleEvent);

function optToggleHandleEvent(event) {
    event.preventDefault();
    if (optToggle.value == 1){
        optToggle.value = 0;
        timeLabel.style.fontWeight = "bold";
        timeLabel.style.border = "2px solid black";
        fuelLabel.style.fontWeight = "normal";
        fuelLabel.style.border = "none";
    } else {
        optToggle.value = 1;
        fuelLabel.style.fontWeight = "bold";
        fuelLabel.style.border = "2px solid black";
        timeLabel.style.fontWeight = "normal";
        timeLabel.style.border = "none";
    }
}

// autofill orbit form from maneuver form
document.getElementById("initial-orbit-title").addEventListener("click", () => {
    autofillOrbitForm(1);
})

document.getElementById("final-orbit-title").addEventListener("click", () => {
    autofillOrbitForm(2);
})

function autofillOrbitForm(id) {
    const attributes = ["axis", "ecc", "arg"];
    attributes.forEach((attr) => {
        document.getElementById("orbit-" + attr + "-value").value = document.getElementById("maneuver-" + attr + "-" + id + "-value").value;
        document.getElementById("orbit-" + attr + "-slider").value = document.getElementById("maneuver-" + attr + "-" + id + "-slider").value;
    });
    document.getElementById("orbit-tab-btn").click();
}

// info

// format time in s to h, m, s for info generating functions
function formatTime(time) {
    let hours = Math.floor(time/3600);
    let minutes = Math.floor((time % 3600)/60);
    let seconds = Math.floor(time % 60);

    return `${hours}h ${minutes}m ${seconds}s`;
}

const info = document.getElementById("info");
const velocityChartCtx = document.getElementById('velocity-chart');
let velocityChart;
const timeChartCtx = document.getElementById('time-chart');
let timeChart;

// creates line for info generating functions
function createLine(name, value) {
    info.innerHTML += '<b>' + name + ': </b>' + value + '<br>';
}

// creates title for info generating functions
function createTitle(name, color) {
    info.innerHTML += '<span class="info-title">' + name + '</span>' + 
    '<div style="width:20px;height:20px;margin-left:10px;display:inline-block;background-color:'+color+'"></div><br>';
}

// info helper function
function generateOrbitInfo(orbit) {
    createLine("Shape", orbit.isCircular ? "Circular" : "Elliptical");
    createLine("Semi-Major Axis", orbit.semiMajorAxis.toLocaleString() + " km");
    if (!orbit.isCircular) {
        createLine("Semi-Minor Axis", Math.round(orbit.semiMinorAxis).toLocaleString() + " km");
        createLine("Eccentricity", Math.round(orbit.e * 1000)/1000);
        createLine("Periapsis", Math.round(orbit.periapsis).toLocaleString() + " km");
        createLine("Apoapsis", Math.round(orbit.apoapsis).toLocaleString() + " km");
        createLine("Focal Distance", Math.round(orbit.focalDistance).toLocaleString() + " km");
    }
    createLine("Argument of Periapsis", Math.round(orbit.argumentOfPeriapsis * 180/Math.PI) + "°");
    if (!orbit.isCircular) {
        createLine("Velocity at Periapsis", Math.round(orbit.vPeriapsis).toLocaleString() + " m/s");
        createLine("Velocity at Apoapsis", Math.round(orbit.vApoapsis).toLocaleString() + " m/s");
    } else {
        createLine("Velocity", Math.round(orbit.vPeriapsis).toLocaleString() + " m/s");
    }
    createLine("Orbital Period", formatTime(orbit.orbitalPeriod));
}

// orbit info
function updateOrbitInfo(orbit) {  

    info.innerHTML = "";
    if (typeof velocityChart !== "undefined") {
        velocityChart.destroy();
        timeChart.destroy();
    }
    velocityChartCtx.style.display='none';
    timeChartCtx.style.display='none';

    generateOrbitInfo(orbit);

    // credit
    info.innerHTML += '<div id="credit" style=""> To see more of my projects, visit <a href="https://mathusan.net">mathusan.net</a></div>';
}

// maneuver info
function updateManeuverInfo(orbits, burns, totalDeltaVList, totalDeltaTList, stratId, optimization) {

    // chart.js makes min bar nearly invisible, this function is to make min bar more visible
    // since min bar is for the chosen strategy
    function barChartMin(min, max) {
        let minValue = min - (max - min)/2;
        if ((max - min) == 0) {
            minValue = minValue - 10; // so the bar is not invisible
        }
        minValue = minValue < 0 ? 0: minValue;
        let precision = (max - min).toString().length - 1;
        return Math.floor(minValue/(10 ** precision))*(10 ** precision);
    }

    info.innerHTML = "";

    if (typeof velocityChart !== "undefined") {
        velocityChart.destroy();
        timeChart.destroy()
    }
    velocityChartCtx.style.display='block';
    timeChartCtx.style.display='block';

    let velocityChartBgColor = new Array(totalDeltaVList.length).fill('rgba(100, 100, 200, 0.2)');
    let velocityChartBorderColor = new Array(totalDeltaVList.length).fill('rgba(0, 0, 200, 0.7)');
    velocityChartBgColor[stratId] = 'rgba(0, 160, 0, 0.2)';
    velocityChartBorderColor[stratId] = 'rgba(30, 100, 30, 0.7)';

    let timeChartBgColor = new Array(totalDeltaVList.length).fill('rgba(200, 100, 100, 0.2)');
    let timeChartBorderColor = new Array(totalDeltaVList.length).fill('rgba(200, 0, 0, 0.7)');
    timeChartBgColor[stratId] = 'rgba(0, 160, 0, 0.2)';
    timeChartBorderColor[stratId] = 'rgba(30, 100, 30, 0.7)';

    velocityChart = new Chart(velocityChartCtx, {
        type: 'bar',
        data: {
          labels: ['1', '2', '3', '4', '5', '6', '7', '8'],
          datasets: [{
            label: 'Total Δv',
            data: totalDeltaVList,
            borderWidth: 1,
            backgroundColor: velocityChartBgColor,
            borderColor: velocityChartBorderColor
          }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    min: barChartMin(Math.min(...totalDeltaVList), Math.max(...totalDeltaVList)),
                    title: {
                        display: true,
                        text: 'Total Δv (m/s)',
                        font: {
                            size: 14
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Strategies',
                        font: {
                            size: 14
                        },
                        padding: {
                            top: -4
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // it is displayed by default
                },
                title: {
                    display: true,
                    text: 'Total Δv Across Strategies',
                    font: {
                        size: 14
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            let value = tooltipItems[0].label; 
                            return `Strategy ${value}`;
                        },
                        label: function(tooltipItem) {
                            let value = (tooltipItem.raw).toLocaleString(); // Get the value of the bar and format it
                            
                            // Append the unit
                            return `Total Δv: ${value} m/s`; // Example unit: meters per second
                        }
                    }
                }
            }
        }
    });

    timeChart = new Chart(timeChartCtx, {
        type: 'bar',
        data: {
          labels: ['1', '2', '3', '4', '5', '6', '7', '8'],
          datasets: [{
            label: 'Total Δt',
            data: totalDeltaTList,
            borderWidth: 1,
            backgroundColor: timeChartBgColor,
            borderColor: timeChartBorderColor
          }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    min: barChartMin(Math.min(...totalDeltaTList), Math.max(...totalDeltaTList)),
                    title: {
                        display: true,
                        text: 'Total Δt (s)',
                        font: {
                            size: 14
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Strategies',
                        font: {
                            size: 14
                        },
                        padding: {
                            top: -4
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // it is displayed by default
                },
                title: {
                    display: true,
                    text: 'Total Δt Across Strategies',
                    font: {
                        size: 14
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            let value = tooltipItems[0].label; 
                            return `Strategy ${value}`;
                        },
                        label: function(tooltipItem) {
                            let value = tooltipItem.raw; // Get the value of the bar and format it
                            
                            // Append the unit
                            return `Total Δt: ${formatTime(value)}`;
                        }
                    }
                }
            }
        }
    });
    info.innerHTML += '<br>';
    createTitle("Strategy " + (stratId+1) + ": The Most " + (optimization ? "Fuel" : "Time") + "-Efficient Maneuver" , null);
    
    stratAlgHTML = "";
    stratAlgHTML += '<div id="strat-tooltip-hover-container">';
    stratAlgHTML += '<b>' + "Strategy " + (stratId+1) + " Algorithm" + ': </b>' + stratAlgs[stratId] + '<br>';
    stratAlgHTML += '<span id="strat-tooltip">';
    stratAlgs.forEach((alg, id) => {
        stratAlgHTML += '<b> Strategy ' + (id + 1) +': </b>';
        stratAlgHTML += alg;
        if (id != stratAlgs.length - 1) {
            stratAlgHTML += '<br>';
        }
    });
    stratAlgHTML += '</span>';
    stratAlgHTML += '</div>';
    info.innerHTML += stratAlgHTML;

    createLine("Optimization Objective", "Minimize " + (optimization ? "fuel used during burns (proportional to total Δv)" : "time spent in transfer orbits"));
    createLine("Total Δv", totalDeltaVList[stratId].toLocaleString() + " m/s");
    createLine("Total Δt", formatTime(totalDeltaTList[stratId]));
    createLine("Number of Burns", burns.length);
    createLine("Number of Transfer Orbits", burns.length - 1);
    info.innerHTML += '<br>';

    orbits.forEach((orbit, id) => {
        createTitle(orbitTypeTitleMap[orbit.type], orbitTypeColorMap[orbit.type]);
        generateOrbitInfo(orbit);
        if (orbit.type != "end") {
            info.innerHTML+= '<br>';
            createTitle("Burn " + (id + 1), orbitTypeColorMap[orbit.type]);
            createLine("Δv", Math.abs(burns[id]).toLocaleString() + " m/s");
            createLine("Direction", burns[id] > 0? "Prograde":"Retrograde");

            let location1 = orbitTypeTitleMap[orbit.type] + " @ ";
            let theta1 = orbit["endArg"] % (2 * Math.PI);
            location1 += Math.round((theta1/(2 * Math.PI)) * 360) + "°";
            if (theta1 == 0) {
                location1 += " (periapsis)"
            } else if  (theta1 == Math.PI) {
                location1 += " (apoapsis)"
            }
            createLine("Location", location1);

            let location2 = orbitTypeTitleMap[orbits[id + 1].type] + " @ ";
            let theta2 = orbits[id + 1]["startArg"] % (2 * Math.PI);
            location2 += Math.round((theta2/(2 * Math.PI)) * 360) + "°";
            if (theta2 == 0) {
                location2 += " (periapsis)"
            } else if  (theta2 == Math.PI) {
                location2 += " (apoapsis)"
            }
            createLine("Target", location2);

            createLine("Thrust Mode", "Impulse");
            info.innerHTML+= '<br>';
        }   
    })

    // credit
    info.innerHTML += '<div id="credit" style=""> To see more of my projects, visit <a href="https://mathusan.net">mathusan.net</a></div>';
}
