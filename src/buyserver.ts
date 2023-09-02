import { NS } from '@ns'
export async function main(ns: NS) {
  let report = ns.args[0]
  let money = ns.getServerMoneyAvailable('home')
  for (let i = 20; i > 0; i--)
  {
    if ( ns.getPurchasedServerCost(2**i) < money) {
      if (report) {
        ns.tprint('server cost:\t' + ns.formatNumber(ns.getPurchasedServerCost(2**i)))
        ns.tprint('server RAM:\t' + ns.formatRam(2**i))
        return
      }
      let servers = ns.getPurchasedServers()
      if (servers.length == 25) {
        servers = servers.filter(s=>ns.getServerMaxRam(s) < 2**i)
        if (servers.length > 0) {
          ns.upgradePurchasedServer(servers[0], 2**i)
          ns.tprint('upgraded server: "' + servers[0] + '" with RAM: ' + 2**i)
          break
        }
      }
      else {
        let name = 'server-'+(servers.length+1)
        ns.purchaseServer(name, 2**i)
        let scripts = ns.ls('home').filter(s=>s.slice(-3) == ".js")
        scripts.forEach(s=>ns.scp(s, name, 'home'))

      }
      break
    }

  }

  ns.getPurchasedServers().forEach(s=>{
    ns.tprint(`${s}\t: ${ns.formatRam(ns.getServerMaxRam(s))}`)
  })
}