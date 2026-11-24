/* Cartography screens, save bridge and interaction sessions. Scene provides the live world. */
const CartographyScreen = (() => {
  const C = Cartography, regions = [1, 2, 3, 4, 5, 6, 7, 8];
  const labels = { town: 'Town', stairs: 'Dungeon entrance', poi: 'Landmark', fish: 'Fishing water', ferry: 'Ferry quay', home: 'Homestead', lair: 'Lair', service:'Business' };
  const money = n => n.toLocaleString('en-US') + ' gold';

  function create(adapter) {
    const { state, account, scene, region, esc, sheet, save, toast, render, world, blocked, close, homes, houseSize } = adapter;
    let active, activeAccount, mask = C.createMask(), revision = 0, dirty = false, saveTimer = null;
    let selected = 0, worldView = false, townView = false, serial = 0, session = null;
    let rasterRevision = -1;
    const rasters = new Map();
    const name = r => region(r).name;
    const catalogue = () => scene.cartographyCatalogue().filter(C.isPublicDestination);
    const destination = id => catalogue().find(site => site.id === id);
    const surface = () => !!scene.pos() && !scene.inDungeon() && !scene.inHall() && !(scene.inInterior && scene.inInterior());
    const mapOpen = () => !adapter.activeMap || adapter.activeMap();
    const sheetOpen = () => !adapter.sheetOpen || adapter.sheetOpen();

    function current() {
      const s = state(), a = account();
      if (s === active && a === activeAccount) return s && s.cartography;
      active = s; activeAccount = a; session = null; selected = 0; worldView = false; townView=false;
      revision++;
      dirty = false;
      if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null; }
      if (!s) { mask = C.createMask(); return null; }
      const legacy = s.cartography == null;
      s.cartography = C.normalize(s.cartography);
      mask = C.decode(s.cartography.explored);
      if (legacy) for (const r of regions) if (s.been && s.been[r]) reveal(Geography.towns[r]);
      reveal(s.dungeon ? s.dungeon.back : s.pos);
      return s.cartography;
    }

    function reveal(at) {
      if (!Array.isArray(at) || !C.reveal(mask, at[0], at[1])) return false;
      revision++;
      dirty = true;
      return true;
    }

    function moved(x, y) {
      if (!current()) return false;
      const changed = reveal([x, y]);
      if (dirty && saveTimer === null) {
        const expected = active, expectedAccount = activeAccount;
        saveTimer = setTimeout(() => {
          saveTimer = null;
          if (state() === expected && account() === expectedAccount && dirty) save();
        }, 1500);
      }
      return changed;
    }

    function snapshot() {
      const cart = current();
      if (cart && dirty) { cart.explored = C.encode(mask); dirty = false; }
      if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null; }
      return cart;
    }

    function visual() {
      const cart = current();
      return { mask, maps: cart ? cart.maps : {}, revision };
    }

    function installedHome() {
      const atlas = account() && account().atlas;
      return atlas && atlas.owned === true && atlas.homeId && (homes() || []).find(h => h.id === atlas.homeId);
    }

    function updateAtlas() {
      const h = installedHome();
      if (!h) { scene.cartographyAtlas(null); return; }
      const [w, height] = houseSize(h);
      scene.cartographyAtlas({ ...h, w, h: height });
    }

    function restore() {
      current();
      session = null;
      updateAtlas();
    }

    function guide() {
      const cart = current();
      if (!cart || !cart.waypoint || !surface() || blocked()) return null;
      const leg = scene.cartographyGuide(cart.waypoint.id);
      if (leg && leg.arrived) {
        const site = destination(cart.waypoint.id);
        cart.waypoint = null;
        save();
        if (site) toast('Reached ' + site.name + '.');
        return null;
      }
      return leg;
    }

    function visible(site, cart, preview = 0) {
      if(site.kind==='service')return !!(state().services&&state().services[site.id])&&(!preview||site.r===preview);
      if (preview) return site.r === preview;
      const s = state();
      return C.ownsMap(cart, site.r) || C.exploredAt(mask, site.x, site.y) ||
        (site.kind === 'poi' && !!(s.poi && s.poi[site.id] || s.known && s.known[site.r])) ||
        (site.kind === 'fish' && !!(s.fishd && s.fishd[site.id] || s.known && s.known[site.r]));
    }

    function recordedLandmarks(publicSites) {
      const s = state(), publicIds = new Set(publicSites.map(p => p.id));
      const saved = scene.sites().filter(p => !publicIds.has(p.id) && (
        p.kind === 'poi' && s.poi && s.poi[p.id] || p.kind === 'lair' && s.lairs && s.lairs[p.id] ||
        p.kind === 'home' && s.known && s.known[p.r]));
      const targets = Object.values(s.er && s.er.a || {}).map(job => {
        const id = job.type === 'deliver' ? job.to : job.type === 'find' && !job.found ? job.at : job.id;
        const site = scene.sites().find(p => p.id === id);
        return site ? { ...site, kind: 'errand' } : null;
      }).filter(Boolean);
      const owned = (homes() || []).map(h => ({ id: 'owned-' + h.id, r: h.r, x: h.x, y: h.y, kind: 'home', name: h.name }));
      return Array.from(new Map(saved.concat(owned, targets).map(p => [p.id, p])).values());
    }

    function raster(bounds, preview, cart) {
      if (rasterRevision !== revision) { rasters.clear(); rasterRevision = revision; }
      const key = `${preview}:${bounds.join(',')}`;
      if (rasters.has(key)) return rasters.get(key);
      const source = scene.cartographyMap(mask, cart.maps, preview, revision);
      if (!source) return '';
      const [x, y, x1, y1] = bounds;
      let image = source;
      if (x || y || x1 !== C.width || y1 !== C.height) {
        const sx = source.width / C.width, sy = source.height / C.height;
        image = document.createElement('canvas');
        image.width = Math.ceil((x1 - x) * sx);
        image.height = Math.ceil((y1 - y) * sy);
        image.getContext('2d').drawImage(source, x * sx, y * sy, (x1 - x) * sx, (y1 - y) * sy, 0, 0, image.width, image.height);
      }
      const url = image.toDataURL();
      rasters.set(key, url);
      return url;
    }

    function chartImage(r, cart, sites, { preview = 0, mode = 'map', ticket = 0, town = false } = {}) {
      const center=r&&Geography.towns[r],reach=r===8?85:42;
      const bounds = town&&center?[Math.max(0,center[0]-reach),Math.max(0,center[1]-reach),Math.min(C.width,center[0]+reach),Math.min(C.height,center[1]+reach)]:r&&scene.cartographyBounds(r)||[0,0,C.width,C.height];
      const [x, y, x1, y1] = bounds, w = x1 - x, h = y1 - y;
      const url = raster(bounds, preview, cart);
      const at = (px, py) => `left:${100 * (px - x) / w}%;top:${100 * (py - y) / h}%`;
      const within = (px, py) => px >= x && px < x1 && py >= y && py < y1;
      const coordinate = site => at(site.x, site.y);
      const marks = sites.filter(p => within(p.x, p.y)).map(p => {
        const label = esc(p.name + (p.kind === 'town' && p.r === 8 ? ' · Capital' : '')), style = coordinate(p);
        const waypoint = cart.waypoint && cart.waypoint.id === p.id ? ' waypoint' : '';
        if(p.kind==='service')return `<button class="cmap-service${town?'':' compact'}${waypoint}" style="${style}" data-a="cmapservice" data-id="${esc(p.id)}" aria-label="${label}" title="${label}">${ServicePlaces.html(p.type)}</button>`;
        if (p.kind === 'town' && !r && mode === 'map') return `<button class="pin cmap-town${waypoint}" style="${style}" data-a="cmapregion" data-r="${p.r}" aria-label="${label}"><b>${p.r}</b><span>${label}</span></button>`;
        if (p.kind === 'town' && !r && mode === 'atlas') return `<button class="pin cmap-town${waypoint}" style="${style}" data-a="cmapregion" data-mode="atlas" data-ticket="${ticket}" data-r="${p.r}" aria-label="${label}"><b>${p.r}</b><span>${label}</span></button>`;
        return `<i class="cmap-dot ${p.kind}${waypoint}" style="${style}" title="${label}" aria-hidden="true"></i>`;
      });
      const pos = surface() && scene.pos();
      const here = pos && within(pos[0], pos[1]) ? `<i class="me" style="${at(pos[0], pos[1])}" title="You are here"></i>` : '';
      const ferries = sites.filter(p => p.kind === 'ferry');
      const routes = !r && !preview ? scene.ferries().filter(leg => leg.path && leg.path.length > 1 &&
        ['from', 'to'].every(side => ferries.some(p => p.id === `ferry:${leg.id}:${side}`))) : [];
      const paths = routes.length ? `<svg class="ferry-routes" aria-hidden="true" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${routes.map(leg => `<polyline data-route="${esc(leg.id)}" points="${leg.path.map(p => p.join(',')).join(' ')}" fill="none" stroke="#b8d6de" stroke-width="2" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>`).join('')}</svg>` : '';
      return `<div class="wmap cmap-frame${r ? ' cmap-region' : ''}" style="aspect-ratio:${w}/${h}">${url ? `<img alt="${r ? esc(name(r)) + ' chart' : 'Chart of Brasswake'}" src="${url}">` : ''}${paths}${marks.join('')}${here}</div>`;
    }

    function waypointsHTML(cart) {
      const site = cart.waypoint && destination(cart.waypoint.id);
      return cart.waypoint ? `<div class="row cmap-current-waypoint"><span>${site ? 'Waypoint · ' + esc(site.name) : 'Waypoint unavailable'}</span><button class="btn sm quiet" data-a="cmapclear">Clear</button></div>` : '';
    }

    function destinationsHTML(sites, cart, mode, ticket = 0) {
      const travelContext = { mode, surface: surface(), blocked: blocked(), region: scene.region() };
      const ticketAttr = ticket ? ` data-ticket="${ticket}"` : '';
      const rows = sites.map(site => {
        const id = esc(site.id);
        const label = `<div><b>${esc(site.name)}</b><small>${esc(labels[site.kind])}</small></div>`;
        if (mode === 'atlas') return `<li class="good">${label}<button class="btn sm" data-a="cmapatlastravel" data-id="${id}"${ticketAttr} aria-label="Travel to ${esc(site.name)}">Travel</button></li>`;
        const set = cart.waypoint && cart.waypoint.id === site.id;
        const waypoint = `<button class="btn sm quiet" data-a="cmapwaypoint" data-id="${id}"${ticketAttr} aria-label="${set ? 'Waypoint set for ' : 'Set waypoint for '}${esc(site.name)}"${set ? ' disabled' : ''}>${set ? 'Waypoint set' : 'Waypoint'}</button>`;
        const travel = C.canTravel(cart, site, travelContext) ? `<button class="btn sm" data-a="cmaptravel" data-id="${id}" aria-label="Travel to ${esc(site.name)}">Travel</button>` : '';
        return `<li class="good">${label}<div class="cmap-dest-actions">${waypoint}${travel}</div></li>`;
      }).join('');
      return rows ? `<ul class="goods cmap-destinations">${rows}</ul>` : '<p class="cap2">Walk farther to find places to mark.</p>';
    }

    function regionButtons(list, cur, extra = '') {
      return `<div class="row cmap-regions">${list.map(r => `<button class="btn sm${r === cur ? ' solid' : ' quiet'}" data-a="cmapregion" data-r="${r}"${extra}${r === cur ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${esc(name(r))}</button>`).join('')}</div>`;
    }

    function ferryList(r, publicSites) {
      const quays = publicSites.filter(p => p.kind === 'ferry' && p.r === r);
      const to = scene.ferries().map(leg => {
        for (const side of ['from', 'to']) {
          if (quays.some(p => p.id === `ferry:${leg.id}:${side}`)) return leg[side === 'from' ? 'to' : 'from'].r;
        }
        return null;
      }).filter(Boolean);
      return to.length ? `<h4>Ferry destinations</h4><ul class="tale plain">${to.map(other => `<li>${esc(name(other))} <small>Free crossing</small></li>`).join('')}</ul>` : '';
    }

    function map() {
      const cart = current(), s = state();
      const r = selected || scene.region() || s.region || 1;
      const all = catalogue(), known = all.filter(p => visible(p, cart));
      const selectable = regions.filter(other => other === r || other === s.region || C.ownsMap(cart, other) || known.some(p => p.r === other));
      const discoveries = recordedLandmarks(all), listing = known.filter(p => p.r === r);
      const projected = worldView ? known.concat(discoveries) : listing.concat(discoveries.filter(p => p.r === r));
      const details = region(r), owned = C.ownsMap(cart, r);
      return `<section class="place"><p class="eyebrow">World map</p><h1>${worldView ? 'Brasswake' : esc(details.name)}</h1></section>
        <div class="row cmap-mode"><button class="btn sm ${!worldView&&!townView ? 'solid' : 'quiet'}" data-a="cmapview" data-mode="region" aria-pressed="${!worldView&&!townView}">Region</button><button class="btn sm ${townView?'solid':'quiet'}" data-a="cmapview" data-mode="town" aria-pressed="${townView}">Town</button><button class="btn sm ${worldView ? 'solid' : 'quiet'}" data-a="cmapview" data-mode="world" aria-pressed="${worldView}">World</button></div>
        ${!worldView && selectable.length > 1 ? regionButtons(selectable, r) : ''}${chartImage(worldView ? 0 : r, cart, projected,{town:townView})}
        ${waypointsHTML(cart)}<div class="card"><p class="eyebrow">${details.circle ? esc(details.circle) + ' Circle · ' : ''}${esc(details.sub)}</p><h3>${esc(details.name)}${r === 8 ? ' · Capital' : ''}</h3><p>${esc(details.blurb)}</p>
        <div class="kv"><span>Teaches</span><span>${esc(details.teaches)}</span></div><p class="cap2">${owned ? 'Your regional map shows the surveyed ground in muted colours. Travel is available within the region while you are there.' : 'Walking charts the terrain around you. The cartographer’s shop has a regional survey.'}</p>
        ${ferryList(r, known)}<h4>Destinations</h4>${destinationsHTML(listing, cart, 'regional')}
        ${discoveries.some(p => p.r === r) ? `<h4>Recorded discoveries</h4><ul class="tale plain">${discoveries.filter(p => p.r === r).map(p => `<li>${esc(p.name)}</li>`).join('')}</ul>` : ''}</div>`;
    }

    function near(e, kind, inside = false) {
      if (!e || e.kind !== kind || !surface() || !scene.ents().includes(e)) return false;
      const [x, y] = scene.pos(), distance = Math.abs(e.x - x) + Math.abs(e.y - y);
      return distance <= (inside ? 2 : 1);
    }

    function startSession(kind, e, h) {
      current();
      session = { kind, e, h, ticket: ++serial, s: state(), a: account() };
      return session;
    }

    function validSession(d, kind) {
      current();
      return sheetOpen() && session && session.kind === kind && String(session.ticket) === String(d && d.ticket) &&
        session.s === state() && session.a === account() && !blocked() ? session : null;
    }

    function openShop(e, currentSession) {
      const cart = current(), s = state(), r = e.r;
      const quote = C.quoteMap(cart, r, s.gold, r);
      const atlasQuote = C.quoteAtlas(cart, s.gold, r, !!(account().atlas && account().atlas.owned));
      const button = (label, action, disabled) => `<button class="btn sm" data-a="${action}" data-ticket="${currentSession.ticket}"${disabled ? ' disabled' : ''}>${label}</button>`;
      const regional = quote.reason === 'owned' ? '<small>Map owned by this character</small>' : button(`Buy map · ${money(quote.cost)}`, 'cmapbuy', !quote.ok);
      const atlasStatus = { owned: 'Your household owns the atlas.', maps: 'Collect all eight regional maps on this character.', gold: 'You need 30,000 gold in your purse.' };
      const atlasRow = r === 8 ? `<li class="good"><div><b>Grand Atlas of Brasswake</b><small>${atlasStatus[atlasQuote.reason] || 'A chart table for one of your homes'}</small></div>${atlasQuote.reason === 'owned' ? '' : button(`Buy atlas · ${money(atlasQuote.cost)}`, 'cmapbuyatlas', !atlasQuote.ok)}</li>` : '';
      sheet(`<p class="eyebrow">${esc(name(r))}</p><h2>Cartographer</h2><p>Consult the wall chart here. Buy a copy to carry the regional survey and travel to public destinations within ${esc(name(r))}.</p><ul class="goods cmap-shop"><li class="good"><div><b>${esc(name(r))} map</b>${quote.reason === 'gold' ? '<small>Pay from your purse</small>' : ''}</div>${regional}</li>${atlasRow}</ul><div class="row end">${button('Consult chart', 'cmapchart', false)}<button class="btn sm quiet" data-a="closesheet">Close</button></div>`);
    }

    function shop(e) {
      if (blocked() || !near(e, 'cartographer') || !C.price(e.r)) return;
      openShop(e, startSession('shop', e));
    }

    function openChart(record) {
      const cart = current(), r = record.e.r, sites = catalogue().filter(p => p.r === r);
      sheet(`<p class="eyebrow">Free consultation</p><h2>${esc(name(r))} wall chart</h2><p>Choose a waypoint to follow on foot or by ferry.</p>${chartImage(r, cart, sites, { preview: r, mode: 'preview' })}<h3>Destinations</h3>${destinationsHTML(sites, cart, 'preview', record.ticket)}<div class="row end"><button class="btn sm quiet" data-a="closesheet">Close</button></div>`);
    }

    function chart(e) {
      if (blocked() || !near(e, 'regionchart', true) || !C.price(e.r)) return;
      openChart(startSession('chart', e));
    }

    function goodAtlas(record) {
      const h = installedHome();
      return h && record.h && h.id === record.h.id && near(record.e, 'homeatlas', true) && scene.cartographyInsideHome(h) && C.allMaps(current());
    }

    function openAtlas(record, r = 0) {
      const cart = current(), sites = catalogue(), listed = sites.filter(p => p.r === (r || scene.region()));
      sheet(`<p class="eyebrow">${esc(record.h.name)}</p><h2>Grand Atlas of Brasswake</h2>${regionButtons(regions, r, ` data-mode="atlas" data-ticket="${record.ticket}"`)}${chartImage(r, cart, r ? listed : sites, { mode: 'atlas', ticket: record.ticket })}<h3>${esc(name(r || scene.region()))} destinations</h3>${destinationsHTML(listed, cart, 'atlas', record.ticket)}<div class="row end"><button class="btn sm quiet" data-a="closesheet">Close</button></div>`);
    }

    function atlas(e) {
      const cart = current(), h = installedHome();
      if (blocked() || !h || !near(e, 'homeatlas', true) || !scene.cartographyInsideHome(h)) return;
      if (!C.allMaps(cart)) { toast('Collect all eight regional maps on this character to use the atlas.'); return; }
      openAtlas(startSession('atlas', e, h));
    }

    function houseHTML(h) {
      current();
      const a = account().atlas;
      if (!a || !a.owned) return '';
      if (a.homeId === h.id) return '<ul class="goods cmap-house"><li class="good"><div><b>Grand Atlas of Brasswake</b><small>Installed inside this house</small></div></li></ul>';
      const e = adapter.entity && adapter.entity();
      const record = startSession('house', e, h);
      return `<ul class="goods cmap-house"><li class="good"><div><b>Grand Atlas of Brasswake</b><small>Chart table</small></div><button class="btn sm" data-a="cmapinstall" data-ticket="${record.ticket}">${a.homeId ? 'Move atlas here' : 'Install atlas'}</button></li></ul>`;
    }

    function moveTo(site) {
      if (!Array.isArray(site.at)) return;
      const at = scene.safePosition(site.at, site.r);
      if (!at || at[0] !== site.at[0] || at[1] !== site.at[1]) { toast('The approach is blocked. Try again shortly.'); return; }
      const s = state();
      session = null;
      close();
      scene.load(at, site.r);
      s.pos = scene.pos();
      s.region = scene.region();
      s.been[s.region] = 1;
      selected = s.region;
      reveal(s.pos);
      if (s.cartography.waypoint && s.cartography.waypoint.id === site.id) s.cartography.waypoint = null;
      if (adapter.afterTravel) adapter.afterTravel();
      save();
      world();
      toast('Arrived at ' + site.name + '.');
    }

    const actions = {
      cmapservice(d){const site=destination(d.id);if(site&&visible(site,current()))toast(site.name+' · '+ServicePlaces.types[site.type].name);},
      cmapview(d) { if (!mapOpen()) return; worldView = d.mode === 'world'; townView=d.mode==='town'; render(); },
      cmapregion(d) {
        const r = +d.r;
        if (!C.price(r)) return;
        if (d.mode === 'atlas') {
          const record = validSession(d, 'atlas');
          if (record && goodAtlas(record)) openAtlas(record, r);
          return;
        }
        const cart = current();
        if (!mapOpen() || !(r === state().region || C.ownsMap(cart, r) || catalogue().some(p => p.r === r && visible(p, cart)))) return;
        selected = r;
        worldView = false;
        render();
      },
      cmapwaypoint(d) {
        const cart = current(), site = destination(d.id);
        if (!site || blocked()) return;
        if (d.ticket) {
          const record = validSession(d, 'chart');
          if (!record || site.r !== record.e.r || !near(record.e, record.e.kind, record.e.kind === 'regionchart')) return;
        } else if (!mapOpen() || !visible(site, cart)) return;
        cart.waypoint = { id: site.id };
        save();
        toast('Waypoint set for ' + site.name + '.');
        if (d.ticket) { session = null; close(); world(); }
        else render();
      },
      cmapclear() {
        const cart = current();
        if (!mapOpen() || !cart || !cart.waypoint) return;
        cart.waypoint = null;
        save();
        render();
      },
      cmapchart(d) {
        const record = validSession(d, 'shop');
        if (record && near(record.e, 'cartographer')) openChart(startSession('chart', record.e));
      },
      cmapbuy(d) {
        const record = validSession(d, 'shop');
        if (!record || !near(record.e, 'cartographer')) return;
        const cart = current(), s = state(), r = record.e.r, quote = C.quoteMap(cart, r, s.gold, record.e.r);
        if (!quote.ok) return;
        s.gold -= quote.cost;
        cart.maps[r] = true;
        revision++;
        save();
        toast('Bought the ' + name(r) + ' map.');
        openShop(record.e, record);
      },
      cmapbuyatlas(d) {
        const record = validSession(d, 'shop');
        if (!record || !near(record.e, 'cartographer')) return;
        const s = state(), a = account(), quote = C.quoteAtlas(current(), s.gold, record.e.r, !!(a.atlas && a.atlas.owned));
        if (!quote.ok) return;
        s.gold -= quote.cost;
        a.atlas = { owned: true, homeId: null };
        save();
        toast('Bought the Grand Atlas. Install it from a house panel.');
        openShop(record.e, record);
      },
      cmapinstall(d) {
        const record = validSession(d, 'house'), a = account();
        if (!record || !a.atlas || !a.atlas.owned) return;
        const h = (homes() || []).find(home => home === record.h);
        const e = record.e;
        if (!h || h.id === a.atlas.homeId || !e || e.hid !== h.id || !(near(e, 'myhome') || scene.cartographyInsideHome(h))) return;
        a.atlas.homeId = h.id;
        updateAtlas();
        session = null;
        save();
        close();
        toast('Grand Atlas installed in ' + h.name + '.');
      },
      cmaptravel(d) {
        if (!mapOpen()) return;
        const cart = current(), site = destination(d.id);
        if (C.canTravel(cart, site, { mode: 'regional', surface: surface(), blocked: blocked(), region: scene.region() })) moveTo(site);
      },
      cmapatlastravel(d) {
        const record = validSession(d, 'atlas');
        if (!record || !goodAtlas(record)) return;
        const site = destination(d.id), h = installedHome();
        if (C.canTravel(current(), site, { mode: 'atlas', surface: surface(), blocked: blocked(), houseId: record.h.id, installedHouseId: h.id })) moveTo(site);
      }
    };
    return { map, shop, chart, atlas, houseHTML, snapshot, visual, moved, restore, guide, actions };
  }

  return { create };
})();
