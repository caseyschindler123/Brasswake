import sys; sys.path.insert(0, '/home/claude/game/test')
from ui import *
from playwright.sync_api import sync_playwright
def solve(pg, sql=None):
    sql = sql or pg.evaluate("__bw.E.task.sql")
    pg.fill('#sql', sql); pg.click('#e-run'); pg.wait_for_timeout(60)
    return pg.inner_text('#e-out')[:110].replace('\n', ' | ')
with sync_playwright() as p:
    b, pg, logs = new(p)
    pg.wait_for_function("document.querySelector('#view').innerText.includes('Contracts')")
    pg.screenshot(path='/home/claude/game/dist/s1_town.png')
    pg.click('text=Take the first contract'); pg.wait_for_function("!document.querySelector('#e-run').disabled")
    pg.screenshot(path='/home/claude/game/dist/s2_enc.png')
    print('ERR  :', solve(pg, 'selec * from vendors'))
    print('WRONG:', solve(pg, 'select name from vendors'))
    print('WRONG:', solve(pg, 'select * from vendors where rating > 3'))
    # typed with phone "smart" punctuation + chips
    pg.fill('#sql', ''); pg.click('#sql'); pg.keyboard.type('select * from '); pg.click('#k-tab button:has-text("vendors")'); print('chip ->', repr(pg.input_value('#sql')), 'cols:', pg.inner_text('#k-col')[:60].replace('\n',' '))
    pg.click('[data-a=hint]'); print('HINT :', pg.inner_text('#e-hints')[:120].replace('\n', ' | '))
    pg.click('[data-a=target]'); print('TGT  :', pg.inner_text('#sheet-body')[:80].replace('\n', ' | ')); pg.click('.sheet-x')
    pg.click('[data-a=atlas]'); pg.click('summary:has-text("customers")'); print('ATLAS:', pg.inner_text('#sheet-body')[:160].replace('\n', ' | ')); pg.click('.sheet-x')
    print('OK   :', solve(pg))
    pg.screenshot(path='/home/claude/game/dist/s3_win.png', full_page=False)
    # run every contract in region 1 via Next contract
    n = 1
    while pg.locator('#e-out [data-a=contract]').count():
        pg.click('#e-out [data-a=contract]'); r = solve(pg); n += 1
        if 'Contract complete' not in r: print('!!', pg.evaluate('__bw.E.id'), r)
    print('region1 contracts done:', n, pg.evaluate('JSON.stringify(Object.keys(__bw.S.done).length)'))
    pg.click('[data-a=leave]')
    print('TOWN has role card:', 'Choose a path' in pg.inner_text('#view'), '| rounds:', 'Morning rounds' in pg.inner_text('#view'), '| rumor:', 'Heaviest' in pg.inner_text('#view'))
    pg.click('text=Choose a role'); pg.click('button:has-text("Become a Cutpurse")')
    # rumor
    pg.click('[data-k=rumor]'); print('RUMOR:', solve(pg)); pg.click('#e-out [data-a=leave]')
    # rounds
    pg.click('[data-k=round] >> nth=0'); print('ROUND:', solve(pg)); pg.click('#e-out [data-a=leave]')
    # wilds
    pg.click('[data-s=wilds]'); pg.wait_for_timeout(50); pg.screenshot(path='/home/claude/game/dist/s4_wilds.png', full_page=True)
    pg.click('[data-k=monster][data-m=fight] >> nth=0'); print('FIGHT:', solve(pg)); pg.click('#e-out [data-a=leave]')
    pg.click('[data-k=monster][data-m=steal] >> nth=0'); print('STEAL:', solve(pg)); pg.click('#e-out [data-a=leave]')
    pg.click('[data-k=monster][data-m=steal] >> nth=0'); print('STEAL fail:', solve(pg, 'select 1')); pg.click('#e-out [data-a=leave]')
    pg.click('[data-k=rival][data-m=steal]'); print('RIVAL steal:', solve(pg)); pg.click('#e-out [data-a=leave]')
    print('rival away:', 'Left town' in pg.inner_text('#view'))
    # dungeon
    pg.click('[data-k=dungeon]')
    for i in range(4):
        print(' room', i + 1, solve(pg))
        if pg.locator('[data-a=nextstep]').count(): pg.click('[data-a=nextstep]')
    pg.screenshot(path='/home/claude/game/dist/s5_dungeon.png'); pg.click('#e-out [data-a=leave]')
    # dungeon defeat
    pg.click('[data-k=dungeon]')
    for i in range(4):
        if pg.locator('#e-run:not([disabled])').count() == 0: break
        r = solve(pg, 'select 2'); 
    print('DEFEAT:', r)
    pg.click('#e-out [data-a=leave]')
    # workshop
    pg.click('[data-s=market]'); pg.wait_for_timeout(50); print('MARKET:', pg.inner_text('#view')[250:520].replace('\n', ' | '))
    if pg.locator('[data-a=craft]:not([disabled])').count(): pg.click('[data-a=craft]:not([disabled]) >> nth=0'); print('crafted; scrolls', pg.evaluate('__bw.S.scrolls'))
    pg.screenshot(path='/home/claude/game/dist/s6_market.png', full_page=True)
    # boss
    pg.click('[data-s=work]'); pg.click('[data-k=boss]')
    for i in range(3):
        print(' phase', i + 1, solve(pg))
        if pg.locator('[data-a=nextstep]').count(): pg.click('[data-a=nextstep]')
    pg.click('#e-out [data-a=leave]')
    pg.click('[data-t=map]'); pg.wait_for_timeout(50); pg.screenshot(path='/home/claude/game/dist/s7_map.png', full_page=True)
    pg.click('g[data-r="2"]'); pg.click('[data-a=travel]'); print('NOW IN:', pg.inner_text('#view h1'))
    for t in ['hero', 'bag', 'ledger']:
        pg.click(f'[data-t={t}]'); pg.wait_for_timeout(40); pg.screenshot(path=f'/home/claude/game/dist/s8_{t}.png', full_page=True)
    pg.click('[data-a=conq] >> nth=1'); print('CON  :', pg.inner_text('#con-out')[:100].replace('\n', ' | '))
    pg.fill('#con-sql', "update items set unit_price = 1; select count(*) from items where unit_price = 1"); pg.click('[data-a=conrun]'); print('CON w:', pg.inner_text('#con-out')[:60].replace('\n', ' | '))
    pg.click('[data-s=grimoire]'); print('GRIM :', pg.inner_text('#view')[150:260].replace('\n', ' | '))
    st = pg.evaluate("JSON.stringify({xp:__bw.S.xp, gold:__bw.S.gold, mats:__bw.S.mats, inv:__bw.S.inv.length, codex:Object.keys(__bw.S.codex), skills:Object.fromEntries(Object.entries(__bw.S.skills).map(([k,v])=>[k,v.v])), stats:__bw.S.stats})")
    print(st)
    # reload: persistence
    pg.reload(); pg.wait_for_function("document.querySelector('#view').innerText.length > 50"); print('after reload region:', pg.inner_text('#view h1'), '| hud:', pg.inner_text('#hud').replace('\n', ' '))
    ov = pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
    print('page h-overflow:', ov)
    print('LOGS:', logs)
    b.close()
