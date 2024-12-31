document.getElementById('orbit-form').addEventListener('submit', submitOrbitForm);
document.getElementById('maneuver-form').addEventListener('submit', submitManeuverForm);

function submitManeuverForm(event) {
    event.preventDefault();

    if (!loadingScreen.isRunning) {
        if (typeof simulation !== 'undefined') {
            simulation.stop();
        }
        loadingScreen.start();

        const formData = new FormData(event.target);
        formValidator(formData);

        fetch('/submit-maneuver-form/', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            let orbits = [];
            data.orbits.forEach((orbit, id) => {
                if (id == 0) {
                    orbits.push(new Orbit(orbit.axis, orbit.ecc, orbit.arg, "start", orbit.start_arg, orbit.end_arg));
                } else if (id == data.orbits.length - 1) {
                    orbits.push(new Orbit(orbit.axis, orbit.ecc, orbit.arg, "end", orbit.start_arg, false));
                } else if (id == 1 && data.orbits.length >= 3) {
                    orbits.push(new Orbit(orbit.axis, orbit.ecc, orbit.arg, "transfer1", orbit.start_arg, orbit.end_arg));
                } else if (id == 2 && data.orbits.length == 4) {
                    orbits.push(new Orbit(orbit.axis, orbit.ecc, orbit.arg, "transfer2", orbit.start_arg, orbit.end_arg));
                }
            });
            simulation = new ManeuverSimulation(orbits, data.burns, data.max_length, data.earth_pos);
            loadingScreen.stop();
            simulation.start();
            generateManeuverInfo(orbits, data.burns);
        })
        .catch(error => {
            alert('Error: '+ error); 
            location.reload();
        });    
    }
}

function submitOrbitForm(event) {
    event.preventDefault(); // Prevent the default form submission and page reload

    if (!loadingScreen.isRunning) {

        // stop simulation and start loading screen
        if (typeof simulation !== 'undefined') {
            simulation.stop();
        }
        loadingScreen.start();

        const formData = new FormData(event.target); // Get form data

        formValidator(formData); // has to be before orbit definition since validator could put formData values to default

        let orbit = new Orbit(parseInt(formData.get("orbit-axis-value")), parseFloat(formData.get("orbit-ecc-value")), parseInt(formData.get("orbit-arg-value")) * (Math.PI / 180), "constant", false, false);
 
        fetch('/submit-orbit-form/', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            simulation = new OrbitSimulation(orbit, data.max_length);
            loadingScreen.stop();
            simulation.start();
            generateOrbitInfo(orbit);
        })
        .catch(error => {
            alert('Error: '+ error); 
            location.reload();
        });
    }
}

function formValidator(formData) {
    let isManeuverForm = formData.has("maneuver-axis-1-value");
    let ids = isManeuverForm ? ["maneuver-axis-1", "maneuver-ecc-1",
        "maneuver-arg-1", "maneuver-axis-2", "maneuver-ecc-2", "maneuver-arg-2"] : 
        ["orbit-axis", "orbit-ecc", "orbit-arg"];
    
    let regexpCheck = true;
    ids.forEach(id => {
        regexpCheck = regexpCheck &&  /^[0-9]+\.?([0-9]+)?$/.test(formData.get(id + "-value"));
    });
    let emptyCheck = true;
    ids.forEach(id => {
        let value = formData.get(id + "-value");
        emptyCheck = emptyCheck && (value !== '' && value != null && value != undefined);
    });

    let diffOrbitsCheck = true;

    if (regexpCheck && emptyCheck) {
        ids.forEach((idString, id) => {
            if (id % 3 == 0) { // axis
                if (parseFloat(formData.get(idString + "-value")) > 50000) {
                    formData.set(idString + "-value", "50000");
                } else if (parseFloat(formData.get(idString + "-value")) < 6531) {
                    formData.set(idString + "-value", "6531");
                }

                // int conversion
                formData.set(idString + "-value", parseInt(formData.get(idString + "-value")));
            
            } else if (id % 3 == 1) { // ecc
                if (parseFloat(formData.get(idString + "-value")) > maxEcc(formData.get(ids[id-1] + "-value"))) {
                    formData.set(idString + "-value",  maxEcc(formData.get(ids[id-1] + "-value")));
                } else if (parseFloat(formData.get(idString + "-value")) < 0) {
                    formData.set(idString + "-value",  "0");
                }

            } else { // arg

                // int conversion
                formData.set(idString + "-value", parseInt(formData.get(idString + "-value")) % 360 );
            }
        });

        if (isManeuverForm) {
            sameOrbits = true;
            for (let i = 0; i < 3; i++) {
                sameOrbits = sameOrbits && (formData.get(ids[i]+ '-value') == formData.get(ids[i+3] + '-value'));
            }
            diffOrbitsCheck = !sameOrbits;
        }
    }

    if (!(emptyCheck && regexpCheck && diffOrbitsCheck)) {

        // if invalid inputs, everything is put back to default

        let defaultVals = isManeuverForm ? ["15168", "0.569", "39", "9660", "0.226", "137"] : ["12345", "0.420", "69"];

        ids.forEach((id, n) => {
            formData.set(id + "-value", defaultVals[n]);
            document.getElementById(id + "-value").value = defaultVals[n];
            document.getElementById(id + "-slider").value = defaultVals[n];
        });

        if (!emptyCheck) {
            alert("Input cannot be empty.");
        } else if (!regexpCheck) {
            alert("Invalid input! Only digits and one decimal point are allowed. ");
        } else {
            alert("Initial and final orbits have to be different.");
        }
        
    }
}