import * as CANNON from 'cannon';
import * as THREE from 'three';
import { Utilities as Utils } from '../../core/Utilities';

export class SpherePhysics
{
    options: any;
    physical: CANNON.Body;
    visual: THREE.Mesh;

    constructor(options)
    {
        let defaults = {
            mass: 0,
            position: new CANNON.Vec3(),
            radius: 0.3,
            friction: 0.3
        };
        options = Utils.setDefaults(options, defaults);
        this.options = options;

        let mat = new CANNON.Material("sphereMat");
        mat.friction = options.friction;

        let shape = new CANNON.Sphere(options.radius);
        // shape.material = mat;

        // Add phys sphere
        let physSphere = new CANNON.Body({
            mass: options.mass,
            position: options.position,
            shape: shape
        });
        physSphere.material = mat;

        this.physical = physSphere;
        this.visual = this.getVisualModel({ visible: false, wireframe: true });
    }

    public getVisualModel(options)
    {
        let defaults = {
            visible: true,
            wireframe: true
        };
        options = Utils.setDefaults(options, defaults);

        let geometry = new THREE.SphereGeometry(this.options.radius);
        let material = new THREE.MeshLambertMaterial({ color: 0xcccccc, wireframe: options.wireframe });
        let visualSphere = new THREE.Mesh(geometry, material);
        visualSphere.visible = options.visible;

        if (!options.wireframe)
        {
            visualSphere.castShadow = true;
            visualSphere.receiveShadow = true;
        }

        return visualSphere;
    }
}