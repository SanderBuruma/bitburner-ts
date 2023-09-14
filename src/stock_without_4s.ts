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
            if (corp.OwnedStocks > 0)
            {
                corp.Sell()
            }
        }
    })
    while (true) {
        // Update corps
        for (let corporation of corporations) {
            corporation.Update()
        }

        // Log stats
        for (let corporation of corporations.sort((a,b)=>b.UpTicks - a.UpTicks)) {
            if (corporation.UpTicks >= 13) {
                if (corporation.LastTickWasUp) up_tick_count++
                else down_tick_count++
            }
        }

        // Sell stocks with downticks > 11
        let corps_to_sell = corporations
        .filter(x=>x.DownTicks > 11)
        .filter(x=>x.OwnedStocks > 0)
        for (let corp of corps_to_sell)
        {
            corp.Sell()
        }
        
        // Buy stocks with upticks > 14
        let corps_to_buy = corporations
        .filter(x=>x.UpTicks > 14)
        .filter(x=>x.OwnedStocks < x.TotalStocks)
        for (let corp of corps_to_buy)
        {
            if (ns.getPlayer().money > 2e9) {
                corp.Buy(Math.floor(Math.max(1e9, ns.getPlayer().money / 8)/corp.AskPrice))
            } else {
                break
            }
        }

        // Wait for next tick
        await ns.sleep(next_tick - Date.now())
        next_tick += tick_duration
    }
}