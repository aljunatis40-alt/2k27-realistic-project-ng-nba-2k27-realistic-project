import * as THREE from "three";

export type OffensivePlayCall = "FiveOutSpacing" | "PickAndRoll" | "PickAndRollSlip" | "BaselineCut";

export interface OffensiveTeamAIOptions {
  ballCarrier: THREE.Object3D;
  teammates: THREE.Object3D[];
  basketPosition: THREE.Vector3;
  moveSpeed?: number;
  arrivalRadius?: number;
  turnSpeed?: number;
  onPlayChanged?: (play: OffensivePlayCall) => void;
}

type TeammateAgent = {
  object: THREE.Object3D;
  velocity: THREE.Vector3;
  destination: THREE.Vector3;
};

export class OffensiveTeamAI {
  currentPlay: OffensivePlayCall = "FiveOutSpacing";
  private readonly agents: TeammateAgent[];
  private readonly basketPosition: THREE.Vector3;
  private readonly moveSpeed: number;
  private readonly arrivalRadius: number;
  private readonly turnSpeed: number;
  private readonly onPlayChanged?: OffensiveTeamAIOptions["onPlayChanged"];
  private readonly towardBasket = new THREE.Vector3();
  private readonly screenPoint = new THREE.Vector3();
  private readonly rollPoint = new THREE.Vector3();
  private pickRollScreenReady = false;
  private readonly spacingOffsets = [
    new THREE.Vector3(-5.1, 0, -1.8),
    new THREE.Vector3(5.1, 0, -1.8),
    new THREE.Vector3(-6.0, 0, 3.0),
    new THREE.Vector3(6.0, 0, 3.0)
  ];

  constructor(private readonly options: OffensiveTeamAIOptions) {
    this.agents = options.teammates.slice(0, 4).map((object) => ({
      object,
      velocity: new THREE.Vector3(),
      destination: object.position.clone()
    }));
    this.basketPosition = options.basketPosition.clone();
    this.moveSpeed = options.moveSpeed ?? 3.9;
    this.arrivalRadius = options.arrivalRadius ?? 0.28;
    this.turnSpeed = options.turnSpeed ?? 8;
    this.onPlayChanged = options.onPlayChanged;
    this.updateDestinations();
  }

  setPlay(play: OffensivePlayCall): void {
    if (this.currentPlay === play) return;
    this.currentPlay = play;
    this.pickRollScreenReady = false;
    this.onPlayChanged?.(play);
    this.updateDestinations();
  }

  update(deltaSeconds: number): void {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
    if (this.agents.length < 4) return;

    if ((this.currentPlay === "PickAndRoll" || this.currentPlay === "PickAndRollSlip")) {
      this.updatePickAndRollState();
    }
    this.updateDestinations();

    for (const agent of this.agents) {
      const offset = agent.destination.clone().sub(agent.object.position);
      offset.y = 0;
      const distance = offset.length();

      if (distance <= this.arrivalRadius) {
        agent.velocity.set(0, 0, 0);
        continue;
      }

      offset.normalize();
      const desiredSpeed = this.moveSpeed * Math.min(1, distance / 1.15);
      const desiredVelocity = offset.multiplyScalar(desiredSpeed);
      agent.velocity.lerp(desiredVelocity, 1 - Math.exp(-7 * dt));
      agent.object.position.addScaledVector(agent.velocity, dt);

      if (agent.velocity.lengthSq() > 0.01) {
        const facing = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          agent.velocity.clone().normalize()
        );
        agent.object.quaternion.slerp(facing, 1 - Math.exp(-this.turnSpeed * dt));
      }
    }
  }

  private updatePickAndRollState(): void {
    const screener = this.agents[0];
    if (!screener || this.pickRollScreenReady) return;

    this.getScreenPoint();
    const distance = screener.object.position.distanceTo(this.screenPoint);
    if (distance <= 0.9) this.pickRollScreenReady = true;
  }

  private updateDestinations(): void {
    const basketSide = this.basketPosition.z < this.options.ballCarrier.position.z ? -1 : 1;
    for (let i = 0; i < this.agents.length; i++) {
      const point = this.agents[i].destination;
      if (this.currentPlay === "FiveOutSpacing") {
        const offset = this.spacingOffsets[i];
        point.set(offset.x, 0, offset.z * (basketSide < 0 ? 1 : -1));
      } else if ((this.currentPlay === "PickAndRoll" || this.currentPlay === "PickAndRollSlip")) {
        if (i === 0) {
          if (this.pickRollScreenReady) {
            this.rollPoint.copy(this.basketPosition);
            this.rollPoint.y = 0;
            this.rollPoint.x += 0.9;
            this.rollPoint.z += basketSide * 1.4;
            point.copy(this.rollPoint);
          } else {
            this.getScreenPoint();
            point.copy(this.screenPoint);
          }
        } else {
          const offset = this.spacingOffsets[i];
          point.set(offset.x, 0, offset.z * (basketSide < 0 ? 1 : -1));
        }
      } else if (this.currentPlay === "BaselineCut") {
        if (i === 2) {
          point.copy(this.basketPosition);
          point.y = 0;
          point.x -= 2.2;
          point.z += basketSide * 1.4;
        } else {
          const offset = this.spacingOffsets[i];
          point.set(offset.x, 0, offset.z * (basketSide < 0 ? 1 : -1));
        }
      }
    }
  }

  private getScreenPoint(): void {
    this.towardBasket.copy(this.basketPosition).sub(this.options.ballCarrier.position);
    this.towardBasket.y = 0;
    if (this.towardBasket.lengthSq() > 0.0001) this.towardBasket.normalize();
    this.screenPoint.copy(this.options.ballCarrier.position).addScaledVector(this.towardBasket, 1.25);
    this.screenPoint.y = 0;
  }

  get activePlay(): OffensivePlayCall {
    return this.currentPlay;
  }
}
