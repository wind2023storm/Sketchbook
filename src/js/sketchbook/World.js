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
import _ from 'lodash';
import { InputManager } from './InputManager';

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

        //#region ParamGUI
        
        // Variables
        let params = {
            Pointer_Lock: false,
            Mouse_Sensitivity: 0.4,
            FPS_Limit: 60,
            Time_Scale: 1,
            Shadows: true,
            FXAA: false,
            Draw_Physics: false,
            RayCast_Debug: false
        };
        this.params = params;

        // Changing time scale with scroll wheel
        this.timeScaleTarget = 1;

        let gui = new GUI();
        let input_folder = gui.addFolder('Input');
        let pl = input_folder.add(params, 'Pointer_Lock');
        let ms = input_folder.add(params, 'Mouse_Sensitivity', 0, 1);
        let graphics_folder = gui.addFolder('Rendering');
        graphics_folder.add(params, 'FPS_Limit', 0, 60);
        let timeController = graphics_folder.add(params, 'Time_Scale', 0, 1).listen();
        let shadowSwitch = graphics_folder.add(params, 'Shadows');
        graphics_folder.add(params, 'FXAA');

        let debug_folder = gui.addFolder('Debug');
        let dp = debug_folder.add(params, 'Draw_Physics');
        let rcd = debug_folder.add(params, 'RayCast_Debug');

        gui.open();
        
        timeController.onChange(function(value) {
            scope.timeScaleTarget = value;
        });

        ms.onChange(function(value) {
            scope.cameraController.setSensitivity(value, value * 0.8);
        });

        pl.onChange(function(enabled) {
            scope.inputManager.setPointerLock(enabled);
        });

        dp.onChange(function(enabled) {
            scope.objects.forEach(obj => {
                if(obj.shapeModel != undefined) {
                    if(enabled) obj.shapeModel.visible = true;
                    else        obj.shapeModel.visible = false;
                }
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
        this.objects = [];
        this.characters = [];
        this.vehicles = [];
        this.cameraController = new CameraController(this.camera, this.params.Mouse_Sensitivity, this.params.Mouse_Sensitivity * 0.8);
        this.inputManager = new InputManager(this, this.renderer.domElement);
        this.gameMode = new GameModes.FreeCameraControls(this);
        
        this.render(this);
    }
    
    // Update
    // Handles all logic updates.
    update(timeStep) {
    
        this.updatePhysics(timeStep);
    
        // Objects
        this.objects.forEach(obj => {
            obj.update(timeStep);
        });

        // Characters
        this.characters.forEach(char => {
            char.behaviour.update(timeStep);
            char.updateMatrixWorld();
        });

        // Gamemode
        this.gameMode.update(timeStep);
    
        // Rotate and position camera according to cameraTarget and angles
        this.cameraController.update();
    
        // Lerp timescale parameter
        this.params.Time_Scale = THREE.Math.lerp(this.params.Time_Scale, this.timeScaleTarget, 0.2);
    }

    updatePhysics(timeStep) {
        // Step the physics world
        this.physicsWorld.step(this.physicsFrameTime, timeStep, this.physicsMaxPrediction);

        // Sync physics/visuals
        this.objects.forEach(obj => {
    
            if(obj.shape != undefined) {
                if(obj.shape.position.y < -1) {	
                    obj.shape.position.y = 10;
                }
        
                if(obj.shape.position.y > 10) {	
                    obj.shape.position.y = -1;
                }
        
                if(obj.shape.position.x > 5) {	
                    obj.shape.position.x = -5;
                }
        
                if(obj.shape.position.x < -5) {	
                    obj.shape.position.x = 5;
                }
        
                if(obj.shape.position.z > 5) {	
                    obj.shape.position.z = -5;
                }
        
                if(obj.shape.position.z < -5) {	
                    obj.shape.position.z = 5;
                }
        
                obj.position.copy(obj.shape.interpolatedPosition);
                obj.quaternion.copy(obj.shape.interpolatedQuaternion);
            }
        });
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

    add(object) {
        if(object.isObject) {
            this.objects.push(object);

            if(object.shape != undefined) {
                this.physicsWorld.addBody(object.shape);
            }

            if(object.shapeModel != undefined) {
                this.graphicsWorld.add(object.shapeModel);
            }

            if(object.model != undefined) {
                this.graphicsWorld.add(object.model);
            }
        }
        else if(object.isCharacter) {

            const character = object;

            // Set world
            character.world = this;

            // Register character
            this.characters.push(character);
                    
            // Register physics
            this.physicsWorld.addBody(character.characterCapsule.shape);

            // Raycast debug
            this.graphicsWorld.add(character.raycastBox);

            // Register characters physical capsule object
            this.objects.push(character.characterCapsule);

            // Add to graphicsWorld
            this.graphicsWorld.add(character);
            this.graphicsWorld.add(character.characterCapsule.shapeModel);

            return character;
        }
        else {
            console.error('Object type not supported: ' + object);
        }
    }

    remove(object) {
        if(object.isCharacter) {

            const character = object;

            // Remove from characters
            _.pull(this.characters, character);
        
            // Remove physics
            this.physicsWorld.removeBody(character.characterCapsule.physical);

            // Remove visuals
            this.graphicsWorld.remove(character.characterCapsule.visual);
            this.graphicsWorld.remove(character.raycastBox);

            // Register for synchronization
            _.pull(this.parallelPairs, character.characterCapsule);

            // Add to graphicsWorld
            this.graphicsWorld.remove(character);

            return character;
        }
        else {
            console.error('Object type not supported: ' + object);
        }
    }
}

