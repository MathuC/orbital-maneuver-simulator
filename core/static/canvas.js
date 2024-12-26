let canvas = document.getElementById('canvas');
let ctx = canvas.getContext("2d");

const G = 6.67430e-11
const EARTH_DIAMETER = 6371 * 2;
const EARTH_MASS = 5.972e24;

let simulation;

/* 
 * redraw every 10 ms
 * leave 50 pixels around the canvas so the orbits aren't stuck to the
 * the border which is 600 x 600 pixels so the drawing canvas is 500 x 500 pixels (600-50-50)
 * default: periapsis on the right
 * default: counter clockwise orbit
 * default: 1h/s
 * argument of periapsis is the angle between the line earth_center-periapsis and the x-axis
 */ 

// tests
// intersection at the end_orbit periapsis; test with axis=30,000, ecc=0 and axis=50,000, ecc=0.4
// intersection at the end_orbit apoapsis; test with axis=28,000, ecc=0 and axis=20,000, ecc=0.4

class ManeuverSimulation {
    constructor(orbits, burns, maxLength, earthPos) {
        this.animation;
        this.time = 0;
        this.isRunning = false;
        this.speedMultiplier = parseInt(speedSlider.value);
        this.scale = Math.floor(maxLength/5) + " km";
        this.showOrbitalPath  = orbitalPathCheckbox.checked;
        this.showVelocity = velocityCheckbox.checked;
        this.showAcceleration = accelerationCheckbox.checked;
        this.maxVectorSize = 150;

        // orbits
        this.startPhase = true; 
        // if the start phase is true, no burns can be executed 
        // this will stay true till the start orbit's mean anomalie is at pi/2
        // so a 0 angle burn isn't executed as soon as the simulation starts
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


        let drawOrbit = (orbit) => {
            ctx.save();
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.translate(...this.earthPos);
            ctx.rotate(-orbit.argumentOfPeriapsis);
            ctx.translate(-orbit.focalDistance/(this.kmPerPixel), 0);
            if (orbit.type.includes("transfer")) {
                ctx.setLineDash([5,5]);
                ctx.beginPath();
                ctx.ellipse(0, 0, orbit.semiMajorAxis/this.kmPerPixel, orbit.semiMinorAxis/this.kmPerPixel, 0, orbit.endArg, orbit.startArg, true);
                ctx.lineWidth = 2;
                ctx.strokeStyle = orbit.type == "transfer1" ? "magenta" : "darkorange";
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.ellipse(0, 0, orbit.semiMajorAxis/this.kmPerPixel, orbit.semiMinorAxis/this.kmPerPixel, 0, orbit.startArg, orbit.endArg, true);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.ellipse(0, 0, orbit.semiMajorAxis/this.kmPerPixel, orbit.semiMinorAxis/this.kmPerPixel, 0, 0, 2 * Math.PI);
                ctx.lineWidth = 2;
                ctx.strokeStyle = orbit.type == "start" ? "dodgerblue" : "yellow";
                ctx.stroke();
            }
            ctx.closePath();
            ctx.restore();
        }

        // orbits
        if (this.showOrbitalPath) {
            this.orbits.forEach((orbit) => {
                drawOrbit(orbit);
            })
        }

        // distance scale
        const scaleX = 490;
        ctx.beginPath(); 
        ctx.rect(scaleX, 30, 100, 5);
        ctx.fillStyle = "white";
        ctx.fill();
        // distance scale text
        ctx.font = "16px Courier New";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.fillText(this.scale, scaleX + 50, 25); 
        
        // simulation speed scale
        const speedScaleX = 445;
        const speedScaleY = 25;
        ctx.font = "16px Courier New";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        if (this.speedMultiplier == 24){
            ctx.fillText("1 day/s", speedScaleX, speedScaleY); 
        } else {
            ctx.fillText(this.speedMultiplier + " h/s", speedScaleX, speedScaleY); 
        }

        // increments for next animation frame
        this.earthArg += this.speedMultiplier * 2 * Math.PI/(100 * 24);
        this.time += this.speedMultiplier;
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
        this.isRunning = false;
        this.speedMultiplier = parseInt(speedSlider.value);
        this.scale = Math.floor(maxLength/5) + " km";
        this.showOrbitalPath  = orbitalPathCheckbox.checked;
        this.showVelocity = velocityCheckbox.checked;
        this.showAcceleration = accelerationCheckbox.checked;
        this.maxVectorSize = 150;

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

        // velocity vector
        this.velocity = function() {
            let theta = this.trueAnomalie();
            let velocityFactor = Math.sqrt(2/this.satRadius(theta) - 1/this.pixelOrbit.semiMajorAxis);  // Proportional to true speed
            let maxVelocityFactor = Math.sqrt(2/this.pixelOrbit.periapsis - 1/this.pixelOrbit.semiMajorAxis); // when radius is equal to periapsis, speed will be the greatest
            let velocityRatio = velocityFactor/maxVelocityFactor;
            let [x,y] = this.satPosition();
            let m = -((orbit.semiMinorAxis ** 2) * x)/((orbit.semiMajorAxis ** 2) * y); // slope of the velocity vector
            let velocityRatioX = velocityRatio/(Math.sqrt(1 + m**2)); 
            if (theta % (2 * Math.PI) < Math.PI) { // determining x's direction in the orbit
                velocityRatioX =  - velocityRatioX;
            }
            let velocityRatioY = m * velocityRatioX;
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
            if (this.time == 0) {
                return 0;
            } else {
                // Newton's method with Kepler's equation M = E - e * sin(E). 
                // It is a transcendental equation: no closed form solution, so numerical methods are necessary to estimate E
                const f = (E) => E - orbit.e * Math.sin(E) - this.meanAnomalie();
                const df_dE = (E) => 1 - orbit.e * Math.cos(E);
                let E = this.meanAnomalie(); // initial guess for E
                let E_next;
                // 8 iterations reduce max error to under 1e-15 for the highest eccentricity possible (0.869)
                for (let i = 0; i < 8; i++) {
                    E_next = E - f(E)/df_dE(E);
                    E = E_next;
                }
                return E;
            }
        }

        this.trueAnomalie = function () {
            if (orbit.orbitIsCircular) {
                return this.meanAnomalie(); // for circular orbits, true anomalie is the same as mean anomalie
            } else {
                let theta = 2 * Math.atan2(Math.sqrt(1 + orbit.e) * Math.tan(this.eccentricAnomalie()/2), Math.sqrt(1 - orbit.e));
                if (theta < 0) {
                    theta += 2* Math.PI;
                } 
                return theta;
            }
        }

        this.satPosition = function() {
            let theta = this.trueAnomalie();
            let radius = this.satRadius(theta);
            return [Math.cos(theta) * radius + this.pixelOrbit.focalDistance, -Math.sin(theta) * radius];
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
        ctx.rotate(-this.orbit.argumentOfPeriapsis);
        ctx.translate(...this.satPosition());
        ctx.rotate(this.orbit.argumentOfPeriapsis);
        ctx.drawImage(satImg, -this.satLength/2, -this.satLength/2, this.satLength, this.satLength);
        ctx.restore();

        // draw vector: line and a arrow head
        function drawVector(fromX, fromY, toX, toY, color, argumentOfPeriapsis) {
            ctx.save();
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.rotate(-argumentOfPeriapsis);
            let headLen = 10;
            let dx = toX - fromX;
            let dy = toY - fromY;
            let angle = Math.atan2(dy, dx);
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY- headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(toX, toY);
            ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
            ctx.restore();
        }
        
        // velocity vector
        if (this.showVelocity){
            let [velocityStartX, velocityStartY] = this.satPosition();
            let [velocityEndX, velocityEndY] = [velocityStartX + this.maxVectorSize * this.velocity()[0], velocityStartY + this.maxVectorSize * this.velocity()[1]]
            drawVector(velocityStartX, velocityStartY, velocityEndX, velocityEndY, "blue", this.orbit.argumentOfPeriapsis);
        }

        // acceleration vector
        if (this.showAcceleration){
            let [accelerationStartX, accelerationStartY] = this.satPosition();
            let [accelerationEndX, accelerationEndY] = [accelerationStartX + this.maxVectorSize * this.acceleration()[0], accelerationStartY + this.maxVectorSize * this.acceleration()[1]]
            drawVector(accelerationStartX, accelerationStartY, accelerationEndX, accelerationEndY, "red", this.orbit.argumentOfPeriapsis);
        }

        // distance scale
        const scaleX = 490;
        ctx.beginPath(); 
        ctx.rect(scaleX, 30, 100, 5);
        ctx.fillStyle = "white";
        ctx.fill();
        // distance scale text
        ctx.font = "16px Courier New";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.fillText(this.scale, scaleX + 50, 25); 
        
        // simulation speed scale
        const speedScaleX = 445;
        const speedScaleY = 25;
        ctx.font = "16px Courier New";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        if (this.speedMultiplier == 24){
            ctx.fillText("1 day/s", speedScaleX, speedScaleY); 
        } else {
            ctx.fillText(this.speedMultiplier + " h/s", speedScaleX, speedScaleY); 
        }

        // increments for next animation frame
        this.earthArg += this.speedMultiplier * 2 * Math.PI/(100 * 24);
        this.time += this.speedMultiplier;
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
        ctx.fillText("loading"+".".repeat(this.time % 3 + 1), canvas.width/2 - 90, canvas.height/2); 
        this.time++;
    }
    
    start() {
        if (this.isRunning == false) {
            this.draw(); // first frame
            this.animation = setInterval(this.draw.bind(this), 500);
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
        this.orbitIsCircular = this.e == 0;
        this.type = type;
        if (this.type.includes("transfer")) {
            this.startArg =  parseFloat(startArg);
            this.endArg =  parseFloat(endArg);
        } else if (this.type == "start") {
            this.endArg =  parseFloat(endArg);
        } else if (this.type == "end") {
            this.startArg =  parseFloat(startArg);
        }
    }
}