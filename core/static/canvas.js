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
        speedSlider.value = 1;
        speedValue.innerHTML = "1 h/s";

        this.animation = null;
        let kmPerPixel = maxLength/500;
        this.isRunning = false;
        this.speedMultiplier = 1;
        this.scale = Math.floor(maxLength/5) + " km";
        this.showOrbitalPath  = orbitalPathCheckbox.checked;
        this.showVelocity = velocityCheckbox.checked;
        this.showAcceleration = accelerationCheckbox.checked;

        // orbit 
        this.argumentOfPeriapsis = argumentOfPeriapsis;
        this.orbitalPeriod = orbitalPeriod;
        this.orbitSemiMajorAxis = semiMajorAxis/kmPerPixel;
        this.orbitSemiMinorAxis = semiMinorAxis/kmPerPixel;
        this.focalDistance = focalDistance/kmPerPixel;

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
        this.satTrueAnomalie = Math.PI;
        this.satPosition = function(theta) {
            let radius = (this.orbitSemiMajorAxis * (1 - e**2))/(1 + e * Math.cos(theta)); //polar function describing orbital path from kepler's first law
            return [-Math.cos(theta) * radius - this.focalDistance, Math.sin(theta) * radius];
        }

        this.velocity = function(theta) {

        }

        this.acceleration = function(theta) {

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
        
        // speed scale
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
        

        //border
        /*
        ctx.save();
        ctx.beginPath(); // Start a new path
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.strokeRect(50, 50, 500, 500);
        ctx.restore();
        */

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