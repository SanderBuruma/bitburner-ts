import { NS } from '@ns'

export async function main(ns: NS) {
    ns.tprint('hello world')
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
  //all_servers.shift()
  all_servers.sort((a,b)=>ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
  return all_servers
}


export function root_servers(ns: NS) {
  return scan_all(ns).filter(s=>ns.hasRootAccess(s))
  .sort((a,b)=>ns.getServerMaxRam(b)-ns.getServerMaxRam(a))
}

export function nonroot_servers(ns: NS) {
  return scan_all(ns).filter(s=>!ns.hasRootAccess(s))
}

export function servers_with_ram(ns: NS, treshold = 16) {
  return root_servers(ns)
  .filter(s=>ns.getServerMaxRam(s) - ns.getServerUsedRam(s) > treshold)
  .sort((a,b)=>ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
}

/** @description returns the total ram available on all purchased servers */
export function total_max_ram(ns: NS, all = false) {
  let servers = purchased_and_homeserver(ns, true, true)
  let serversTotalRam = (servers.reduce((a,c)=>{
    return a + ns.getServerMaxRam(c) - ns.getServerMaxRam(c)
  }, 0))
  return serversTotalRam
}

export function purchased_and_homeserver(ns: NS, withHome=true, allroot=true) {
  let servers = ns.getPurchasedServers()
  if (allroot) {
    servers = root_servers(ns)
  }
  else if (withHome) servers.push('home')
  servers = servers.filter(s=>ns.getServerMaxRam(s) - ns.getServerUsedRam(s))
  servers = servers.sort((a,b)=>{
    return ns.getServerMaxRam(b) - ns.getServerMaxRam(a)
  })
  return servers
}

/** @description returns the total ram available on all purchased servers */
export function available_ram(ns: NS, minimum_ram = 8) {
  let servers = purchased_and_homeserver(ns, true, true)
  let serversTotalRam = (servers.reduce((a,s)=>{
    let available_ram = ns.getServerMaxRam(s) - ns.getServerUsedRam(s)
    return available_ram >= minimum_ram ? a + available_ram : a
  }, 0))
  return serversTotalRam
}

/** @return boolean whether or not the script was run */
export function run_script(ns: NS, scriptName: string, threads: number, ...aargs: string[]) {
  let servers = root_servers(ns)
  for (let s of servers) {
    let pid
    let availableRam = ns.getServerMaxRam(s) - ns.getServerUsedRam(s)
    if (availableRam > threads * ns.getScriptRam(scriptName)) {
      pid = ns.exec(scriptName, s, threads, ...aargs)
      if (!pid) 
      { 
        ns.print({msg: "Failed execution; no individual server has enough ram", scriptName, threads, host:ns.getHostname(), aargs})
        throw new Error('Failed execution, See log')
      }
      return pid
    }
  }
  ns.print({msg: "Not enough ram", scriptName, threads, aargs, host:ns.getHostname()})
  return 0
}