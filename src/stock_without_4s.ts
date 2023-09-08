import { NS } from '@ns'
import { Corporation } from 'classes/Corporation'

export async function main(ns: NS) {
    ns.tail()
    ns.disableLog('ALL')

    const tick_duration = 6e3
    let corporations = ns.stock.getSymbols().map(x=>new Corporation(ns, x, 20))
    const init = Date.now()
    let next_tick = init + tick_duration
    let down_tick_count = 0
    let up_tick_count = 0
    ns.atExit(()=>{
        ns.tprintf('Selling all stocks at script exit')
        for (let corp of corporations) {
            if (corp.ownedStocks > 0)
            {
                corp.sell()
            }
        }
    })
    while (true) {
        // Update corps
        for (let corporation of corporations) {
            corporation.update()
        }

        // Log stats
        for (let corporation of corporations.sort((a,b)=>b.upTicks - a.upTicks)) {
            if (corporation.upTicks >= 13) {
                if (corporation.lastTickWasUp) up_tick_count++
                else down_tick_count++
            }
        }

        // Sell stocks with downticks > 11
        let corps_to_sell = corporations
        .filter(x=>x.downTicks > 11)
        .filter(x=>x.ownedStocks > 0)
        for (let corp of corps_to_sell)
        {
            corp.sell()
        }
        
        // Buy stocks with upticks > 14
        let corps_to_buy = corporations
        .filter(x=>x.upTicks > 14)
        .filter(x=>x.ownedStocks < x.totalStocks)
        for (let corp of corps_to_buy)
        {
            if (ns.getPlayer().money > 2e9) {
                corp.buy(Math.floor(Math.max(1e9, ns.getPlayer().money / 8)/corp.askPrice))
            } else {
                break
            }
        }

        // Wait for next tick
        await ns.sleep(next_tick - Date.now())
        next_tick += tick_duration
    }
}