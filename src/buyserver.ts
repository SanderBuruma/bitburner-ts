import { NS } from '@ns'
import { Colors } from 'helpers/colors'

export async function main(ns: NS) {
  let report = ns.args[0]
  let money = ns.getServerMoneyAvailable('home')
  for (let i = 20; i > 0; i--)
  {
    if ( ns.getPurchasedServerCost(2**i) < money) {
      if (report) {
        ns.tprintf('Server Cost: ' + Colors.Highlight(ns.formatNumber(ns.getPurchasedServerCost(2**i))))
        ns.tprintf('Server RAM : ' + Colors.Highlight(ns.formatRam(2**i)))
        return
      }
      let servers = ns.getPurchasedServers()
      if (servers.length == 25) {
        servers = servers.filter(s=>ns.getServerMaxRam(s) < 2**i)
        if (servers.length > 0) {
          ns.upgradePurchasedServer(servers[0], 2**i)
          ns.tprintf('Upgraded Server: "' + Colors.Highlight(servers[0]) + '" with RAM: ' + Colors.Good(ns.formatRam(2**i)))
          break
        }
      } else {
        let name = 'server-'+(servers.length+1)
        ns.tprintf(Colors.Good(name) + ' bought for ' + ns.formatNumber(ns.getPurchasedServerCost(2**i))+ ' !')
        ns.purchaseServer(name, 2**i)
      }
      break
    }

  }
}