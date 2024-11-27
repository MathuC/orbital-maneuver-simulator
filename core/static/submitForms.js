document.getElementById('orbit-form').addEventListener('submit', submitOrbitForm);

function submitOrbitForm(event) {
    event.preventDefault(); // Prevent the default form submission and page reload

    if (!loadingScreen.isRunning) {

        const formData = new FormData(event.target); // Get form data

        orbitFormValidator(formData);

        let orbit = new Orbit(parseInt(formData.get("orbit-axis-value")), parseFloat(formData.get("orbit-ecc-value")), parseInt(formData.get("orbit-arg-value")));

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
            simulation = new OrbitSimulation(orbit, data.max_length);
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
    } else {
        // float to int conversion
        formData.set("orbit-axis-value", String(parseInt(formData.get("orbit-axis-value"))));
        formData.set("orbit-arg-value", String(parseInt(formData.get("orbit-arg-value"))));

        // min max check
        if (parseFloat(formData.get("orbit-axis-value")) > 50000) {
            formData.set("orbit-axis-value", "50000");
        } else if (parseFloat(formData.get("orbit-axis-value")) < 6531) {
            formData.set("orbit-axis-value", "6531");
        }

        if (parseFloat(formData.get("orbit-ecc-value")) > maxEcc(formData.get("orbit-axis-value"))) {
            formData.set("orbit-ecc-value",  maxEcc(formData.get("orbit-axis-value")));
        } else if (parseFloat(formData.get("orbit-ecc-value")) < 0) {
            formData.set("orbit-ecc-value",  "0");
        }
    }

    if (!emptyCheck) {
        alert("Input cannot be empty.");
    } else if (!regexpCheck) {
        alert("Invalid input! Only digits and one decimal point are allowed. ");
    }
}