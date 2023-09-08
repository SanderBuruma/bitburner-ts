import { NS } from '@ns'
import { Colors } from 'helpers/colors'

export async function main(ns: NS) {
  ns.tprint('Av  RAM: ' + ns.formatRam(available_ram(ns, 0, true)))
  ns.tprint('Max RAM: ' + ns.formatRam(total_max_ram(ns, true)))
}

export function scan_all(ns: NS) {
  let all_servers = ['home']
  let i = 0
  while (i < all_servers.length) {
    let new_servers = ns.scan(all_servers[i])
    for (let s of new_servers) {
      if (all_servers.indexOf(s) != -1) {
        continue
      }
      all_servers.push(s)
    }
    i++
  }
  all_servers.sort((a,b)=>get_server_available_ram(ns, b)-get_server_available_ram(ns, a))
  return all_servers
}


export function rooted_servers(ns: NS, with_home = false) {
  return scan_all(ns).filter(s=>ns.hasRootAccess(s)).filter(x=>with_home || x!='home')
  .sort((a,b)=>ns.getServerMaxRam(b)-ns.getServerMaxRam(a))
}

export function nonrooted_servers(ns: NS) {
  return scan_all(ns).filter(s=>!ns.hasRootAccess(s))
}

export function servers_with_ram(ns: NS, treshold = 16) {
  return rooted_servers(ns)
  .filter(s=>ns.getServerMaxRam(s) - ns.getServerUsedRam(s) > treshold)
  .sort((a,b)=>ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
}

/** @description returns the total ram available on all servers */
export function total_max_ram(ns: NS, with_home = false) {
  let servers = rooted_servers(ns, with_home)
  let serversTotalRam = (servers.reduce((a,c)=>{
    let m_ram = ns.getServerMaxRam(c)
    return a + m_ram
  }, 0))
  return serversTotalRam
}

/** @description returns the total ram available on all purchased servers */
export function available_ram(ns: NS, minimum_ram = 8, with_home = false) {
  let servers = rooted_servers(ns, with_home)
  let serversTotalRam = (servers.reduce((a,s)=>{
    let available_ram = ns.getServerMaxRam(s) - ns.getServerUsedRam(s)
    return available_ram >= minimum_ram ? a + available_ram : a
  }, 0))
  return serversTotalRam
}

/** @return boolean whether or not the script was run */
export function run_script(ns: NS, scriptName: string, threads: number, ...aargs: string[]) {
  let servers = rooted_servers(ns)
  for (let s of servers) {
    let pid
    let availableRam = get_server_available_ram(ns, s)
    if (availableRam > threads * ns.getScriptRam(scriptName)) {
      pid = ns.exec(scriptName, s, threads, ...aargs)
      if (!pid) 
      { 
        ns.print({
          msg: Colors.warning() + "Failed execution. no individual server has enough RAM", 
          scriptName, 
          threads, 
          host:ns.getHostname(), 
          aargs
        })
        throw new Error('Failed execution, See log')
      }
      return pid
    }
  }
  ns.print({msg: Colors.warning() + "Not enough RAM", scriptName, threads, aargs, host:ns.getHostname()})
  return 0
}

export function get_server_available_ram(ns: NS, server: string) {
  return ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
}