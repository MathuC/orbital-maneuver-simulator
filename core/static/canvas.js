let canvas = document.getElementById('canvas');
let ctx = canvas.getContext("2d");

const G = 6.67430e-11
const EARTH_DIAMETER = 6371 * 2;
const EARTH_MASS = 5.972e24;

/* 
 * redraw every 10 ms
 * leave 50 pixels around the canvas so the orbits aren't stuck to the
 * the border which is 600 x 600 pixels so the drawing canvas is 500 x 500 pixels (600-50-50)
 * default: periapsis on the right
 * default: counter clockwise orbit
 * default: 1h/s
 * argument of periapsis is the counterclockwise angle between the semi-major axis and the x-axis
 */

class ManeuverSimulation {
    constructor(orbits, burns, maxLength, earthPos) {
        this.animation;
        this.time = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.speedMultiplier = parseInt(speedSlider.value);
        this.scale = Math.floor(maxLength/5) + " km";
        this.showOrbitalPath  = orbitalPathCheckbox.checked;
        this.showVelocity = velocityCheckbox.checked;
        this.showAcceleration = accelerationCheckbox.checked;
        this.maxVectorSize = 250;
        this.maxBurnVectorSize = 100;

        // orbits
        this.orbits = orbits;
        this.currentOrbitId = 0; // pointer to the current orbit
        this.burns = burns;
        this.kmPerPixel = maxLength/500;

        // stars
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push([Math.floor(Math.random() * 501) -250, Math.floor(Math.random() * 501) -250, Math.random()]);
        }

        // earth
        this.earthArg = 0;
        this.earthDiameter = EARTH_DIAMETER/this.kmPerPixel;
        this.earthPos = [earthPos[0]/this.kmPerPixel, -earthPos[1]/this.kmPerPixel] // because of how to canvas work, y's sign needs to be flipped
        
        // satellite
        this.satLength = 35;
        // polar function describing orbital path - Kepler's first law
        this.satRadius = function(theta) {
            let orbit = this.orbits[this.currentOrbitId];
            return ((orbit.semiMajorAxis/this.kmPerPixel) * (1 - orbit.e**2))/(1 + orbit.e * Math.cos(theta));
        }

        // vectors
        this.maxVelocityFactor = 0
        this.maxAccelerationFactor = 0
        this.orbits.forEach((orbit) => {
            let maxV = Math.sqrt(2/(orbit.periapsis/this.kmPerPixel) - 1/(orbit.semiMajorAxis/this.kmPerPixel));
            let maxA = 1/((orbit.periapsis/this.kmPerPixel) ** 2);
            this.maxVelocityFactor = Math.max(maxV, this.maxVelocityFactor);
            this.maxAccelerationFactor = Math.max(maxA, this.maxAccelerationFactor);
        })
        this.maxBurn = 0
        this.burns.forEach((burn) => {
            this.maxBurn = Math.max(this.maxBurn, Math.abs(burn));
        })
        

        this.meanAnomalie = function() {
            let orbit = this.orbits[this.currentOrbitId];
            return (this.time * 36 * 2 * Math.PI)/orbit.orbitalPeriod + (orbit.startArg ? orbit.startArg : 0);
        }

        this.eccentricAnomalie = function () {
            let orbit = this.orbits[this.currentOrbitId];
            // Newton's method with Kepler's equation M = E - e * sin(E). 
            // It is a transcendental equation: no closed form solution, so numerical methods are necessary to estimate E
            const f = (E) => E - orbit.e * Math.sin(E) - this.meanAnomalie();
            const df_dE = (E) => 1 - orbit.e * Math.cos(E);
            let E = this.meanAnomalie(); // initial guess for E
            let E_next;
            // 8 iterations reduce max error to under 1e-15 for the highest eccentricity possible (0.869)
            for (let i = 0; i < 10; i++) {
                E_next = E - f(E)/df_dE(E);
                E = E_next;
            }
            return E;
        }

        this.trueAnomalie = function () {
            let orbit = this.orbits[this.currentOrbitId];
            if (orbit.isCircular) {
                return this.meanAnomalie(); // for circular orbits, true anomalie is the same as mean anomalie
            } else {
                let theta = 2 * Math.atan2(Math.sqrt(1 + orbit.e) * Math.tan(this.eccentricAnomalie()/2), Math.sqrt(1 - orbit.e));
                if (theta < 0) {
                    theta += 2* Math.PI;
                } 
                return theta;
            }
        }

        // satellite position according to the center of the earth
        this.satPosition = function() {
            let theta = this.trueAnomalie();
            let radius = this.satRadius(theta);
            return [Math.cos(theta) * radius, -Math.sin(theta) * radius];
        }

        this.orbitPosition = function(orbit, theta) {
            let radius = ((orbit.semiMajorAxis/this.kmPerPixel) * (1 - orbit.e**2))/(1 + orbit.e * Math.cos(theta));
            return [Math.cos(theta) * radius, -Math.sin(theta) * radius];
        }

        // velocity vector
        this.velocity = () => {
            let orbit = this.orbits[this.currentOrbitId];
            let theta = this.trueAnomalie();
            let velocityFactor = Math.sqrt(2/this.satRadius(theta) - 1/(orbit.semiMajorAxis/this.kmPerPixel));  // Proportional to true speed
            let velocityRatio = velocityFactor/this.maxVelocityFactor;
            let [x,y] = this.satPosition();
            let velocityRatioX;
            let velocityRatioY;
            if (theta != 0 && theta != Math.PI) { // when theta is equal to 0 or Math.PI, y will be 0, m will be infinite (vertical slope)
                let m = -((orbit.semiMinorAxis ** 2) * (x + orbit.focalDistance/this.kmPerPixel))/((orbit.semiMajorAxis ** 2) * y); // slope of the velocity vector 
                // added this.orbits[this.currentOrbitId].focalDistance to x so that x and y are from the center of the ellipse, so that the equation works mathematically
                velocityRatioX = velocityRatio/(Math.sqrt(1 + m**2)); 
                if (theta % (2 * Math.PI) < Math.PI) { // determining x's direction in the orbit
                    velocityRatioX *= -1;
                }
                velocityRatioY = m * velocityRatioX;
            } else { 
                velocityRatioX = 0;
                velocityRatioY = theta == 0 ? -velocityRatio: velocityRatio; 
                // when theta is 0, y will be positive which is negative in canvas and vice versa for when theta is Math.PI
            }
            return [velocityRatioX, velocityRatioY];
        }

        // acceleration vector
        this.acceleration = () => {
            let theta = this.trueAnomalie();
            let accelerationFactor = 1/(this.satRadius(theta) ** 2); // Proportional to true acceleration magnitude - Newton's law of universal gravitation
            let accelerationRatio = accelerationFactor/this.maxAccelerationFactor;
            let accelerationRatioX = -accelerationRatio * Math.cos(theta);
            let accelerationRatioY = accelerationRatio * Math.sin(theta);
            return [accelerationRatioX, accelerationRatioY];
        }

        // burn vectors
        // similar strategy as velocity vector
        this.burnVectors = [];
        this.burns.forEach((burn, id) => {
            let orbit = this.orbits[id];
            let theta = orbit['endArg'] % (2 * Math.PI);
            let [x,y] = this.orbitPosition(orbit, theta);
            let burnRatio = Math.abs(burn)/this.maxBurn;

            let burnRatioX;
            let burnRatioY;

            if (theta != 0 && theta != Math.PI) {
                let m = -((orbit.semiMinorAxis ** 2) * (x + orbit.focalDistance/this.kmPerPixel))/((orbit.semiMajorAxis ** 2) * y);
                burnRatioX = burnRatio/(Math.sqrt(1 + m**2)); 
                if (theta % (2 * Math.PI) < Math.PI) {
                    burnRatioX *= -1;
                }
                burnRatioY = m * burnRatioX;
            } else { 
                burnRatioX = 0;
                burnRatioY = theta == 0 ? -burnRatio : burnRatio;
            }

            if (burn < 0) {
                burnRatioX *= -1;
                burnRatioY *= -1;
            }

            let color = orbitTypeColorMap[orbit.type].slice(0, -2);
            this.burnVectors.push([x, y, x + burnRatioX * this.maxBurnVectorSize, y + burnRatioY * this.maxBurnVectorSize, orbit.argumentOfPeriapsis, this.earthPos, color]);
        });
    }

    draw() {

        // check if needed to switch to next orbit
        if (this.meanAnomalie() > this.orbits[this.currentOrbitId].endArg && this.currentOrbitId < this.orbits.length - 1) {
            this.currentOrbitId++;
            this.time = 0;
        }

        ctx.clearRect(0, 0, 600, 600);

        // stars
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        this.stars.forEach(star => {
            const [x, y, z] = star;
            ctx.beginPath();
            if (z > 0.95) { // twinkling star
                ctx.arc(x, y, Math.floor(Math.random()*2)+1, 0, Math.PI * 2);
            } else if (z > 0.90){ // big star
                ctx.arc(x, y, 2, 0, Math.PI * 2);
            } else { // small star
                ctx.arc(x, y, 1, 0, Math.PI * 2);
            }
            ctx.fillStyle = "white";
            ctx.fill();
            ctx.closePath();
        });
        ctx.restore();

        // earth
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.translate(...this.earthPos);
        ctx.rotate(-this.earthArg);
        ctx.drawImage(earthImg, -this.earthDiameter/2, -this.earthDiameter/2, this.earthDiameter, this.earthDiameter);
        ctx.restore();

        // orbits
        let drawOrbit = (orbit, active, inactiveOpacity) => {
            ctx.save();
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.translate(...this.earthPos);
            ctx.rotate(-orbit.argumentOfPeriapsis);
            ctx.translate(-orbit.focalDistance/(this.kmPerPixel), 0);
            
            ctx.lineWidth = active ? 3 : 2;
            ctx.strokeStyle = orbitTypeColorMap[orbit.type].slice(0, -2) + (active ? 1 : inactiveOpacity) + ")";
            // !(orbit.startArg == 0 && orbit.endArg == 2 * Math.PI) is a necessary check since without this check, ctx draws the orbit when end arg is 2pi and start arg is 0, even if it shoudn't
            if (orbit.type != "end" && !(orbit.startArg == 0 && orbit.endArg == 2 * Math.PI)) {
                ctx.setLineDash([5,5]);
                ctx.beginPath();
                ctx.ellipse(0, 0, orbit.semiMajorAxis/this.kmPerPixel, orbit.semiMinorAxis/this.kmPerPixel, 0, -orbit.endArg, -orbit.startArg, true); // negation of angles because of ctx.ellipse keeps angles clockwise even when drawing counterclockwise
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.beginPath();
            ctx.ellipse(0, 0, orbit.semiMajorAxis/this.kmPerPixel, orbit.semiMinorAxis/this.kmPerPixel, 0, 
                orbit.type != "end" ? -orbit.startArg : 0, 
                orbit.type != "end" ? -orbit.endArg : 2 * Math.PI, true);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }

        // orbits and burn vectors
        if (this.showOrbitalPath) {
            let inactiveOpacity = 0.55;
            this.orbits.forEach((orbit, id) => {
                drawOrbit(orbit, id == this.currentOrbitId, inactiveOpacity);
                if (orbit.type != "end") {
                    // add the opacity at the end of of color according to currentOrbitId
                    drawVector(...(this.burnVectors[id].slice(0, -1)), 
                        this.burnVectors[id][this.burnVectors[id].length - 1] + ((id == this.currentOrbitId) ? "1)" : (inactiveOpacity + ")")), id == this.currentOrbitId ? 3 : 2);
                }
            });
        }

        // satellite
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.translate(...this.earthPos)
        ctx.rotate(-this.orbits[this.currentOrbitId].argumentOfPeriapsis);
        ctx.translate(...this.satPosition());
        ctx.rotate(this.orbits[this.currentOrbitId].argumentOfPeriapsis);
        ctx.drawImage(satImg, -this.satLength/2, -this.satLength/2, this.satLength, this.satLength);
        ctx.restore();
        
        // velocity vector
        if (this.showVelocity){
            let [velocityStartX, velocityStartY] = this.satPosition();
            let [velocityEndX, velocityEndY] = this.velocity().map(num => num * this.maxVectorSize).map((num, id) => num + [velocityStartX, velocityStartY][id]);
            drawVector(velocityStartX, velocityStartY, velocityEndX, velocityEndY, this.orbits[this.currentOrbitId].argumentOfPeriapsis, this.earthPos, "blue", 3);
        }

        // acceleration vector
        if (this.showAcceleration){
            let [accelerationStartX, accelerationStartY] = this.satPosition();
            let [accelerationEndX, accelerationEndY] = this.acceleration().map(num => num * this.maxVectorSize).map((num, id) => num + [accelerationStartX, accelerationStartY][id]);
            drawVector(accelerationStartX, accelerationStartY, accelerationEndX, accelerationEndY, this.orbits[this.currentOrbitId].argumentOfPeriapsis, this.earthPos, "red", 3);
        }

        displaySpeedScale(this.speedMultiplier);
        displayDistanceScale(this.scale);
        displayTotalTime(this.totalTime);

        // display current orbit name
        let displayOrbitName = orbitTypeTitleMap[this.orbits[this.currentOrbitId].type];
        const displayOrbitX = 10;
        const displayOrbitY = 25;
        ctx.font = "16px Courier New";
        ctx.textAlign = "left";
        ctx.fillStyle = "white";
        ctx.fillText(displayOrbitName, displayOrbitX, displayOrbitY);

        // increments for next animation frame
        this.earthArg += this.speedMultiplier * 2 * Math.PI/(100 * 24);
        this.time += this.speedMultiplier;
        this.totalTime += this.speedMultiplier;
    }

    start() {
        if (this.isRunning == false) {
            this.draw(); // first frame, setInterval will wait interval time before starting to draw
            this.animation = setInterval(this.draw.bind(this), 10); // bind(this) is used so this in this.draw doesn't refer to global context while inside setInterval
            this.isRunning = true;
            document.getElementById("play-pause-btn").innerHTML = "&#10074;&#10074;";
        }
    }

    stop() {
        if (this.isRunning == true) {
            clearInterval(this.animation);
            this.isRunning = false;
            document.getElementById("play-pause-btn").innerHTML = "&#9654;";
        }
    }
}

class OrbitSimulation {

    constructor(orbit, maxLength) {
        this.animation;
        this.time = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.speedMultiplier = parseInt(speedSlider.value);
        this.scale = Math.floor(maxLength/5) + " km";
        this.showOrbitalPath  = orbitalPathCheckbox.checked;
        this.showVelocity = velocityCheckbox.checked;
        this.showAcceleration = accelerationCheckbox.checked;
        this.maxVectorSize = 250;

        // orbit 
        this.orbit = orbit;
        const kmPerPixel = maxLength/500;

        // contains orbit distances but converted in pixels for the simulation
        this.pixelOrbit = {
            semiMajorAxis: orbit.semiMajorAxis/kmPerPixel,
            semiMinorAxis: orbit.semiMinorAxis/kmPerPixel,
            focalDistance: orbit.focalDistance/kmPerPixel,
            periapsis: orbit.periapsis/kmPerPixel,
            apoapsis: orbit.apoapsis/kmPerPixel
        }

        // stars
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push([Math.floor(Math.random() * 501) -250, Math.floor(Math.random() * 501) -250, Math.random()]);
        }

        // earth
        this.earthArg = 0;
        this.earthDiameter = EARTH_DIAMETER/kmPerPixel;
        let earthX = (orbit.semiMajorAxis - orbit.periapsis) * Math.cos(orbit.argumentOfPeriapsis)/kmPerPixel;
        let earthY = -(orbit.semiMajorAxis - orbit.periapsis) * Math.sin(orbit.argumentOfPeriapsis)/kmPerPixel;
        this.earthPos = [earthX, earthY];

        // satellite
        this.satLength = 35;
        // polar function describing orbital path - Kepler's first law
        this.satRadius = function(theta) {
            return (this.pixelOrbit.semiMajorAxis * (1 - orbit.e**2))/(1 + orbit.e * Math.cos(theta));
        }

        this.meanAnomalie = function() {
            return (this.time * 36 * 2 * Math.PI)/orbit.orbitalPeriod;
        }

        this.eccentricAnomalie = function () {
            // Newton's method with Kepler's equation M = E - e * sin(E). 
            // It is a transcendental equation: no closed form solution, so numerical methods are necessary to estimate E
            const f = (E) => E - orbit.e * Math.sin(E) - this.meanAnomalie();
            const df_dE = (E) => 1 - orbit.e * Math.cos(E);
            let E = this.meanAnomalie(); // initial guess for E
            let E_next;
            // 8 iterations reduce max error to under 1e-15 for the highest eccentricity possible (0.869)
            for (let i = 0; i < 10; i++) {
                E_next = E - f(E)/df_dE(E);
                E = E_next;
            }
            return E;
        }

        this.trueAnomalie = function () {
            if (orbit.isCircular) {
                return this.meanAnomalie(); // for circular orbits, true anomalie is the same as mean anomalie
            } else {
                let theta = 2 * Math.atan2(Math.sqrt(1 + orbit.e) * Math.tan(this.eccentricAnomalie()/2), Math.sqrt(1 - orbit.e));
                if (theta < 0) {
                    theta += 2* Math.PI;
                } 
                return theta;
            }
        }

        // sattelite position according to the center of the earth
        this.satPosition = function() {
            let theta = this.trueAnomalie();
            let radius = this.satRadius(theta);
            return [Math.cos(theta) * radius, -Math.sin(theta) * radius];
        }

        // velocity vector
        this.velocity = function() {
            let theta = this.trueAnomalie();
            let velocityFactor = Math.sqrt(2/this.satRadius(theta) - 1/this.pixelOrbit.semiMajorAxis);  // Proportional to true speed
            let maxVelocityFactor = Math.sqrt(2/this.pixelOrbit.periapsis - 1/this.pixelOrbit.semiMajorAxis); // when radius is equal to periapsis, speed will be the greatest
            let velocityRatio = velocityFactor/maxVelocityFactor;
            let [x,y] = this.satPosition();
            let velocityRatioX;
            let velocityRatioY;
            if (theta != 0 && theta != Math.PI) {
                let m = -((orbit.semiMinorAxis ** 2) * (x + this.pixelOrbit.focalDistance))/((orbit.semiMajorAxis ** 2) * y); // slope of the velocity vector
                // x + this.pixelOrbit.focalDistance since you want the coordinates to be from the center of the ellipse and not the center of the earth, so that the equation works mathematically
                // Both semiMajorAxis not from pixelOrbit since it doesn't matter since they cancel each other and aren't added to x
                velocityRatioX = velocityRatio/(Math.sqrt(1 + m**2)); 
                if (theta % (2 * Math.PI) < Math.PI) { // determining x's direction in the orbit
                    velocityRatioX =  - velocityRatioX;
                }
                velocityRatioY = m * velocityRatioX;
            } else {
                velocityRatioX = 0;
                velocityRatioY = theta == 0 ? -velocityRatio : velocityRatio
            }
            return [velocityRatioX, velocityRatioY];
        }

        // acceleration vector
        this.acceleration = function() {
            let theta = this.trueAnomalie();
            let accelerationFactor = 1/(this.satRadius(theta) ** 2); // Proportional to true acceleration magnitude - Newton's law of universal gravitation
            let maxAccelerationFactor = 1/(this.pixelOrbit.periapsis ** 2); // When radius will be equal to periapsis, acceleration will be the greatest
            let accelerationRatio = accelerationFactor/maxAccelerationFactor;
            let accelerationRatioX = -accelerationRatio * Math.cos(theta);
            let accelerationRatioY = accelerationRatio * Math.sin(theta);
            return [accelerationRatioX, accelerationRatioY];
        }
    }

    draw() {
        ctx.clearRect(0, 0, 600, 600);

        // stars
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        this.stars.forEach(star => {
            const [x, y, z] = star;
            ctx.beginPath();
            if (z > 0.95) { // twinkling star
                ctx.arc(x, y, Math.floor(Math.random()*2)+1, 0, Math.PI * 2);
            } else if (z > 0.90){ // big star
                ctx.arc(x, y, 2, 0, Math.PI * 2);
            } else { // small star
                ctx.arc(x, y, 1, 0, Math.PI * 2);
            }
            ctx.fillStyle = "white";
            ctx.fill();
            ctx.closePath();
        });
        ctx.restore();

        // earth
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.translate(...this.earthPos);
        ctx.rotate(-this.earthArg);
        ctx.drawImage(earthImg, -this.earthDiameter/2, -this.earthDiameter/2, this.earthDiameter, this.earthDiameter);
        ctx.restore();

        // orbit
        if (this.showOrbitalPath) {
            ctx.save();
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.rotate(-this.orbit.argumentOfPeriapsis);
            ctx.beginPath();
            ctx.ellipse(0, 0, this.pixelOrbit.semiMajorAxis, this.pixelOrbit.semiMinorAxis, 0, 0, 2 * Math.PI);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "white";
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }

        // satellite
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.translate(...this.earthPos);
        ctx.rotate(-this.orbit.argumentOfPeriapsis);
        ctx.translate(...this.satPosition());
        ctx.rotate(this.orbit.argumentOfPeriapsis);
        ctx.drawImage(satImg, -this.satLength/2, -this.satLength/2, this.satLength, this.satLength);
        ctx.restore();
        
        // velocity vector
        if (this.showVelocity){
            let [velocityStartX, velocityStartY] = this.satPosition();
            let [velocityEndX, velocityEndY] = this.velocity().map(num => num * this.maxVectorSize).map((num, id) => num + [velocityStartX, velocityStartY][id]);
            drawVector(velocityStartX, velocityStartY, velocityEndX, velocityEndY, this.orbit.argumentOfPeriapsis, this.earthPos, "blue", 3);
        }

        // acceleration vector
        if (this.showAcceleration){
            let [accelerationStartX, accelerationStartY] = this.satPosition();
            let [accelerationEndX, accelerationEndY] = this.acceleration().map(num => num * this.maxVectorSize).map((num, id) => num + [accelerationStartX, accelerationStartY][id]);
            drawVector(accelerationStartX, accelerationStartY, accelerationEndX, accelerationEndY, this.orbit.argumentOfPeriapsis, this.earthPos, "red", 3);
        }

        displaySpeedScale(this.speedMultiplier);
        displayDistanceScale(this.scale);
        displayTotalTime(this.totalTime);
        
        // increments for next animation frame
        this.earthArg += this.speedMultiplier * 2 * Math.PI/(100 * 24);
        this.time += this.speedMultiplier;
        this.totalTime += this.speedMultiplier;
    }

    start() {
        if (this.isRunning == false) {
            this.draw(); // first frame, setInterval will wait interval time before starting to draw
            this.animation = setInterval(this.draw.bind(this), 10); // bind(this) is used so this in this.draw doesn't refer to global context while inside setInterval
            this.isRunning = true;
            document.getElementById("play-pause-btn").innerHTML = "&#10074;&#10074;";
        }
    }

    stop() {
        if (this.isRunning == true) {
            clearInterval(this.animation);
            this.isRunning = false;
            document.getElementById("play-pause-btn").innerHTML = "&#9654;";
        }
    }
}

// singleton
const loadingScreen = new (class {
    constructor() {
        this.time = 0;
        this.animation;
        this.isRunning = false;
    }

    draw() {
        ctx.clearRect(0, 0, 600, 600);
        ctx.font = "40px Courier New";
        ctx.textAlign = "left";
        ctx.fillStyle = "white";
        ctx.fillText("loading"+".".repeat(this.time % 4), canvas.width/2 - 90, canvas.height/2); 
        this.time++;
    }
    
    start() {
        if (this.isRunning == false) {
            this.draw(); // first frame
            this.animation = setInterval(this.draw.bind(this), 250);
            this.isRunning = true;
            document.getElementById("orbit-submit-btn").disabled = true;
            document.getElementById("maneuver-submit-btn").disabled = true;
        }
    }

    stop() {
        if (this.isRunning == true) {
            clearInterval(this.animation);
            this.time = 0;
            this.isRunning = false;
            document.getElementById("orbit-submit-btn").disabled = false;
            document.getElementById("maneuver-submit-btn").disabled = false;
        }
    }
});

/**
 * If startArg and endArg are false, the orbit will be constant and part of an OrbitSimulation. 
 * If one of them is true, the orbit will be part of a ManeuverSimulation
 */
class Orbit {
    constructor(semiMajorAxis, e, argumentOfPeriapsis, type, startArg, endArg) {
        this.semiMajorAxis = parseInt(semiMajorAxis);
        this.e =  parseFloat(e);
        this.argumentOfPeriapsis = parseFloat(argumentOfPeriapsis);
        this.semiMinorAxis = this.semiMajorAxis * ((1 - (this.e ** 2)) ** 0.5);
        this.periapsis = this.semiMajorAxis * (1 - this.e);
        this.apoapsis =  this.semiMajorAxis * (1 + this.e);
        this.focalDistance = (this.semiMajorAxis ** 2 - this.semiMinorAxis ** 2) ** 0.5;
        this.orbitalPeriod = 2 * Math.PI * ((((this.semiMajorAxis * 1000) ** 3)/(G * EARTH_MASS))) ** 0.5;
        this.isCircular = this.e == 0;
        this.type = type;
        if (this.type.includes("transfer") || this.type == "start") {
            this.startArg =  parseFloat(startArg);
            this.endArg =  parseFloat(endArg);
        } else if (this.type == "end") {
            this.startArg =  parseFloat(startArg);
        }
        this.vPeriapsis = Math.sqrt(G * EARTH_MASS * (2/(this.periapsis * 1000) - 1/(this.semiMajorAxis * 1000))) // m/s
        this.vApoapsis = this.isCircular ? this.vPeriapsis: Math.sqrt(G * EARTH_MASS * (2/(this.apoapsis * 1000) - 1/(this.semiMajorAxis * 1000))) // m/s
    }
}

// draw vector: line and a arrow head
function drawVector(fromX, fromY, toX, toY, argumentOfPeriapsis, earthPos, color, lineWidth) {
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.translate(...earthPos);
    ctx.rotate(-argumentOfPeriapsis);
    let headLen = 10;
    let dx = toX - fromX;
    let dy = toY - fromY;
    let angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.moveTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY- headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
}

// display distance scale
function displayDistanceScale(scale) {
    const scaleX = 490;
    const scaleY = 25;
    ctx.beginPath(); 
    ctx.rect(scaleX, 30, 100, scaleY - 20);
    ctx.fillStyle = "white";
    ctx.fill();
    // distance scale text
    ctx.font = "16px Courier New";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(scale, scaleX + 50, scaleY);
}

 
// display speed scale
function displaySpeedScale(speedMultiplier) {
    const speedScaleX = 445;
    const speedScaleY = 25;
    ctx.font = "16px Courier New";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    if (speedMultiplier == 24){
        ctx.fillText("1 day/s", speedScaleX, speedScaleY); 
    } else {
        ctx.fillText(speedMultiplier + " h/s", speedScaleX, speedScaleY); 
    }
}

// display total time passed
function displayTotalTime(totalTime) {
    const totalTimeX = 590;
    const totalTimeY = 584;
    ctx.font = "16px Courier New";
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.fillText("Time: " + Math.floor(totalTime/100) + " h", totalTimeX, totalTimeY); // floor and not round
}