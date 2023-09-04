import { get_server_available_ram, rooted_servers } from 'helpers/servers.js'
import { NS } from '@ns'

/** @description use all servers for weaken repeats*/
export async function main(ns: NS) {
  ns.disableLog('ALL')
  while (true) {
    let servers = rooted_servers(ns)
    for (let s of servers) {
      let threads = Math.floor((get_server_available_ram(ns, s))/2)
      if (threads > 0) {
        ns.exec(
          'simple/weaken.js', 
          s,
          Math.floor((get_server_available_ram(ns, s))/2),
          'foodnstuff'
        )
      }
    }
    await ns.sleep(100 + ns.getWeakenTime('foodnstuff'))
  }
}