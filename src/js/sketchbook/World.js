import * as THREE from 'three';
import * as CANNON from 'cannon';

import { CameraController } from './CameraController';
import { Character } from '../characters/Character';
import { GameModes } from './GameModes';
import { Utilities as Utils } from './Utilities';
import { Shaders } from '../lib/shaders/Shaders';

import { Detector } from '../lib/utils/Detector';
import { Stats } from '../lib/utils/Stats';
import { GUI } from '../lib/utils/dat.gui';

export class World {

    constructor() {

        const scope = this;

        //#region HTML
        
        // WebGL not supported
        if (!Detector.webgl) Detector.addGetWebGLMessage();

        // Renderer
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        // Global variables

        // Auto window resize
        function onWindowResize() {
            scope.camera.aspect = window.innerWidth / window.innerHeight;
            scope.camera.updateProjectionMatrix();
            scope.renderer.setSize(window.innerWidth, window.innerHeight);
            effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr));
            scope.composer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
        }
        window.addEventListener('resize', onWindowResize, false);

        // Stats (FPS, Frame time, Memory)
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        //#endregion

        //#region Graphics

        this.graphicsWorld = new THREE.Scene();

        // Fog
        // this.graphicsWorld.fog = new THREE.FogExp2(0xC8D3D5, 0.25);

        // Camera
        this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 120);

        // Scene render pass
        let renderScene = new Shaders.RenderPass(this.graphicsWorld, this.camera);

        // DPR for FXAA
        let dpr = 1;
        if (window.devicePixelRatio !== undefined) {
            dpr = window.devicePixelRatio;
        }
        // FXAA
        let effectFXAA = new Shaders.ShaderPass(Shaders.FXAAShader);
        effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr));
        effectFXAA.renderToScreen = true;

        // Composer
        this.composer = new Shaders.EffectComposer(this.renderer);
        this.composer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
        this.composer.addPass(renderScene);
        this.composer.addPass(effectFXAA);

        // Sky
        let sky = new Shaders.Sky();
        sky.scale.setScalar(100);
        this.graphicsWorld.add(sky);

        // Sun helper
        this.sun = new THREE.Vector3();
        let theta = Math.PI * (-0.3);
        let phi = 2 * Math.PI * (-0.25);
        this.sun.x = Math.cos(phi);
        this.sun.y = Math.sin(phi) * Math.sin(theta);
        this.sun.z = Math.sin(phi) * Math.cos(theta);
        sky.material.uniforms.sunPosition.value.copy(this.sun);

        // Lighting
        let ambientLight = new THREE.AmbientLight(0x888888); // soft white light
        this.graphicsWorld.add(ambientLight);

        // Sun light with shadowmap
        let dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        this.dirLight = dirLight;
        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 8;

        dirLight.shadow.camera.top = 5;
        dirLight.shadow.camera.right = 5;
        dirLight.shadow.camera.bottom = -5;
        dirLight.shadow.camera.left = -5;

        dirLight.shadow.camera;
        this.graphicsWorld.add(dirLight);

        // Helpers
        let helper = new THREE.GridHelper(10, 10, 0x000000, 0x000000);
        helper.position.set(0, 0.01, 0);
        helper.material.opacity = 0.2;
        helper.material.transparent = true;
        this.graphicsWorld.add( helper );
        helper = new THREE.AxesHelper(2);
        // this.graphicsWorld.add( helper );
        helper = new THREE.DirectionalLightHelper(dirLight, 3);
        // this.graphicsWorld.add( helper );
        helper = new THREE.CameraHelper(dirLight.shadow.camera);
        // this.graphicsWorld.add( helper );

        //#endregion

        //#region Physics

        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0,-9.81,0);
        this.physicsWorld.broadphase = new CANNON.NaiveBroadphase();
        this.physicsWorld.solver.iterations = 10;

        this.parallelPairs = [];
        this.physicsFrameRate = 60;
        this.physicsFrameTime = 1/this.physicsFrameRate;
        this.physicsMaxPrediction = this.physicsFrameRate;

        //#endregion

        //#region RenderLoop

        this.clock = new THREE.Clock();
        this.renderDelta = 0;
        this.logicDelta = 0;
        this.sinceLastFrame = 0;
        this.justRendered = false;

        //#endregion

        //#region Input

        // Input
        // Event listeners
        document.addEventListener("keydown", keyDown, false);
        document.addEventListener("keyup", keyUp, false);
        document.addEventListener("mousedown", mouseDown, false);
        document.addEventListener("mouseup", mouseUp, false);
        document.addEventListener("wheel", mouseWheel, false);

        // Event handlers
        function keyDown(event) {
            if(typeof scope.gameMode !== 'undefined')
                scope.gameMode.handleKey(event, event.key, true);
        }
        function keyUp(event) {
            if(typeof scope.gameMode !== 'undefined')
                scope.gameMode.handleKey(event, event.key, false);
        }
        function mouseDown(event) {
            if(typeof scope.gameMode !== 'undefined')
                scope.gameMode.handleKey(event, 'mouse' + event.button, true);
        }
        function mouseUp(event) {
            if(typeof scope.gameMode !== 'undefined')
                scope.gameMode.handleKey(event, 'mouse' + event.button, false);
        }

        // Changing time scale with scroll wheel
        this.timeScaleBottomLimit = 0.003;
        this.timeScaleChangeSpeed = 1.3;
        this.timeScaleTarget = 1;
        function mouseWheel(event) {

            if(event.deltaY > 0) {
                scope.timeScaleTarget /= scope.timeScaleChangeSpeed;
                if(scope.timeScaleTarget < scope.timeScaleBottomLimit) scope.timeScaleTarget = 0;
            }
            else {
                scope.timeScaleTarget *= scope.timeScaleChangeSpeed;
                if(scope.timeScaleTarget < scope.timeScaleBottomLimit) scope.timeScaleTarget = scope.timeScaleBottomLimit;
                scope.timeScaleTarget = Math.min(scope.timeScaleTarget, 1);
                if(scope.params.Time_Scale > 0.9) scope.params.Time_Scale *= scope.timeScaleChangeSpeed;
            }
        }

        //#endregion
        
        //#region ParamGUI
        
        // Variables
        let params = {
            FPS_Limit: 60,
            Time_Scale: 1,
            Shadows: true,
            FXAA: false,
            Draw_Capsules: false,
            RayCast_Debug: false
        };
        this.params = params;

        let gui = new GUI();
        let graphics_folder = gui.addFolder('Rendering');
        graphics_folder.add(params, 'FPS_Limit', 0, 60);
        let timeController = graphics_folder.add(params, 'Time_Scale', 0, 1).listen();
        let shadowSwitch = graphics_folder.add(params, 'Shadows');
        graphics_folder.add(params, 'FXAA');

        let debug_folder = gui.addFolder('Debug');
        let dc = debug_folder.add(params, 'Draw_Capsules');
        let rcd = debug_folder.add(params, 'RayCast_Debug');

        gui.open();
        
        timeController.onChange(function(value) {
            this.timeScaleTarget = value;
        });

        dc.onChange(function(enabled) {
            scope.characters.forEach(char => {
                if(enabled) char.characterCapsule.visual.visible = true;
                else        char.characterCapsule.visual.visible = false;
            });
        });

        rcd.onChange(function(enabled) {
            scope.characters.forEach(char => {
                if(enabled) char.raycastBox.visible = true;
                else        char.raycastBox.visible = false;
            });
        });

        shadowSwitch.onChange(function(enabled) {
            if(enabled) {
                dirLight.castShadow = true;
            }
            else {
                dirLight.castShadow = false;
            }
        });

        //#endregion

        //Initialization
        this.characters = [];
        this.vehicles = [];
        this.cameraController = new CameraController(this.camera);
        this.gameMode = new GameModes.FreeCameraControls(this);
        
        this.render(this);
    }
    
    // Update
    // Handles all logic updates.
    update(timeStep) {
    
        this.updatePhysics(timeStep);
    
        this.characters.forEach(char => {
            char.behaviour.update(timeStep);
            char.updateMatrixWorld();
        });
    
        this.gameMode.update(timeStep);
    
        // Rotate and position camera according to cameraTarget and angles
        this.cameraController.update();
    
        // Lerp timescale parameter
        this.params.Time_Scale = THREE.Math.lerp(this.params.Time_Scale, this.timeScaleTarget, 0.2);
    }
    
    /**
     * Rendering loop.
     * Implements custom fps limit and frame-skipping
     * Calls the "update" function before rendering.
     * @param {World} world 
     */
    render(world) {
    
        // Stats begin
        if (this.justRendered) {
            this.justRendered = false;
            this.stats.begin();
        }
    
        requestAnimationFrame(function() {
            world.render(world);
        });
    
        // Measuring render time
        this.renderDelta = this.clock.getDelta();

        // Getting timeStep
        let timeStep = (this.renderDelta + this.logicDelta) * this.params.Time_Scale;

        // Logic
        world.update(timeStep);

        // Measuring logic time
        this.logicDelta = this.clock.getDelta();
    
        // Frame limiting
        let interval = 1 / this.params.FPS_Limit;
        this.sinceLastFrame += this.renderDelta + this.logicDelta;
        if (this.sinceLastFrame > interval) {
            this.sinceLastFrame %= interval;
    
            // Actual rendering with a FXAA ON/OFF switch
            if (this.params.FXAA) this.composer.render();
            else this.renderer.render(this.graphicsWorld, this.camera);
    
            // Stats end
            this.stats.end();
            this.justRendered = true;
        }
    }
    
    spawnCharacter(options = []) {

        let defaults = {
            position: new THREE.Vector3()
        };
        options = Utils.setDefaults(options, defaults);
    
        let character = new Character(this);
        character.setPosition(options.position.x, options.position.y, options.position.z);

        // Register character
        this.characters.push(character);
        
        // Register physics
        this.physicsWorld.addBody(character.characterCapsule.physical);
        
        // Register capsule visuals
        this.graphicsWorld.add(character.characterCapsule.visual);
        this.graphicsWorld.add(character.raycastBox);
    
        // Register for synchronization
        this.parallelPairs.push(character.characterCapsule);
    
        // Add to graphicsWorld
        this.graphicsWorld.add(character);

        return character;
    }
    
    updatePhysics(timeStep) {
        // Step the physics world
        this.physicsWorld.step(this.physicsFrameTime, timeStep, this.physicsMaxPrediction);

        // Sync physics/visuals
        this.parallelPairs.forEach(pair => {
    
            if(pair.physical.position.y < -1) {	
                pair.physical.position.y = 10;
            }
    
            if(pair.physical.position.y > 10) {	
                pair.physical.position.y = -1;
            }
    
            if(pair.physical.position.x > 5) {	
                pair.physical.position.x = -5;
            }
    
            if(pair.physical.position.x < -5) {	
                pair.physical.position.x = 5;
            }
    
            if(pair.physical.position.z > 5) {	
                pair.physical.position.z = -5;
            }
    
            if(pair.physical.position.z < -5) {	
                pair.physical.position.z = 5;
            }
    
            pair.visual.position.copy(pair.physical.interpolatedPosition);
            pair.visual.quaternion.copy(pair.physical.interpolatedQuaternion);
        });
    }
    
    spawnBoxPrimitive(options = []) {
    
        let defaults = {
            mass: 1,
            position: new CANNON.Vec3(),
            size: new CANNON.Vec3(0.3, 0.3, 0.3),
            friction: 0.3,
            visible: true
        };
        options = Utils.setDefaults(options, defaults);

        let mat = new CANNON.Material();
        mat.friction = options.friction;
        // mat.restitution = 0.7;

        let shape = new CANNON.Box(options.size);
        shape.material = mat;
        
    
        // Add phys sphere
        let physBox = new CANNON.Body({
            mass: options.mass,
            position: options.position,
            shape: shape
        });
    
        physBox.material = mat;
        this.physicsWorld.addBody(physBox);
        
        // Add visual box
        let geometry = new THREE.BoxGeometry( options.size.x*2, options.size.y*2, options.size.z*2 );
        let material = new THREE.MeshLambertMaterial( { color: 0xcccccc } );
        let visualBox = new THREE.Mesh( geometry, material );
        visualBox.castShadow = true;
        visualBox.receiveShadow = true;
        visualBox.visible = options.visible;
        this.graphicsWorld.add( visualBox );
    
        let pair = {
            physical: physBox,
            visual: visualBox
        };
      
        this.parallelPairs.push(pair);
        return pair;
    }
    
    spawnSpherePrimitive(options = []) {
    
        let defaults = {
            mass: 1,
            position: new CANNON.Vec3(),
            radius:  0.3,
            friction: 0.3,
            visible: true
        };
        options = Utils.setDefaults(options, defaults);

        let mat = new CANNON.Material();
        mat.friction = options.friction;
    
        let shape = new CANNON.Sphere(options.radius);
        shape.material = mat;
    
        // Add phys sphere
        let physSphere = new CANNON.Body({
            mass: options.mass, // kg
            position: options.position, // m
            shape: shape
        });
        physSphere.material = mat;
        this.physicsWorld.addBody(physSphere);
        
        // Add visual sphere
        let geometry2 = new THREE.SphereGeometry(options.radius);
        let material2 = new THREE.MeshLambertMaterial( { color: 0xcccccc } );
        let visualSphere = new THREE.Mesh( geometry2, material2 );
        visualSphere.castShadow = true;
        visualSphere.receiveShadow = true;
        visualSphere.visible = options.visible;
        this.graphicsWorld.add( visualSphere );
    
        let pair = {
            physical: physSphere,
            visual: visualSphere
        };
    
        this.parallelPairs.push(pair);
        return pair;
    }

    spawnCapsulePrimitive(options = []) {
    
        let defaults = {
            mass: 1,
            position: new CANNON.Vec3(),
            height: 0.5,
            radius:  0.3,
            segments: 8,
            friction: 0.3,
            visible: true
        };
        options = Utils.setDefaults(options, defaults);

        let mat = new CANNON.Material();
        mat.friction = options.friction;
    
        let physicalCapsule = new CANNON.Body({
            mass: options.mass,
            position: options.position
        });
        
        // Compound shape
        let sphereShape = new CANNON.Sphere(options.radius);
        let cylinderShape = new CANNON.Cylinder(options.radius, options.radius, options.height / 2, options.segments);
        cylinderShape.transformAllPoints(new CANNON.Vec3(), new CANNON.Quaternion(0.707,0,0,0.707));
    
        // Materials
        physicalCapsule.material = mat;
        sphereShape.material = mat;
        cylinderShape.material = mat;
    
        physicalCapsule.addShape(sphereShape, new CANNON.Vec3( 0, options.height / 2, 0));
        physicalCapsule.addShape(sphereShape, new CANNON.Vec3( 0, -options.height / 2, 0));
        physicalCapsule.addShape(cylinderShape, new CANNON.Vec3( 0, 0, 0));
    
        let visualCapsule = new THREE.Mesh(
            Utils.createCapsuleGeometry(options.radius, options.height, options.segments),
            new THREE.MeshLambertMaterial( { color: 0xcccccc, wireframe: true} )
        );
        visualCapsule.visible = options.visible;
    
        let pair = {
            physical: physicalCapsule,
            visual: visualCapsule
        };
    
        return pair;
    }
}

