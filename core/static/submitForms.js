document.getElementById('orbit-form').addEventListener('submit', submitOrbitForm);

function submitOrbitForm(event) {
    event.preventDefault(); // Prevent the default form submission and page reload

    if (!loadingScreen.isRunning) {

        const formData = new FormData(event.target); // Get form data

        orbitFormValidator(formData);

        let orbit = new Orbit(formData.get("orbit-axis-value"), formData.get("orbit-ecc-value"), formData.get("orbit-arg-value"));

        // stop simulation and start loading screen
        if (typeof simulation !== 'undefined') {
            simulation.stop();
        }
        loadingScreen.start();
 
        fetch('/submit-orbit-form/', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            simulation = new OrbitSimulation(data.semi_major_axis, data.semi_minor_axis, data.focal_distance, data.eccentricity, data.periapsis, 
                data.apoapsis, data.argument_of_periapsis, data.orbital_period, data.max_length
            );
            generateOrbitInfo(orbit);
            loadingScreen.stop();
            simulation.start();
        })
        .catch(error => console.error('Error:', error));
    }
}

function submitManeuverForm(event) {

}

function orbitFormValidator(formData) {
    let regexpCheck = /^[0-9]+\.?([0-9]+)?$/.test(formData.get("orbit-axis-value")) && 
        /^[0-9]+\.?([0-9]+)?$/.test(formData.get("orbit-ecc-value")) && 
        /^[0-9]+\.?([0-9]+)?$/.test(formData.get("orbit-arg-value")); 
    let emptyCheck = formData.get("orbit-axis-value") != '' && formData.get("orbit-ecc-value") != '' && 
        formData.get("orbit-arg-value") != '';

    if (!(regexpCheck && emptyCheck)) {
        // if invalid inputs, everything is put back to default
        let ids = ["orbit-axis", "orbit-ecc", "orbit-arg"];
        let defaultVals = ["12345", "0.420", "69"];
        ids.forEach((id, n) => {
            formData.set(id + "-value", defaultVals[n]);
            document.getElementById(id + "-value").value = defaultVals[n];
            document.getElementById(id + "-slider").value = defaultVals[n];
        });
    }

    if (!emptyCheck) {
        alert("Input cannot be empty.");
    } else if (!regexpCheck) {
        alert("Invalid input! Only digits and one decimal point are allowed. ");
    }
}