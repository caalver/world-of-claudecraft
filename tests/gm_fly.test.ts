import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { DT, RUN_SPEED } from '../src/sim/types';

describe('gm fly', () => {
  it('only GM characters can toggle fly mode', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior' });
    const pid = sim.playerId;
    sim.toggleGmFly(pid);
    expect(sim.player.flying).toBeFalsy();

    sim.setGm(pid);
    sim.toggleGmFly(pid);
    expect(sim.player.flying).toBe(true);
    sim.toggleGmFly(pid);
    expect(sim.player.flying).toBe(false);
  });

  it('ascends while holding jump and ramps horizontal speed to 500%', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior' });
    const pid = sim.playerId;
    sim.setGm(pid);
    sim.toggleGmFly(pid);
    const y0 = sim.player.pos.y;

    sim.moveInput.jump = true;
    for (let i = 0; i < 20; i++) sim.tick();
    expect(sim.player.pos.y).toBeGreaterThan(y0 + 0.5);

    sim.moveInput.jump = false;
    sim.moveInput.forward = true;
    const start = { x: sim.player.pos.x, z: sim.player.pos.z };
    for (let i = 0; i < 40; i++) sim.tick();
    const midDist = Math.hypot(sim.player.pos.x - start.x, sim.player.pos.z - start.z);

    for (let i = 0; i < 120; i++) sim.tick();
    const maxDist = Math.hypot(sim.player.pos.x - start.x, sim.player.pos.z - start.z);
    const midSpeed = midDist / (40 * DT);
    const maxSpeed = maxDist / (160 * DT);
    expect(maxSpeed).toBeGreaterThan(midSpeed * 1.5);
    expect(maxSpeed).toBeLessThanOrEqual(RUN_SPEED * 5.05);
  });
});
