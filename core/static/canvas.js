let canvas = document.getElementById('canvas');
let ctx = canvas.getContext("2d");

let simulation;
let EARTH_DIAMETER = 6371 * 2; // Earth radius is 6371km

/** 
 * redraw every 10 ms
 * leave 50 pixels around the canvas so the orbits aren't stuck to the
 * the border which is 600 x 600 pixels so the drawing canvas is 500 x 500 pixels (600-50-50)
 * default: periapsis on the right
 * default: counter clockwise orbit
 * default: 1h/s
 * argument of periapsis is the angle between the semi major axis and x axis
 * everytime start simulation button is clicked an instance of this class is created 
 */ 
class Simulation {

    constructor(semiMajorAxis, semiMinorAxis, focalDistance, e, periapsis, apoapsis, argumentOfPeriapsis, orbitalPeriod, maxLength) {
        this.animation = null;
        this.time = 0;
        let kmPerPixel = maxLength/500;
        this.isRunning = false;
        this.speedMultiplier = parseInt(speedSlider.value);
        this.scale = Math.floor(maxLength/5) + " km";
        this.showOrbitalPath  = orbitalPathCheckbox.checked;
        this.showVelocity = velocityCheckbox.checked;
        this.showAcceleration = accelerationCheckbox.checked;
        this.maxVectorSize = 150;

        // orbit 
        this.orbitIsCircular = e == 0;
        this.argumentOfPeriapsis = argumentOfPeriapsis;
        this.e = e;
        this.orbitalPeriod = orbitalPeriod;
        this.orbitSemiMajorAxis = semiMajorAxis/kmPerPixel;
        this.orbitSemiMinorAxis = semiMinorAxis/kmPerPixel;
        this.orbitFocalDistance = focalDistance/kmPerPixel;
        this.orbitPeriapsis = periapsis/kmPerPixel;

        // stars
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push([Math.floor(Math.random() * 501) -250, Math.floor(Math.random() * 501) -250, Math.random()]);
        }

        // earth
        this.earthArg = 0;
        this.earthDiameter = EARTH_DIAMETER/kmPerPixel;
        this.earthX = (semiMajorAxis - periapsis) * Math.cos(argumentOfPeriapsis)/kmPerPixel;
        this.earthY = -(semiMajorAxis - periapsis) * Math.sin(argumentOfPeriapsis)/kmPerPixel;

        // velocity vector
        this.velocity = function() {
            let theta = this.trueAnomalie();
            let velocityFactor = Math.sqrt(2/this.satRadius(theta) - 1/this.orbitSemiMajorAxis);  // Proportional to true speed
            let maxVelocityFactor = Math.sqrt(2/this.orbitPeriapsis - 1/this.orbitSemiMajorAxis); // when radius is equal to periapsis, speed will be the greatest
            let velocityRatio = velocityFactor/maxVelocityFactor;
            let [x,y] = this.satPosition();
            let m = -((this.orbitSemiMinorAxis ** 2) * x)/((this.orbitSemiMajorAxis ** 2) * y); // slope of the velocity vector
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
            let maxAccelerationFactor = 1/(this.orbitPeriapsis ** 2); // When radius will be equal to periapsis, acceleration will be the greatest
            let accelerationRatio = accelerationFactor/maxAccelerationFactor;
            let accelerationRatioX = -accelerationRatio * Math.cos(theta);
            let accelerationRatioY = accelerationRatio * Math.sin(theta);
            return [accelerationRatioX, accelerationRatioY];
        }

        // satellite
        this.satLength = 35;
        // polar function describing orbital path - Kepler's first law
        this.satRadius = function(theta) {
            return (this.orbitSemiMajorAxis * (1 - e**2))/(1 + e * Math.cos(theta));
        }

        this.meanAnomalie = function() {
            return (this.time * 36 * 2 * Math.PI)/this.orbitalPeriod;
        }

        this.eccentricAnomalie = function () {
            if (this.time == 0) {
                return 0;
            } else {
                // Newton's method with Kepler's equation M = E - e * sin(E). 
                // It is a transcendental equation: no closed form solution, so numerical methods are necessary to estimate E
                const f = (E) => E - this.e * Math.sin(E) - this.meanAnomalie();
                const df_dE = (E) => 1 - this.e * Math.cos(E);
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
            if (this.orbitIsCircular) {
                return this.meanAnomalie(); // for circular orbits, true anomalie is the same as mean anomalie
            } else {
                let theta = 2 * Math.atan2(Math.sqrt(1+this.e) * Math.tan(this.eccentricAnomalie()/2), Math.sqrt(1-this.e));
                if (theta < 0) {
                    theta += 2* Math.PI;
                } 
                return theta;
            }
        }

        this.satPosition = function() {
            let theta = this.trueAnomalie();
            let radius = this.satRadius(theta);
            return [Math.cos(theta) * radius + this.orbitFocalDistance, -Math.sin(theta) * radius];
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
        ctx.translate(this.earthX, this.earthY);
        ctx.rotate(-this.earthArg);
        ctx.drawImage(earthImg, -this.earthDiameter/2, -this.earthDiameter/2, this.earthDiameter, this.earthDiameter);
        ctx.restore();

        // orbit
        if (this.showOrbitalPath) {
            ctx.save();
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.beginPath();
            ctx.ellipse(0, 0, this.orbitSemiMajorAxis, this.orbitSemiMinorAxis, -this.argumentOfPeriapsis, 0, 2 * Math.PI);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "white";
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
            ctx.save();
        }

        // satellite
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.rotate(-this.argumentOfPeriapsis);
        ctx.translate(...this.satPosition());
        ctx.rotate(this.argumentOfPeriapsis);
        ctx.drawImage(satImg, -this.satLength/2, -this.satLength/2, this.satLength, this.satLength);
        ctx.restore();

        //draw vector: line and a arrow head
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
            drawVector(velocityStartX, velocityStartY, velocityEndX, velocityEndY, "blue", this.argumentOfPeriapsis);
        }

        // acceleration vector
        if (this.showAcceleration){
            let [accelerationStartX, accelerationStartY] = this.satPosition();
            let [accelerationEndX, accelerationEndY] = [accelerationStartX + this.maxVectorSize * this.acceleration()[0], accelerationStartY + this.maxVectorSize * this.acceleration()[1]]
            drawVector(accelerationStartX, accelerationStartY, accelerationEndX, accelerationEndY, "red", this.argumentOfPeriapsis);
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
        this.animation = setInterval(this.draw.bind(this), 10); // bind(this) is used so this in this.draw doesn't refer to global context while inside setInterval
        this.isRunning = true;
        document.getElementById("play-pause-btn").innerHTML = "&#10074;&#10074;";
    }

    stop() {
        clearInterval(this.animation);
        this.isRunning = false;
        document.getElementById("play-pause-btn").innerHTML = "&#9654;";
    }
}