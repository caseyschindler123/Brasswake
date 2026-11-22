from playwright.sync_api import sync_playwright
ASM = open('/home/claude/game/node_modules/sql.js/dist/sql-asm.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); pg = b.new_page(viewport={'width': 390, 'height': 760}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(body=ASM, content_type='application/javascript')); pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.add_init_script("""window.__sets=[]; const remote={json: JSON.stringify({xp: 5000, gold: 77, rev: 9999, region: 1, intro: 1}), rev: 9999};
      window.claude={use: async n => n==='db' ? {doc: path => ({path, get: async () => ({exists: true, data: () => remote}), set: async d => { window.__sets.push([path, d.rev, d.json.length]); }})} : n==='user' ? {id: async () => 'u_42'} : null};""")
    pg.goto('file:///home/claude/game/dist/index.html'); pg.wait_for_function("typeof Scene !== 'undefined' && Scene.debug().map", timeout=15000); pg.wait_for_timeout(800)
    print('adopted remote save:', pg.inner_text('#hud').replace('\n', ' '))
    pg.evaluate("(() => { const e = Scene.debug().map.ents.find(e => e.kind === 'node'); __bw.HOST.interact(e); })()"); pg.wait_for_timeout(3300)
    print('account writes:', pg.evaluate('JSON.stringify(window.__sets)'), errs)
    pg.click('#nav [data-t=hero]'); print('save note:', pg.inner_text('#view').split('Save')[-1][:80].replace('\n', ' '))
    pg.click('#nav [data-t=map]'); pg.wait_for_timeout(100); pg.screenshot(path='dist/y_map.png')
    b.close()
