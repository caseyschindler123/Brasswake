import sys
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
def solve(pg, sql=None):
    pg.fill('#sql', sql or pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(15)
    return pg.inner_text('#e-out .verdict h3')
def ent(pg, kind, i=None):
    return pg.evaluate("([k,i]) => { const e = Scene.debug().map.ents.find(e => e.kind === k && (i == null || e.i === i)); if (!e) return false; e.unseen = true; __bw.HOST.interact(e); return true; }", [kind, i])
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript')); pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('file:///home/claude/game/dist/index.html'); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=15000); pg.wait_for_timeout(500)
    pg.click('[data-a=begin]')
    # real tap-to-walk onto the first NPC
    xy = pg.evaluate("(() => { const d = Scene.debug(), e = d.map.ents.find(e => e.kind === 'npc' && e.i === 0), r = document.querySelector('#stage').getBoundingClientRect(); const camx = Math.max(0, Math.min(d.map.w*16 - r.width/2, d.P.fx*16 + 8 - r.width/4)), camy = Math.max(0, Math.min(d.map.h*16 - r.height/2, d.P.fy*16 + 8 - r.height/4)); return [r.left + (e.fx*16 + 8 - camx)*2, r.top + (e.fy*16 + 4 - camy)*2, e.x, e.y, d.P.x, d.P.y]; })()")
    print('npc screen pos', xy)
    for attempt in range(6):
        if pg.evaluate("!document.querySelector('#sheet').hidden"): break
        xy = pg.evaluate("(() => { const d = Scene.debug(), e = d.map.ents.find(e => e.kind === 'npc' && e.i === 0), r = document.querySelector('#stage').getBoundingClientRect(); const camx = Math.max(0, Math.min(d.map.w*16 - r.width/2, d.P.fx*16 + 8 - r.width/4)), camy = Math.max(0, Math.min(d.map.h*16 - r.height/2, d.P.fy*16 + 8 - r.height/4)); return [r.left + (e.fx*16 + 8 - camx)*2, r.top + (e.fy*16 + 4 - camy)*2]; })()")
        if 0 < xy[1] < 700: pg.mouse.click(xy[0], xy[1])
        else: pg.mouse.click(195, 140)   # walk north toward the guildhall
        pg.wait_for_timeout(1500)
    print('walked to NPC, sheet:', pg.inner_text('#sheet-body')[:70].replace('\n', ' | ')); pg.screenshot(path='dist/x1_npc.png')
    pg.click('#sheet [data-a=contract] >> nth=0'); pg.wait_for_timeout(100); pg.screenshot(path='dist/x2_enc.png')
    print(solve(pg)); pg.click('#e-out [data-a=leave]')
    for r in range(1, 9):
        ids = pg.evaluate(f"Content.CONTRACTS.filter(c=>c.r==={r}).map(c=>c.id)")
        for i in range(3):
            ent(pg, 'npc', i)
            while pg.locator('#sheet [data-a=contract]:not([disabled])').count():
                todo = pg.evaluate("[...document.querySelectorAll('#sheet [data-a=contract]:not([disabled])')].filter(b => !b.innerText.includes('done')).map(b => b.dataset.id)")
                if not todo: break
                pg.click(f'#sheet [data-a=contract][data-id={todo[0]}]'); v = solve(pg)
                if v != 'Contract complete': print('!!', todo[0], v)
                while pg.locator('#e-out [data-a=contract]').count():
                    pg.click('#e-out [data-a=contract]'); v = solve(pg)
                    if v != 'Contract complete': print('!!', v)
                pg.click('#e-out [data-a=leave]'); ent(pg, 'npc', i)
            pg.click('.sheet-x')
        done = pg.evaluate(f"Content.CONTRACTS.filter(c=>c.r==={r} && __bw.S.done[c.id]).length"); 
        if r == 1: 
            ent(pg, 'registrar'); pg.click('button:has-text("Become a Cutpurse")')
        ent(pg, 'tavern'); pg.click('#sheet [data-k=rumor]'); v1 = solve(pg); pg.click('#e-out [data-a=leave]')
        ent(pg, 'board'); v2 = 'none left'
        if pg.locator('#sheet [data-k=round]:not([disabled])').count(): pg.click('#sheet [data-k=round]:not([disabled]) >> nth=0'); v2 = solve(pg); pg.click('#e-out [data-a=leave]')
        else: pg.click('.sheet-x')
        ent(pg, 'mon'); pg.click('#sheet [data-m=fight]'); v3 = solve(pg); pg.click('#e-out [data-a=leave]')
        ent(pg, 'mon'); pg.click('#sheet [data-m=steal]'); v4 = solve(pg); pg.click('#e-out [data-a=leave]')
        ent(pg, 'node'); ent(pg, 'rival'); pg.click('#sheet [data-k=rival][data-m=steal]'); v5 = solve(pg); pg.click('#e-out [data-a=leave]')
        ent(pg, 'stairs'); pg.click('#sheet [data-k=dungeon]'); pg.wait_for_timeout(700)
        if r in (1, 6): pg.screenshot(path=f'dist/x3_dun{r}.png')
        for i in range(3):
            ent(pg, 'guard', i); solve(pg); pg.click('#e-out [data-a=leave]')
        ent(pg, 'chest'); v6 = solve(pg); pg.click('#e-out [data-a=leave]'); ent(pg, 'exit'); pg.wait_for_timeout(100)
        ent(pg, 'bench'); 
        if pg.locator('#sheet [data-a=craft]:not([disabled])').count(): pg.click('#sheet [data-a=craft]:not([disabled]) >> nth=-1'); 
        pg.click('.sheet-x')
        ent(pg, 'stallkeep'); pg.click('.sheet-x')
        ent(pg, 'boss'); pg.click('#sheet [data-k=boss]')
        for i in range(4):
            v7 = solve(pg)
            if pg.locator('[data-a=nextstep]').count(): pg.click('[data-a=nextstep]')
            else: break
        if r == 8: pg.wait_for_timeout(800); print('ENDING:', pg.inner_text('#sheet-body')[:90].replace('\n', ' | ')); pg.click('#sheet-body [data-a=closesheet]')
        pg.click('#e-out [data-a=leave]')
        print(f'R{r}: contracts {done}/{len(ids)} | rumor {v1} | round {v2} | fight {v3} | steal {v4} | rival {v5} | dungeon {v6} | gate {v7} | gateOpen', pg.evaluate("!!(Scene.debug().map.gate && Scene.debug().map.gate.open)"))
        if r < 8:
            pg.evaluate(f"__bw.HOST.travel({r+1}, 'S')"); pg.wait_for_timeout(200)
    # dungeon defeat path
    ent(pg, 'stairs'); pg.click('#sheet [data-k=dungeon]'); pg.wait_for_timeout(300); ent(pg, 'guard', 0)
    for i in range(6):
        if pg.locator('#e-run:not([disabled])').count() == 0: break
        v = solve(pg, 'select 3')
    print('dungeon defeat:', v, '| hearts', pg.evaluate("__bw.DG && __bw.DG.hearts")); pg.click('#e-out [data-a=leave]'); pg.wait_for_timeout(200); print('back outside:', pg.evaluate("!Scene.inDungeon() && __bw.DG === null"))
    ent(pg, 'mon'); print('journal test'); pg.click('.sheet-x'); pg.click('[data-a=journal]'); print(pg.inner_text('#sheet-body')[:120].replace('\n', ' | ')); pg.click('.sheet-x')
    print(pg.evaluate("JSON.stringify({hud: document.querySelector('#hud').innerText, mats:__bw.S.mats, inv:__bw.S.inv.length, codex:Object.keys(__bw.S.codex).length, skills:Object.fromEntries(Object.entries(__bw.S.skills).map(([k,v])=>[k,v.v])), stats:__bw.S.stats, bytes: JSON.stringify(__bw.S).length})"))
    for t in ['map', 'ledger', 'hero', 'bag', 'world']:
        pg.click(f'#nav [data-t={t}]'); pg.wait_for_timeout(80)
    pg.reload(); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=15000); pg.wait_for_timeout(600); print('reload region', pg.evaluate("Scene.region()"), pg.inner_text('#hud').replace('\n', ' '))
    print('LOGS:', [l for l in logs if 'ERR_FAILED' not in l][:8])
    b.close()
