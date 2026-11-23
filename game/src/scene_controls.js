  /* Manual controls shared by the surface, indoor rooms and dungeon floors. */
  const ARROW_KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const JOYSTICK_DIRECTIONS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  let joy = null, key = null;

  const inputAvailable = () => running && map && P && !locked && !(host.inputBlocked && host.inputBlocked());

  function stopManualStep() {
    if (!P) return;
    P.path = [];
    P.fx = P.x;
    P.fy = P.y;
    P.run = false;
  }

  function joystickVisual(x, y, mode) {
    joy.base.style.setProperty('--joy-x', `${x}px`);
    joy.base.style.setProperty('--joy-y', `${y}px`);
    joy.base.dataset.mode = mode;
  }

  function stopJoystick() {
    if (!joy || joy.pointer === null) return;
    const id = joy.pointer;
    joy.pointer = null;
    joy.direction = null;
    if (joy.base.hasPointerCapture(id)) joy.base.releasePointerCapture(id);
    joystickVisual(0, 0, 'rest');
    stopManualStep();
  }

  function clearSceneControls() {
    stopJoystick();
    key = null;
    stopManualStep();
  }

  function moveJoystick(e) {
    const rect = joy.base.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2, y = e.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(x, y), radius = Math.min(rect.width, rect.height) / 2;
    if (distance <= radius * .22) {
      if (joy.direction) stopManualStep();
      joy.direction = null;
      joystickVisual(0, 0, 'rest');
      return;
    }
    const scale = Math.min(1, radius * .66 / distance);
    const index = (Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8;
    joy.direction = JOYSTICK_DIRECTIONS[index];
    joy.run = distance > radius * .67;
    joystickVisual(x * scale, y * scale, joy.run ? 'run' : 'walk');
  }

  function initSceneControls(el) {
    const base = document.createElement('div'), thumb = document.createElement('i');
    base.id = 'movement-joystick';
    base.className = 'movement-joystick';
    base.setAttribute('role', 'group');
    base.setAttribute('aria-label', 'Movement joystick');
    base.setAttribute('aria-disabled', 'true');
    thumb.className = 'joystick-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    base.append(thumb);
    el.append(base);
    joy = { base, pointer: null, direction: null, run: false, available: false };
    joystickVisual(0, 0, 'rest');
    base.addEventListener('pointerdown', e => {
      if (e.button !== 0 || joy.pointer !== null || !inputAvailable()) return;
      e.preventDefault();
      clearSceneControls();
      joy.pointer = e.pointerId;
      base.setPointerCapture(e.pointerId);
      moveJoystick(e);
    });
    base.addEventListener('pointermove', e => {
      if (e.pointerId === joy.pointer) moveJoystick(e);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      base.addEventListener(event, e => { if (e.pointerId === joy.pointer) stopJoystick(); });
    }
    window.addEventListener('blur', clearSceneControls);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearSceneControls(); });
    window.addEventListener('keydown', e => {
      if (!inputAvailable() || /TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName)) return;
      if (Object.prototype.hasOwnProperty.call(ARROW_KEYS, e.key)) {
        e.preventDefault();
        if (joy.pointer === null) key = e.key;
      } else if ((e.key === ' ' || e.key === 'Enter') && near && document.activeElement.tagName !== 'BUTTON') act();
    });
    window.addEventListener('keyup', e => { if (e.key === key) key = null; });
  }

  function manualMovement() {
    const available = !!inputAvailable();
    if (joy && joy.available !== available) {
      joy.available = available;
      joy.base.setAttribute('aria-disabled', String(!available));
    }
    if (!available) { if (key || joy && joy.pointer !== null || P.path.length) clearSceneControls(); return; }
    const joystick = joy && joy.pointer !== null;
    const direction = joystick ? joy.direction : ARROW_KEYS[key];
    if (!direction) return;
    const [dx, dy] = direction;
    P.run = !!(joystick && joy.run);
    if (P.path.length) return;
    let x = P.x + dx, y = P.y + dy;
    const clearX = dx && !blocked(x, P.y), clearY = dy && !blocked(P.x, y);
    if (dx && dy && (!clearX || !clearY || blocked(x, y))) {
      // Slide along one open side of a corner instead of crossing it diagonally.
      if (clearX) y = P.y;
      else if (clearY) x = P.x;
    }
    if ((dx && dy && !clearX && !clearY) || blocked(x, y)) {
      P.dg = null;
      P.dir = dirOf(dx, dy);
      P.d8 = D8(dx, dy);
      return;
    }
    P.path = [[x, y]];
  }
