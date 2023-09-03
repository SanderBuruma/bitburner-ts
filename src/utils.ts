import { NS } from '@ns'

export async function main(ns: NS) {
  let f: string = ns.args[0].toString() || 'servers'
  let target: string = ns.args[1]?.toString() || 'n00dles'

  if (f == 'servers') {
    ns.tprint('all servers')
    ns.tprint(scan_all(ns))
  } else if (f == 'pservers') {
    let pservers = purchased_and_homeserver(ns, false, false)
    .map(s=>
      {
        return {server: s, availableRam: ns.getServerMaxRam(s) - ns.getServerUsedRam(s), maxRam: ns.getServerMaxRam(s)}
      }
    )
    for (let s of pservers) {
      ns.tprint({name: s.server, availableRam: s.availableRam, maxRam: s.maxRam})
    }

  } else if (f == 'available_ram') {
    ns.tprint("available_ram")
    ns.tprint(ns.formatRam(available_ram(ns)))
  } else if (f == 'target_analyze') {
    ns.tprint("target_analyze")
    await target_analyze(ns, target)
  } else if (f == 'net_worth') {
    ns.tprintf("net_worth: "+net_worth(ns))
  } else if (f == 'gthreads') {
    let result =  hack_grow_weaken_ratios(ns, ns.args[1]?.toString())
    ns.tprint(JSON.stringify(result, null, 2))
  } else {
    throw new Error('Variable f doesn\'t call for a valid value')
  }
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

/** @description calculates how many continuous grow and hack threads need to run to counter 1 hack thread */
export function hack_grow_weaken_ratios(ns: NS, target: string = 'foodnstuff') {
  if (!target) throw new Error('No target selected')
  let multiplier = 1.25
  let grow_threads = ns.growthAnalyze(target, multiplier)
  let fraction = 1-1/multiplier
  let hack_threads = ns.hackAnalyzeThreads(target, ns.getServerMaxMoney(target) * fraction)
  let grow_threads_per_hack_thread = grow_threads / hack_threads / .25 * .8
  let weaken_threads_plus_grow_threads_per_hack = ns.formatNumber(grow_threads_per_hack_thread/10 + 4/25)
  return {target, grow_threads, hack_threads, multiplier, fraction, grow_threads_per_hack_thread, weaken_threads_plus_grow_threads_per_hack}
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

/** @description returns the total ram available on all purchased servers */
export function available_ram(ns: NS, minimum_ram = 8) {
  let servers = purchased_and_homeserver(ns, true, true)
  let serversTotalRam = (servers.reduce((a,s)=>{
    let available_ram = ns.getServerMaxRam(s) - ns.getServerUsedRam(s)
    return available_ram >= minimum_ram ? a + available_ram : a
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

/** @description gives weaken time, max and current money, minsec, sec, hack req */
export function target_analyze(ns: NS, target: string) {
  ns.tprint('Target wTime: \t ' + ns.formatNumber(ns.getWeakenTime(target)))
  ns.tprint('Target max money:\t ' + ns.formatNumber(ns.getServerMaxMoney(target)))
  ns.tprint('Target cur money:\t ' + ns.formatNumber(ns.getServerMoneyAvailable(target)))
  ns.tprint('Target minsec:\t ' + ns.getServerMinSecurityLevel(target))
  ns.tprint('Target sec:   \t ' + ns.getServerSecurityLevel(target))
  ns.tprint('Target hack req:\t ' + ns.getServerRequiredHackingLevel(target))
}

let print_to_terminal = true
let print_to_file = true
/** @description sets the default setting for logging for the running script */
export function set_log_settings(ns: NS, ptt=true, ptf=true, default_log=false) {
  print_to_terminal = ptt
  print_to_file = ptf

  if (!default_log) ns.disableLog('ALL')
  else ns.enableLog('ALL')
}

export function log(ns: NS, log_message: string) {
  ns.printf(log_message)
  if (print_to_terminal) ns.tprintf(log_message)

  let date = new Date();
  let parts = date.toLocaleString('en-US', {hour12: false}).split(', ');
  let dateParts = parts[0].split('/');
  let year = dateParts[2];
  let month = dateParts[0].padStart(2, '0');
  let day = dateParts[1].padStart(2, '0');
  let timePart = parts[1].split(':').slice(0, 2).join(':');  // Take hours and minutes
  let reversedDate = `${year}-${month}-${day} ${timePart}`;
  if (print_to_file) ns.write('log/' + ns.getRunningScript()?.filename +'.txt', reversedDate + ' ' + log_message + '\n', 'a')
}

export function net_worth(ns: NS) {
  let stocks_value = ns.stock.getSymbols().map(x=>ns.stock.getPosition(x)[0]*ns.stock.getBidPrice(x))
  let sum = stocks_value.reduce((a,c)=>{
    return a + c
  }, 0)
  return ns.formatNumber(sum + ns.getPlayer().money)
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



/** @description Kills all previous instances of the calling script on the host */
export function kill_previous(ns: NS) {
  let previous = ns.ps().filter(
    x=> {
      return (
        x.filename === ns.getRunningScript()?.filename && 
        x.pid != ns.getRunningScript()?.pid
      )
    }
  )
  previous.forEach(x=>ns.kill(x.pid))
}