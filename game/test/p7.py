import subprocess, time, json
from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765', '--directory', '/home/claude/game/dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def shot(pg, n): pg.screenshot(path=f'/home/claude/game/dist/p7_{n}.png')
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []; bad = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.on('response', lambda r: bad.append(r.url) if r.status >= 400 else None)
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript')); pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=20000); pg.wait_for_timeout(900); shot(pg, '0_title')
    pg.click('[data-a=newslot]'); pg.wait_for_timeout(300); pg.click('[data-a=pick][data-look="7"]'); pg.fill('#cr-name', 'Casey'); pg.wait_for_timeout(200); shot(pg, '1_create')
    pg.click('[data-a=begin]'); pg.wait_for_timeout(700); shot(pg, '2_cold')
    pg.click('[data-a=ashore]'); pg.wait_for_timeout(1500); shot(pg, '3_ashore')
    S = lambda: pg.evaluate("JSON.parse(JSON.stringify(__bw.S))")
    print('made', S()['name'], S()['path'], S()['look'], S()['sk'], [i['name'] for i in S()['inv']], 'pos', pg.evaluate("Scene.pos()"))
    for i in range(8):
        if not pg.evaluate('!!__bw.SB'): break
        pg.click('#say'); pg.wait_for_timeout(500)
    print('speech closed', pg.evaluate("!__bw.SB"))
    pg.evaluate("window.__bwFast = true")
    pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'npc' && e.i === 0))"); pg.click('#say .opt[data-a=offer]'); pg.click('#say .opt[data-a=contract]'); pg.wait_for_timeout(200)
    pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(100); pg.click('#e-out [data-a=leave]'); pg.wait_for_timeout(200)
    print('tut after lesson', S()['tut'], '| odalys says:', pg.inner_text('#say')[:70].replace('\n', ' '))
    pg.evaluate("__bw.ACT.closesheet()")
    pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'mon' && e.inst.tpl !== 'b101' && !e.inst.elite))"); pg.click("#say .opt[data-m=fight]"); pg.wait_for_timeout(300); shot(pg, '4_battle')
    for i in range(8):
        if pg.evaluate("__bw.E.over"): break
        if pg.evaluate("__bw.E.wait"): pg.click('[data-a=nextround]')
        pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(50)
    pg.click('#e-after [data-a=leave]'); pg.wait_for_timeout(200); print('tut after kill', S()['tut'], 'kills', S()['stats']['kills']); pg.evaluate("__bw.ACT.closesheet()")
    # hide then steal, seen
    pg.evaluate("(() => { __bw.S.sk.hiding = 60; const e = Scene.debug().map.ents.find(e => e.kind === 'mon'); e.unseen = false; __bw.HOST.interact(e); })()"); print('steal option:', pg.inner_text('#say .opts')[:120].replace('\n', ' | '))
    pg.click("#say .opt[data-m=sneak]"); pg.wait_for_timeout(150); print('sneak -> in encounter:', pg.evaluate("!!__bw.E && __bw.E.act"), 'hiding', S()['sk'].get('hiding'))
    if pg.evaluate("!!__bw.E"): pg.evaluate("__bw.ACT.leave()")
    # crafting by query
    pg.evaluate("__bw.S.mats[1] = 40; __bw.S.mats.sigil = 5; __bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'bench'))"); pg.wait_for_timeout(200); shot(pg, '5_bench')
    res = []
    for rid in ['uncommon', 'tonic', 'rare']:
        pg.evaluate("__bw.HOST.interact(Scene.debug().map.ents.find(e => e.kind === 'bench'))"); pg.click(f'[data-a=craft][data-id={rid}]'); pg.wait_for_timeout(150)
        if rid == 'uncommon': shot(pg, '6_craft')
        pg.fill('#sql', pg.evaluate("__bw.E.task.sql")); pg.click('#e-run'); pg.wait_for_timeout(100); res.append(pg.inner_text('#e-after')[:60].replace('\n', ' | ')); pg.click('#e-after [data-a=leave]'); pg.wait_for_timeout(80)
    print('craft:', res, '| mats left', S()['mats'], 'smith', S()['sk'].get('smith'), 'alchemy', S()['sk'].get('alchemy'))
    pg.evaluate("for (const r of ['rare','epic','legendary','uncommon','common']) for (const s of ['weapon','armor','shield','ring','charm']) __bw.S.inv.length < 30 && __bw.ACT && 0")
    pg.click('#nav [data-t=bag]'); pg.wait_for_timeout(300); shot(pg, '7_bag')
    pg.click('#view .cell[data-a=item]'); pg.wait_for_timeout(200); shot(pg, '8_item'); pg.evaluate("__bw.ACT.closesheet()")
    pg.click('#nav [data-t=hero]'); pg.wait_for_timeout(300); shot(pg, '9_hero')
    pg.click('#nav [data-t=map]'); pg.wait_for_timeout(300); shot(pg, '10_map')
    pg.click('#nav [data-t=world]'); pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=20000); pg.wait_for_timeout(700); shot(pg, '11_title2')
    pg.click('[data-a=continue]'); pg.wait_for_timeout(900); shot(pg, '12_world'); print('continued as', S()['name'], 'gold', S()['gold'], 'inv', len(S()['inv']))
    print('failed requests', bad[:5]); print('LOGS', logs[:6]); b.close()
finally: srv.terminate()
