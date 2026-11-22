import sys; sys.path.insert(0, '/home/claude/game/test')
from ui import *
from playwright.sync_api import sync_playwright
def solve(pg):
    pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(15)
    return pg.inner_text('#e-out .verdict h3')
with sync_playwright() as p:
    b, pg, logs = new(p)
    pg.wait_for_function("document.querySelector('#view').innerText.includes('Contracts')")
    pg.wait_for_timeout(600)
    for r in range(1, 9):
        ids = pg.evaluate(f"Content.CONTRACTS.filter(c=>c.r==={r}).map(c=>c.id)")
        for cid in ids:
            pg.click(f'[data-a=contract][data-id={cid}]'); v = solve(pg)
            if v != 'Contract complete': print('!!', cid, v, pg.inner_text('#e-out')[:200])
            if cid in ('c609', 'c709'): pg.evaluate("__bw.S.gold += 500"); 
            pg.click('#e-out [data-a=leave]')
        # hint skeleton sample on one contract per region
        pg.click(f'[data-a=contract][data-id={ids[-1]}]'); pg.evaluate("__bw.S.gold += 200"); pg.click('[data-a=hint]'); pg.click('[data-a=hint]')
        print(f'R{r} skeleton:', pg.inner_text('#e-hints .hintbox:nth-child(2) pre').replace('\n', ' / ')[:230]); pg.click('[data-a=leave]')
        pg.click('[data-s=wilds]')
        for i in range(3):
            pg.click('[data-k=monster][data-m=fight] >> nth=0'); v = solve(pg)
            if 'slain' not in v: print('!! monster', v)
            pg.click('#e-out [data-a=leave]')
        pg.click('[data-k=rival][data-m=duel]'); v = solve(pg); pg.click('#e-out [data-a=leave]')
        pg.click('[data-k=dungeon]')
        for i in range(4):
            v = solve(pg)
            if pg.locator('[data-a=nextstep]').count(): pg.click('[data-a=nextstep]')
        if 'cleared' not in v: print('!! dungeon', v)
        pg.click('#e-out [data-a=leave]')
        pg.click('[data-s=work]'); pg.click('[data-k=boss]')
        for i in range(4):
            v = solve(pg)
            if pg.locator('[data-a=nextstep]').count(): pg.click('[data-a=nextstep]')
            else: break
        print(f'R{r} boss:', v)
        if r == 8:
            pg.wait_for_timeout(800); print('ENDING:', pg.inner_text('#sheet-body')[:120].replace('\n', ' | ')); pg.screenshot(path='/home/claude/game/dist/s9_end.png'); pg.click('#sheet-body [data-a=closesheet]')
        pg.click('#e-out [data-a=leave]')
        if r < 8: pg.click('[data-t=map]'); pg.click(f'g[data-r="{r+1}"]'); pg.click('[data-a=travel]')
    pg.click('[data-t=town]'); 
    for i in range(5):
        pg.click(f'[data-k=round][data-i="{i}"]'); v = solve(pg); pg.click('#e-out [data-a=leave]')
    print('rounds claimed:', pg.evaluate('__bw.S.rounds.claimed'))
    print(pg.evaluate("JSON.stringify({lvl: document.querySelector('#hud').innerText, gold:__bw.S.gold, mats:__bw.S.mats, inv:__bw.S.inv.length, codex:Object.keys(__bw.S.codex).length, skills:Object.fromEntries(Object.entries(__bw.S.skills).map(([k,v])=>[k,v.v])), stats:__bw.S.stats, bytes: JSON.stringify(__bw.S).length})"))
    pg.click('[data-t=hero]'); pg.click('[data-a=export]'); code = pg.input_value('#savebox'); print('save code len', len(code)); pg.click('.sheet-x')
    pg.click('[data-a=reset]'); pg.click('[data-a=doreset]'); print('after reset:', pg.inner_text('#hud').replace('\n', ' '))
    pg.click('[data-t=hero]'); pg.click('[data-a=import]'); pg.fill('#savebox', code); pg.click('[data-a=doimport]'); print('after import:', pg.inner_text('#hud').replace('\n', ' '))
    print('LOGS:', [l for l in logs if 'ERR_FAILED' not in l])
    b.close()
    # cloud mock: remote has a newer save
    b2 = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); pg = b2.new_page(viewport={'width': 390, 'height': 780}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript')); pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.add_init_script("""window.__sets=[]; const remote={json: JSON.stringify({xp: 5000, gold: 77, rev: 9999, region: 1}), rev: 9999};
      window.claude={use: async n => n==='db' ? {doc: path => ({path, get: async () => ({exists: true, data: () => remote}), set: async d => { window.__sets.push([path, d.rev]); }})} : n==='user' ? {id: async () => 'u_42'} : null};""")
    pg.goto('file:///home/claude/game/dist/index.html'); pg.wait_for_timeout(1500)
    print('cloud adopt hud:', pg.inner_text('#hud').replace('\n', ' '))
    pg.click('[data-a=contract] >> nth=0'); pg.fill('#sql', 'select * from vendors'); pg.click('#e-run'); pg.wait_for_timeout(3200)
    print('cloud sets:', pg.evaluate('JSON.stringify(window.__sets)'), errs)
    pg.click('#e-out [data-a=leave]'); pg.click('[data-t=hero]'); print('save note:', pg.inner_text('#view').split('Save')[-1][:70].replace('\n', ' '))
    b2.close()
