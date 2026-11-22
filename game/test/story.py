import sys
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
def solve(pg, sql=None):
    pg.fill('#sql', sql or pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(15)
    return pg.inner_text('#e-out .verdict h3')
def ent(pg, kind, i=None):
    return pg.evaluate("([k,i]) => { const e = Scene.debug().map.ents.find(e => e.kind === k && (i == null || e.i === i)); if (!e) return false; e.unseen = true; __bw.HOST.interact(e); return true; }", [kind, i])
obj = lambda pg: (pg.wait_for_timeout(120), pg.inner_text('#obj'))[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript')); pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('file:///home/claude/game/dist/index.html'); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=15000); pg.wait_for_timeout(500)
    pg.screenshot(path='dist/t0.png'); pg.click('[data-a=begin]'); print('1', obj(pg))
    pg.mouse.click(195, 250); pg.wait_for_timeout(1200); print('2', obj(pg))
    ent(pg, 'npc', 0); pg.wait_for_timeout(100); pg.screenshot(path='dist/t1.png'); print('  dlg:', pg.inner_text('#sheet-body').replace('\n', ' | ')[:200])
    pg.click('.opt >> nth=0'); pg.wait_for_timeout(60); pg.screenshot(path='dist/t2.png'); print('  offer:', pg.inner_text('#sheet-body').replace('\n', ' | ')[:230])
    pg.click('.opt:has-text("Accept")'); pg.wait_for_timeout(100); pg.screenshot(path='dist/t3.png'); print('  enc words:', len(pg.inner_text('#e-task').split()))
    print(' ', solve(pg, 'select * from vendors')); pg.click('#e-out [data-a=contract]'); solve(pg); pg.click('#e-out [data-a=contract]'); solve(pg); print('  after c103:', pg.inner_text('#e-out .story')); pg.click('#e-out [data-a=leave]')
    print('3', obj(pg))
    ent(pg, 'npc', 0); pg.click('.opt:has-text("The missing coin")'); print('  ask:', pg.inner_text('.say')); pg.click('.opt:has-text("Back")'); pg.click('.opt:has-text("This place")'); print('  place:', pg.inner_text('.say')); pg.click('.opt:has-text("Back")'); pg.click('.opt:has-text("Past jobs")'); print('  past:', pg.inner_text('.opts').replace('\n', ' | ')[:80]); pg.click('.sheet-x')
    ent(pg, 'mon'); pg.wait_for_timeout(60); pg.screenshot(path='dist/t4.png'); pg.click('.opt:has-text("Fight")'); solve(pg); pg.click('#e-out [data-a=leave]'); print('4', obj(pg))
    ent(pg, 'registrar'); pg.click('.opt >> nth=0'); pg.click('button:has-text("Become a Cutpurse")'); print('5', obj(pg))
    ent(pg, 'tavern'); print('  tavern:', pg.inner_text('.opts').replace('\n', ' | ')); pg.click('.opt:has-text("Gossip")'); print('  gossip:', pg.inner_text('.say')); pg.click('.sheet-x')
    ent(pg, 'stallkeep'); pg.click('.opt:has-text("Buy")'); print('  shop:', pg.inner_text('#sheet-body').replace('\n', ' | ')[:90]); pg.click('.sheet-x')
    ent(pg, 'rival'); pg.wait_for_timeout(50); pg.screenshot(path='dist/t5.png'); print('  rival:', pg.inner_text('.opts').replace('\n', ' | ')); pg.click('.opt:has-text("Steal")'); print('  ', solve(pg)); pg.click('#e-out [data-a=leave]')
    ent(pg, 'board'); print('  board:', pg.inner_text('#sheet-body').replace('\n', ' | ')[:160]); pg.click('.sheet-x')
    ent(pg, 'stairs'); pg.click('.opt:has-text("Descend")'); pg.wait_for_timeout(300)
    for i in range(3): ent(pg, 'guard', i); solve(pg); pg.click('#e-out [data-a=leave]')
    ent(pg, 'chest'); print('  dungeon:', solve(pg)); pg.click('#e-out [data-a=leave]'); ent(pg, 'exit'); pg.wait_for_timeout(100)
    ent(pg, 'boss'); pg.wait_for_timeout(50); print('  boss:', pg.inner_text('.opts').replace('\n', ' | ')); pg.click('.opt >> nth=0')
    for i in range(4):
        v = solve(pg)
        if pg.locator('[data-a=nextstep]').count(): pg.click('[data-a=nextstep]')
        else: break
    pg.click('#e-out [data-a=leave]'); print('6', obj(pg))
    # the rest of the story, straight through
    for r in range(2, 9):
        pg.evaluate(f"__bw.HOST.travel({r}, 'S')"); pg.wait_for_timeout(150); o0 = obj(pg)
        for cid in pg.evaluate(f"Content.CONTRACTS.filter(c=>c.r==={r}).map(c=>c.id)"):
            pg.evaluate(f"__bw.START.contract({{id:'{cid}'}})"); v = solve(pg)
            if v != 'Contract complete': print('!!', cid, v, pg.inner_text('#e-out')[:150])
            pg.click('#e-out [data-a=leave]')
        o1 = obj(pg); ent(pg, 'boss'); pg.click('.opt >> nth=0')
        for i in range(5):
            v = solve(pg)
            if pg.locator('[data-a=nextstep]').count(): pg.click('[data-a=nextstep]')
            else: break
        if r == 8: pg.wait_for_timeout(800); pg.click('#sheet-body [data-a=closesheet]')
        pg.click('#e-out [data-a=leave]'); print(f'R{r}: [{o0}] -> [{o1}] -> {v} -> [{obj(pg)}]')
    pg.click('[data-a=journal]'); pg.wait_for_timeout(60); pg.screenshot(path='dist/t6.png'); print('JOURNAL:', pg.inner_text('#sheet-body').replace('\n', ' | ')[:900]); pg.click('.sheet-x')
    pg.evaluate("__bw.HOST.travel(7,'plaza')"); pg.wait_for_timeout(100); ent(pg, 'npc', 2); pg.click('.opt:has-text("The missing coin")'); print('Hale:', pg.inner_text('.dh b'), pg.inner_text('.say'))
    print('LOGS:', [l for l in logs if 'ERR_FAILED' not in l][:6])
    b.close()
