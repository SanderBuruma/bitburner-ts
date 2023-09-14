import { nonrooted_servers, run_script } from 'helpers/servers.js'
import { NS } from '@ns'
import { log } from 'helpers/utils'
import { Colors } from 'helpers/colors'

export async function main(ns: NS) {

  let bruteExists = ns.fileExists('BruteSSH.exe', 'home')
  let ftpExists = ns.fileExists('FTPCrack.exe', 'home')
  let relayExists = ns.fileExists('relaySMTP.exe', 'home')
  let httpExists = ns.fileExists('HTTPWorm.exe', 'home')
  let sqlExists = ns.fileExists('SQLInject.exe', 'home')

  let maxPorts = ports_we_can_hack(ns)
  let allServers = nonrooted_servers(ns).filter(x=>ns.getServerNumPortsRequired(x)<=maxPorts)
  let nuked_something = false
  let count = 0
  allServers.forEach(s=>{
    if (ns.getServerNumPortsRequired(s) <= maxPorts) {
      if (bruteExists) ns.brutessh(s)
      if (relayExists) ns.relaysmtp(s)
      if (sqlExists) ns.sqlinject(s)
      if (httpExists) ns.httpworm(s)
      if (ftpExists) ns.ftpcrack(s)
      ns.nuke(s)
      count++
      nuked_something = true
    }
  })

  if (count > 0) {
    log(ns, 'Nuked ' + Colors.good(count.toString()) + ' servers! They had up to ' + Colors.good(ports_we_can_hack(ns).toString()) + ' ports')
  }
}

/** @return the number of ports we can hack */
export function ports_we_can_hack(ns: NS) {
  return ['BruteSSH.exe', 'FTPCrack.exe', 'relaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'].reduce((a,f)=>{
    return ns.fileExists(f) ? a + 1 : a
  }, 0)
}