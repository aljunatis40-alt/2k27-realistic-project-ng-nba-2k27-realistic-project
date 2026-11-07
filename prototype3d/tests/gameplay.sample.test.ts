import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { BallPhysics } from "../src/simulation/BallPhysics.ts";
import { ShotTrajectorySolver } from "../src/simulation/ShotTrajectorySolver.ts";
import { MatchLoopManager, MatchState } from "../src/gameplay/MatchLoopManager.ts";
import { BallPossessionController } from "../src/gameplay/BallPossessionController.ts";

describe("basketball prototype sample tests", () => {
  it("moves the shot along its arc and finishes at the target", () => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshBasicMaterial());
    const physics = new BallPhysics();
    const solver = new ShotTrajectorySolver(mesh, physics);
    const start = new THREE.Vector3(0, 1.5, 2);
    const target = new THREE.Vector3(0, 3.05, -10);
    const onTarget = vi.fn();

    solver.launchBallFlight(start, target);
    expect(solver.getIsFlightActive()).toBe(true);

    for (let i = 0; i < 24; i++) solver.updateFlightTrajectory(0.05, onTarget);

    expect(solver.getIsFlightActive()).toBe(false);
    expect(physics.position.x).toBeCloseTo(target.x, 5);
    expect(physics.position.y).toBeCloseTo(target.y, 5);
    expect(physics.position.z).toBeCloseTo(target.z, 5);
    expect(onTarget).toHaveBeenCalledTimes(1);
    expect(physics.velocity.y).toBe(-1.2);
  });

  it("applies a bounded horizontal release error", () => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshBasicMaterial());
    const physics = new BallPhysics();
    const solver = new ShotTrajectorySolver(mesh, physics);
    solver.launchBallFlight(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 3, -5), 8);
    for (let i = 0; i < 24; i++) solver.updateFlightTrajectory(0.05, () => {});
    expect(physics.position.x).toBeCloseTo(1, 5);
  });

  it("bounces the ball off the court floor", () => {
    const physics = new BallPhysics();
    physics.launch(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -5, 0));
    physics.step(0.2);
    expect(physics.position.y).toBeCloseTo(0.12, 5);
    expect(physics.velocity.y).toBeGreaterThan(0);
  });

  it("awards valid points only during live play", () => {
    const match = new MatchLoopManager([], null, { deadBallDurationSeconds: 2 });
    match.registerScore(true, 2);
    expect(match.score.home).toBe(0);

    match.start();
    match.registerScore(true, 3);
    expect(match.score.home).toBe(3);
    expect(match.matchState).toBe(MatchState.DeadBall);

    match.registerScore(false, 0);
    expect(match.score.away).toBe(0);
  });

  it("transfers possession to the intended pass receiver", () => {
    const physics = new BallPhysics();
    const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshBasicMaterial());
    const possession = new BallPossessionController(physics, ballMesh);
    const makeActor = (id: string, x: number) => {
      const mesh = new THREE.Group();
      mesh.position.set(x, 0, 0);
      const handNode = new THREE.Object3D();
      handNode.position.set(0, 1, 0);
      mesh.add(handNode);
      mesh.updateMatrixWorld(true);
      return { id, isHomeTeam: true, mesh, position: mesh.position, handNode, stamina: 100 };
    };
    const passer = makeActor("home-01", 0);
    const receiver = makeActor("home-02", 2);

    possession.assignPossession(passer);
    expect(possession.initiatePassTransfer(passer, receiver, 0.2)).toBe(true);
    for (let i = 0; i < 5; i++) possession.update(0.05);
    expect(possession.getCurrentHandler()?.id).toBe(receiver.id);
  });
});
