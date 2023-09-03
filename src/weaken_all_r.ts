import { root_servers } from 'helpers/servers.js'
import { NS } from '@ns'

/** @description use all servers for weaken repeats*/
export async function main(ns: NS) {
  ns.disableLog('ALL')
  while (true) {
    let servers = root_servers(ns)
    for (let s of servers) {
      let threads = Math.floor((ns.getServerMaxRam(s) - ns.getServerUsedRam(s))/2)
      if (threads > 0) {
        ns.exec(
          'simple/weaken.js', 
          s,
          Math.floor((ns.getServerMaxRam(s) - ns.getServerUsedRam(s))/2),
          'foodnstuff'
        )
      }
    }
    await ns.sleep(100 + ns.getWeakenTime('foodnstuff'))
  }
}