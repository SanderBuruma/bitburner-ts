import { nonrooted_servers } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {

  let allServers = nonrooted_servers(ns)
  let bruteExists = ns.fileExists('BruteSSH.exe', 'home')
  let ftpExists = ns.fileExists('FTPCrack.exe', 'home')
  let relayExists = ns.fileExists('relaySMTP.exe', 'home')
  let httpExists = ns.fileExists('HTTPWorm.exe', 'home')
  let sqlExists = ns.fileExists('SQLInject.exe', 'home')

  let maxPorts = ports_we_can_hack(ns)
  let nuked_something = false
  allServers.forEach(s=>{
    if (ns.getServerNumPortsRequired(s) <= maxPorts) {
      if (bruteExists) ns.brutessh(s)
      if (relayExists) ns.relaysmtp(s)
      if (sqlExists) ns.sqlinject(s)
      if (httpExists) ns.httpworm(s)
      if (ftpExists) ns.ftpcrack(s)
      ns.nuke(s)
      ns.tprintf(s + ' has been nuked')
      nuked_something = true
    }
  })

  if (nuked_something) {
    ns.exec('scp2all.js', 'home')
  }
}

export function ports_we_can_hack(ns: NS) {
  return ['BruteSSH.exe', 'FTPCrack.exe', 'relaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'].reduce((a,f)=>{
    return ns.fileExists(f) ? a + 1 : a
  }, 0)
}