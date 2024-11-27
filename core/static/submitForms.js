document.getElementById('orbit-form').addEventListener('submit', submitOrbitForm);

function submitOrbitForm(event) {
    event.preventDefault(); // Prevent the default form submission and page reload

    if (!loadingScreen.isRunning) {
        const formData = new FormData(event.target); // Get form data
        let orbit = new Orbit(formData.get("orbit-axis-value"), formData.get("orbit-ecc-value"), formData.get("orbit-arg-value"));

        // stop simulation and start loading screen
        if (typeof simulation !== 'undefined') {
            simulation.stop();
        }
        loadingScreen.start();

        // so the values aren't out of bounds
        const orbitSliderInputIds = ["orbit-ecc", "orbit-axis", "orbit-arg"];
        orbitSliderInputIds.forEach((id) => {
            clamp(id);
        });
 
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