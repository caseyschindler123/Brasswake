/* Saved arrival story. Old characters without this optional object stay ashore. */
const Prologue = (() => {
  const phases = ['rescue', 'name', 'home', 'recognition', 'question', 'where', 'walk', 'decktalk', 'chart', 'kit', 'hero', 'ledger', 'arrival', 'done'];
  const origins = [
    { id: 'sunspire', name: 'Sunspire', detail: 'A distant realm whose merchants trade glass and medicines.' },
    { id: 'sylvanreach', name: 'Sylvanreach', detail: 'A distant realm known here through its cloth merchants.' },
    { id: 'dwarrowdeep', name: 'Dwarrowdeep', detail: 'A distant realm whose foundries trade across the sea.' }
  ];
  const route = { rescue: { rescued: 'name' }, name: { named: 'home' }, home: { home: 'recognition' }, recognition: { continue: 'question' }, question: { remember: 'where' }, where: { continue: 'walk' }, walk: { spoke: 'decktalk' }, decktalk: { rest: 'chart' }, chart: { continue: 'kit' }, kit: { continue: 'hero' }, hero: { continue: 'ledger' }, ledger: { continue: 'arrival' }, arrival: { land: 'done' } };
  const toolFor = {chart:'map',kit:'bag',hero:'hero',ledger:'ledger'};
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
  const fresh = () => ({ v: 1, phase: 'rescue', origin: 'sunspire', named: false, steps: 0, tools: [], pos: entry.slice() });
  function normalize(value) {
    if (!value || value.v !== 1) return null;
    const p = fresh();
    p.phase = phases.includes(value.phase) ? value.phase : 'rescue';
    p.origin = origin(value.origin) ? value.origin : 'sunspire';
    p.named = !!value.named;
    p.steps = Math.max(0, Math.min(10000, Math.floor(Number(value.steps) || 0)));
    p.tools = Array.from(new Set((Array.isArray(value.tools)?value.tools:[]).filter(t=>['world','map','bag','hero','ledger'].includes(t))));
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
    // A single homeland for new arrivals; established legacy origins stay intact.
    if (action === 'home' && input && !origin(input)) return p;
    if (action === 'spoke' && p.steps < 3) return p;
    if (toolFor[p.phase] && !p.tools.includes(toolFor[p.phase])) return p;
    p.phase = next;
    return p;
  }
  function moved(value, position) {
    const p = normalize(value); if (!p || !['walk', 'arrival'].includes(p.phase) || !Array.isArray(position) || !deck(...position, p.phase === 'arrival')) return p;
    if (position[0] !== p.pos[0] || position[1] !== p.pos[1]) p.steps++;
    p.pos = position.slice(); return p;
  }
  const skip = value => Object.assign(normalize(value) || fresh(), { phase: 'done' });
  function viewed(value, tab) {const p=normalize(value);if(p&&['world','map','hero','bag','ledger'].includes(tab)&&!p.tools.includes(tab))p.tools.push(tab);return p;}
  const toolsAvailable = p => !!p && phases.indexOf(p.phase)>=phases.indexOf('walk');
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
      decktalk: { title: 'A little help ashore', text: '“You’re doing better. When we dock, I’ll introduce you to Odalys Brine. She teaches SQL. It’s how people here put power into a spell or a strike, and you’ll need it for the other skills you practise, too.”\n\n“She’ll help you get started. You don’t have to decide what you’ll do with it yet, and you can stay with us while we ask about your journey.”' },
      chart: { title: 'A map for the journey', text: '“Here, take this map. It’s a pretty shitty one. You’ll have to fill in the gaps yourself, but it’ll help you find your way around. You’re not exactly from around here.”\n\n“Open Map down below. That sketch shows the coast and where we’re landing. Once you’re ashore, walking fills in the ground around you, and places you find get marked. A proper survey costs gold; this one won’t take you anywhere by magic.”' },
      kit: { title: 'Your things', text: '“Have a look in your Bag. We packed a Healing Draught and some bandages with your things. Tap a supply to see what it does before using it. Weapons, clothes and any scrolls you find go in there too.”' },
      hero: { title: 'Find your strength', text: '“Hero shows your equipment and the skills you’ve brought with you. Your skills improve when you use them. You can learn other trades here, so you don’t have to stick to the one people know you for.”\n\n“Knowing the right query gives an action its power. Your skill with a blade or a spell still matters when you try it.”' },
      ledger: { title: 'A place to learn', text: '“Your Ledger holds the practice tables, a sandbox you can experiment in, and the lessons you’ve met. Odalys will show you what a query does when we land. After that, the dojo fighters can explain their techniques and practise with you. Losing a teaching bout won’t cost your gear or supplies.”\n\n“Adventure brings you back to the world. You can check your map or your things whenever you need them.”' },
      arrival: { title: 'Tallyport · three days later', text: 'Three days later, the Marigold ties up at Tallyport. “Come on,” Tamsin says. “Let’s find Odalys.” Walk to the gangplank on the right, then tap Step ashore.' }
    };
    return beats[p.phase] || null;
  }
  return { phases, origins, origin, fresh, normalize, active, advance, moved, skip, viewed, toolsAvailable, toolFor, home, cleanName, recognition, beat, deck, entry, width, height };
})();
if (typeof module !== 'undefined') module.exports = Prologue;
