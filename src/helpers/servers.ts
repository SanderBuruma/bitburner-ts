import { NS } from '@ns'
import { Colors } from 'helpers/colors'

export async function main(ns: NS) {
  ns.tprint('Av  RAM: ' + ns.formatRam(total_available_ram(ns, 0)))
  ns.tprint('Max RAM: ' + ns.formatRam(total_max_ram(ns)))
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
  return all_servers.sort((a,b)=>get_server_available_ram(ns, b)-get_server_available_ram(ns, a))
}


export function rooted_servers(ns: NS) {
  return scan_all(ns).filter(s=>ns.hasRootAccess(s))
}

export function nonrooted_servers(ns: NS) {
  return scan_all(ns).filter(s=>!ns.hasRootAccess(s))
}

export function servers_with_ram(ns: NS, treshold = 16) {
  return rooted_servers(ns)
  .filter(s=>get_server_available_ram(ns, s) > treshold)
}

/** @description returns the total ram available on all servers */
export function total_max_ram(ns: NS) {
  let servers = rooted_servers(ns)
  let serversTotalRam = (servers.reduce((a,c)=>{
    let m_ram = ns.getServerMaxRam(c)
    return a + m_ram
  }, 0))
  return serversTotalRam
}

/** @description returns the total ram available on all servers with more than minimum_ram*/
export function total_available_ram(ns: NS, minimum_ram = 8) {
  let servers = rooted_servers(ns)
  let serversTotalRam = (servers.reduce((a,s)=>{
    let available_ram = get_server_available_ram(ns, s)
    return available_ram >= minimum_ram ? a + available_ram : a
  }, 0))
  return serversTotalRam
}

export function get_server_available_ram(ns: NS, server: string) {
  return ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
}

/** @description attempts to run a script on the largest available server or spread among many others if multi threaded
 * @return boolean whether or not the script was run */
export function run_script(ns: NS, scriptName: string, threads: number = 1, ...aargs: string[]) {
  let script_ram = ns.getScriptRam(scriptName)
  let servers = rooted_servers(ns).filter(x=>get_server_available_ram(ns, x) >= script_ram)
  let ram_requirement = threads * script_ram
  if (ram_requirement > total_available_ram(ns, script_ram))
  {
    throw new Error(
      'Ram requirement: ' + ns.formatRam(ram_requirement) + 
      ' is greater than available ram: ' + ns.formatRam(total_available_ram(ns, script_ram))
    )
  }

  if (threads == 1 || ram_requirement <= get_server_available_ram(ns, servers[0]))
  {
    for (let server of servers) {
      let pid: number
      let availableRam = get_server_available_ram(ns, server)
      if (availableRam > threads * ns.getScriptRam(scriptName)) {
        pid = ns.exec(scriptName, server, threads, ...aargs)
        if (!pid) 
        { 
          throw new Error('Failed execution. no individual server has enough RAM')
        }
        return pid
      }
    }
    ns.print({msg: Colors.warning() + "Not enough RAM", scriptName, threads, aargs, host:ns.getHostname()})
    return 0
  } 

  for (let server of servers) {
    let server_ram = get_server_available_ram(ns, server)
    let threads_to_use = Math.min(threads, Math.floor(server_ram / script_ram))
    if (!ns.exec(scriptName, server, threads_to_use, ...aargs)) {
      throw new Error(
        'Failure of execution: possible reasons:' + 
        '\n1. Not enough RAM'+
        '\n2. File does not exist or match the original on \'home\''+
        '\n3. Unknown'
      )
    }
    threads -= threads_to_use
    if (threads <= 0) break 
  }

  return 0
}

export function run_script_with_fraction_threads(ns: NS, filename: string, threads_fraction: number = 1, ...aargs: string[]) {
  if (threads_fraction >= 1 || threads_fraction <= 0) throw new Error('threads_fraction argument must be between 0 and 1')
  const script_ram = ns.getScriptRam(filename)
  const av_ram = total_available_ram(ns, script_ram)
  if (!ns.fileExists(filename)) throw new Error('File: ' + filename + ' does not exist')
  if (script_ram > av_ram) throw new Error('Not enough ram available on any server')
  const threads = Math.floor(av_ram/script_ram * threads_fraction)
  if (threads < 1 || threads % 1 !== 0 || threads === Infinity) throw new Error('There is somehing wrong with threads: ' + threads)
  run_script(
    ns, 
    filename, 
    threads, 
    ...aargs)
}