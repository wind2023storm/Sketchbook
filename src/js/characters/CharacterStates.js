//
// States Enum
//
var CharStates = {
    DefaultState: 'DefaultState',
    Idle: 'Idle',
    Walk: 'Walk',
    Sprint: 'Sprint',
    StartWalkForward: 'StartWalkForward',
    EndWalk: 'EndWalk',
    JumpIdle: 'JumpIdle',
    JumpRunning: 'JumpRunning',
    Falling: 'Falling',
    DropIdle: 'DropIdle',
    DropRunning: 'DropRunning'
}
Object.freeze(CharStates);

//
// Default state
//
function CS_DefaultState(character) {
    this.character = character;

    this.character.velocitySimulator.damping = 0.8;
    this.character.velocitySimulator.mass = 50;

    this.character.rotationSimulator.damping = 0.5;
    this.character.rotationSimulator.mass = 10;
}
CS_DefaultState.prototype.update = function(timeStep) {}
CS_DefaultState.prototype.changeState = function() {}

CS_DefaultState.prototype.noDirection = function() {
    return !this.character.controls.up.value && !this.character.controls.down.value && !this.character.controls.left.value && !this.character.controls.right.value;
}

CS_DefaultState.prototype.anyDirection = function() {
    return this.character.controls.up.value || this.character.controls.down.value || this.character.controls.left.value || this.character.controls.right.value;
}

CS_DefaultState.prototype.justPressed = function(control) {
    return this.character.controls.lastControl == control && control.justPressed;
}

CS_DefaultState.prototype.isPressed = function(control) {
    return control.value;
}

CS_DefaultState.prototype.justReleased = function(control) {
    return this.character.controls.lastControl == control && control.justReleased;
}

CS_DefaultState.prototype.fallInAir = function() {
    if(!this.character.rayHasHit) this.character.setState(CharStates.Falling);
}

//
// Idle
//
function CS_Idle(character) {
    CS_DefaultState.call(this, character);
    
    this.character.setAnimation('idle', 0.3);
    this.character.orientationTarget = this.character.orientation;
}
CS_Idle.prototype = Object.create(CS_DefaultState.prototype);
CS_Idle.prototype.update = function(timeStep) {
    this.character.velocityTarget = 0;
    this.character.update(timeStep);

    this.fallInAir();
}
CS_Idle.prototype.changeState = function() {
    if(this.justPressed(this.character.controls.jump)) {
        this.character.setState(CharStates.JumpIdle);
    }

    if(this.anyDirection()) {
        this.character.setState(CharStates.StartWalkForward);
    }
}

//
// Walk
//
function CS_Walk(character) {
    CS_DefaultState.call(this, character);

    this.character.setAnimation('run', 0.1);

    if(this.noDirection()) {
        this.character.setState(CharStates.EndWalk);
    }
}
CS_Walk.prototype = Object.create(CS_DefaultState.prototype);
CS_Walk.prototype.update = function(timeStep) {
    // this.character.orientationTarget = getMoveDirections();
    // character.setOrientationTarget(getMoveDirections());
    this.character.setGlobalDirectionGoal();
    this.character.velocityTarget = 0.8;
    this.character.update(timeStep);

    this.fallInAir();

    if(this.isPressed(this.character.controls.run)) {
        this.character.setState(CharStates.Sprint);
    }
}
CS_Walk.prototype.changeState = function() {
    if(this.justPressed(this.character.controls.jump)) {
        this.character.setState(CharStates.JumpRunning);
    }

    if(this.noDirection()) {
        this.character.setState(CharStates.EndWalk);
    }
}

//
// Sprint
//
function CS_Sprint(character) {
    CS_DefaultState.call(this, character);

    this.character.velocitySimulator.mass = 10;
    this.character.rotationSimulator.damping = 0.8;
    this.character.rotationSimulator.mass = 50;

    this.character.setAnimation('sprint', 0.3);
}
CS_Sprint.prototype = Object.create(CS_DefaultState.prototype);
CS_Sprint.prototype.update = function(timeStep) {
    this.character.setGlobalDirectionGoal();
    this.character.velocityTarget = 1.4;
    this.character.update(timeStep);

    this.fallInAir();
}
CS_Sprint.prototype.changeState = function() {
    if(this.justReleased(this.character.controls.run)) {
        this.character.setState(CharStates.Walk);
    }
    if(this.justPressed(this.character.controls.jump)) {
        this.character.setState(CharStates.JumpRunning);
    }
    if(this.noDirection()) {
        this.character.setState(CharStates.EndWalk);
    }
}

//
// Start Walk Forward
//
function CS_StartWalkForward(character) {
    CS_DefaultState.call(this, character);

    this.character.velocitySimulator.mass = 30;

    var duration = character.setAnimation('start_forward', 0.1);
    this.time = duration;
    this.timer = 0;
}
CS_StartWalkForward.prototype = Object.create(CS_DefaultState.prototype);
CS_StartWalkForward.prototype.update = function(timeStep) {
    this.timer += timeStep;
    if(this.timer > this.time - timeStep) this.character.setState(CharStates.Walk);

    this.character.setGlobalDirectionGoal();
    this.character.velocityTarget = 0.8;

    this.character.update(timeStep);

    this.fallInAir();
}
CS_StartWalkForward.prototype.changeState = function() {
    if(this.justPressed(this.character.controls.jump)) {
        this.character.setState(CharStates.JumpRunning);
    }

    if(this.noDirection()) {
        this.character.setState(CharStates.EndWalk);
    }

    if(this.justPressed(this.character.controls.run)) {
        this.character.setState(CharStates.Sprint);
    }
}

//
// End Walk
//
function CS_EndWalk(character) {
    CS_DefaultState.call(this, character);

    var duration = character.setAnimation('stop', 0.1);
    this.time = duration;
    this.timer = 0;
    this.character.orientationTarget = character.orientation;
}
CS_EndWalk.prototype = Object.create(CS_DefaultState.prototype);
CS_EndWalk.prototype.update = function(timeStep) {
    this.timer += timeStep;
    if(this.timer > this.time - timeStep) {

        this.character.setState(CharStates.Idle);
    }
    
    this.character.velocityTarget = 0;

    this.character.update(timeStep);

    this.fallInAir();
}
CS_EndWalk.prototype.changeState = function() {
    if(this.justPressed(this.character.controls.jump)) {
        this.character.setState(CharStates.JumpIdle);
    }

    if(this.anyDirection()) {
        if(this.isPressed(this.character.controls.run)) {
            this.character.setState(CharStates.Sprint);
        }
        else {
            this.character.setState(CharStates.StartWalkForward);
        }
    }
}

//
// Jump Idle
//
function CS_JumpIdle(character) {
    CS_DefaultState.call(this, character);

    this.character.velocitySimulator.mass = 200;

    this.animationLength = this.character.setAnimation('jump_idle', 0.1);
    this.timer = 0;

    this.alreadyJumped = false;
}
CS_JumpIdle.prototype = Object.create(CS_DefaultState.prototype);
CS_JumpIdle.prototype.update = function(timeStep) {
    this.character.setGlobalDirectionGoal();
    // Move in air
    if(this.timer > 0.3) {
        this.character.velocityTarget = this.anyDirection() ? 0.8 : 0;
    }
    this.character.update(timeStep);

    //Physically jump
    this.timer += timeStep;
    if(this.timer > 0.3 && !this.alreadyJumped) {
        this.character.jump();
        this.alreadyJumped = true;
    }

    if(this.timer > 0.35 && this.character.rayHasHit) {
        this.character.setState(CharStates.DropIdle);
    }

    if(this.timer > this.animationLength - timeStep) {
        this.character.setState(CharStates.Falling);
    }
}

//
// Jump Running
//
function CS_JumpRunning(character) {
    CS_DefaultState.call(this, character);

    this.character.velocitySimulator.mass = 200;

    this.animationLength = this.character.setAnimation('jump_running', 0.1);
    this.timer = 0;

    this.alreadyJumped = false;
}
CS_JumpRunning.prototype = Object.create(CS_DefaultState.prototype);
CS_JumpRunning.prototype.update = function(timeStep) {
    this.character.setGlobalDirectionGoal();
    // Move in air
    this.character.velocityTarget = 0.8;
    this.character.update(timeStep);

    //Physically jump
    this.timer += timeStep;
    if(this.timer > 0.2 && !this.alreadyJumped) {
        this.character.jump();
        this.alreadyJumped = true;
    }

    if(this.timer > 0.3 && this.character.rayHasHit) {
        this.character.setState(CharStates.DropRunning);
    }

    if(this.timer > this.animationLength - timeStep) {
        this.character.setState(CharStates.Falling);
    }
}

//
// Falling
//
function CS_Falling(character) {
    CS_DefaultState.call(this, character);

    this.character.velocitySimulator.mass = 200;

    this.character.setAnimation('falling', 0.3);
}
CS_Falling.prototype = Object.create(CS_DefaultState.prototype);
CS_Falling.prototype.update = function(timeStep) {
    this.character.setGlobalDirectionGoal();
    this.character.velocityTarget = this.anyDirection() ? 0.8 : 0;
    this.character.update(timeStep);

    if(this.character.rayHasHit) {
        if(this.anyDirection()) {
            this.character.setState(CharStates.DropRunning);
        }
        else {
            this.character.setState(CharStates.DropIdle);
        }
    }
}

//
// Drop Idle
//
function CS_DropIdle(character) {
    CS_DefaultState.call(this, character);

    this.character.velocitySimulator.damping = 0.6;
    this.character.velocitySimulator.mass = 15;

    this.animationLength = this.character.setAnimation('drop_idle', 0.1);
    this.timer = 0;
    
    if(this.anyDirection()) {
        this.character.setState(CharStates.StartWalkForward);
    }
}
CS_DropIdle.prototype = Object.create(CS_DefaultState.prototype);
CS_DropIdle.prototype.update = function(timeStep) {
    this.character.setGlobalDirectionGoal();
    this.character.velocityTarget = 0;
    this.character.update(timeStep);

    this.timer += timeStep;
    if(this.timer > this.animationLength - timeStep) {
        this.character.setState(CharStates.Idle);
    }

    this.fallInAir();
}
CS_DropIdle.prototype.changeState = function() {
    if(this.justPressed(this.character.controls.jump)) {
        this.character.setState(CharStates.JumpIdle);
    }
    if(this.anyDirection()) {
        this.character.setState(CharStates.StartWalkForward);
    }
}

//
// Drop Running
//
function CS_DropRunning(character) {
    CS_DefaultState.call(this, character);

    this.animationLength = this.character.setAnimation('drop_running', 0.1);
    this.timer = 0;
    
}
CS_DropRunning.prototype = Object.create(CS_DefaultState.prototype);
CS_DropRunning.prototype.update = function(timeStep) {
    this.character.setGlobalDirectionGoal();
    this.character.velocityTarget = 0.8;
    this.character.update(timeStep);

    this.timer += timeStep;
    if(this.timer > this.animationLength - timeStep) {
        this.character.setState(CharStates.Walk);
    }

    this.fallInAir();
}
CS_DropRunning.prototype.changeState = function() {
    if(this.noDirection(this.character.controls.jump)) {
        this.character.setState(CharStates.EndWalk);
    }

    if(this.anyDirection() && this.justPressed(this.character.controls.run)) {
        this.character.setState(CharStates.Sprint);
    }

    if(this.justPressed(this.character.controls.jump)) {
        this.character.setState(CharStates.JumpRunning);
    }
}

// function getMoveDirections() {
    
//     var positiveX = controls.right.value ? -1 : 0;
//     var negativeX = controls.left.value  ?  1 : 0;
//     var positiveZ = controls.up.value    ?  1 : 0;
//     var negativeZ = controls.down.value  ? -1 : 0;
    
//     var localDirection = new THREE.Vector3(positiveX + negativeX, 0, positiveZ + negativeZ);

//     var vCamera = new THREE.Vector3(camera.position.x, 0, camera.position.z);
//     var vPlayer = new THREE.Vector3(player.position.x, 0, player.position.z);

//     var vertical = new THREE.Vector3().subVectors(vPlayer, vCamera).normalize();
//     var horizontal = new THREE.Vector3(vertical.z, 0, -vertical.x).normalize();

//     vertical.multiplyScalar(localDirection.z);
//     horizontal.multiplyScalar(localDirection.x);
//     var worldDirection = new THREE.Vector3().addVectors(vertical, horizontal).normalize();;
//     return worldDirection;
// }



// function getDefaultState() {
//     return Object.assign({}, CharStates.defaultState);
// }
