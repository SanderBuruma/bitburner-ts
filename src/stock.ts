import { NS } from '@ns'
import { log } from 'helpers/utils.js'

let symbols: string[]
let tick_duration = 4e3
export async function main(ns: NS) {
  let buy_treshold: number = parseFloat(ns.args[0].toString()) * 1e9
  if (!ns.stock.hasWSEAccount()) {
    throw new Error('Don\'t have a WSE account! We need it to be able to trade!')

  }

  ns.disableLog('ALL')
  symbols = ns.stock.getSymbols()

  log(ns, `Starting ${ns.getRunningScript()?.filename}`)
  ns.atExit(()=>{
    log(ns, `Exiting ${ns.getRunningScript()?.filename}`)
    let owned_stocks = symbols.map(s => {
      return {
        sym: s,
        position: ns.stock.getPosition(s)
      }
    }).filter(s => s.position[0])

    for (let o of owned_stocks) {
      if (ns.stock.sellStock(o.sym, o.position[0])) {
        let x = ns.formatNumber(o.position[0] * ns.stock.getBidPrice(o.sym))
        let profit = ns.formatNumber(o.position[0] * (ns.stock.getBidPrice(o.sym) - o.position[1]))
        log(ns, `Sold ${o.sym} for \$${x} and profit ${profit}`)
      }
    }
  })
  
  while (true) {
    // standard wait
    await ns.sleep(tick_duration)

    // check owned stocks and sell those that have a bad forecast
    let owned_stocks = symbols.map(s => {
      return {
        sym: s,
        position: ns.stock.getPosition(s)
      }
    }).filter(s => s.position[0])
    for (let s of owned_stocks) {
      if (ns.stock.getForecast(s.sym) < .53) {
        if (!ns.stock.sellStock(s.sym, s.position[0])) {
          log(ns, `Couldn't sell ${s.sym} - ${ns.formatNumber(s.position[0])}`)
          continue
        }
        let x = ns.formatNumber(s.position[0] * ns.stock.getBidPrice(s.sym))
        let profit = ns.formatNumber(s.position[0] * (ns.stock.getBidPrice(s.sym) - s.position[1]))
        log(ns, `Sold ${s.sym} for \$${x} and profit ${profit}`)
      }
    }

    // check if we have enough money for more stocks
    if (ns.getPlayer().money < buy_treshold * 2) continue

    // sort & filter corporations
    let to_buy_corps = symbols.map(s => {
      return {
        sym: s,
        /** The % chance that good things will happen to this stock */
        forecast: ns.stock.getForecast(s),
        /** Price per share */
        price: ns.formatNumber(ns.stock.getAskPrice(s)),
        /** Total price of unowned shares */
        freeCap: ns.stock.getAskPrice(s) * (ns.stock.getMaxShares(s) - ns.stock.getPosition(s)[0]),
        volatility: ns.stock.getVolatility(s)
      }
    })
    .filter(s => {
      return s.forecast > .57 && 
        s.freeCap > buy_treshold && 
        s.volatility < .02
    })
    .sort((a, b) => b.forecast - a.forecast)
    if (to_buy_corps.length < 1 || ns.getPlayer().money > buy_treshold) continue

    // buy corporation stocks
    let sharesToBuy
    ns.tprint({to_buy_corps})
    let corp = to_buy_corps[0]
    if (!corp || !corp.freeCap) continue
    if (corp.freeCap > ns.getPlayer().money - buy_treshold) {
      sharesToBuy = Math.floor((ns.getPlayer().money - buy_treshold) / ns.stock.getAskPrice(corp.sym))
    } else {
      sharesToBuy = Math.floor((corp.freeCap) / ns.stock.getAskPrice(corp.sym))
    }
    let price = ns.formatNumber(sharesToBuy * ns.stock.getAskPrice(corp.sym))
    if (ns.stock.getAskPrice(corp.sym) < 1) continue

    let result = ns.stock.buyStock(corp.sym, sharesToBuy)

    if (result > 0) {
      log(ns, `Bought ${corp.sym} shares at ${ns.formatNumber(ns.stock.getAskPrice(corp.sym) * sharesToBuy)}`)
    }
  }
}
