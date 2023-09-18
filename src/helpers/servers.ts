import { NS } from '@ns'
import { Colors } from 'helpers/colors'
import { Server } from '/classes/Server'

export async function main(ns: NS) {
  const av_ram = total_available_ram(ns, 0)
  const max_ram = total_max_ram(ns)
  ns.tprintf('Av  RAM: ' + Colors.Highlight(ns.formatRam(av_ram)) + ' ( ' +ns.formatPercent(av_ram/max_ram)+ '% )')
  ns.tprintf('Max RAM: ' + Colors.Highlight(ns.formatRam(max_ram)))
  ns.tprintf('Total $: ' + Colors.Highlight(ns.formatNumber(total_money(ns))))
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

  let all_servers2 = all_servers.map(s=>new Server(ns, s)).sort((a,b)=>b.AvailableRam-a.AvailableRam)

  // Make sure 'home' is the last server to be used anywhere
  all_servers2.splice(all_servers2.findIndex(s=>s.Name==='home'), 1)
  all_servers2.push(new Server(ns, 'home'))

  return all_servers2
}


export function rooted_servers(ns: NS) {
  return scan_all(ns).filter(s=>s.Rooted)
}

export function nonrooted_servers(ns: NS) {
  return scan_all(ns).filter(s=>!s.Rooted)
}

export function servers_with_ram(ns: NS, treshold = 16) {
  return rooted_servers(ns)
  .filter(s=>s.AvailableRam >= treshold)
}

/** @description returns the total ram available on all servers */
export function total_max_ram(ns: NS) {
  let servers = rooted_servers(ns)
  let serversTotalRam = (servers.reduce((a,c)=>{
    let m_ram = c.MaxRam
    return a + m_ram
  }, 0))
  return serversTotalRam
}

/** @description returns the total ram available on all servers with more than minimum_ram*/
export function total_available_ram(ns: NS, minimum_ram = 8) {
  let servers = rooted_servers(ns)
  let serversTotalRam = (servers.reduce((a,s)=>{
    return s.AvailableRam >= minimum_ram ? a + s.AvailableRam : a
  }, 0))
  return serversTotalRam
}

/** @description attempts to run a script on the largest available server or spread among many others if multi threaded
 * @return boolean whether or not the script was run */
export function run_script(ns: NS, scriptName: string, threads: number = 1, ...aargs: string[]) {
  let script_ram = ns.getScriptRam(scriptName)
  if (script_ram === 0) throw new Error(scriptName + ' did not exist, did you specify the correct path?')
  let servers = rooted_servers(ns).filter(x=>x.AvailableRam >= script_ram)
  let ram_requirement = threads * script_ram
  if (ram_requirement > total_available_ram(ns, script_ram))
  {
    
    throw new Error(
      'Ram requirement: ' + ns.formatRam(ram_requirement) + 
      ' is greater than available ram: ' + ns.formatRam(total_available_ram(ns, script_ram))
    )
  }

  // run on single server if possible and return PID
  if (threads == 1 || ram_requirement <= servers[0].AvailableRam)
  {
    for (let server of servers) {
      let pid: number
      let availableRam = server.AvailableRam
      if (availableRam > threads * ns.getScriptRam(scriptName)) {

        // scp file over if it doesn't exist
        if (!ns.fileExists(scriptName, server.Name)) ns.scp(scriptName, server.Name, 'home')

        pid = ns.exec(scriptName, server.Name, threads, ...aargs)

        if (!pid) continue
        return pid
      }
    }
    { 
      throw new Error('Failed execution. no individual server has enough RAM ' + JSON.stringify({scriptName, threads, aargs}, null, 2))
    }
  } 

  // Spread out script over multiple servers if needed
  for (let server of servers) {
    let server_ram = server.AvailableRam
    let threads_to_use = Math.min(threads, Math.floor(server_ram / script_ram))

    // scp file over if it doesn't exist
    if (!ns.fileExists(scriptName, server.Name)) ns.scp(scriptName, server.Name, 'home')

    if (!ns.exec(scriptName, server.Name, threads_to_use, ...aargs)) {
      throw new Error(
        'Failure of execution: possible reasons:' + 
        '\n1. Not enough RAM'+
        '\n2. File does not exist or match the original on \'home\''+
        '\n3. Unknown'
      )
    }
    threads -= threads_to_use
    if (threads <= 0) return 1 
  }

  return -1
}

export function run_script_with_fraction_threads(ns: NS, filename: string, threads_fraction: number = 1, ...aargs: string[]) {
  if (threads_fraction > 1 || threads_fraction <= 0) throw new Error('threads_fraction argument must be between 0 and 1')
  const script_ram = ns.getScriptRam(filename)
  const av_ram = total_available_ram(ns, script_ram)
  if (!ns.fileExists(filename)) throw new Error('File: ' + filename + ' does not exist')
  if (script_ram > av_ram) throw new Error('Not enough ram available on any server')
  const threads = Math.floor(av_ram/script_ram * threads_fraction)
  if (threads < 1 || threads % 1 !== 0 || threads === Infinity) throw new Error('There is something wrong with threads: ' + threads + ' filename ' + filename)
  run_script(
    ns, 
    filename, 
    threads, 
    ...aargs)
}

export function total_money(ns: NS) {
  let total_money = rooted_servers(ns)
  .filter(s=>s.HackingRequirement <= ns.getPlayer().skills.hacking)
  .reduce((a,c)=>{return a + c.Money},0)
  return (total_money - ns.getPlayer().money)
}

export function continuous_targets(ns: NS, filter_by_atminsec: boolean = true) {
  let targets = rooted_servers(ns)
  .filter(s=>
    s.MaxMoney > 1e3 && 
    ns.getPlayer().skills.hacking > s.HackingRequirement
  )

  if (filter_by_atminsec) {
    targets = targets.filter(s=>s.AtMinSec)
  }
  return targets.sort((a,b)=>b.StaticScore - a.StaticScore)
}

export function no_grow_targets(ns: NS) {
  let targets = rooted_servers(ns)
  .filter(s=>s.MaxMoney > 1e3 && ns.getPlayer().skills.hacking >= s.HackingRequirement)
  .sort((a,b)=>b.NoGrowScore - a.NoGrowScore)
  return targets
}
