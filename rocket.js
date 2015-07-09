function init(){
  // if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1)
  // {
  //   alert("This game doesn't run well in Firefox!  Try Chrome or Safari for the best experience!");
  // }

  is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
  // if (is_chrome) {
  //   alert("Chrome doesn't render circles properly. Landing will be imprecise and potentially impossible! I'm looking for a fix for this.");
  // }

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
  angleIncr = 0.1;
  dead = false;
  HOME_PLANET_SIZE = 500000;
  LASER_LIFETIME = 180;  //60 frames per second * seconds of life
  LASER_SPEED = 40;
  FIRE_LASER = false;
  ROT = false;
  GRAV = false;
  EDGE_TELEPORT = false;
  AFTER = false;

  //Camera state
  CAMERA_LOCK = 0;
  CAMERA_FREE = 0;
  CAMERA_LOCK_ROCKET = 1;
  CAMERA_LOCK_ENEMY = 2;

  NUM_PLANETS = 20;
  //NUM_STARS = 500;
  STAR_DENSITY = 0.00016;
  STARFIELD_SPEED_MENU = 10000;
  TRAJECTORY = false;
  TIME_MULTIPLIER = 1;
  MAX_TIME_BURN = 30;
  MAX_TIME_MULTIPLIER = 30;
  SECTOR_SIZE = 10000000;
  DRAW_SECTOR_BOUNDARIES = false;
  ASTEROIDS_PER_SECTOR = 10;

  //color strings
  background = "rgb(0,0,0)";
  blue = "rgb(0,200,255)";
  green = "rgb(0,255,0)";
  red = "rgb(255,60,0)";
  purple = "rgb(255,0,255)";

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

  //audio objects
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

  //planets = new Array();
  //planets.push(new Planet(new Point(0,0), HOME_PLANET_SIZE));
  stars = new Array();
  stars.push(new Point(0, 10000));
  sectorMap = new SectorMap();

  //ship target
  target = undefined;

  //list of all lasers in game
  lasers = new Array();
  lasers.push(new Laser(new Point(0,5090), new Point(0,5100), new Point(0,0)));
  lasers[0].trash();

  nearbySectorsQuadrant = new Array();

  //global starmap
  generateStars();

  //begin drawing
  requestId = window.requestAnimFrame(draw);
}

function restart(){
  //reset all state variables to start values
  dead = false;
  ROT = false;
  GRAV = false;
  EDGE_TELEPORT = false;
  AFTER = false;
  CAMERA_LOCK = CAMERA_FREE;
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
  //planets = new Array();
  //planets.push(new Planet(new Point(0,0), HOME_PLANET_SIZE));
  stars = new Array();
  stars.push(new Point(0, 10000));
  lasers = new Array();
  lasers.push(new Laser(new Point(0,5090), new Point(0,5100), new Point(0,0)));
  lasers[0].trash();
  generateStars();
  //generatePlanets();

  //stop music, if playing
  background_music.stop();

  //play background music
  if (MUSIC){
    background_music.play();
  }
}

function generateStars(){
  for (var i = 0; i < STAR_DENSITY * canvas.width * canvas.height; i++){
    var x = Math.floor(Math.random()*canvas.width * 140);
    x *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
    var y = Math.floor(Math.random()*canvas.height * 140);  //800000 * 0.38
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

  this.drawAllSectors = function(){
    for (var sector in Map){
      if (Map.hasOwnProperty(sector)){
        Map[sector].drawSector();
      }
    }
  }

  this.drawCameraSectors = function(){
    if (camera.p.x >= 0){
      var cameraX = Math.floor(camera.p.x/(SECTOR_SIZE) + 1/2);
    } else {
      var cameraX = Math.ceil(camera.p.x/(SECTOR_SIZE) - 1/2);
    }
    if (camera.p.y >= 0){
      var cameraY = Math.floor(camera.p.y/(SECTOR_SIZE) + 1/2);
    } else {
      var cameraY = Math.ceil(camera.p.y/(SECTOR_SIZE) - 1/2);
    }
    //ctx.fillText("camera: "+cameraX+" "+cameraY, 100, 400);
    for (var i = cameraX - 2; i < cameraX + 3; i++){
      for (var j = cameraY - 2; j < cameraY + 3; j++){
        (sectorMap.getSector(new Point(i, j))).drawSector();
      }
    }
  }

  this.simulateCameraSectors = function(){
    if (camera.p.x >= 0){
      var cameraX = Math.floor(camera.p.x/(SECTOR_SIZE) + 1/2);
    } else {
      var cameraX = Math.ceil(camera.p.x/(SECTOR_SIZE) - 1/2);
    }
    if (camera.p.y >= 0){
      var cameraY = Math.floor(camera.p.y/(SECTOR_SIZE) + 1/2);
    } else {
      var cameraY = Math.ceil(camera.p.y/(SECTOR_SIZE) - 1/2);
    }
    //ctx.fillText("camera: "+cameraX+" "+cameraY, 100, 400);
    for (var i = cameraX - 2; i < cameraX + 3; i++){
      for (var j = cameraY - 2; j < cameraY + 3; j++){
        var sector = sectorMap.getSector(new Point(i,j));
        (sectorMap.getSector(new Point(i, j))).moveAsteroids();
        sector.moveAsteroids();
        //do other physics things like move aliens
      }
    }
  }

  //transforms point to string as follows:
  //  (1,2) -> "s_1_2"
  //  (-1,2) -> "s_n1_2"
  //thanks to Simon BW for the mapping
  this.pointToString = function(point){
    var xString = "";
    var yString = "";
    var outString = "s_";
    if (point.x < 0){
      xString += "n";
    }
    if (point.y < 0){
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
    if (!sectorMap.containsSector(sectorPoint)){
      sectorMap.instantiate(sectorPoint);
    }
    var sectorString = this.pointToString(sectorPoint);
    return Map[sectorString];
  }

  //returns true if map contains sector for given point
  this.containsSector = function(sectorPoint){
    return (Map.hasOwnProperty(this.pointToString(sectorPoint)));
  }
}

function Sector(sectorPoint){
  // arrays of objects in sector
  this.position = new Point(sectorPoint.x, sectorPoint.y); 
  var worldPosition = new Point(this.position.x * SECTOR_SIZE, this.position.y * SECTOR_SIZE);
  var planets;
  var asteroids;
  var alienSaucers;

  //generates planets, stars, and asteroids for this sector
  this.generateSector = function(){
    planets = new Array();
    if (this.position.x == 0 && this.position.y == 0){
      planets.push(new Planet(worldPosition, HOME_PLANET_SIZE));
    } else {
      for (var i = 0; i < Math.floor(Math.random() * 3); i++){
        var x = Math.floor(Math.random()*SECTOR_SIZE/2);
        x *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
        var y = Math.floor(Math.random()*SECTOR_SIZE/2);
        y *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
        var newPlanetSize = Math.random() * HOME_PLANET_SIZE * 2;
        planets.push(new Planet(new Point(worldPosition.x + x, worldPosition.y + y), newPlanetSize));
      }
    }
    asteroids = new Array();
    for (var i = 0; i < Math.random() * ASTEROIDS_PER_SECTOR; i++){
      var x = Math.floor(Math.random()*SECTOR_SIZE/2);
      x *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
      var y = Math.floor(Math.random()*SECTOR_SIZE/2);
      y *= Math.floor(Math.random()*2) == 1 ? 1 : -1;

      var xVel = Math.floor(Math.random()*100);
      xVel *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
      var yVel = Math.floor(Math.random()*100);
      yVel *= Math.floor(Math.random()*2) == 1 ? 1 : -1;

      asteroids.push(new Asteroid(new Point(worldPosition.x + x, worldPosition.y + y), new Point(xVel,yVel), 80, worldPosition));
      asteroids[i].generatePoints();
    }
    alienSaucers = new Array();
    for (var i = 0; i < Math.random() * 5; i++){
      var x = Math.floor(Math.random()*SECTOR_SIZE/2);
      x *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
      var y = Math.floor(Math.random()*SECTOR_SIZE/2);
      y *= Math.floor(Math.random()*2) == 1 ? 1 : -1;

      alienSaucers.push(new AlienSaucer(new Point(worldPosition.x + x, worldPosition.y + y), worldPosition));
    }
  }

  //draws all the objects associated with this sector
  this.drawSector = function(){
    //draw planets
    for (var i = 0; i < planets.length; i++){
      planets[i].drawPlanet();
    }
    if (DRAW_SECTOR_BOUNDARIES){
      var topLeftCorner = new Point(worldPosition.x - SECTOR_SIZE/2, worldPosition.y + SECTOR_SIZE/2);
      topLeftCorner = toScreenCoords(topLeftCorner);
      ctx.fillStyle = green;
      ctx.beginPath();
      ctx.rect(topLeftCorner.x, topLeftCorner.y, SECTOR_SIZE * scale, SECTOR_SIZE * scale);
      ctx.stroke();
      ctx.closePath();
    }
    //draw asteroids
    for (var i = 0; i < asteroids.length; i++){
      asteroids[i].drawAsteroid();
    }
  }

  this.moveAlienSaucers = function(){
    for (var i = 0; i < alienSaucers.length; i++){
      alienSaucers[i].move();
    }
  }

  this.drawAlienSaucers = function(){
    for (var i = 0; i < alienSaucers.length; i++){
      alienSaucers[i].draw();
    }
  }
  
  this.moveAsteroids = function(){
    for (var i = 0; i < asteroids.length; i++){
      asteroids[i].move();
    }
  }

  this.collideAlienSaucers = function(){
    for (var i = alienSaucers.length - 1; i >= 0; i--){
      if (alienSaucers[i].alive()){
        alienSaucers[i].checkCollisions();
      } else {
        var timer = alienSaucers[i].getDeathTimer();
        var pos = toScreenCoords(alienSaucers[i].position);
        ctx.fillStyle = "rgb(0,"+(timer/30 * 255)+",0)";
        ctx.fillText("+1000", pos.x + scale * 200, pos.y - scale * 200);
        if (timer == 0){
          if (alienSaucers[i] == target){
            target = undefined;
            if (CAMERA_LOCK == CAMERA_LOCK_ENEMY){
              CAMERA_LOCK = CAMERA_LOCK_ROCKET;
            }
          }
          alienSaucers.splice(i, 1);
          points += 1000;
          if (points >= POINTS_TO_WIN){
            background_music.stop();
            GAME_STATE = GAME_OVER;
          }
        }
      }
    }
  }

  this.getAlienSaucers = function(){
    return alienSaucers;
  }

  this.planets = function(){
    return planets;
  }
  this.asteroids = function(){
    return asteroids;
  }
  this.getWorldPosition = function(){
    return worldPosition;
  }
}

window.onresize = function(){
  ctx.canvas.width = window.innerWidth * 0.9;
  ctx.canvas.height = window.innerHeight * 0.9;
  stars = new Array();
  generateStars();
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
    
    if (CAMERA_LOCK == CAMERA_FREE){
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

function detectTarget(){
  var aliens = new Array();
  for (var i = 0; i < nearbySectorsQuadrant.length; i++){
    aliens = aliens.concat(nearbySectorsQuadrant[i].getAlienSaucers());
  }
  if (aliens.length != 0){
    var minDist = subtractPoint(rocket.center, aliens[0].position).lengthSquared();
    var minIndex = 0;
    for (var i = 1; i < aliens.length; i++){
      var temp = subtractPoint(rocket.center, aliens[i].position).lengthSquared(); 
      if (temp < minDist){
        minDist = temp;
        minIndex = i;
      }
    }
    target = aliens[minIndex];
    //set camera state to CAMERA_LOCK_ENEMY
    CAMERA_LOCK = CAMERA_LOCK_ENEMY;
  }
}

document.onkeydown = function(e){
  if (GAME_STATE != MENU){
    switch(e.keyCode){
      case 81: // Q for unlock camera from enemy
        CAMERA_LOCK = CAMERA_FREE;
        target = undefined;
        break;
      case 9: // tab
        detectTarget();
        return false;
        break;
      case 222: // ' (single quote) sector boundaries: debug
        DRAW_SECTOR_BOUNDARIES = !DRAW_SECTOR_BOUNDARIES;
        break;
      case 190: // "." for increase time accel
        if (TIME_MULTIPLIER < MAX_TIME_MULTIPLIER){
          if (TIME_MULTIPLIER > 4){
            TIME_MULTIPLIER += 5;
          } else {
            TIME_MULTIPLIER++;
          }
        }
        if (TIME_MULTIPLIER > MAX_TIME_BURN){
          rocket.setBurn(false);
          rocket_sound.stop();
        }
        break;
      case 188: // "," for decrease time accel
        if (TIME_MULTIPLIER > 1){
          if (TIME_MULTIPLIER > 9){
            TIME_MULTIPLIER -= 5;
          } else {
            TIME_MULTIPLIER--;
          }
        }
        break;
      case 80: // P for Plot trajectory
        TRAJECTORY = !TRAJECTORY; 
        break;
      case 32: // SPACE for laser
        if (TIME_MULTIPLIER == 1){
          FIRE_LASER = true;
        }
        //rocket.fireLaser();
        //laser_sound.play();
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
        if (TIME_MULTIPLIER <= MAX_TIME_BURN){
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
        if (TIME_MULTIPLIER <= MAX_TIME_BURN){
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
        if (CAMERA_LOCK == CAMERA_FREE){
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
          if (CAMERA_LOCK != CAMERA_LOCK_ENEMY){
            if (CAMERA_LOCK == CAMERA_LOCK_ROCKET){
              CAMERA_LOCK = CAMERA_FREE;
            } else if (CAMERA_LOCK == CAMERA_FREE){
              CAMERA_LOCK = CAMERA_LOCK_ROCKET;
            }
          }
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
      case 32: //space
        FIRE_LASER = false;
        break;
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
  var y = (canvas.height/2 - 0.0035 * (p.y - dist * camera.p.y)) % canvas.height;
  var x = (canvas.width/2 + 0.0035 * (p.x - dist * camera.p.x)) % canvas.width;
  if (y < 0){
    y += canvas.height;
  }
  if (x < 0){
    x += canvas.width;
  }
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
      ctx.strokeStyle = green;
    } else {
      ctx.strokeStyle = "rgb(0,100,50)";
    }
    var newPosition = toScreenCoords(this.position);
    fillCircle(newPosition,scale * radius, background);
    circle(newPosition, scale * radius);
    ctx.fillStyle = green;
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

function AlienSaucer(position, sectorPosition){
  this.position = position;
  this.sectorPosition = sectorPosition;
  var velocity = new Point(0,0);
  var shoot = false;
  var matched = false;
  var alive = true;
  var deathTimer = 30;
  var health = 50;
  var radius = 200;
  var explosions = new Array();

  this.alive = function(){
    return alive;
  }

  this.draw = function(){
    var screenPosition = toScreenCoords(position);
    if (alive){
      fillCircle(screenPosition, scale * radius, "rgb("+Math.round((((50-health)/50)*150))+",0,0)");
      circle(screenPosition, scale * radius); 
      circle(screenPosition, scale * 50);
      ctx.fillStyle = green;
      //ctx.fillText(health, screenPosition.x, screenPosition.y);
      for (var i = 0; i < explosions.length; i++){
        fillCircle(explosions[i], scale * 50, red);
      }
      if (explosions.length > 0){
        explosions = new Array();
      }
      if (scale < 0.25){
        drawIndicator(screenPosition, 20, "enemy");
      }
    } else {
      fillCircle(screenPosition, (deathTimer/30)*250  * scale, blue);
    }
  }

  this.checkCollisions = function(){
    for (var i = lasers.length - 1; i >= 0; i--){
      if (subtractPoint(lasers[i].front, this.position).lengthSquared() <= radius * radius){
        explosions.push(toScreenCoords(lasers[i].front));
        lasers.splice(i,1);
        health -= 1;
        if (health == 0){
          alive = false;
          break;
        }
      }
    }
  }

  this.getDeathTimer = function(){
    return deathTimer;
  }

  this.move = function(){
    if (this.position.x < sectorPosition.x + SECTOR_SIZE/2
      && this.position.x > sectorPosition.x - SECTOR_SIZE/2
      && this.position.y < sectorPosition.y + SECTOR_SIZE/2
      && this.position.y > sectorPosition.y - SECTOR_SIZE/2){
      if (alive){
        //move towards rocket at constant speed
        var rocketVec = subtractPoint(rocket.center, this.position);
        var length = rocketVec.length();
        if (length < 10000){
          shoot = true;
        } else {
          shoot = false;
        }
        rocketVec = pointDivide(rocketVec, length);
        if (length > 600){
          matched = false;
        }
        if (length > 500){
          var velInRocketDirection = rocketVec.x * velocity.x + rocketVec.y * velocity.y;
          if (velInRocketDirection < 30){
            rocketVec = pointMultiply(rocketVec, 0.25);
            velocity.x += rocketVec.x;
            velocity.y += rocketVec.y;
          }
        } else {
          if (!matched){
            velocity.x = rocket.getVelocity().x;
            velocity.y = rocket.getVelocity().y;
            matched = true;
          }
        }

        //limit total velocity
        if (velocity.x > 30){
          velocity.x = 30;
        } else if (velocity.x < -30){
          velocity.x = -30;
        }
        if (velocity.y > 30){
          velocity.y = 30;
        } else if (velocity.y < -30){
          velocity.y = -30;
        }
      } else {
        if (deathTimer > 0){
          deathTimer--;
        }
      }
        this.position.x += velocity.x;
        this.position.y += velocity.y;
      }
    }
}

function AlienTriangle(position){
}

function AlienBoss(position){
}

function Asteroid(position, velocity, radius, sectorPosition){
  this.position = position;
  this.velocity = velocity;
  this.radius = radius;
  this.sectorPosition = sectorPosition;
  var points = new Array(); //in coords relative to position

  this.move = function(){
    position.x += velocity.x;
    position.y += velocity.y;
    if (this.position.x > sectorPosition.x + SECTOR_SIZE/2){
      this.position.x -= SECTOR_SIZE;
    } else if (this.position.x < sectorPosition.x - SECTOR_SIZE/2){
      this.position.x += SECTOR_SIZE;
    }
    if (this.position.y > sectorPosition.y + SECTOR_SIZE/2){
      this.position.y -= SECTOR_SIZE;
      //klein bottle math courtesy Cole Graham
      //this.center.x = camera.p.x - (this.center.x - camera.p.x);
      //vel.x = -1 * vel.x;
    } else if (this.position.y < sectorPosition.y - SECTOR_SIZE/2){
      this.position.y += SECTOR_SIZE;
      //klein bottle
      //this.center.x = camera.p.x - (this.center.x - camera.p.x);
      //vel.x = -1 * vel.x;
    }
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
      var mag = Math.random() * this.radius/2 + this.radius/2;
      var newx = mag * x;
      var newy = mag * y; 
      points.push(new Point(newx, newy));
    }
  }

  this.toWorldCoords = function(point){
    return new Point(position.x + point.x, position.y + point.y);
  }

  this.drawAsteroid = function(){
    ctx.strokeStyle = green;
    ctx.beginPath();
    var start = toScreenCoords(this.toWorldCoords(points[0]));
    ctx.moveTo(start.x, start.y);
    for (var i = 1; i < points.length; i++){
      var nextPoint = toScreenCoords(this.toWorldCoords(points[i]));
      ctx.lineTo(nextPoint.x, nextPoint.y);
    }
    ctx.closePath();
    ctx.fillStyle = background;
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
  var currentSector = new Point(0,0);
  var health = 100;
  var alive = true;
  var explosions = new Array();

  this.alive = function(){
    return alive;
  }

  this.checkLaserCollisions = function(){
    for (var i = lasers.length - 1; i >= 0; i--){
      if (subtractPoint(lasers[i].front, this.center).lengthSquared() <= 3600){
        explosions.push(toScreenCoords(lasers[i].front));
        lasers.splice(i,1);
        health -= 5;
        if (health == 0){
          alive = false;
          break;
        }
      }
    }

    if (!this.alive()){
      background_music.stop();
      dead = true;
      edgeTimer = 0;
      GAME_STATE = GAME_OVER;
    }
  }

  this.getVelocity = function(){
    return vel;
  }

  this.damage = function(damage){
    health -= damage;
  }

  this.heal = function(healing){
    health += healing;
  }

  this.getCurrentSector = function(){
    return currentSector;
  }

  //plots trajectory of the rocket
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
      for (var i = 0; i < localPlanets.length; i++){
        // G * M_plan / r^2 * rhat
        //console.log("starting to calculate a point");
        var accelVec = subtractPoint(trajPoint, localPlanets[i].position);
        var accelVecLength = accelVec.length();
        if (accelVecLength > radius + localPlanets[i].radius){
          var rHat = pointDivide(accelVec, accelVecLength); 
          var accel = pointMultiply(rHat, -1 * G * localPlanets[i].getMass() / accelVec.lengthSquared());
          tempVel.x += accel.x * multiplier;
          tempVel.y += accel.y * multiplier;
        }
      } 
      trajPoint.x += tempVel.x * multiplier;
      trajPoint.y += tempVel.y * multiplier;
      for (var k = 0; k < localPlanets.length; k++){
        if (localPlanets[k].contains(trajPoint)){
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

  var cooldown = 0;
  this.fireLaser = function(){
    if (cooldown == 0){
      var back = this.toWorldCoords(new Point(0,50), this.center);
      var front = this.toWorldCoords(new Point(0,70), this.center);
      //velocity: same as back and front, but relative to origin
      var lasVel = addPoint(this.toWorldCoords(new Point(0,LASER_SPEED), new Point(0,0)), vel);
      lasers.push(new Laser(back, front, lasVel));
      laser_sound.play();
      cooldown = 10;
    }
    if (cooldown > 0){
      cooldown--;
    }
  }

  var localPlanets = new Array();

  this.gravitate = function(){
    //ctx.fillText("rocket: "+rocketX+" "+rocketY, 100, 500);
    localPlanets = new Array();
    for (var k = currentSector.x - 1; k < currentSector.x + 2; k++){
      for (var j = currentSector.y - 1; j < currentSector.y + 2; j++){
        var planets = (sectorMap.getSector(new Point(k, j))).planets();
        for (var i = 0; i < planets.length; i++){
          localPlanets.push(planets[i]);
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
    }
    //draw lines from active planets to rocket: for debug
    /*
    var rock = toScreenCoords(this.center);
    for (var h = 0; h < localPlanets.length; h++){
      var loc = toScreenCoords(localPlanets[h].position);
      ctx.beginPath();
      ctx.moveTo(loc.x, loc.y);
      ctx.lineTo(rock.x, rock.y);
      ctx.stroke();
    }
    */


  }

  this.checkCollisions = function(){
    //position at next tick
    var nextPos = addPoint(this.center, vel);

    //check collisions with planets
    for (var i = 0; i < localPlanets.length; i++){
      var connector = subtractPoint(nextPos, localPlanets[i].position);
      if (connector.length() < radius + localPlanets[i].radius){
        if (vel.lengthSquared() > 99999999999999999999){
          background_music.stop();
          dead = true;
          edgeTimer = 0;
          GAME_STATE = GAME_OVER;
        }
        if (!landed && !dead){
          //points += Math.round(0.01 * Math.sqrt(distance));
          if (points >= POINTS_TO_WIN){
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
 
    //check collisions with asteroids
    var nearbyAsteroids = sectorMap.getSector(currentSector).asteroids();
    for (var i = 0; i < nearbyAsteroids.length; i++){
      var connector = subtractPoint(this.center, nearbyAsteroids[i].position);
      if (connector.length() < radius + nearbyAsteroids[i].radius){
        //STILL BUGGY AND WRONG
        var un_x = (this.center.x - nearbyAsteroids[i].position.x) / distance;
        var un_y = (this.center.y - nearbyAsteroids[i].position.y) / distance;
        
        //unit tangential vector for collision
        var ut_x = -1 * un_y;
        var ut_y = un_x;

        //projections of v_a and v_b onto unit normal
        var v_a_n = un_x * nearbyAsteroids[i].velocity.x + un_y * nearbyAsteroids[i].velocity.y;
        var v_b_n = un_x * vel.x + un_y * vel.y;

        //projections of v_a and v_b onto unit tangential
        var v_b_t = ut_x * vel.x + ut_y * vel.y; //NOTE: stays the same
        var v_a_t = ut_x * nearbyAsteroids[i].velocity.x + ut_y * nearbyAsteroids[i].velocity.y;

        //new normal velocity magnitudes: remember, new tangential are the same as old
        //var v_a_n_after = (v_a_n * (a.mass - b.mass) + 2 * b.mass * v_b_n) / (a.mass + b.mass);
        //var v_b_n_after = (v_b_n * (b.mass - a.mass) + 2 * a.mass * v_a_n) / (a.mass + b.mass);
        var v_a_n_after = v_b_n;
        var v_b_n_after = v_a_n;


        //ball a's final normal vector
        var a_final_normal_x = v_a_n_after * un_x;
        var a_final_normal_y = v_a_n_after * un_y;
        //ball a's final tangent vector
        var a_final_tangent_x = v_a_t * ut_x;
        var a_final_tangent_y = v_a_t * ut_y;
        //ball a's final velocity vector
        nearbyAsteroids[i].velocity.x = a_final_normal_x + a_final_tangent_x;
        nearbyAsteroids[i].velocity.y = a_final_normal_y + a_final_tangent_y;

        //ball b's final normal vector
        var b_final_normal_x = v_b_n_after * un_x;
        var b_final_normal_y = v_b_n_after * un_y;
        //ball b's final tangent vector
        var b_final_tangent_x = v_b_t * ut_x;
        var b_final_tangent_y = v_b_t * ut_y;
        //ball b's final velocity vector
        vel.x = b_final_normal_x + b_final_tangent_x;
        vel.y = b_final_normal_y + b_final_tangent_y;


        //if (vel.lengthSquared() > 0){
          //background_music.stop();
          //dead = true;
          //edgeTimer = 0;
          //GAME_STATE = GAME_OVER;
          ctx.fillText("colliding with Asteroid", 100, 400);
        //}
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
    if (this.center.x >= 0){
      currentSector.x = Math.floor(this.center.x/(SECTOR_SIZE) + 1/2);
    } else {
      currentSector.x = Math.ceil(this.center.x/(SECTOR_SIZE) - 1/2);
    }
    if (this.center.y >= 0){
      currentSector.y = Math.floor(this.center.y/(SECTOR_SIZE) + 1/2);
    } else {
      currentSector.y = Math.ceil(this.center.y/(SECTOR_SIZE) - 1/2);
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
    ctx.fillStyle = background;
    ctx.strokeStyle = green;
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
    shieldGradient.addColorStop(1,"rgba(0,200,255,0.25)");/*(0.25 - health/400)+*/
    //ctx.arc(newCenter.x, newCenter.y, scale * 60, Math.PI * 2 - angle, Math.PI * 2 - angle + Math.PI/4);
    //ctx.fillStyle = shieldGradient;
    //ctx.fill();
    //ctx.fillStyle = background;
    fillCircle(newCenter, scale * 60, shieldGradient);

    //center of model for scale drawing
    var modelCenter = new Point(50, canvas.height - 50);

      
    //draw rocket model compass
    fillCircle(new Point(50, canvas.height - 50), 70, background);
    circle(new Point(50, canvas.height - 50), 70);
    //draw velocity
    ctx.fillStyle = green;
    ctx.fillText(Math.round(vel.length()), 125, canvas.height - 8);

    //draw health meter
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,0,0,0.75)";
    ctx.beginPath();
    ctx.arc(50, canvas.height - 50, 67, Math.PI/4, health/100 * -3*Math.PI/4, true); 
    ctx.stroke();

    ctx.strokeStyle = green;
    ctx.lineWidth = 1;


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
        drawIndicator(center, 20, "neutral");
    }

    if (burn){
      if (AFTER) {
        ctx.fillStyle = blue;
        ctx.strokeStyle = blue;
        var tip = toScreenCoords(this.toWorldCoords(new Point(0,-270 * (Math.random() + 0.3)), this.center));
        var modelTip = this.modelToScreen(this.toWorldCoords(new Point(0,-50), modelCenter));
      } else {
        ctx.fillStyle = red; 
        ctx.strokeStyle = red;
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
      ctx.fillStyle = blue;
      ctx.strokeStyle = blue;
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

    ctx.strokeStyle = green;
    ctx.fillStyle = green;

    //draw explosions
    for (var i = 0; i < explosions.length; i++){
      fillCircle(explosions[i], scale * 30, red);
    }
    if (explosions.length > 0){
      explosions = new Array();
    }

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
function drawIndicator(center, edgeLength, type){
  if (type == "enemy"){
    ctx.strokeStyle = red;
  } else if (type == "friend"){
    ctx.strokeStyle = blue;
  } else if (type == "neutral"){
    ctx.strokeStyle = green;
  } else if (type == "target"){
    ctx.strokeStyle = purple;
  }
  ctx.beginPath();
  ctx.moveTo(center.x - edgeLength/2, center.y - edgeLength/2);
  ctx.lineTo(center.x - edgeLength/4, center.y - edgeLength/2);
  ctx.moveTo(center.x + edgeLength/4, center.y - edgeLength/2);
  ctx.lineTo(center.x + edgeLength/2, center.y - edgeLength/2);
  
  ctx.moveTo(center.x - edgeLength/2, center.y + edgeLength/2);
  ctx.lineTo(center.x - edgeLength/4, center.y + edgeLength/2);
  ctx.moveTo(center.x + edgeLength/4, center.y + edgeLength/2);
  ctx.lineTo(center.x + edgeLength/2, center.y + edgeLength/2);

  ctx.moveTo(center.x - edgeLength/2, center.y - edgeLength/2);
  ctx.lineTo(center.x - edgeLength/2, center.y - edgeLength/4);
  ctx.moveTo(center.x - edgeLength/2, center.y + edgeLength/4);
  ctx.lineTo(center.x - edgeLength/2, center.y + edgeLength/2);

  ctx.moveTo(center.x + edgeLength/2, center.y - edgeLength/2);
  ctx.lineTo(center.x + edgeLength/2, center.y - edgeLength/4);
  ctx.moveTo(center.x + edgeLength/2, center.y + edgeLength/4);
  ctx.lineTo(center.x + edgeLength/2, center.y + edgeLength/2);

  ctx.stroke();
  ctx.closePath();
  //set stroke style to default
  ctx.strokeStyle = green;
}

/**
 * Another attempt to fix circle drawing, from http://stackoverflow.com/users/331511/mathijs-henquet
 * via http://stackoverflow.com/questions/8714857/very-large-html5-canvas-circle-imprecise
 */
function magic_circle(ctx, x, y, r){
  m = 0.551784

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(r, r)

  ctx.beginPath()
  ctx.moveTo(1, 0)
  ctx.bezierCurveTo(1,  -m,  m, -1,  0, -1)
  ctx.bezierCurveTo(-m, -1, -1, -m, -1,  0)
  ctx.bezierCurveTo(-1,  m, -m,  1,  0,  1)
  ctx.bezierCurveTo( m,  1,  1,  m,  1,  0)
  ctx.closePath()
  ctx.restore()
}

function circle(p, r){
  if (!is_chrome){
    ctx.beginPath();   
    ctx.arc(p.x, p.y, r, 0, Math.PI*2, true);
    ctx.stroke(); 
    ctx.closePath();
  } else {
    magic_circle(ctx, p.x, p.y, r);
    ctx.stroke();
  }
}

function fillCircle(p, r, color){
  ctx.fillStyle = color;
  if (!is_chrome){
    //experimental:
    /*
    var grad = ctx.createLinearGradient(0, p.y - r, 0, p.y + r);
    var centerPlanet = toScreenCoords(p);
    grad.addColorStop(1,"rgb(255,100,100)");
    grad.addColorStop(0.75, "rgb(125,50,50)");
    grad.addColorStop(0.5, "rgb(60,25,25)");
    grad.addColorStop(0.25, background);
    grad.addColorStop(0, background);
    ctx.fillStyle = grad;
    */
    ctx.beginPath();   
    ctx.arc(p.x, p.y, r, 0, Math.PI*2, true);
    ctx.fill(); 
    ctx.closePath();
  } else {
    magic_circle(ctx, p.x, p.y, r);
    ctx.fill();
  }
}

function printControls(x, y, FULL){
  ctx.strokeStyle = green;
  ctx.fillStyle = green;
  ctx.font = "20px Arial";

  ctx.fillText("Arrow keys/WASD: steer and fire engine", x, y + 30);
  ctx.fillText("Mousewheel or -/=: zoom", x, y + 60); 

  if (AFTER){
    ctx.fillText("B: Deactivate afterburner", x, y + 90);
  } else {
    ctx.fillText("B: Activate afterburner", x, y + 90);
  }
  if (CAMERA_LOCK == CAMERA_LOCK_ROCKET){
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
  if (target == undefined){
    ctx.fillText("TAB: Lock on to nearest enemy", x, y + 330);
  } else {
    ctx.fillText("Q: release target lock", x, y + 330);
  }
  ctx.fillText("R: Restart game", x, y + 360);

      
  ctx.fillStyle = background;
  ctx.strokeStyle = green;
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

      rocket.checkLaserCollisions();

      if (FIRE_LASER){
        rocket.fireLaser();
      }
      //move rocket
      rocket.move();
    }

    //figure out current quadrant in current sector
    var currentQuadrant = new Point(0,0);
    var rocketSector = new Point(rocket.getCurrentSector().x, rocket.getCurrentSector().y);
    var center = sectorMap.getSector(rocketSector).getWorldPosition();
    if (rocket.center.x > center.x){
      currentQuadrant.x = 1;
    } else {
      currentQuadrant.x = -1;
    }
    if (rocket.center.y > center.y){
      currentQuadrant.y = 1;
    } else {
      currentQuadrant.y = -1;
    }
    //build list of sectors that neighbor current quadrant (including current sector)
    // list is global!
    nearbySectorsQuadrant = new Array();
    nearbySectorsQuadrant.push(sectorMap.getSector(rocketSector));
    rocketSector.x += currentQuadrant.x;
    nearbySectorsQuadrant.push(sectorMap.getSector(rocketSector));
    rocketSector.x -= currentQuadrant.x;
    rocketSector.y += currentQuadrant.y;
    nearbySectorsQuadrant.push(sectorMap.getSector(rocketSector));
    rocketSector.x += currentQuadrant.x;
    nearbySectorsQuadrant.push(sectorMap.getSector(rocketSector));

    //do physics stuff for camera sectors
    sectorMap.simulateCameraSectors();

    //check if the sectors near this quadrant contain the target
    var containsTarget = false;
    for (var i = 0; i < nearbySectorsQuadrant.length; i++){
      if (nearbySectorsQuadrant[i].getAlienSaucers().indexOf(target) != -1){
        containsTarget = true;
      }
    }
    //if not, then unlock the camera, since the target is out of range
    if (target != undefined && !containsTarget){
      target = undefined;
      CAMERA_LOCK = CAMERA_FREE;
    }

    //check for collisions and move alien saucers in quad-neighboring sectors
    for (var i = 0; i < nearbySectorsQuadrant.length; i++){
      nearbySectorsQuadrant[i].collideAlienSaucers();
      nearbySectorsQuadrant[i].moveAlienSaucers();
    }
    //lock the camera
    if (CAMERA_LOCK == CAMERA_LOCK_ROCKET){
      camera.p.x = rocket.center.x;
      camera.p.y = rocket.center.y;
    } else if (CAMERA_LOCK == CAMERA_LOCK_ENEMY){
      var line = subtractPoint(rocket.center, target.position);
      camera.p.x = rocket.center.x - line.x/2;
      camera.p.y = rocket.center.y - line.y/2;
      //do some zoom stuff to keep both objects in frame
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
    ctx.strokeStyle = green;
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

    //draw sectors around camera
    sectorMap.drawCameraSectors();

    //draw alien saucers in quad-neighboring sectors
    for (var i = 0; i < nearbySectorsQuadrant.length; i++){
      nearbySectorsQuadrant[i].drawAlienSaucers();
    }
    /*
    var currentQuadrant = new Point(0,0);
    var rocketSector = new Point(rocket.getCurrentSector().x, rocket.getCurrentSector().y);
    var center = sectorMap.getSector(rocketSector).getWorldPosition();
    if (rocket.center.x > center.x){
      currentQuadrant.x = 1;
    } else {
      currentQuadrant.x = -1;
    }
    if (rocket.center.y > center.y){
      currentQuadrant.y = 1;
    } else {
      currentQuadrant.y = -1;
    }
    var asteroidsToDraw = sectorMap.getSector(rocketSector).asteroids();
    rocketSector.x += currentQuadrant.x;
    asteroidsToDraw = asteroidsToDraw.concat(sectorMap.getSector(rocketSector).asteroids());
    rocketSector.x -= currentQuadrant.x;
    rocketSector.y += currentQuadrant.y;
    asteroidsToDraw = asteroidsToDraw.concat(sectorMap.getSector(rocketSector).asteroids());
    rocketSector.x += currentQuadrant.x;
    asteroidsToDraw = asteroidsToDraw.concat(sectorMap.getSector(rocketSector).asteroids());
    */
    if (scale < 0.25){
      for (var i = 0; i < nearbySectorsQuadrant.length; i++){
        var asteroidsToDraw = nearbySectorsQuadrant[i].asteroids();
        for (var j = 0; j < asteroidsToDraw.length; j++){
          drawIndicator(toScreenCoords(asteroidsToDraw[j].position), 20, "friend");
        }
      }
    }
    
    //draw target indicator
    if (target != undefined){
      drawIndicator(toScreenCoords(target.position), 40, "target");
    }

    //draw rocket
    rocket.drawRocket();

    //debug: print camera center
    //circle(toScreenCoords(camera.p), 10);

    //formatting for point count and controls
    ctx.font = "20px Arial";
    ctx.fillStyle = green;
    
    //print time multiplier
    ctx.fillText(TIME_MULTIPLIER+"x", canvas.width - 40, 25);
    if (TIME_MULTIPLIER > MAX_TIME_BURN){
      ctx.fillText("Burn Disabled!", canvas.width - 145, 50);
    }

    //print point count
    ctx.fillText("Points: "+points+"/"+POINTS_TO_WIN, canvas.width/2 - 30, 30);

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
    if (points >= POINTS_TO_WIN){
      ctx.font = "20px Helvetica";
      ctx.fillText("You won!", Math.random() * canvas.width, Math.random() * canvas.height);
    } else {
      ctx.clearRect(0,0,canvas.width, canvas.height);  
      ctx.fillText("GAME OVER", canvas.width/2 - 200, canvas.height/2);
      ctx.fillText("you exploded", canvas.width/2 - 200, canvas.height/2 + 60);
      ctx.font = "20px Helvetica";
      ctx.fillText("R to restart", canvas.width/2 - 100, canvas.height/2 + 90);
    }
  } else if (GAME_STATE == MENU){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.font = "80px Helvetica";
    ctx.fillStyle = green;
    ctx.fillText("ROCKET SIMULATOR", 20, 80);
    ctx.font = "40px Helvetica";
    ctx.fillText("click to play", canvas.width/2 - 100, canvas.height/2 + 50);
    ctx.strokeStyle = green;
    ctx.font = "30px Helvetica";
    ctx.fillText("Controls: ", 20, 130);
    printControls(20, 130, false);

    //moving field of stars for menu
    
    for (var i = 0; i < Math.floor(stars.length/4); i++){
      circle(starToScreen(stars[i], 0.012), 0.1);
    }
    for (var i = Math.ceil(stars.length/4); i < Math.floor(stars.length/2); i++){
      circle(starToScreen(stars[i], 0.015), 0.1);
    }
    for (var i = Math.ceil(stars.length/2); i < Math.floor(stars.length/4 * 3); i++){
      circle(starToScreen(stars[i], 0.018), 0.1);
    }
    for (var i = Math.ceil(stars.length/4 * 3); i < stars.length; i++){
      circle(starToScreen(stars[i], 0.021), 0.1);
    }
    
    camera.p.x += STARFIELD_SPEED_MENU;
    
  }
}
