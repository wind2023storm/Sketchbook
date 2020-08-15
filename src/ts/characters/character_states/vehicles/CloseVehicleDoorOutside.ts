import
{
	CharacterStateBase,
} from '../_stateLibrary';
import { Character } from '../../Character';
import { SeatPoint } from '../../../data/SeatPoint';
import { Side } from '../../../enums/Side';
import { Idle } from '../Idle';

export class CloseVehicleDoorOutside extends CharacterStateBase
{
	private seat: SeatPoint;
	private hasClosedDoor: boolean = false;

	constructor(character: Character, seat: SeatPoint)
	{
		super(character);

		this.seat = seat;
		this.canFindVehiclesToEnter = false;

		if (seat.doorSide === Side.Left)
		{
			this.playAnimation('close_door_standing_right', 0.1);
		}
		else if (seat.doorSide === Side.Right)
		{
			this.playAnimation('close_door_standing_left', 0.1);
		}
	}

	public update(timeStep: number): void
	{
		super.update(timeStep);

		if (this.timer > 0.3 && !this.hasClosedDoor)
		{
			this.hasClosedDoor = true;
			this.seat.door.close();   
		}

		if (this.animationEnded(timeStep))
		{
			this.character.setState(new Idle(this.character));
		}
	}
}