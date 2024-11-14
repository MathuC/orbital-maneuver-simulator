document.getElementById('orbit-form').addEventListener('submit', submitOrbitForm);

function submitOrbitForm(event) {
        // start loading screen
        // loading screen will be a 3D animation of big earth and satellite orbiting it but coming close to us and going behind earth

        // so the values aren't out of bounds
        const orbitSliderInputIds = ["orbit-ecc", "orbit-axis", "orbit-arg"];
        orbitSliderInputIds.forEach((id) => {
            clamp(id);
        });
        
        event.preventDefault(); // Prevent the default form submission and page reload
        const formData = new FormData(event.target); // Get form data

        fetch('/submit-orbit-form/', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (typeof simulation !== 'undefined') {
                simulation.stop();
            }
            simulation = new Simulation(data.semi_major_axis, data.semi_minor_axis, data.focal_distance, data.eccentricity, data.periapsis, 
                data.apoapsis, data.argument_of_periapsis, data.orbital_period, data.max_length
            );
            generateInfo(data.semi_major_axis, data.semi_minor_axis, data.focal_distance, data.eccentricity, data.periapsis, data.apoapsis, 
                data.argument_of_periapsis, data.orbital_period
            );
            simulation.start();
        })
        .catch(error => console.error('Error:', error))
        .finally(() => {
            //stop the loading screen
        });
    
}

function submitManeuverForm(event) {

}