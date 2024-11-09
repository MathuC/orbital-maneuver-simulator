let canvas = document.getElementById('canvas');
let ctx = canvas.getContext("2d");

let simulation;
let EARTH_DIAMETER = 6371 * 2; // Earth radius is 6371km
let h = 50; // offsets so that orbit doesn't go to the border of canvas
let k = 50;

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

    constructor(semiMajorAxis, semiMinorAxis, focalDistance, e, periapsis, argumentOfPeriapsis, maxLength, orbitalPeriod) {
        this.animation = null;
        let kmPerPixel = maxLength/500;
        this.isRunning = false;
        this.speedMultiplier = parseInt(speedSlider.value);
        this.scale = Math.floor(maxLength/5) + " km";
        this.showOrbitalPath  = orbitalPathCheckbox.checked;
        this.showVelocity = velocityCheckbox.checked;
        this.showAcceleration = accelerationCheckbox.checked;
        this.maxVectorSize = 150;

        // orbit 
        this.argumentOfPeriapsis = argumentOfPeriapsis;
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

        // satellite
        this.satLength = 35;
        this.satTrueAnomalie = 0;
        // polar function describing orbital path - Kepler's first law
        this.satRadius = function(theta) {
            return (this.orbitSemiMajorAxis * (1 - e**2))/(1 + e * Math.cos(theta));
        }
        this.satPosition = function(theta) {
            let radius = this.satRadius(theta);
            return [Math.cos(theta) * radius + this.orbitFocalDistance, Math.sin(theta) * radius];
        }

        this.velocity = function(theta) {
            let radius = this.satRadius(theta);
            let velocityFactor = Math.sqrt(2/radius - 1/this.orbitSemiMajorAxis);  // Proportional to true speed - Kepler's third law
            let maxVelocityFactor = Math.sqrt(2/this.orbitPeriapsis - 1/this.orbitSemiMajorAxis); // when radius is equal to periapsis, speed will be the greatest
            let velocityRatio = velocityFactor/maxVelocityFactor;
            let [x,y] = this.satPosition(theta);
            let m = -((this.orbitSemiMinorAxis ** 2) * x)/((this.orbitSemiMajorAxis ** 2) * y); // slope of the velocity vector
            let velocityRatioX = velocityRatio/(Math.sqrt(1 + m**2)); 
            if (theta % (2 * Math.PI) < Math.PI) { // determining x's direction in the orbit
                velocityRatioX = -velocityRatioX;
            }
            let velocityRatioY = m * velocityRatioX;
            return [velocityRatioX, velocityRatioY];
        }

        this.acceleration = function(theta) {
            let radius = this.satRadius(theta);
            let accelerationFactor = 1/(radius ** 2); // Proportional to true acceleration magnitude - Newton's law of universal gravitation
            let maxAccelerationFactor = 1/(this.orbitPeriapsis ** 2); // When radius will be equal to periapsis, acceleration will be the greatest
            let accelerationRatio = accelerationFactor/maxAccelerationFactor;
            let accelerationRatioX = accelerationRatio * Math.cos(theta + Math.PI);
            let accelerationRatioY = accelerationRatio * Math.sin(theta + Math.PI);
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
        ctx.translate(this.earthX, this.earthY);
        ctx.rotate(this.earthArg);
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
        ctx.translate(...this.satPosition(this.satTrueAnomalie));
        ctx.rotate(this.argumentOfPeriapsis);
        ctx.drawImage(satImg, -this.satLength/2, -this.satLength/2, this.satLength, this.satLength);
        ctx.restore();

        // scale
        const scaleX = 490;
        ctx.beginPath(); 
        ctx.rect(scaleX, 30, 100, 5);
        ctx.fillStyle = "white";
        ctx.fill();
        // scale text
        ctx.font = "16px Courier New";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.fillText(this.scale, scaleX + 50, 25); 
        
        // simulation speed scale
        const speedScaleX = 435;
        const speedScaleY = 25;
        ctx.font = "16px Courier New";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        if (this.speedMultiplier == 24){
            ctx.fillText("1 day/s", speedScaleX, speedScaleY); 
        } else {
            ctx.fillText(this.speedMultiplier + " h/s", speedScaleX, speedScaleY); 
        }

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
        }
        
        // velocity vector
        if (this.showVelocity){
            let [velocityStartX, velocityStartY] = this.satPosition(this.satTrueAnomalie);
            let [velocityEndX, velocityEndY] = [velocityStartX + this.maxVectorSize * this.velocity(this.satTrueAnomalie)[0], velocityStartY + this.maxVectorSize * this.velocity(this.satTrueAnomalie)[1]]
            drawVector(velocityStartX, velocityStartY, velocityEndX, velocityEndY, "blue", this.argumentOfPeriapsis);
        }

        // acceleration vector
        if (this.showAcceleration){
            let [accelerationStartX, accelerationStartY] = this.satPosition(this.satTrueAnomalie);
            let [accelerationEndX, accelerationEndY] = [accelerationStartX + this.maxVectorSize * this.acceleration(this.satTrueAnomalie)[0], accelerationStartY + this.maxVectorSize * this.acceleration(this.satTrueAnomalie)[1]]
            drawVector(accelerationStartX, accelerationStartY, accelerationEndX, accelerationEndY, "red", this.argumentOfPeriapsis);
        }
        
        // angle increments for next animation frame
        this.earthArg -= this.speedMultiplier * 2 * Math.PI/(100 * 24);
        this.satTrueAnomalie += this.speedMultiplier * 36 * 2 * Math.PI/(this.orbitalPeriod);
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