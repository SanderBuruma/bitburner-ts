import { root_servers, servers_with_ram } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {
  let servers = root_servers(ns)
  servers = servers.sort((a,b)=>ns.getServerMinSecurityLevel(a) - ns.getServerMinSecurityLevel(b))

  for (let s of servers) {
    let diff = ns.getServerSecurityLevel(s) - ns.getServerMinSecurityLevel(s)
    let weakensNeeded = Math.ceil(diff / .05)
    if (!diff) {
      continue
    }
    ns.tprint({weakensNeeded, s})

    let servers_w_ram = servers_with_ram(ns)
    for (let s2 of servers_w_ram) {
      let threads = Math.floor((ns.getServerMaxRam(s2) - ns.getServerUsedRam(s2)) / 2)
      if (threads > 0) {
        if (weakensNeeded < threads) {
          ns.exec('weaken.js', s2, weakensNeeded, s)
          weakensNeeded = 0
          break
        } else {
          ns.exec('weaken.js', s2, threads, s)
          weakensNeeded -= threads
        }
      }
    }
    if (weakensNeeded > 0) {
      ns.tprint('not enough ram found to weaken all servers: stopped at ' + s)
      return
    }
  }

}