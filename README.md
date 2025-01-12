# Orbital Maneuver Simulator

The [Orbital Maneuver Simulator](https://www.orbitalmaneuversimulator.com/) is designed to model and visualize satellite orbits and coplanar orbital maneuvers. 
Whether you're a student, an aerospace enthusiast or a professional, this tool makes understanding orbital maneuvers more intuitive and interactive.
## Demo

# Project Architecture
## Tech stack
 - **Frontend:** HTML, CSS, Javascript. Canvas.js for the 2D simulation. Chart.js for the charts in the information panel.
 - **Backend:** Built with Django. Deployed with DigitalOcean, Gunicorn, Nginx, Docker Compose and GitHub Actions.
## Important files
### Frontend
`core/static/canvas.js` contains all of the logic for the simulation.
  - `OrbitSimulation` class
    - `eccentricAnomalie()` performs 8 iterations of Newton's method starting with the mean anomaly as the initial guess to estimate the eccentric anomaly from Kepler's equation $M = E - e \cdot \sin(E)$, which is a transcendental equation meaning it does not have a closed-form solution. 8 iterations reduce the maximum error to below $1 \times 10^{-15}$, ensuring extremely smooth satellite movement.
  - `ManeuverSimulation` class
  - `Orbit` class

`core/static/main.js` contains all of the functions that handle user interactions.

`core/static/submitForm.js` handles sending data to the backend and receiving the processed response to then start the simulation.

### Backend
`core/utils.py` houses the key functions that process the user's data, makes all of the necessary calculations to provide the essential information needed for the simulation.
  - `process_maneuver_data()` iterates through 8 strategies to find the best strategy for the orbital maneuver according to the optimization criteria provided by the user: *Save fuel* or *Save time*.
  - `process_orbit_data()`
  - `ellipse_bounding_box()` returns the length and width of a bounding box for a rotated ellipse. Calculates the roots of the derivatives of the parametric equations that define the rotated ellipse to find the four edges of the bouding box. Crucial for fitting the different orbits inside the canvas.
  - `max_length_earth_pos()` returns the spatial scale and earth's position based on the bounding boxes of all of the rotated ellipses representing the orbits.

# Installation and Running the Development Server
**Prerequisites:** Python 3 and a web browser
1. Clone the repository:
```bash
git clone https://github.com/MathuC/orbital-maneuver-simulator.git
```
2. Create and activate a virtual environment:
 - macOS/Linux:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```
 - Windows:
  ```batch
  python -m venv venv
  venv\Scripts\activate
  ```
3. Install Dependencies:
```bash
pip install -r requirements.txt
```
4. Start the Development Server:
```bash
python manage.py runserver
```
5. Access the app in your browser:
 - Open your browser and navigate to http://127.0.0.1:8000/ to view the application.

# Contributing
 - To inform us about bugs or about enhancement you think the web app can benefit from, [submit a new issue](https://github.com/MathuC/orbital-maneuver-simulator/issues/new) on GitHub.
 - To contribute to the code, fork the repository, commit your changes, squash your commits, and then submit a Pull Request.

# Future enhancements 
- [x] 3 more orbital maneuver strategies
- [x] Add *Save time* optimization criteria in the form
- [x] 4 more orbital maneuver strategies with circularization of orbit as the first step
- [ ] Add inclination and longitude of the ascending node in the form
- [ ] Add initial true anomalie of the satellite in the form
