import { NS, ProcessInfo } from '@ns'
import { hack_grow_weaken_ratios, kill_previous, log, set_log_settings } from 'helpers/utils.js'
import { lmt } from 'list_money_targets.js'
import { ports_we_can_hack } from './hackall'
import { available_ram, get_server_available_ram, nonrooted_servers, rooted_servers, run_script, scan_all } from './helpers/servers'

let runmode = initBitNode.name
let script_pids: number[] = []

export async function main(ns: NS) {

  set_log_settings(ns, true, true, false)

  kill_previous(ns)
  ns.atExit(async ()=>{
    await xrun(ns, 'killall.js')
    log(ns, 'Exiting ' + ns.getRunningScript()?.filename + ' and killing all scripts')
  })
  log(ns, 'Starting ' + ns.getRunningScript()?.filename)

  // The loop might at some point break from within
  while (true) {
    await ns.sleep(1e3)
    log(ns, "Running SAR loop: runmode "+ runmode)

    // Detect runmode
    switch (runmode) {
      case (initBitNode.name):
        await initBitNode(ns)
        break;
      case (initAfterReset.name):
        await initAfterReset(ns)
        break;
      case (operating.name):
        await operating(ns)
        break;
      default:
        throw new Error(`runmode '${runmode}' not recognized`)
    }
  }
}

async function initBitNode(ns: NS) {
  if (ns.getServerMaxRam('home') >= 64) {
    runmode = initAfterReset.name
    log(ns, 'exiting ' + initBitNode.name)
    return
  }

  await xrun(ns, 'hackall.js')
  await ns.sleep(50)
  await commit_rob_store(ns)
  await ns.sleep(50)
  log(ns, 'Initiating hgw_continuous_best_target')
  await hgw_continuous_best_target(ns)
  log(ns, 'Waiting to upgrade home RAM')
  while (ns.getPlayer().money < ns.singularity.getUpgradeHomeRamCost()) {
    await ns.sleep(50)
    await buy_programs(ns)
    await upgrade_port_exploits(ns)
    await hgw_continuous_best_target(ns)
  }
  await ns.sleep(50)
  await xrun(ns, 'simple/upg_home_ram.js', 1)
  await ns.sleep(50)
  await xrun(ns, 'killall.js', 1, ns.getRunningScript()?.pid.toString()??'0')
  await ns.sleep(50)
  runmode = initAfterReset.name
}

async function initAfterReset(ns: NS) {
  await upgrade_port_exploits(ns)
  await commit_rob_store(ns)
  await hgw_continuous_best_target(ns)
}

async function operating(ns: NS) {
  await upg_home(ns)
  await buy_servers(ns)
  await buy_programs(ns)
  await upgrade_port_exploits(ns)
  // await update_hacknet(ns)
  await backdoor_everything(ns)
  await update_batchers(ns)
  // await train_with_faction(ns)
  // await buy_augs(ns)
  // await install_augs(ns)
  // await run_stocks(ns)
}

async function upg_home(ns: NS) {
  await xrun(ns, 'simple/upg_home_cores.js', 1)
  await ns.sleep(50)
  await xrun(ns, 'simple/upg_home_ram.js', 1)
  await ns.sleep(50)
}

async function buy_servers(ns: NS) {
  let servers = ns.getPurchasedServers().sort((a,b)=>ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
  let cost
  let player = ns.getPlayer()

  if (servers.length > 0) {
    cost = ns.getPurchasedServerCost(ns.getServerMaxRam(servers[0]) * 2)
    if (player.money > cost)
    {
      await xrun(ns, 'buyserver.js', 1)
      log(ns, 'Bought a server for ' + ns.formatNumber(cost))
      await ns.sleep(1000)
      return
    }
  } else {
    cost = ns.getPurchasedServerCost(64)
    if (player.money > cost) 
    {
      await xrun(ns, 'buyserver.js', 1)
      log(ns, 'Bought a server for ' + ns.formatNumber(cost))
      await ns.sleep(50)
      return
    }
  }
    
}

async function buy_programs(ns: NS) {
  
  if (!ns.hasTorRouter && ns.getPlayer().money > 2e5) {
    await xrun(ns, 'simple/purchase_tor.js')
    await ns.sleep(50)
  }
  
  let programs = [
    {
      money: 5e5,
      program: 'DeepscanV1.exe'
    },
    {
      money: 5e5,
      program: 'BruteSSH.exe'
    },
    {
      money: 15e5,
      program: 'FTPCrack.exe'
    },
    {
      money: 5e6,
      program: 'relaySMTP.exe'
    },
    {
      money: 30e6,
      program: 'HTTPWorm.exe'
    },
    {
      money: 25e7,
      program: 'SQLInject.exe'
    },
  ]
  
  for (let p of programs) {
    if (!ns.fileExists(p.program) && ns.getPlayer().money > p.money) {
      ns.run('simple/purchase_program.js', 1, p.program)
      await ns.sleep(50)
      ns.run('hackall.js', 1)
      await ns.sleep(50)
    }
  }
}

async function backdoor_everything(ns: NS) {
  let servers = rooted_servers(ns).filter(x=>!ns.getServer(x).backdoorInstalled)

  for (let s of servers) {
    let server = ns.getServer(s)
    if (!server.backdoorInstalled && ns.getPlayer().skills.hacking >= (server.requiredHackingSkill ?? 0)) {
      if (!xrun(ns, 'connect.js', 1, s)) return
      await ns.sleep(250)
      await ns.singularity.installBackdoor()
      ns.singularity.connect('home')
      log(ns, 'Backdoor installed on ' + s)
    }
  }
}

async function update_batchers(ns: NS) {
  // Gather batching scripts
  let servers = rooted_servers(ns)
  let scripts: ProcessInfo[] = []
  scripts = scripts.filter(s=>s.filename == 'batch/initiate.js')

  // Judge how much ram they use
  let batch_ram_sum = ns.getScriptRam('batch/initiate.js') * scripts.length
  for (let s of scripts) {
    let target = s.args[0].toString()
    let timing_fraction = parseFloat(s.args[1].toString())
    let multiplier = parseFloat(s.args[2].toString())

    batch_ram_sum += timing_fraction * (ns.getScriptRam('batch/once.js') + 1)
    let hack_threads = Math.floor((multiplier-1) / ns.hackAnalyze(target))
    let grow_threads = Math.ceil(ns.growthAnalyze(target, multiplier))
    batch_ram_sum += timing_fraction * hack_threads * .25 * ns.getScriptRam('simple/hack.js')
    batch_ram_sum += timing_fraction * grow_threads * .8 * ns.getScriptRam('simple/grow.js')
    batch_ram_sum += timing_fraction * Math.ceil(hack_threads / 25 + grow_threads / 12.5)
  }

  // Judge how much ram we CAN use
  let av_ram = available_ram(ns)

  // Judge if we should use more ram
  if (av_ram < batch_ram_sum * 2) return

  // If we do, kill all batching scripts
  scripts.forEach(s=>ns.kill(s.pid))

  // Wait for a while
  await ns.sleep(1e3)
  
  // Start new batching script
  /** @type string[] */
  let targets
  if (servers.length < 3) return
  targets = lmt(ns)
  
  if (targets.length == 0) return
  targets = targets.filter(s=>s.name != 'n00dles')
  
  // Get a target which doesn't take too long to exploit
  let target
  while (targets.length > 0) {
    target = targets.shift()
    if (!target || ns.getWeakenTime(target.name) < 5e3 * 60) break
  }
  // Calculate a good batch multiplier (by how much money will grow because of the grow.js script)
  let multiplier: number
  let sum_threads: number = 0

  if (!target) return
  for (multiplier = 1.5; multiplier > 1; multiplier-=.01) {
    let hack_threads = Math.floor((multiplier-1) / ns.hackAnalyze(target.name))
    let grow_threads = Math.ceil(ns.growthAnalyze(target.name, multiplier))
    let weaken_threads = Math.ceil(hack_threads / 25 + grow_threads / 12.5)
    sum_threads = hack_threads + grow_threads + weaken_threads
    
    if (sum_threads * 2.5 + ns.getScriptRam('batch/once.js') * 2 < av_ram) break
    if (multiplier > 1) continue
    if (targets.length > 0)
    {
      target = targets.shift()
      if (!target) return
      multiplier = 1.5
    }

  }

  // find a time factor
  let time_factor = 1.54
  for (let tf of [2.22, 2.86, 3.2, 5.83, 6.45, 6.86, 8.57, 11.43, 13.14]) {
    if (sum_threads * tf * 2.5 + ns.getScriptRam('batch/once.js') * tf > av_ram) break

    time_factor = tf
  }

  await xrun(ns, 'batch/initiate.js', 1, target.name, time_factor.toString(), multiplier.toString(), '100')
  log(ns, 'Initiating batch on ' + target.name + ' tf: ' + time_factor + ' multi: ' + multiplier)
}

async function xrun(ns: NS, filename: string, threads = 1, ...aargs: string[]) {
  log(ns, 'Running ' + filename + ' with threads: ' + threads)
  let host_name = ns.getHostname()
  let pid: number = 0
  if (get_server_available_ram(ns, host_name) < ns.getScriptRam(filename) * threads) {
    log(ns, host_name + ': ' + filename + ' was not able to run due to lack of RAM')
    pid = run_script(ns, filename, threads, ...aargs)
    await ns.sleep(50)
    return pid
  }

  pid = ns.run(filename, threads, ...aargs)
  if (!pid) {
    log(ns, host_name + ': ' + filename + ' was not able to run due to unknown reason')
    pid = run_script(ns, filename, threads, ...aargs)
    await ns.sleep(50)
    return pid
  }
  return 0
}

function kill_script_pids(ns: NS) {
  while (script_pids.length>0) {
    let pid = script_pids.shift()
    if (pid === undefined) continue
    ns.kill(pid)
  }
}

async function hgw_continuous_best_target(ns: NS) {
  // Gather some necesssary information
  let targets = lmt(ns)
  let target = targets.shift()?.name ?? 'foodnstuff'
  let a_ram = available_ram(ns, 2, false)
  let hgw_rs = hack_grow_weaken_ratios(ns, target)
  let sum_threads_per_1_hack = hgw_rs.grow_threads_per_hack_thread + hgw_rs.weaken_threads_plus_grow_threads_per_hack + 1

  // Check if we should start a new cycle
  if (sum_threads_per_1_hack * 1.8 > a_ram) {
    return
  }

  // Kill the old continuous cycle
  let y = rooted_servers(ns).reduce((a: number[],c)=>{
    return a.concat(
      ns.ps(c)
      .filter(x=>/^repeat\//.test(x.filename))
      .map(x=>x.pid)
    )
  },[]).forEach(x=>{
    ns.kill(x)
  })
  await ns.sleep(100)

  // Start the new continuous cycle
  a_ram = available_ram(ns, 2, false) 
  let hgw_rs_multiple = Math.floor(a_ram / sum_threads_per_1_hack / 1.8)
  let hack_threads = Math.max(Math.floor(hgw_rs_multiple), 1)
  let grow_threads = Math.max(Math.ceil(hgw_rs_multiple * hgw_rs.grow_threads_per_hack_thread), 1)
  let weaken_threads = Math.max(Math.ceil(hgw_rs_multiple * hgw_rs.weaken_threads_plus_grow_threads_per_hack), 1)
  //ns.tprint(JSON.stringify({target, hgw_rs, a_ram, hgw_rs_multiple, hack_threads, grow_threads, weaken_threads, sum_threads_per_1_hack}, null, 2))
  for (let s of rooted_servers(ns, false)) {
    let ram = get_server_available_ram(ns, s)
    let hack_script_ram = ns.getScriptRam('repeat/hack.js')
    let grow_script_ram = ns.getScriptRam('repeat/grow.js')
    let weaken_script_ram = ns.getScriptRam('repeat/weaken.js')

    // Initiate repeat/weaken.js scripts
    if (weaken_threads >= 1 && weaken_threads * weaken_script_ram > ram) {
      ns.exec(
        'repeat/weaken.js', 
        s, 
        Math.floor(ram / weaken_script_ram), 
        target
      )
      weaken_threads -= Math.floor(ram / weaken_script_ram)
      continue
    } else if (weaken_threads >= 1) {
      ns.exec(
        'repeat/weaken.js', 
        s, 
        weaken_threads, 
        target
      )
      weaken_threads = 0
    }
    
    await ns.sleep(50)
    ram = get_server_available_ram(ns, s)
    if (ram < grow_script_ram) continue

    // Initiate repeat/grow.js scripts
    if (grow_threads >= 1 && grow_threads * grow_script_ram > ram) {
      ns.exec(
        'repeat/grow.js', 
        s, 
        Math.floor(ram / grow_script_ram), 
        target
      )
      grow_threads -= Math.floor(ram / grow_script_ram)
      continue
    } else if (grow_threads >= 1) {
      ns.exec(
        'repeat/grow.js', 
        s, 
        grow_threads, 
        target
      )
      grow_threads = 0
    }
    
    await ns.sleep(50)
    ram = get_server_available_ram(ns, s)
    if (ram < weaken_script_ram) continue
    
    // Initiate repeat/hack.js scripts
    if (hack_threads >= 1 && hack_threads * hack_script_ram > ram) {
      ns.exec(
        'repeat/hack.js', 
        s, 
        Math.floor(ram / hack_script_ram), 
        target
      )
      hack_threads -= Math.floor(ram / hack_script_ram)
      continue
    } else if (hack_threads >= 1) {
      ns.exec(
        'repeat/hack.js', 
        s, 
        hack_threads, 
        target
      )
      hack_threads = 0
    }
    
  }
}

async function upgrade_port_exploits(ns: NS) {
  if (nonrooted_servers(ns).filter(s=>ns.getServerNumPortsRequired(s) < ports_we_can_hack(ns)).length > 0) {
    await xrun(ns, 'hackall.js')
    await ns.sleep(50)
    await hgw_continuous_best_target(ns)
    await ns.sleep(50)
  }
}
async function commit_rob_store(ns: NS) {
  if (!ns.singularity.getCurrentWork()) {
    await xrun(ns, 'simple/commit_crime.js', 1, 'Rob Store')
    await ns.sleep(50)
  }
}