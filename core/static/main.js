const EARTH_RADIUS = 6371;

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
        slider.value = value.value;
    });

    value.addEventListener('blur', () => {
        clamp(id);
    });
}

// restricts value so it doesn't go out of bounds
function clamp(id) {
    const slider = document.getElementById(id + "-slider");
    const value = document.getElementById(id + "-value");
    const min = parseFloat(document.getElementById(id + "-slider").min);
    const max = parseFloat(document.getElementById(id + "-slider").max);

    if (id == "orbit-arg") { //angle periodicity
        let angle = parseFloat(value.value) % 360;
        angle = angle >= 0 ? angle : 360 + angle;
        value.value = angle;
        slider.value = value.value;
    } else {
        if (parseFloat(value.value) < min) {
            value.value = min;
        }
        if (parseFloat(value.value) > max) {
            value.value = max;
        }
    }
}

const sliderInputIds = ["orbit-ecc", "orbit-axis", "orbit-arg"];
sliderInputIds.forEach((id) => {
    syncSliderAndInput(id);
});

// change eccentricity max so that periapsis is at least bigger than earth's radius + 160km which is the lowest altitude a satellite can be at
function changeEccMax() {
    orbitAxisValue = document.getElementById("orbit-axis-value").value;
    eccMax = 1 - (EARTH_RADIUS + 160)/orbitAxisValue
    document.getElementById("orbit-ecc-slider").max = Math.floor(eccMax * 1000) / 1000;
    clamp("orbit-ecc");
}

document.getElementById("orbit-axis-slider").addEventListener('input', () => {
    changeEccMax();
});

document.getElementById("orbit-axis-value").addEventListener('blur', () => {
    changeEccMax();
});

changeEccMax();

// info
function generateOrbitInfo(semiMajorAxis, semiMinorAxis, focalDistance, e, periapsis, apoapsis, 
    argumentOfPeriapsis, orbitalPeriod) 
{   
    const info = document.getElementById("info");
    info.innerHTML = "";
    function createLine(name, value, unit) {
        info.innerHTML += "<b>" + name + ": </b>" + value + ((typeof unit !== 'undefined') ? (" " + unit) : "") + "<br>";
    }

    function formatTime(time) {
        let hours = Math.floor(time/3600);
        let minutes = Math.floor((time % 3600)/60);
        let seconds = Math.floor(time % 60);

        return `${hours}h ${minutes}m ${seconds}s`;
    }
    
    createLine("Semi-major axis", semiMajorAxis, "km");
    createLine("Semi-minor axis", Math.round(semiMinorAxis), "km");
    createLine("Eccentricity", e);
    createLine("Periapsis", Math.round(periapsis), "km");
    createLine("Apoapsis", Math.round(apoapsis), "km");
    createLine("Focal distance", Math.round(focalDistance), "km");
    createLine("Argument of periapsis", Math.round(argumentOfPeriapsis * 180/Math.PI), "°");
    createLine("Orbital period", formatTime(orbitalPeriod));

    // credit
    info.innerHTML += '<div id="credit" style=""> To see more of my projects, visit <a href="https://mathusan.net">mathusan.net</a></div>';
}