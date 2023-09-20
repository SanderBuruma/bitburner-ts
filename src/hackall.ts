import { nonrooted_servers } from 'helpers/servers.js'
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
  let allServers = nonrooted_servers(ns).filter(x=>ns.getServerNumPortsRequired(x.Name)<=maxPorts)
  let count = 0
  allServers.forEach(s=>{
    if (s.PortsRequirement <= maxPorts) {
      if (bruteExists) ns.brutessh(s.Name)
      if (relayExists) ns.relaysmtp(s.Name)
      if (sqlExists) ns.sqlinject(s.Name)
      if (httpExists) ns.httpworm(s.Name)
      if (ftpExists) ns.ftpcrack(s.Name)
      ns.nuke(s.Name)
      count++
    }
  })

  if (count > 0) {
    log(ns, 'Nuked ' + Colors.Good(count.toString()) + ' servers! They had up to ' + Colors.Good(ports_we_can_hack(ns).toString()) + ' ports')
  }
}

/** @return the number of ports we can hack */
export function ports_we_can_hack(ns: NS) {
  return ['BruteSSH.exe', 'FTPCrack.exe', 'relaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'].reduce((a,f)=>{
    return ns.fileExists(f) ? a + 1 : a
  }, 0)
}