// Standalone map editor — no account login. Requires `npm run dev` for save/publish APIs.
import { Sim } from '../sim/sim';
import { Renderer } from '../render/renderer';
import { Input } from '../game/input';
import { Keybinds } from '../game/keybinds';
import { assetsReady } from '../render/assets/preload';
import { createMapEditor } from '../dev/map_editor';
import { PLAYER_START } from '../sim/data';
import { DT } from '../sim/types';

const WORLD_SEED = 20061;

async function boot(): Promise<void> {
  const status = document.querySelector('#editor-status') as HTMLElement;
  status.textContent = 'Loading assets…';
  await assetsReady();

  // Let the grid layout settle so the canvas has real dimensions before WebGL init.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const sim = new Sim({ seed: WORLD_SEED, playerClass: 'warrior', playerName: 'Editor' });
  sim.setGm();
  sim.toggleGmFly();
  const p = sim.player;
  p.pos.x = PLAYER_START.x;
  p.pos.z = PLAYER_START.z;
  p.pos.y = 8;
  p.facing = 0;

  const canvas = document.querySelector('#editor-canvas') as HTMLCanvasElement;
  const nameplates = document.createElement('div');
  nameplates.style.display = 'none';
  document.body.appendChild(nameplates);

  const renderer = new Renderer(sim, canvas, nameplates, { omitAuthoredTrees: true });
  const keybinds = new Keybinds();
  const root = document.querySelector('#editor-root') as HTMLElement;
  const mapEditor = createMapEditor(renderer, sim, sim, root);

  const input = new Input(canvas, {
    onTab: () => {},
    onAbility: () => {},
    onUiKey: () => {},
    onClickPick: () => {},
    canUseGameKeys: () => true,
    onGmFly: () => sim.toggleGmFly(),
  }, keybinds);
  input.camYaw = p.facing;

  mapEditor.attachCanvas(canvas);

  window.dispatchEvent(new Event('resize'));

  let acc = 0;
  let last = performance.now();
  const frame = (now: number): void => {
    requestAnimationFrame(frame);
    let frameDt = (now - last) / 1000;
    last = now;
    if (frameDt > 0.25) frameDt = 0.25;

    input.updateTouchLook(frameDt);
    const movementFacing = input.isMouselookActive() ? input.camYaw : null;

    acc += frameDt;
    while (acc >= DT) {
      Object.assign(sim.moveInput, input.readMoveInput());
      if (movementFacing !== null) sim.player.facing = movementFacing;
      sim.tick();
      acc -= DT;
    }

    renderer.camYaw = input.camYaw;
    renderer.camPitch = input.camPitch;
    renderer.camDist = input.camDist;
    mapEditor.update(frameDt);
    try {
      renderer.sync(acc / DT, frameDt, movementFacing);
    } catch (err) {
      status.textContent = `Render error: ${err instanceof Error ? err.message : String(err)}`;
      console.error(err);
      return;
    }
  };
  requestAnimationFrame(frame);
  status.textContent = 'Ready.';
}

boot().catch((e) => {
  const status = document.querySelector('#editor-status') as HTMLElement;
  status.textContent = `Boot failed: ${e instanceof Error ? e.message : String(e)}`;
  console.error(e);
});
