const EARTH_RADIUS = 6371;
const orbitTypeColorMap = {"start": "rgba(30, 144, 255, 1)", "transfer1": "rgba(255, 0, 255, 1)", 
    "transfer2": "rgba(255, 140, 0, 1)", "end": "rgba(255, 255, 0, 1)"};
const orbitTypeTitleMap = {"start": "Initial Orbit", "transfer1": "Transfer Orbit 1", 
    "transfer2": "Transfer Orbit 2", "end": "Final Orbit"};

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



// format time for info generating functions
function formatTime(time) {
    let hours = Math.floor(time/3600);
    let minutes = Math.floor((time % 3600)/60);
    let seconds = Math.floor(time % 60);

    return `${hours}h ${minutes}m ${seconds}s`;
}


// info

const info = document.getElementById("info");

// create line for info generating functions
function createLine(name, value) {
    info.innerHTML += '<b>' + name + ': </b>' + value + '<br>';
}

// orbit info
function generateOrbitInfo(orbit) {  

    const info = document.getElementById("info");
    info.innerHTML = "";
    
    createLine("Semi-Major Axis", orbit.semiMajorAxis.toLocaleString() + " km");
    createLine("Semi-Minor Axis", Math.round(orbit.semiMinorAxis).toLocaleString() + " km");
    createLine("Eccentricity", orbit.e);
    createLine("Periapsis", Math.round(orbit.periapsis).toLocaleString() + " km");
    createLine("Apoapsis", Math.round(orbit.apoapsis).toLocaleString() + " km");
    createLine("Focal Distance", Math.round(orbit.focalDistance).toLocaleString() + " km");
    createLine("Argument of Periapsis", Math.round(orbit.argumentOfPeriapsis * 180/Math.PI) + "°");
    createLine("Orbital Period", formatTime(orbit.orbitalPeriod));

    // credit
    info.innerHTML += '<div id="credit" style=""> To see more of my projects, visit <a href="https://mathusan.net">mathusan.net</a></div>';
}

// maneuver info
function generateManeuverInfo(orbits, burns, totalDeltaVList, stratId) {

    info.innerHTML = "";

    function createTitle(name, color) {
        info.innerHTML += '<span class="info-title">' + name + '</span>' + 
        '<div style="width:20px;height:20px;margin-left:10px;display:inline-block;background-color:'+color+'"></div><br>';
    }

    createTitle("Total Δv: "+totalDeltaVList[stratId].toLocaleString() +" m/s");
    info.innerHTML += '<br>';

    const chartCtx = document.getElementById('myChart');

    new Chart(chartCtx, {
        type: 'bar',
        data: {
          labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
          datasets: [{
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3],
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });

    orbits.forEach((orbit, id) => {
        createTitle(orbitTypeTitleMap[orbit.type], orbitTypeColorMap[orbit.type]);
        createLine("Semi-Major Axis", orbit.semiMajorAxis.toLocaleString() + " km");
        createLine("Semi-Minor Axis", Math.round(orbit.semiMinorAxis).toLocaleString() + " km");
        createLine("Eccentricity", Math.round(orbit.e * 1000)/1000);
        createLine("Periapsis", Math.round(orbit.periapsis).toLocaleString() + " km");
        createLine("Apoapsis", Math.round(orbit.apoapsis).toLocaleString() + " km");
        createLine("Focal Distance", Math.round(orbit.focalDistance).toLocaleString() + " km");
        createLine("Argument of Periapsis", Math.round(orbit.argumentOfPeriapsis * 180/Math.PI) + "°");
        createLine("Orbital Period", formatTime(orbit.orbitalPeriod));
        info.innerHTML+= '<br>';
        if (orbit.type != "end") {
            createTitle("Burn " + (id + 1), orbitTypeColorMap[orbit.type]);
            createLine("Orbit", orbitTypeTitleMap[orbit.type]);
            let theta = orbit["endArg"] % (2 * Math.PI);
            let location = Math.round((theta/(2 * Math.PI)) * 360) + "°";
            if (theta == 0) {
                location += " (periapsis)"
            } else if  (theta == Math.PI) {
                location += " (apoapsis)"
            }
            createLine("True Anomaly", location);
            createLine("Δv", Math.abs(burns[id]).toLocaleString() + " m/s");
            createLine("Direction", burns[id] > 0? "Prograde":"Retrograde");
            createLine("Thrust Mode", "Impulse");
            info.innerHTML+= '<br>';
        }   
    })

    // credit
    info.innerHTML += '<div id="credit" style=""> To see more of my projects, visit <a href="https://mathusan.net">mathusan.net</a></div>';
}
