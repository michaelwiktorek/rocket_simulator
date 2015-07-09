function init(){
  if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1)
  {
    alert("This game doesn't run well in Firefox!  Try Chrome or Safari for the best experience!");
  }

  window.requestAnimFrame = function(){
    return (
      window.requestAnimationFrame       || 
      window.webkitRequestAnimationFrame || 
      window.mozRequestAnimationFrame    || 
      window.oRequestAnimationFrame      || 
      window.msRequestAnimationFrame     
    );
  }();
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  ctx.canvas.width = window.innerWidth * 0.9;
  ctx.canvas.height = window.innerHeight * 0.9;
  mouseX = canvas.width/2;
  mouseY = canvas.height/2;
  mouseXprev = mouseX;
  mouseYprev = mouseY;
  angleIncr = 0.08;
  dead = false;
  HOME_PLANET_SIZE = 500000;
  LASER_LIFETIME = 180;  //60 frames per second * seconds of life
  LASER_SPEED = 40;
  ROT = false;
  GRAV = false;
  EDGE_TELEPORT = false;
  AFTER = false;
  CAMERA_LOCK = false;
  NUM_PLANETS = 20;
  NUM_STARS = 500;
  STARFIELD_SPEED_MENU = 2000;
  TRAJECTORY = false;
  TIME_MULTIPLIER = 1;
  MAX_TIME_MULTIPLIER = 30;

  //edge gradient
  edgeTimer = 0;
  edge = new EdgeGradient(30);

  //list of game state constants
  MENU = 0;  //menu state
  GAME_PLAY = 1;  //gameplay state
  GAME_OVER = 2;  //game over state
  GAME_STATE = MENU; // INITIAL game state
  
  POINTS_TO_WIN = 5000;
  ARENA_SIZE = 20000000;
  MAX_ZOOM_OUT = 0.00005; //0.004 is default, 0.001 for debug  //or .00005
  MAX_ZOOM_IN = 1.95;
  SHOW_CONTROLS = false;
  MUSIC = true;

  background_music = new Howl({
    urls: ['Rocket_Sim_Music.mp3'],
    loop: true,
    volume: 0.2
  }).play();

  rocket_sound = new Howl({
    urls:['rocketsound.mp3'],
    loop: true,
    volume: 0.3
  });

  laser_sound = new Howl({
    urls: ['Laser02.wav'],
    loop: false,
    volume: 0.1
  });

  points = 0;
  G = 0.2;
  drag = false;
  scale = 1;
  zoom = 0;
  rocket = new Rocket(new Point(0, HOME_PLANET_SIZE + 40));
  camera = new Camera(new Point(-8000000, HOME_PLANET_SIZE + 200));

  //test
  testAsteroid = new Asteroid(new Point(0,HOME_PLANET_SIZE + 200), new Point(0,0), 80);
  testAsteroid.generatePoints();

  planets = new Array();
  planets.push(new Planet(new Point(0,0), HOME_PLANET_SIZE));
  stars = new Array();
  stars.push(new Point(0, 10000));
  lasers = new Array();
  lasers.push(new Laser(new Point(0,5090), new Point(0,5100), new Point(0,0)));
  lasers[0].trash();
  generateStars();
  generatePlanets();
  requestId = window.requestAnimFrame(draw);
}

function restart(){
  //reset all state variables to start values
  dead = false;
  ROT = false;
  GRAV = false;
  EDGE_TELEPORT = false;
  AFTER = false;
  CAMERA_LOCK = false;
  GAME_STATE = GAME_PLAY;
  //SHOW_CONTROLS = false;  //control-showing state is persistent
  //MUSIC = true;  //music state is persistent

  //reset value variables
  points = 0;
  zoom = 0;
  scale = 1;
  TIME_MULTIPLIER = 1;

  //reset planets, stars, and rocket
  rocket = new Rocket(new Point(0, HOME_PLANET_SIZE + 40));
  camera.p = new Point(0, HOME_PLANET_SIZE + 200);
  planets = new Array();
  planets.push(new Planet(new Point(0,0), HOME_PLANET_SIZE));
  stars = new Array();
  stars.push(new Point(0, 10000));
  lasers = new Array();
  lasers.push(new Laser(new Point(0,5090), new Point(0,5100), new Point(0,0)));
  lasers[0].trash();
  generateStars();
  generatePlanets();

  //test
  testAsteroid = new Asteroid(new Point(0,HOME_PLANET_SIZE + 200), new Point(0,0), 80);
  testAsteroid.generatePoints();


  //stop music, if playing
  background_music.stop();

  //play background music
  if (MUSIC){
    background_music.play();
  }
}

function generateStars(){
  for (var i = 0; i < NUM_STARS; i++){
    var x = Math.floor(Math.random()*800000 * 0.38);
    x *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
    var y = Math.floor(Math.random()*800000 * 0.38);
    y *= Math.floor(Math.random()*2) == 1 ? 1 : -1;

    stars.push(new Point(x, y));
  }
}

function generatePlanets(){
  planets = new Array();
  planets.push(new Planet(new Point(0,0), HOME_PLANET_SIZE));
  for (var i = 0; i < NUM_PLANETS; i++){
    var x = Math.floor(Math.random()*ARENA_SIZE) + HOME_PLANET_SIZE * 2;
    x *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
    var y = Math.floor(Math.random()*ARENA_SIZE) + HOME_PLANET_SIZE * 2;
    y *= Math.floor(Math.random()*2) == 1 ? 1 : -1;

    planets.push(new Planet(new Point(x, y), Math.floor(Math.random() * 2 * HOME_PLANET_SIZE) + 1));
  }
}

function SectorMap(){
  var Map = {}

  //transforms point to string as follows:
  //  (1,2) -> "s_1_2"
  //  (-1,2) -> "s_n1_2"
  //thanks to Simon BW for the mapping
  this.pointToString = function(point){
    var xString = "";
    var yString = "";
    var outString = "s_";
    if (sectorPoint.x < 0){
      xString += "n";
    }
    if (sectorPoint.y < 0){
      yString += "n";
    }
    xString += point.x;
    yString += point.y;
    outString += xString + "_" + yString;
    return outString;
  }

  //creates, populates, and inserts a new sector into the map
  this.instantiate = function(sectorPoint){
    var outString = this.pointToString(sectorPoint);
    Map[outString] = new Sector(sectorPoint);
    Map[outString].generateSector();
  }

  //returns a sector, given a point
  this.getSector = function(sectorPoint){
    var sectorString = this.pointToString(sectorPoint);
    return Map[sectorString];
  }
}

function Sector(sectorPoint){
  // arrays of objects in sector
  this.position = new Point(sectorPoint.x, sectorPoint.y); 
  var planets;
  var stars;
  var asteroids;

  //generates planets, stars, and asteroids for this sector
  this.generateSector = function(){
  }

  //draws all the objects associated with this sector
  this.drawSector = function(){
    //draw planets
    for (var i = 0; i < planets.length; i++){
      planets[i].drawPlanet();
    }
    //draw stars
    for (var i = 0; i < stars.length/2; i++){
      circle(starToScreen(stars[i], 0.004), 0.1);
      //var star = starToScreen(stars[i],0.012);
      //ctx.rect(star.x,star.y,0.1,0.1);
    }
    for (var i = Math.ceil(stars.length/2); i < stars.length; i++){
      circle(starToScreen(stars[i], 0.0045), 0.1);
      //var star = starToScreen(stars[i],0.018);
      //ctx.rect(star.x,star.y,0.1,0.1);
    }
    //draw asteroids
    for (var i = 0; i < asteroids.length; i++){
      asteroids[i].drawAsteroid();
    }
  }


}

window.onresize = function(){
  ctx.canvas.width = window.innerWidth * 0.9;
  ctx.canvas.height = window.innerHeight * 0.9;
}

canvas.onmousewheel = function(e){
  if (GAME_STATE == GAME_PLAY){
    //get mouse's world coords
    var oldMouse = toWorldCoords(new Point(mouseX, mouseY));

    if (e.wheelDelta > 0){
      if (scale < MAX_ZOOM_IN){
        scaleEngineSound();
        scaleLaserSound();
        scale += 0.05 * scale;
      }
    } else if (e.wheelDelta < 0){
      if (scale > MAX_ZOOM_OUT){
        scaleEngineSound();
        scaleLaserSound();
        scale -= 0.05 * scale;
      }
    }
    
    if (!CAMERA_LOCK){
      //get mouse's new world coords
      var newMouse = toWorldCoords(new Point(mouseX, mouseY));

      //take difference
      var vector = subtractPoint(oldMouse, newMouse);
      
      //move camera by difference
      camera.p.x += vector.x;
      camera.p.y += vector.y;
    }
  }

  return false;
}

function EdgeGradient(width){
  var intensity = 0;

  var leftgrad = ctx.createLinearGradient(0, 0, width, 0);
  leftgrad.addColorStop(1,"rgba(17,17,17,0)");

  var rightgrad = ctx.createLinearGradient(canvas.width, 0, canvas.width - width, 0);
  rightgrad.addColorStop(1,"rgba(17,17,17,0)");

  var topgrad = ctx.createLinearGradient(0, 0, 0, width);
  topgrad.addColorStop(1,"rgba(17,17,17,0)");

  var bottomgrad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - width);
  bottomgrad.addColorStop(1,"rgba(17,17,17,0)");

  this.drawEdgeGradient = function(){

    intensity = edgeTimer/30;

    leftgrad.addColorStop(0,"rgba(0,200,255,"+intensity+")");
    rightgrad.addColorStop(0,"rgba(0,200,255,"+intensity+")");
    topgrad.addColorStop(0,"rgba(0,200,255,"+intensity+")");
    bottomgrad.addColorStop(0,"rgba(0,200,255,"+intensity+")");

    ctx.fillStyle = leftgrad;
    ctx.fillRect(0, 0, width, canvas.height);
    
    ctx.fillStyle = rightgrad;
    ctx.fillRect(canvas.width - width, 0, width, canvas.height);

    ctx.fillStyle = topgrad;
    ctx.fillRect(0, 0, canvas.width, width);

    ctx.fillStyle = bottomgrad;
    ctx.fillRect(0, canvas.height - width, canvas.width, width);
  }
}

document.onkeydown = function(e){
  if (GAME_STATE != MENU){
    switch(e.keyCode){
      case 190: // "." for increase time accel
        if (TIME_MULTIPLIER < MAX_TIME_MULTIPLIER){
          TIME_MULTIPLIER++;
        }
        if (TIME_MULTIPLIER > 5){
          rocket.setBurn(false);
        }
        break;
      case 188: // "," for decrease time accel
        if (TIME_MULTIPLIER > 1){
          TIME_MULTIPLIER--;
        }
        break;
      case 80: // P for Plot trajectory
        TRAJECTORY = !TRAJECTORY; 
        break;
      case 32: // SPACE for laser
        rocket.fireLaser();
        laser_sound.play();
        break;
      case 82: // R for restart
        restart();
        break;
      case 39: //right arrow: turn right
        ROT = true;
        angleIncr = -0.1;
        break;
      case 37: //left arrow: turn left
        ROT = true;
        angleIncr = 0.1;
        break;
      case 38: // up arrow: burn rocket
        if (TIME_MULTIPLIER <= 5){
          if (GAME_STATE == 1){
            if (!rocket.getBurn()){ 
              rocket_sound.play();
            }
          }
          rocket.setBurn(true);
        }
        break;
      case 65: // A to turn left
        ROT = true;
        angleIncr = 0.1;
        break;
      case 68: // D to turn right
        ROT = true;
        angleIncr = -0.1;
        break;
      case 87: // W to burn rocket
        if (TIME_MULTIPLIER <= 5){
          if (GAME_STATE == 1){
            if (!rocket.getBurn()){ 
              rocket_sound.play();
            }
          }
          rocket.setBurn(true);
        }
        break;
        /*
      case 71: // G for gravity: not in use
        GRAV = !GRAV;
        break;
        */
        
      case 187: //+ zoom: zooms toward camera center
        zoom = 1;
        break;
      case 189: //- zoom: zooms toward camera center
        zoom = -1;
        break;
      case 77: // M for music
        if (GAME_STATE != GAME_OVER){
          if (MUSIC){
            background_music.pause();
          } else {
            background_music.play();
          }
          MUSIC = !MUSIC;
        }
        break;
      case 84: // T
        if (!CAMERA_LOCK){
          edgeTimer = 15;
          EDGE_TELEPORT = !EDGE_TELEPORT;
        }
        break;
      case 66: // B for afterburner
        AFTER = !AFTER;
        if (AFTER){
          rocket_sound.volume(0.5 * scale);
        } else {
          rocket_sound.volume(0.3 * scale);
        }
        break;
      case 76: // L for camera lock
        if (!EDGE_TELEPORT){
          CAMERA_LOCK = !CAMERA_LOCK;
        }
        break;
      case 82: // R for restart
        window.cancelAnimationFrame(requestId);
        break;
      case 67: // C for controls
        SHOW_CONTROLS = !SHOW_CONTROLS;
        break;
    } 
  }
  if (GAME_STATE != GAME_PLAY && GAME_STATE != GAME_OVER){
    if (e.keyCode == 77){
      if (MUSIC){
        background_music.pause();
      } else {
        background_music.play();
      }
      MUSIC = !MUSIC;
    }
  }
}

document.onkeyup = function(e){
  if (GAME_STATE != MENU){
    switch(e.keyCode){
      case 39: //right arrow
        ROT = false;
        break;
      case 37: //left arrow
        ROT = false;
        break;
      case 38: // up arrow
        rocket.setBurn(false);
        rocket_sound.stop();
        break;
      case 65: // A
        ROT = false;
        break;
      case 68: // D
        ROT = false;
        break;
      case 87: // W
        rocket.setBurn(false);
        rocket_sound.stop();
        break;
      case 187: //+
          zoom = 0;
        break;
      case 189: //-
          zoom = 0;
        break;
    }
  }
}

canvas.onmousemove = function(e){
  var rect = canvas.getBoundingClientRect();
  mouseXprev = mouseX;
  mouseYprev = mouseY;
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
}

canvas.onmousedown = function(){
  if (GAME_STATE == MENU){ //temporary state test
    camera.p.x = 0;
    GAME_STATE = GAME_PLAY;
  } else {
    drag = true;
  }
}

canvas.onmouseup = function(){
  if (GAME_STATE == GAME_PLAY){
    drag = false;
  }
}

function scaleEngineSound(){
  if (!AFTER){
    rocket_sound.volume(0.3 * scale);
  } else {
    rocket_sound.volume(0.5 * scale);
  }
}

function scaleLaserSound(){
  laser_sound.volume(0.1 * scale);
}

function checkZoom(){
  if (zoom == 1){
    if (scale < MAX_ZOOM_IN){
      scaleEngineSound();
      scaleLaserSound();
      scale += 0.05 * scale;
    }
  } else if (zoom == -1){
    if (scale > MAX_ZOOM_OUT){
      scaleEngineSound();
      scaleLaserSound();
      scale -= 0.05 * scale;
    }
  }
}

function scroll(){
  var dx = mouseX - mouseXprev;
  var dy = mouseY - mouseYprev;
  camera.p.x -= dx/scale;
  camera.p.y += dy/scale;
  mouseXprev = mouseX;
  mouseYprev = mouseY;
}

//translate a point from world to screen coordinates
function toScreenCoords(p){
  //right now origin is center bottom
  var y = canvas.height/2 - scale * (p.y - camera.p.y);
  var x = canvas.width/2 + scale * (p.x - camera.p.x);
  return new Point(x, y);
}

//translate a point from screen to world coordinates
function toWorldCoords(p){
  var y = (canvas.height/2 + scale * camera.p.y - p.y) / scale;
  var x = (scale * camera.p.x + p.x - canvas.width/2) / scale;
  return new Point(x, y);
}

//convert a star to screen coordinates, with a parallax value of dist
function starToScreen(p, dist){ //0.012 and something else?
  var y = canvas.height/2 - 0.0035 * (p.y - dist * camera.p.y);
  var x = canvas.width/2 + 0.0035 * (p.x - dist * camera.p.x);
  return new Point(x, y);
}

//adds a and b
function addPoint(a, b){
  return new Point(a.x + b.x, a.y + b.y);
}

//subtracts b from a
function subtractPoint(a, b){
  return new Point(a.x - b.x, a.y - b.y);
}

//divide point by a scalar
function pointDivide(point, scalar){
  return new Point(point.x/scalar, point.y/scalar);
}

//multiply point by a scalar
function pointMultiply(point, scalar){
  return new Point(point.x * scalar, point.y * scalar);
}

function Point(x, y){
  this.x = x;
  this.y = y;

  this.lengthSquared = function(){
    return this.x * this.x + this.y * this.y;
  }

  this.length = function(){
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

}

function Camera(p){
  //camera has world coordinates
  //camera "size" is canvas size
  //coordinates are center of camera 
  this.p = p;
}

function Planet(position, radius){
  this.position = position;
  this.radius = radius;
  var radSquared = this.radius * this.radius;
  var mass = radius * radius;

  this.drawPlanet = function() {
    if (!EDGE_TELEPORT){
      ctx.strokeStyle = "rgb(0,255,0)";
    } else {
      ctx.strokeStyle = "rgb(0,100,50)";
    }
    var newPosition = toScreenCoords(this.position);
    fillCircle(newPosition,scale * radius, "rgb(17,17,17)");
    circle(newPosition, scale * radius);
  }

  this.getMass = function(){
    return mass;
  }

  this.contains = function(p){
    //var screenPos = toScreenCoords(this.position);
    var distance = subtractPoint(this.position, p).lengthSquared();
    return (distance < radSquared);
  }
}

function Laser(back, front, velocity){
  //front and back in world coordinates
  this.back = back;
  this.front = front;
  this.velocity = velocity;

  var lasVec = subtractPoint(back, front);
  var life = LASER_LIFETIME;
  var in_use = true;

  this.getLife = function(){
    return life;
  }

  this.use = function(){
    in_use = true;
  }

  this.trash = function(){
    in_use = false;
  }

  this.used = function(){
    return in_use;
  }

  this.move = function(){
    life--;
    this.back.x += this.velocity.x;
    this.back.y += this.velocity.y;
    this.front.x += this.velocity.x;
    this.front.y += this.velocity.y;
    
    // Asteroids-style edge-teleport
    if (EDGE_TELEPORT){
      var translate_factor_W = canvas.width/scale;
      var half_factor_W = translate_factor_W/2;
      var translate_factor_H = canvas.height/scale;
      var half_factor_H = translate_factor_H/2;

      if (this.back.x > camera.p.x + half_factor_W){
        this.back.x -= translate_factor_W;
        this.front.x -= translate_factor_W;
      } else if (this.back.x < camera.p.x - half_factor_W){
        this.back.x += translate_factor_W;
        this.front.x += translate_factor_W;
      }
      if (this.back.y > camera.p.y + half_factor_H){
        this.back.y -= translate_factor_H;
        this.front.y -= translate_factor_H;
        //klein bottle math courtesy Cole Graham
        //this.center.x = camera.p.x - (this.center.x - camera.p.x);
        //vel.x = -1 * vel.x;
      } else if (this.back.y < camera.p.y - half_factor_H){
        this.back.y += translate_factor_H;
        this.front.y += translate_factor_H;
        //klein bottle
        //this.center.x = camera.p.x - (this.center.x - camera.p.x);
        //vel.x = -1 * vel.x;
      }
    }
    
  }

  this.drawLaser = function(){
    var frontScreen = toScreenCoords(front);
    var backScreen = toScreenCoords(back);
    ctx.strokeStyle = "rgb(0,255,200)";
    ctx.beginPath();
    ctx.moveTo(backScreen.x, backScreen.y);
    ctx.lineTo(frontScreen.x, frontScreen.y);
    ctx.closePath();
    ctx.stroke();
  }
}

function Asteroid(position, velocity, radius){
  this.position = position;
  this.velocity = velocity;
  var points = new Array(); //in coords relative to position

  this.move = function(){
    position.x += velocity.x;
    position.y += velocity.y;
  }

  this.generatePoints = function(){
    //placeholder
    /*
    points.push(new Point(50,0));
    points.push(new Point(0,50));
    points.push(new Point(-50,0));
    points.push(new Point(0,-50));
    */
    var x;
    var y;
    for (var angle = 0; angle < Math.PI * 2; angle += 0.4){
      x = Math.cos(angle);
      y = Math.sin(angle);
      var mag = Math.random() * radius/2 + radius/2;
      var newx = mag * x;
      var newy = mag * y; 
      points.push(new Point(newx, newy));
    }
  }

  this.toWorldCoords = function(point){
    return new Point(position.x + point.x, position.y + point.y);
  }

  this.drawAsteroid = function(){
    ctx.strokeStyle = "rgb(0,255,0)";
    ctx.beginPath();
    var start = toScreenCoords(this.toWorldCoords(points[0]));
    ctx.moveTo(start.x, start.y);
    for (var i = 1; i < points.length; i++){
      var nextPoint = toScreenCoords(this.toWorldCoords(points[i]));
      ctx.lineTo(nextPoint.x, nextPoint.y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgb(17,17,17)";
    ctx.fill();
    ctx.stroke();
  }
}

function Rocket(center){
  this.center = center;  //point
  var angle = 0;
  var burn = false;
  var vel = new Point(0, 0);
  var radius = 30;
  var landed = false;
  var distance = 0;

  //useless piece of crap functio
  ////useless piece of crap function
  this.plotTrajectory = function(numIterations){
    var trajPoint = new Point(this.center.x, this.center.y);
    var tempVel = new Point(vel.x, vel.y);
    var screenTrajPoint = toScreenCoords(trajPoint);
    var done = false;
    ctx.beginPath();
    ctx.moveTo(screenTrajPoint.x, screenTrajPoint.y);
    for (var j = 0; j < numIterations && !done; j++){
      //var multiplier = 1 + Math.sqrt(j);  //more accurate
      //var multiplier = 1 + j;  //farther into the future
      var multiplier = 1 + Math.pow(j, 0.75);
      //var multiplier = 1 + Math.sqrt(200 * j);
      for (var i = 0; i < planets.length; i++){
        // G * M_plan / r^2 * rhat
        //console.log("starting to calculate a point");
        var accelVec = subtractPoint(trajPoint, planets[i].position);
        var accelVecLength = accelVec.length();
        if (accelVecLength > radius + planets[i].radius){
          var rHat = pointDivide(accelVec, accelVecLength); 
          var accel = pointMultiply(rHat, -1 * G * planets[i].getMass() / accelVec.lengthSquared());
          tempVel.x += accel.x * multiplier;
          tempVel.y += accel.y * multiplier;
        }
      } 
      trajPoint.x += tempVel.x * multiplier;
      trajPoint.y += tempVel.y * multiplier;
      for (var k = 0; k < planets.length; k++){
        if (planets[k].contains(trajPoint)){
          done = true;
        }
      }
      if (!done){
        var screenTrajPoint = toScreenCoords(trajPoint);
        ctx.lineTo(screenTrajPoint.x, screenTrajPoint.y);
      }
    }
    ctx.stroke();
  }

  this.fireLaser = function(){
    var back = this.toWorldCoords(new Point(0,50), this.center);
    var front = this.toWorldCoords(new Point(0,70), this.center);
    //velocity: same as back and front, but relative to origin
    var lasVel = addPoint(this.toWorldCoords(new Point(0,LASER_SPEED), new Point(0,0)), vel);
    lasers.push(new Laser(back, front, lasVel));
  }

  this.gravitate = function(){
    /*
    if (this.center.y > camera.p.y - canvas.width/2 + radius){
      vel.y -= 0.05;
    }
    */
    for (var i = 0; i < planets.length; i++){
      // G * M_plan / r^2 * rhat
      var accelVec = subtractPoint(this.center, planets[i].position);
      var accelVecLength = accelVec.length();
      if (accelVecLength > radius + planets[i].radius){
        var rHat = pointDivide(accelVec, accelVecLength); 
        var accel = pointMultiply(rHat, -1 * G * planets[i].getMass() / accelVec.lengthSquared());
        vel.x += accel.x;
        vel.y += accel.y;
      }
    }
  }

  this.checkCollisions = function(){
    var nextPos = addPoint(this.center, vel);
    for (var i = 0; i < planets.length; i++){
      var connector = subtractPoint(nextPos, planets[i].position);
      if (connector.length() < radius + planets[i].radius){
        if (vel.lengthSquared() > 22){
          background_music.stop();
          dead = true;
          edgeTimer = 0;
          GAME_STATE = GAME_OVER;
        }
        if (!landed && !dead){
          points += Math.round(0.01 * distance);
          if (points > POINTS_TO_WIN){
            background_music.stop();
            GAME_STATE = GAME_OVER;
          }
          distance = 0;
          landed = true;
        }
        vel.x = 0;
        vel.y = 0;
      }
    }
  }

  this.move = function(){ 
    this.center.x += vel.x;
    this.center.y += vel.y;
    
    distance += vel.length();

    if (burn){
      if (vel.lengthSquared != 0){
        landed = false;
      }
      if (AFTER){
        vel.x += 0.5 * rotBasis.y.x;
        vel.y += 0.5 * rotBasis.y.y;
      } else {
        vel.x += 0.205 * rotBasis.y.x;
        vel.y += 0.205 * rotBasis.y.y;
      }
    }
    /*  ground collision: buggy
    if (this.center.y < camera.p.y - canvas.height/2 + radius) {
      vel.y = 0;
      this.center.y = camera.p.y - canvas.height/2 + radius;
    }
    */

    // Asteroids-style edge-teleport
    if (EDGE_TELEPORT){
      if (this.center.x > camera.p.x + canvas.width/(2 * scale)){
        this.center.x = camera.p.x - canvas.width/(2 * scale);
      } else if (this.center.x < camera.p.x - canvas.width/(2 * scale)){
        this.center.x = camera.p.x + canvas.width/(2 * scale);
      }
      if (this.center.y > camera.p.y + canvas.height/(2 * scale)){
        this.center.y = camera.p.y - canvas.height/(2 * scale);
        //klein bottle math courtesy Cole Graham
        //this.center.x = camera.p.x - (this.center.x - camera.p.x);
        //vel.x = -1 * vel.x;
      } else if (this.center.y < camera.p.y - canvas.height/(2 * scale)){
        this.center.y = camera.p.y + canvas.height/(2 * scale);
        //klein bottle
        //this.center.x = camera.p.x - (this.center.x - camera.p.x);
        //vel.x = -1 * vel.x;
      }
    }
    

  }

  this.changeAngle = function(inc){
      angle += inc;
  }

  this.setBurn = function(b){
    burn = b;
  }

  this.getBurn = function(){
    return burn;
  }
  
  //basis vectors for ship axis
  var rotBasis = new Point(new Point(1, 0), new Point(0, 1));

  //get ship's basis vectors from angle
  this.rotate = function(){
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    rotBasis.x.x = cos;
    rotBasis.x.y = sin;

    rotBasis.y.x = -1 * sin;
    rotBasis.y.y = cos;

    if (ROT){
      this.changeAngle(angleIncr);
    }
  }

  //let the ship center be the origin of the ship's 
  //arbitrarily rotated coordinate axis. Given a point
  //relative to this origin, return its world coordinates
  this.toWorldCoords = function(point, axis){
    var newx = point.x * rotBasis.x.x + point.y * rotBasis.y.x;
    var newy = point.x * rotBasis.x.y + point.y * rotBasis.y.y;
    return new Point(axis.x + newx, axis.y + newy);
  }

  this.modelToScreen = function(p){
    var y = canvas.height + canvas.height - 100 - p.y;
    return new Point(p.x, y);
  }

  this.drawRocket = function(){
    ctx.fillStyle = "rgb(17,17,17)";
    ctx.strokeStyle = "rgb(0,255,0)";
    this.rotate();
    var tip = toScreenCoords(this.toWorldCoords(new Point(0,50), this.center));
    var left = toScreenCoords(this.toWorldCoords(new Point(-15,-30), this.center));
    var right = toScreenCoords(this.toWorldCoords(new Point(15,-30), this.center));
    //draw rocket body
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    circle(toScreenCoords(this.center), scale * 5); 
    //draw shield
    var newCenter = toScreenCoords(this.center);
    var shieldGradient = ctx.createRadialGradient(newCenter.x, newCenter.y, scale * 30, newCenter.x, newCenter.y, scale *60);
    shieldGradient.addColorStop(0,"rgba(17,17,17,0)");
    shieldGradient.addColorStop(1,"rgba(0,200,255,0.25)");
    //ctx.arc(newCenter.x, newCenter.y, scale * 60, Math.PI * 2 - angle, Math.PI * 2 - angle + Math.PI/4);
    //ctx.fillStyle = shieldGradient;
    //ctx.fill();
    //ctx.fillStyle = "rgb(17,17,17)";
    fillCircle(newCenter, scale * 60, shieldGradient);

    //center of model for scale drawing
    var modelCenter = new Point(50, canvas.height - 50);

    //draw rocket model compass
    fillCircle(new Point(50, canvas.height - 50), 70, "rgb(17,17,17)");
    circle(new Point(50, canvas.height - 50), 70);

    //draw rocket model
    var modelTip = this.modelToScreen(this.toWorldCoords(new Point(0,50), modelCenter));
    var modelLeft = this.modelToScreen(this.toWorldCoords(new Point(-15,-30), modelCenter));
    var modelRight = this.modelToScreen(this.toWorldCoords(new Point(15,-30), modelCenter));
    ctx.beginPath();
    ctx.moveTo(modelTip.x, modelTip.y);
    ctx.lineTo(modelLeft.x, modelLeft.y);
    ctx.lineTo(modelRight.x, modelRight.y);
    ctx.closePath();
    ctx.stroke();
        
    if (scale < 0.25){
        //draw indicator around rocket.  Constant size rel. screen
        var center = toScreenCoords(this.center);
        drawIndicator(center);
    }

    if (burn){
      if (AFTER) {
        ctx.fillStyle = "rgb(0,200,255)";
        ctx.strokeStyle = "rgb(0,200,255)";
        var tip = toScreenCoords(this.toWorldCoords(new Point(0,-270 * (Math.random() + 0.3)), this.center));
        var modelTip = this.modelToScreen(this.toWorldCoords(new Point(0,-50), modelCenter));
      } else {
        ctx.fillStyle = "rgb(255,60,0)";
        ctx.strokeStyle = "rgb(255,60,0)";
        var tip = toScreenCoords(this.toWorldCoords(new Point(0,-70 * (Math.random() + 0.5)), this.center));
        var modelTip = this.modelToScreen(this.toWorldCoords(new Point(0,-40), modelCenter));
      }
      
      //draw rocket exhaust
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      
      //draw model exhaust
      ctx.beginPath();
      ctx.moveTo(modelTip.x, modelTip.y);
      ctx.lineTo(modelLeft.x, modelLeft.y);
      ctx.lineTo(modelRight.x, modelRight.y);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }

    //set color for model engine
    if (AFTER) {
      ctx.fillStyle = "rgb(0,200,255)";
      ctx.strokeStyle = "rgb(0,200,255)";
    } else {
      ctx.fillStyle = "rgb(255,60,0)";
      ctx.strokeStyle = "rgb(255,60,0)";
    }
    
    //draw model engine type indicator
    ctx.beginPath();
    ctx.moveTo(modelLeft.x, modelLeft.y);
    ctx.lineTo(modelRight.x, modelRight.y);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = "rgb(0,255,0)";
    ctx.fillStyle = "rgb(0,255,0)";

    var velocityMagnitude = vel.length();
    if (velocityMagnitude > 0.3){
      //draw velocity vector 
      var normalizedVelocity = pointMultiply(pointDivide(vel, velocityMagnitude), 70)
      ctx.beginPath();
      ctx.moveTo(modelCenter.x + normalizedVelocity.x/2, modelCenter.y - normalizedVelocity.y/2);
      ctx.lineTo(modelCenter.x + normalizedVelocity.x, modelCenter.y - normalizedVelocity.y);
      ctx.closePath;
      ctx.stroke();
    }
    //whatever you do, don't do this:
    if (TRAJECTORY && !EDGE_TELEPORT){
      if (vel.x != 0 || vel.y != 0){
        this.plotTrajectory(512);
      }
    }
  }
}

//draws an indicator around a point, given in screen coordinates
function drawIndicator(center){
  ctx.moveTo(center.x - 10, center.y - 10);
  ctx.lineTo(center.x - 5, center.y - 10);
  ctx.moveTo(center.x + 5, center.y - 10);
  ctx.lineTo(center.x + 10, center.y - 10);
  
  ctx.moveTo(center.x - 10, center.y + 10);
  ctx.lineTo(center.x - 5, center.y + 10);
  ctx.moveTo(center.x + 5, center.y + 10);
  ctx.lineTo(center.x + 10, center.y + 10);

  ctx.moveTo(center.x - 10, center.y - 10);
  ctx.lineTo(center.x - 10, center.y - 5);
  ctx.moveTo(center.x - 10, center.y + 5);
  ctx.lineTo(center.x - 10, center.y + 10);

  ctx.moveTo(center.x + 10, center.y - 10);
  ctx.lineTo(center.x + 10, center.y - 5);
  ctx.moveTo(center.x + 10, center.y + 5);
  ctx.lineTo(center.x + 10, center.y + 10);

  ctx.stroke();

}

function circle(p, r){
  ctx.beginPath();   
  ctx.arc(p.x, p.y, r, 0, Math.PI*2, true);
  ctx.stroke(); 
  ctx.closePath();
}

function fillCircle(p, r, color){
  ctx.fillStyle = color;
  //experimental:
  /*
  var grad = ctx.createLinearGradient(0, p.y - r, 0, p.y + r);
  var centerPlanet = toScreenCoords(p);
  grad.addColorStop(1,"rgb(255,100,100)");
  grad.addColorStop(0.75, "rgb(125,50,50)");
  grad.addColorStop(0.5, "rgb(60,25,25)");
  grad.addColorStop(0.25, "rgb(17,17,17)");
  grad.addColorStop(0, "rgb(17,17,17)");
  ctx.fillStyle = grad;
  */
  ctx.beginPath();   
  ctx.arc(p.x, p.y, r, 0, Math.PI*2, true);
  ctx.fill(); 
  ctx.closePath();
}

function printControls(x, y, FULL){
  ctx.strokeStyle = "rgb(0,255,0)";
  ctx.fillStyle = "rgb(0,255,0)";
  ctx.font = "20px Arial";

  ctx.fillText("Arrow keys/WASD: steer and fire engine", x, y + 30);
  ctx.fillText("Mousewheel or -/=: zoom", x, y + 60); 

  if (AFTER){
    ctx.fillText("B: Deactivate afterburner", x, y + 90);
  } else {
    ctx.fillText("B: Activate afterburner", x, y + 90);
  }
  if (CAMERA_LOCK){
    ctx.fillText("L: Free camera from rocket", x, y + 120);
  } else {
    if (EDGE_TELEPORT){
      ctx.fillText("T: Deactivate edge-teleport (collisions and gravity ON)", x, y + 210);
    } else {
      ctx.fillText("T: Activate edge-teleport (collisions and gravity OFF)", x, y + 210);
    }
    if (drag){
      ctx.fillText("Dragging universe", x, y + 150);
    } else {
      ctx.fillText("Left Mouse: drag universe", x, y + 150);
    }
    if (!EDGE_TELEPORT){
      ctx.fillText("L: Lock camera to rocket", x, y + 120);
    }
  }
  if (MUSIC){
    ctx.fillText("M: Music is ON", x, y + 180);
  } else {
    ctx.fillText("M: Music is OFF", x, y + 180);
  }
  if (!EDGE_TELEPORT){
    if (TRAJECTORY){
      ctx.fillText("P: Deactivate trajectory plotting", x, y + 270);
    } else {
      ctx.fillText("P: Activate trajectory plotting", x, y + 270);
    }
  }

  ctx.fillText("Spacebar: Fire laser", x, y + 240);
  ctx.fillText(", and . : Time acceleration", x, y + 300);
  ctx.fillText("R: Restart game", x, y + 330);

      
  ctx.fillStyle = "rgb(17,17,17)";
  ctx.strokeStyle = "rgb(0,255,0)";
}

function draw(){
  //ctx.canvas.width = window.innerWidth * 0.9;
  //ctx.canvas.height = window.innerHeight * 0.9;
  window.requestAnimFrame(draw);

  if (GAME_STATE == GAME_PLAY){
    ctx.clearRect(0,0,canvas.width, canvas.height);  

    //scale the map 
    checkZoom();
     
    for (var i = 0; i < TIME_MULTIPLIER; i++){
      if (!EDGE_TELEPORT){
        //apply gravity 
        rocket.gravitate();
     
        //check collisions
        rocket.checkCollisions();
      }

      //move rocket
      rocket.move();
    }

    //lock the camera
    if (CAMERA_LOCK){
      camera.p.x = rocket.center.x;
      camera.p.y = rocket.center.y;
    }

    // DEBUG PRINTS
    //ctx.fillText(Math.round(camera.p.x)+" "+Math.round(camera.p.y), 100, 300);
    //ctx.fillText(Math.round(rocket.center.x)+" "+Math.round(rocket.center.y), 100, 350);
    //ctx.fillText("number of planets: "+planets.length, 100, 400);
    /*
    for (var i = 0; i < planets.length; i++){
      var transformedPlanet = toScreenCoords(planets[i].position);
      var transformedRocket = toScreenCoords(rocket.center);
      ctx.beginPath();
      ctx.moveTo(transformedRocket.x, transformedRocket.y);
      ctx.lineTo(transformedPlanet.x, transformedPlanet.y);
      ctx.stroke();
      ctx.closePath();
    }
    */
    
    //draw stars
    
    ctx.strokeStyle = "rgb(0,255,0)";
    for (var i = 0; i < stars.length/2; i++){
      circle(starToScreen(stars[i], 0.004), 0.1);
      //var star = starToScreen(stars[i],0.012);
      //ctx.rect(star.x,star.y,0.1,0.1);
    }
    for (var i = Math.ceil(stars.length/2); i < stars.length; i++){
      circle(starToScreen(stars[i], 0.0045), 0.1);
      //var star = starToScreen(stars[i],0.018);
      //ctx.rect(star.x,star.y,0.1,0.1);
    }
    //ctx.stroke();

    //draw planets
    for (var i = 0; i < planets.length; i++){
      planets[i].drawPlanet();
    }

    //Asteroid test
    testAsteroid.move();
    testAsteroid.drawAsteroid();

    //draw rocket
    rocket.drawRocket();

    //formatting for point count and controls
    ctx.font = "20px Arial";
    
    //print time multiplier
    ctx.fillText(TIME_MULTIPLIER+"x", canvas.width - 40, 25);
    if (TIME_MULTIPLIER > 5){
      ctx.fillText("Burn Disabled!", canvas.width - 145, 50);
    }

    //print point count
    ctx.fillText("Points: "+points, canvas.width/2 - 30, 30);

    //print controls
    if (SHOW_CONTROLS){
      ctx.fillText("Controls (C to hide):", 10, 30);
      printControls(10, 30, false); 
    } else {
      ctx.fillText("Show Controls: C", 10, 30);
    }
     
    for (var j = 0; j < TIME_MULTIPLIER; j++){
    //lasers
      for (var i = lasers.length - 1; i >= 0; i--){
          lasers[i].move();
          if (lasers[i].getLife() == 0){
            lasers.splice(i,1);
          }
      }
    }
    for (var i = lasers.length - 1; i >= 0; i--){
      lasers[i].drawLaser();
    }
    
    //draw Gradient
    if (edgeTimer != 0){
      edge.drawEdgeGradient();
      edgeTimer--;
    }

    //scroll universe
    if (drag) {
      scroll();
    }

  } else if (GAME_STATE == GAME_OVER){
    ctx.font = "60px Helvetica";
    ctx.fillStyle = "rgb(255,0,0)";
    if (points > POINTS_TO_WIN){
      ctx.font = "20px Helvetica";
      ctx.fillText("You won!", Math.random() * canvas.width, Math.random() * canvas.height);
    } else {
      ctx.clearRect(0,0,canvas.width, canvas.height);  
      ctx.fillText("GAME OVER", canvas.width/2 - 200, canvas.height/2);
      ctx.fillText("you crashed", canvas.width/2 - 200, canvas.height/2 + 60);
      ctx.font = "20px Helvetica";
      ctx.fillText("R to restart", canvas.width/2 - 100, canvas.height/2 + 90);
    }
  } else if (GAME_STATE == MENU){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.font = "80px Helvetica";
    ctx.fillStyle = "rgb(0,255,0)";
    ctx.fillText("ROCKET SIMULATOR", 20, 80);
    ctx.font = "40px Helvetica";
    ctx.fillText("click to play", canvas.width/2 - 100, canvas.height/2 + 50);
    ctx.strokeStyle = "rgb(0,255,0)";
    ctx.font = "30px Helvetica";
    ctx.fillText("Controls: ", 20, 130);
    printControls(20, 130, false);

    //moving field of stars for menu
    for (var i = 0; i < stars.length/2; i++){
      circle(starToScreen(stars[i], 0.012), 0.1);
    }
    for (var i = Math.ceil(stars.length/2); i < stars.length; i++){
      circle(starToScreen(stars[i], 0.018), 0.1);
    }
    if (camera.p.x > 8000000){
      STARFIELD_SPEED_MENU = -2000;
    } else if (camera.p.x < -8000000){
      STARFIELD_SPEED_MENU = 2000;
    }
    camera.p.x += STARFIELD_SPEED_MENU;
  }
}
