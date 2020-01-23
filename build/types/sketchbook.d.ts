import '../css/dat.gui.css';
import '../css/main.css';
import * as THREEImport from 'three';
import * as CANNONImport from 'cannon';
import { FollowTarget } from './characters/character_ai/FollowTarget';
import { FollowPath } from './characters/character_ai/FollowPath';
import { RandomBehaviour } from './characters/character_ai/RandomBehaviour';
export declare const CharacterAI: {
    FollowTarget: typeof FollowTarget;
    FollowPath: typeof FollowPath;
    RandomBehaviour: typeof RandomBehaviour;
};
import { BoxPhysics } from './objects/object_physics/BoxPhysics';
import { CapsulePhysics } from './objects/object_physics/CapsulePhysics';
import { ConvexPhysics } from './objects/object_physics/ConvexPhysics';
import { SpherePhysics } from './objects/object_physics/SpherePhysics';
import { TrimeshPhysics } from './objects/object_physics/TrimeshPhysics';
export declare const ObjectPhysics: {
    BoxPhysics: typeof BoxPhysics;
    CapsulePhysics: typeof CapsulePhysics;
    ConvexPhysics: typeof ConvexPhysics;
    SpherePhysics: typeof SpherePhysics;
    TrimeshPhysics: typeof TrimeshPhysics;
};
export { Airplane } from './vehicles/Airplane';
export { Car } from './vehicles/Car';
export { Helicopter } from './vehicles/Helicopter';
export { Wheel } from './vehicles/Wheel';
export { VehicleSeat } from './vehicles/VehicleSeat';
export { VehicleDoor } from './vehicles/VehicleDoor';
import * as statesLibrary from './characters/character_states/_stateLibrary';
export declare const CharacterStates: typeof statesLibrary;
export { Character } from './characters/Character';
export { KeyBinding } from './core/KeyBinding';
export { SBObject } from './objects/SBObject';
export { World } from './core/World';
export declare let THREE: typeof THREEImport;
export declare let CANNON: typeof CANNONImport;
export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
export { FBXLoader } from '../lib/utils/FBXLoader';
