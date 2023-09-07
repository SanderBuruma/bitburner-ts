import { NS, ProcessInfo } from '@ns'
import { await_predicate, hack_grow_weaken_ratios, kill_previous, log, run_write_read, set_log_settings } from 'helpers/utils.js'
import { lmt } from 'list_money_targets.js'
import { ports_we_can_hack } from './hackall'
import { available_ram, get_server_available_ram, nonrooted_servers, rooted_servers, run_script, total_max_ram } from 'helpers/servers'
import { IFactionResult } from 'interfaces/IFactionResult.js'
import { IServerResult } from 'interfaces/IServerResult.js'

let runmode: string
let script_pids: number[] = []

export async function main(ns: NS) {

  runmode = initBitNode.name
  set_log_settings(ns, true, true, false)

  kill_previous(ns)
  ns.atExit(async ()=>{
    await ns.run('killall.js')
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
      case (operating_lv_2.name):
        await operating_lv_2(ns)
        break;
      default:
        throw new Error(`runmode '${runmode}' not recognized`)
    }
  }
}

async function initBitNode(ns: NS) {
  await commit_rob_store(ns)
  await ns.sleep(50)
  await ns.run('hackall.js')
  await ns.sleep(50)
  if (ns.getServerMaxRam('home') >= 64) {
    runmode = initAfterReset.name
    log(ns, 'exiting ' + initBitNode.name)
    return
  }

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
  await ns.run('simple/upg_home_ram.js', 1)
  await ns.sleep(50)
  await ns.run('killall.js', 1, ns.getRunningScript()?.pid ?? 0)
  await ns.sleep(50)
  runmode = initAfterReset.name
}

async function initAfterReset(ns: NS) {
  while (ns.getServerMaxRam('home') < 256)
  {
    await buy_servers(ns)
    if (ns.getPlayer().money > ns.singularity.getUpgradeHomeRamCost()) {
      ns.run('simple/upg_home_ram.js', 1)
      await ns.sleep(50)
    }
    await buy_programs(ns)
    await upgrade_port_exploits(ns)
    await commit_rob_store(ns)
    await upg_home_ram(ns)
    await hgw_continuous_best_target(ns)
    await backdoor_everything(ns)
    await work_with_faction(ns)

    await ns.sleep(1000)
  }

  await ns.run('killall.js', 1, ns.getRunningScript()?.pid ?? 0)
  await ns.sleep(500)
  runmode = operating.name
}

async function operating(ns: NS) {
  while (total_max_ram(ns, false) < 2 ** 12) {
    await buy_servers(ns)
    await upg_home_ram(ns)
    await buy_programs(ns)
    await upgrade_port_exploits(ns)
    await hgw_continuous_best_target(ns)
    await home_weaken_repeat(ns, 50)
    await backdoor_everything(ns)
    // await update_hacknet(ns)
    // await update_batchers(ns)

    await work_with_faction(ns)
    await ns.sleep(1000)
    // await buy_augs(ns)
    // await install_augs(ns)
    // await run_stocks(ns)
  }
  runmode = operating_lv_2.name
}
async function operating_lv_2(ns: NS) {
  while (true) {
    await buy_servers(ns)
    await upg_home_ram(ns)
    await buy_programs(ns)
    await upgrade_port_exploits(ns)
    await update_batchers(ns)
    await home_weaken_repeat(ns, 1000)
    await backdoor_everything(ns)
    // await update_hacknet(ns)

    await work_with_faction(ns)
    await ns.sleep(1000)
    // await buy_augs(ns)
    // await install_augs(ns)
    // await run_stocks(ns)
  }
}

async function work_with_faction(ns: NS) {
  if (Date.now() % 60000 < 1000) {
    let factions: IFactionResult[] = await run_write_read(ns, 'simple/work_with_a_faction.js', 1, 'factions_to_port')
    let work = ns.singularity.getCurrentWork()
    if (factions.length > 0 && (!work || work['type'] !== 'FACTION')) {
      let faction = factions[0]
      log(ns, 'initiating work with faction:' + faction.name)
      ns.run('simple/work_with_a_faction.js', 1, 'work_with_faction')
    }
  }
}

async function upg_home_ram(ns: NS) {
  if (ns.singularity.getUpgradeHomeRamCost() * 1.5 < ns.getPlayer().money) {
    await await_predicate(ns, ()=>ns.getScriptRam('simple/upg_home_ram.js') < get_server_available_ram(ns, 'home'))
    log(ns, 'Upgrading home RAM from ' + ns.formatRam(ns.getServerMaxRam('home')))
    ns.run('simple/upg_home_ram.js', 1)
  }
}

async function buy_servers(ns: NS) {
  // Check if we should skip on buying more servers
  let work = ns.singularity.getCurrentWork()
  if (work && work['type'] === 'FACTION') {
    let faction = work['factionName']    
    let owned_augs = ns.singularity.getOwnedAugmentations(true)
    let augmentations = ns.singularity.getAugmentationsFromFaction(faction)
    .filter(x=>!owned_augs.includes(x))
    .sort((a,b)=>{
      return ns.singularity.getAugmentationRepReq(b) - ns.singularity.getAugmentationRepReq(a)
    })

    if (augmentations.length > 0) {
      let max_rep_required = ns.singularity.getAugmentationRepReq(augmentations[0])

      if (ns.singularity.getFactionRep(faction) * 2 > max_rep_required) {
        // If we are close to finishing the rep for an organization, stop buying servers
        return
      }
    }
  }

  let servers = ns.getPurchasedServers().sort((a,b)=>ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
  let cost
  let player = ns.getPlayer()

  if (servers.length > 0) {
    cost = ns.getPurchasedServerCost(ns.getServerMaxRam(servers[0]) * 2)
    if (player.money > cost)
    {
      await ns.run('buyserver.js', 1)
      log(ns, 'Bought a server for ' + ns.formatNumber(cost))
      await ns.sleep(1000)
      return
    }
  } else {
    let ram = 2 ** Math.floor(Math.log2(total_max_ram(ns, false)))
    cost = ns.getPurchasedServerCost(ram)
    if (player.money > cost) 
    {
      await ns.run('buyserver.js', 1)
      log(ns, 'Bought a server for ' + ns.formatNumber(cost) + ' RAM: ' + ns.formatRam(ram))
      await ns.sleep(50)
      return
    }
  }
    
}

async function buy_programs(ns: NS) {
  
  if (!ns.hasTorRouter() && ns.getPlayer().money > 2e5) {
    ns.run('simple/purchase_tor.js')
    log(ns, 'Bought TOR Router at seconds since aug: ' + Math.floor(ns.getResetInfo().lastAugReset)/1e3)
    await ns.sleep(50)
  }
  
  let programs = [
    {
      money: 500e3,
      program: 'BruteSSH.exe'
    }, {
      money: 1.5e6,
      program: 'FTPCrack.exe'
    }, {
      money: 1.6e6,
      program: 'DeepscanV1.exe'
    }, {
      money: 5e6,
      program: 'relaySMTP.exe'
    }, {
      money: 30e6,
      program: 'HTTPWorm.exe'
    }, {
      money: 250e6,
      program: 'SQLInject.exe'
    }, {
      money: 40e9,
      program: 'Formulas.exe'
    },
  ]
  
  for (let p of programs) {
    if (!ns.fileExists(p.program) && ns.getPlayer().money > p.money) {
      ns.run('simple/purchase_program.js', 1, p.program)
      log(ns, 'Bought ' + p.program + ' at seconds since aug: ' + Math.floor(ns.getResetInfo().lastAugReset/1e3))
      await ns.sleep(50)
      ns.run('hackall.js', 1)
      await ns.sleep(50)
    }
  }
}

async function backdoor_everything(ns: NS) {
  let servers = rooted_servers(ns)
  .filter(x=>!ns.getServer(x).backdoorInstalled)
  .sort((a,b)=>ns.getServerRequiredHackingLevel(a) - ns.getServerRequiredHackingLevel(b))

  for (let s of servers) {
    let server = ns.getServer(s)
    if (!server.backdoorInstalled && ns.getPlayer().skills.hacking >= (server.requiredHackingSkill ?? 0)) {
      if (!ns.run('connect.js', 1, s)) return
      await ns.sleep(250)
      await ns.singularity.installBackdoor()
      ns.singularity.connect('home')
      log(ns, 'Backdoor installed on ' + s)
    }
  }
}

async function update_batchers(ns: NS) {
  // Gather batching scripts
  let servers = rooted_servers(ns, true)
  let scripts: ProcessInfo[] = []
  for (let s of servers) {
    let s_scripts = ns.ps(s)
    scripts = scripts.concat(s_scripts)
  }
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
  if (scripts.length > 0) return

  // If we do, kill all batching scripts
  // scripts.forEach(s=>ns.kill(s.pid))

  // Wait for a while
  await ns.sleep(1e3)
  
  // Start new batching script
  /** @type string[] */
  let targets: IServerResult[]
  if (servers.length < 3) return
  let current_targets = scripts
  .map(y=>y.args)
  .reduce((a,c)=>{
    return a.concat(c)
  }, [])
  targets = lmt(ns, false).filter(x=>!current_targets.includes(x.name))
  
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

  await ns.run('batch/initiate.js', 1, target.name, time_factor.toString(), multiplier.toString(), '100')
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

let hgw_cbt_cur_target: IServerResult
async function hgw_continuous_best_target(ns: NS) {
  // Gather some necesssary information
  let targets: IServerResult[] = lmt(ns, false)
  .filter(x=>ns.hackAnalyzeChance(x.name)>.5)
  .filter(x=>ns.getWeakenTime(x.name) < 300e3)
  if (targets.length < 1) return
  let target = targets.shift() ?? { name: '', score: 0, hackingLv: 1_000_000}
  let a_ram = available_ram(ns, 2, false)
  let max_ram = total_max_ram(ns, false)
  let hgw_rs = hack_grow_weaken_ratios(ns, target.name)
  let sum_threads_per_1_hack = hgw_rs.grow_threads_per_hack_thread + hgw_rs.weaken_threads_plus_grow_threads_per_hack + 1

  // Check if we should NOT start a new cycle
  let condition1 = !!hgw_cbt_cur_target // We already have a target
  let condition2 = ((hgw_cbt_cur_target?.score ?? 0 / 1.5) >= target.score) // The next best target isn't good enough in order for us to switch
  let condition3 = a_ram * 4 < max_ram // Not enough availale ram is being wasted
  if (condition1 && condition2 && condition3) {
    return
  }

  // Kill the old continuous cycle
  let y = rooted_servers(ns).reduce((a: number[],c)=>{
    return a.concat(
      ns.ps(c)
      .filter(x=>/^repeat\//.test(x.filename) && !/share/.test(x.filename))
      .map(x=>x.pid)
    )
  },[]).forEach(x=>{
    ns.kill(x)
  })
  await ns.sleep(100)

  // Start the new continuous cycle
  a_ram = available_ram(ns, 2, false) 
  let hgw_rs_multiple = Math.floor(a_ram / sum_threads_per_1_hack / 1.8)
  let hack_threads = Math.min(Math.max(Math.floor(hgw_rs_multiple), 1), Math.floor(hgw_rs.hack_threads))
  let grow_threads = Math.max(Math.ceil(hgw_rs_multiple * hgw_rs.grow_threads_per_hack_thread), 1)
  let weaken_threads = Math.max(Math.ceil(hgw_rs_multiple * hgw_rs.weaken_threads_plus_grow_threads_per_hack), 1)
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
        target.name
      )
      weaken_threads -= Math.floor(ram / weaken_script_ram)
      continue
    } else if (weaken_threads >= 1) {
      ns.exec(
        'repeat/weaken.js', 
        s, 
        weaken_threads, 
        target.name
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
        target.name
      )
      grow_threads -= Math.floor(ram / grow_script_ram)
      continue
    } else if (grow_threads >= 1) {
      ns.exec(
        'repeat/grow.js', 
        s, 
        grow_threads, 
        target.name
      )
      grow_threads = 0
    }
    
    await ns.sleep(50)
    ram = get_server_available_ram(ns, s)
    if (ram < hack_script_ram) continue
    
    // Initiate repeat/hack.js scripts
    if (hack_threads >= 1 && hack_threads * hack_script_ram > ram) {
      ns.exec(
        'repeat/hack.js', 
        s, 
        Math.floor(ram / hack_script_ram), 
        target.name
      )
      hack_threads -= Math.floor(ram / hack_script_ram)
      continue
    } else if (hack_threads >= 1) {
      ns.exec(
        'repeat/hack.js', 
        s, 
        hack_threads, 
        target.name
      )
      hack_threads = 0
    }

    hgw_cbt_cur_target = target
    
  }
}

async function upgrade_port_exploits(ns: NS) {
  if (nonrooted_servers(ns).filter(s=>ns.getServerNumPortsRequired(s) < ports_we_can_hack(ns)).length > 0) {
    await ns.run('hackall.js')
    await ns.sleep(50)
    await hgw_continuous_best_target(ns)
    await ns.sleep(50)
  }
}
async function commit_rob_store(ns: NS) {
  if (!ns.singularity.getCurrentWork()) {
    await ns.run('simple/commit_crime.js', 1, 'Rob Store')
    await ns.sleep(50)
  }
}

function home_weaken_repeat(ns: NS, margin = 50) {
  let home_ram = get_server_available_ram(ns, 'home')
  if (home_ram < margin + ns.getScriptRam('repeat/weaken.js')) {
    return
  }

  let weaken_threads = (home_ram - 50) / ns.getScriptRam('repeat/weaken.js')
  ns.run('repeat/weaken.js', Math.floor(weaken_threads), 'foodnstuff')
}