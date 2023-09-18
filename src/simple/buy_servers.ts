import { NS } from '@ns'
import { rooted_servers, total_max_ram } from '/helpers/servers'
import { Colors } from '/helpers/colors'
import { log } from '/helpers/utils'
export async function main(ns: NS) {
  buy_servers(ns)
}

export function buy_servers(ns: NS, fraction=.1) {
  let total_m_ram = total_max_ram(ns) 
  let cost: number
  let log2ofTotalRAM = Math.min(20,1+Math.max(6,Math.floor(Math.log2(total_m_ram/16))))
  cost = ns.getPurchasedServerCost(2**log2ofTotalRAM)
  
  while (ns.getPlayer().money * fraction > cost)
  {
    total_m_ram = total_max_ram(ns) 
    log2ofTotalRAM = Math.min(20,1+Math.max(6,Math.floor(Math.log2(total_m_ram/16))))
    cost = ns.getPurchasedServerCost(2**log2ofTotalRAM)
    let pServers = rooted_servers(ns).filter(s=>/^server-([1-9]|1[0-9]|2[0-5])+/.test(s.Name))
    if (ns.getPurchasedServers().length === 25 && pServers.findIndex(s=>s.MaxRam < 2**20) === -1) return
    if (ns.getPurchasedServers().length < 25) {
      let name = 'server-' + (pServers.length+1).toString()
      if (ns.purchaseServer(name, 2**log2ofTotalRAM)) 
      { 
        log(ns, 
          'Bought '+Colors.Good(name)
          +' server for ' + Colors.Highlight(ns.formatNumber(cost))
          +' of ' + Colors.Good(ns.formatRam(2**log2ofTotalRAM))
        ) 
      }
      else 
      {
        throw new Error('Failed to purchase new server')
      }
    } else {
      let newRam = 2**log2ofTotalRAM
      pServers = pServers.filter(s=>s.MaxRam < newRam)
      if (ns.upgradePurchasedServer(pServers[0].Name, newRam))
      { 
        log(
          ns, 'Upgraded '+Colors.Good(pServers[0].Name)
          +' for ' + Colors.Highlight(ns.formatNumber(cost)) 
          + ' to ' + Colors.Good(ns.formatRam(newRam))) 
      }
      else 
      {
        throw new Error('Failed to upgrade server')
      }
    }
  }
}