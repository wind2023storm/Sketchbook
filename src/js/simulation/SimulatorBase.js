import * as THREE from 'three';

export class SimulatorBase {

    constructor(fps) {
        this.frameTime = 1/fps;
        this.offset = 0; // 0 - frameTime
        this.cache = []; // At least two frames
    }

    setFPS(value) {
        this.frameTime = 1/value;
    }

    lastFrame() {
        return this.cache[this.cache.length - 1];
    }
}

export function spring(source, dest, velocity, mass, damping) {
    let acceleration = dest - source;
    acceleration /= mass;
    velocity += acceleration;
    velocity *= damping;

    let position = source += velocity;

    return { position: position, velocity: velocity };
}

export function springV(source, dest, velocity, mass, damping) {
    let acceleration = new THREE.Vector3().subVectors(dest, source);
    acceleration.divideScalar(mass);
    velocity.add(acceleration);
    velocity.multiplyScalar(damping);
    source.add(velocity);
}