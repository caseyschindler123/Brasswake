/* Saved arrival story. Old characters without this optional object stay ashore. */
const Prologue = (() => {
  const phases = ['rescue', 'name', 'home', 'recognition', 'question', 'where', 'walk', 'decktalk', 'arrival', 'done'];
  const origins = [
    { id: 'sunspire', name: 'Sunspire', detail: 'A distant realm whose merchants trade glass and medicines.' },
    { id: 'sylvanreach', name: 'Sylvanreach', detail: 'A distant realm known here through its cloth merchants.' },
    { id: 'dwarrowdeep', name: 'Dwarrowdeep', detail: 'A distant realm whose foundries trade across the sea.' }
  ];
  const route = { rescue: { rescued: 'name' }, name: { named: 'home' }, home: { home: 'recognition' }, recognition: { continue: 'question' }, question: { remember: 'where' }, where: { continue: 'walk' }, walk: { spoke: 'decktalk' }, decktalk: { rest: 'arrival' }, arrival: { land: 'done' } };
  const entry = [5, 18], width = 18, height = 36;
  const origin = id => origins.find(o => o.id === id) || null;
  const cleanName = value => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 16);
  function deck(x, y, arrival) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
    if (arrival && y === 18 && x >= 13 && x <= 16) return true;
    if (y < 5 || y > 29) return false;
    const bounds = y === 5 ? [9, 9] : y < 9 ? [8, 10] : y < 12 ? [7, 11] : y < 15 ? [6, 12] : y < 27 ? [5, 12] : [6, 12];
    if (x < bounds[0] || x > bounds[1]) return false;
    return !(x === 9 && [10, 18, 25].includes(y));
  }
  const fresh = () => ({ v: 1, phase: 'rescue', origin: null, named: false, steps: 0, pos: entry.slice() });
  function normalize(value) {
    if (!value || value.v !== 1) return null;
    const p = fresh();
    p.phase = phases.includes(value.phase) ? value.phase : 'rescue';
    p.origin = origin(value.origin) ? value.origin : null;
    p.named = !!value.named;
    p.steps = Math.max(0, Math.min(10000, Math.floor(Number(value.steps) || 0)));
    if (Array.isArray(value.pos) && deck(value.pos[0], value.pos[1], p.phase === 'arrival')) p.pos = value.pos.slice(0, 2);
    // A corrupted or partially imported checkpoint returns to its missing question.
    if (!['rescue', 'name', 'done'].includes(p.phase) && !p.named) p.phase = 'name';
    if (!['rescue', 'name', 'home', 'done'].includes(p.phase) && !p.origin) p.phase = 'home';
    return p;
  }
  const active = p => !!p && p.v === 1 && p.phase !== 'done';
  function advance(value, action, input) {
    const p = normalize(value); if (!p) return null;
    const next = route[p.phase] && route[p.phase][action]; if (!next) return p;
    if (action === 'named') { if (!cleanName(input)) return p; p.named = true; }
    if (action === 'home') { if (!origin(input)) return p; p.origin = input; }
    if (action === 'spoke' && p.steps < 3) return p;
    p.phase = next;
    return p;
  }
  function moved(value, position) {
    const p = normalize(value); if (!p || !['walk', 'arrival'].includes(p.phase) || !Array.isArray(position) || !deck(...position, p.phase === 'arrival')) return p;
    if (position[0] !== p.pos[0] || position[1] !== p.pos[1]) p.steps++;
    p.pos = position.slice(); return p;
  }
  const skip = value => Object.assign(normalize(value) || fresh(), { phase: 'done' });
  const home = p => (origin(p && p.origin) || {}).name || '';
  function recognition(path, name, realm) {
    const start = `Hang on. ${name}, from ${realm}? `;
    const deeds = {
      warrior: 'The duelist? A sailor we carried last winter told us about your bouts. He said nobody had managed to beat you.',
      mage: 'The mage? A trader told me you could call fire into your hands. I thought she was trying to impress us.',
      thief: 'The lockpicker? We had a trader aboard who kept talking about you. He said there wasn’t a lock you couldn’t open.',
      crafter: 'The smith who made a blade for the king? One of our merchants saw it. He wouldn’t stop talking about the work.'
    };
    return start + (deeds[path] || 'I’ve heard your name from people who trade there.');
  }
  function beat(p, name, path) {
    const realm = home(p), who = cleanName(name) || 'stranger';
    const beats = {
      rescue: { title: 'The Brass Sea', text: 'A rope lands beside you. Tamsin leans over the rail while another sailor takes the strain. “Hold on. We’ve got you!”' },
      name: { title: 'Aboard the Marigold', text: '“Easy. You’re aboard the Marigold. I’m Tamsin. We pulled you out of the water just now.” She waits for you to catch your breath. “What should I call you?”' },
      home: { title: 'A place to call home', text: `“All right, ${who}. Where are you from?”` },
      recognition: { title: 'A familiar name', text: '“' + recognition(path, who, realm) + '”' },
      question: { title: 'An impossible journey', text: `“How the hell did you get out here? ${realm} is weeks away by ship. Were you sailing with someone?”` },
      where: { title: 'Bound for Tallyport', text: '“Yesterday?” Tamsin looks back at the sea. “I don’t know what brought you here, but I’m glad we found you.”\n\n“You’re off the coast of Brasswake. We’re bound for Tallyport, a trading port where the crew live. It’ll be another three days if the weather holds, so try to get some rest.”' },
      walk: { title: 'Find your feet', text: 'Once you feel steady, Tamsin clears a space beside the cargo. Push the joystick at the lower right to walk over to her, then tap Talk. You can also use the arrow keys.' },
      decktalk: { title: 'A little help ashore', text: '“You’re doing better. Those crates are going to the galley and the town stores. We keep a manifest so the crew know what to unload and where it belongs.”\n\n“When we dock, I’ll introduce you to Odalys Brine. She teaches SQL, a language we use to work with records. She’ll start with the basics, and she can help you find work while we ask about your journey.”' },
      arrival: { title: 'Tallyport · three days later', text: 'Three days later, the Marigold ties up at Tallyport. “Come on,” Tamsin says. “Let’s find Odalys.” Walk to the gangplank on the right, then tap Step ashore.' }
    };
    return beats[p.phase] || null;
  }
  return { phases, origins, origin, fresh, normalize, active, advance, moved, skip, home, cleanName, recognition, beat, deck, entry, width, height };
})();
if (typeof module !== 'undefined') module.exports = Prologue;
