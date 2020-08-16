import * as THREE from 'three';
import
{
	CharacterStateBase,
} from '../_stateLibrary';
import { Character } from '../../Character';
import { IControllable } from '../../../interfaces/IControllable';
import { Driving } from './Driving';
import { VehicleSeat } from '../../../vehicles/VehicleSeat';
import { Side } from '../../../enums/Side';
import { Sitting } from './Sitting';
import { SeatType } from '../../../enums/SeatType';

export class EnteringVehicle extends CharacterStateBase
{
	private vehicle: IControllable;
	private seat: VehicleSeat;
	private startPosition: THREE.Vector3 = new THREE.Vector3();
	private endPosition: THREE.Vector3 = new THREE.Vector3();
	private startRotation: THREE.Quaternion = new THREE.Quaternion();
	private endRotation: THREE.Quaternion = new THREE.Quaternion();

	constructor(character: Character, seat: VehicleSeat)
	{
		super(character);

		this.canFindVehiclesToEnter = false;
		this.vehicle = seat.vehicle;
		this.seat = seat;

		if (seat.doorSide === Side.Left)
		{
			this.playAnimation('enter_airplane_right', 0.1);
		}
		else if (seat.doorSide === Side.Right)
		{
			this.playAnimation('enter_airplane_left', 0.1);
		}

		this.character.resetVelocity();
		this.character.rotateModel();
		this.character.setPhysicsEnabled(false);
		(this.seat.vehicle as unknown as THREE.Object3D).attach(this.character);

		this.startPosition.copy(this.character.position);
		this.endPosition.copy(seat.seatPointObject.position);
		this.endPosition.y += 0.6;

		this.startRotation.copy(this.character.quaternion);
		this.endRotation.copy(this.seat.seatPointObject.quaternion);
	}

	public update(timeStep: number): void
	{
		super.update(timeStep);

		if (this.animationEnded(timeStep))
		{
			this.character.occupySeat(this.seat);
			this.character.setPosition(this.endPosition.x, this.endPosition.y, this.endPosition.z);

			if (this.seat.type === SeatType.Driver)
			{
				this.character.setState(new Driving(this.character, this.seat));
			}
			else if (this.seat.type === SeatType.Passenger)
			{
				this.character.setState(new Sitting(this.character, this.seat));
			}
		}
		else
		{
			let factor = THREE.MathUtils.clamp(this.timer / (this.animationLength - 0.3), 0, 1);
			let sineFactor = 1 - ((Math.cos(factor * Math.PI) * 0.5) + 0.5);
	
			let lerpPosition = new THREE.Vector3().lerpVectors(this.startPosition, this.endPosition, sineFactor);
			this.character.setPosition(lerpPosition.x, lerpPosition.y, lerpPosition.z);
	
			THREE.Quaternion.slerp(this.startRotation, this.endRotation, this.character.quaternion, sineFactor);
		}
	}
}