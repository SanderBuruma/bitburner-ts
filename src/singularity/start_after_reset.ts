import { NS, ProcessInfo } from '@ns'
import { await_predicate, hack_grow_weaken_ratios, kill_previous, log, run_write_read, set_log_settings } from 'helpers/utils.js'
import { lmt } from 'list_money_targets.js'
import { ports_we_can_hack } from 'hackall'
import { total_available_ram, get_server_available_ram, nonrooted_servers, rooted_servers, run_script, total_max_ram } from 'helpers/servers'
import { IServerResult } from 'interfaces/IServerResult.js'
import { Colors } from 'helpers/colors'

let runmode: string
let next_faction_with_augs: string

export async function main(ns: NS) {
  // Get the next faction to get augs for
  for (let f of ['CyberSec', 'NiteSec', 'Tian Di Hui', 'The Black Hand', 'BitRunners', 'Daedalus', 'END'])
  {
    if (f === 'END') {
      next_faction_with_augs = f
      break
    }
    let augs = ns.singularity.getAugmentationsFromFaction(f)
    augs = augs.filter(a=>!ns.singularity.getOwnedAugmentations(false).includes(a))
    if (augs.length > 0)
    {
      next_faction_with_augs = f
      break
    }
  }
  if (!next_faction_with_augs) throw new Error('Could not select a faction to get augmentations from')
  log(ns, 'Selected ' + Colors.Highlight(next_faction_with_augs) + ' as the next faction to get augs from')

  runmode = initAfterReset.name
  set_log_settings(ns, true, true, false)

  kill_previous(ns)
  ns.atExit(async ()=>{
    run_script(ns, 'killall.js')
    log(ns, 'Exiting ' + ns.getRunningScript()?.filename + ' and killing all scripts')
  })

  // The loop might at some point break from within
  while (true) {
    await ns.sleep(1e3)
    log(ns, "Running SAR loop: runmode "+ runmode)

    // Detect runmode
    switch (runmode) {
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

async function initAfterReset(ns: NS) {
  run_script(ns, 'hackall.js', 1)
  await commit_rob_store(ns)
  while (ports_we_can_hack(ns) < 2 && ns.getPlayer().money < 200e3)
  {
    await buy_servers(ns)
    if (ns.getServerMaxRam('home') < 2**10 && ns.getPlayer().money > ns.singularity.getUpgradeHomeRamCost()) {
      run_script(ns, 'simple/upg_home_ram.js', 1)
      await ns.sleep(50)
    }
    await buy_programs(ns)
    await upgrade_port_exploits(ns)
    await hgw_continuous_best_target(ns)
    await backdoor_everything(ns)

    await ns.sleep(1000)
  }

  await travel_if_needed(ns)
  run_script(ns, 'killall.js', 1, (ns.getRunningScript()?.pid ?? 0).toString())
  await ns.sleep(500)
  runmode = operating.name
}

async function operating(ns: NS) {
  // await run_stocks(ns)
  while (ports_we_can_hack(ns) < 5) {
    await buy_servers(ns)

    await upg_home_ram(ns)

    await buy_programs(ns)

    await upgrade_port_exploits(ns)

    await hgw_continuous_best_target(ns)

    await backdoor_everything(ns)

    // await update_hacknet(ns)

    await work_for_faction(ns)

    await ns.sleep(1000)

  }
  runmode = operating_lv_2.name
}
async function operating_lv_2(ns: NS) {
  await kill_all_else(ns)
  await buy_augs(ns)
  await ns.sleep(250)
  while (true) {
    await buy_servers(ns)
    await upg_home_ram(ns)
    await buy_programs(ns)
    await upgrade_port_exploits(ns)
    await update_batchers(ns)
    await backdoor_everything(ns)
    // await update_hacknet(ns)

    await work_for_faction(ns)
    await install_augs(ns)
    // await run_stocks(ns)
    await ns.sleep(1000)
  }
}

async function work_for_faction(ns: NS, work_type='hacking') {
  let work = ns.singularity.getCurrentWork()
  if (ns.singularity.checkFactionInvitations().includes(next_faction_with_augs) && (!work || (work && work['type'] !== 'FACTION'))) {
    run_script(ns, 'simple/work_for_faction.js', 1, next_faction_with_augs, work_type)
  }
}

async function upg_home_ram(ns: NS) {
  if (ns.singularity.getUpgradeHomeRamCost() * 1.5 < ns.getPlayer().money) {
    await await_predicate(ns, ()=>ns.getScriptRam('simple/upg_home_ram.js') < get_server_available_ram(ns, 'home'))
    log(ns, 'Upgrading home RAM from ' + ns.formatRam(ns.getServerMaxRam('home')))
    run_script(ns, 'simple/upg_home_ram.js', 1)
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

      if (ns.singularity.getFactionRep(faction) * 4 > max_rep_required) {
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
      run_script(ns, 'buyserver.js', 1)
      log(ns, 'Bought a server for ' + ns.formatNumber(cost))
      await ns.sleep(1000)
      return
    }
  } else {
    let ram = 2 ** Math.floor(Math.log2(total_max_ram(ns)))
    cost = ns.getPurchasedServerCost(ram)
    if (player.money > cost) 
    {
      run_script(ns, 'buyserver.js', 1)
      log(ns, 'Bought a server for ' + ns.formatNumber(cost) + ' RAM: ' + ns.formatRam(ram))
      await ns.sleep(50)
      return
    }
  }
    
}

export async function buy_programs(ns: NS) {
  
  if (!ns.hasTorRouter() && ns.getPlayer().money > 2e5) {
    run_script(ns, 'simple/purchase_tor.js')
    log(ns, 'Bought TOR Router')
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
    if (!ns.fileExists(p.program, 'home') && ns.getPlayer().money > p.money) {
      run_script(ns, 'simple/purchase_program.js', 1, p.program)
      log(ns, 'Bought ' + p.program)
      await ns.sleep(50)
      run_script(ns, 'hackall.js', 1)
      await ns.sleep(50)
    }
  }
}

async function backdoor_everything(ns: NS) {
  let servers = rooted_servers(ns)
  .filter(x=>!ns.getServer(x).backdoorInstalled)
  .filter(x=>['CSEC', 'I.I.I.I', 'run4theh111z', 'avmnite-02h', 'The-Cave', 'w0r1d_d43m0n'].includes(x))
  .sort((a,b)=>ns.getServerRequiredHackingLevel(a) - ns.getServerRequiredHackingLevel(b))

  for (let s of servers) {
    let server = ns.getServer(s)
    if (!server.backdoorInstalled && ns.getPlayer().skills.hacking >= (server.requiredHackingSkill ?? 0)) {
      if (!run_script(ns, 'connect.js', 1, s)) return
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
  let av_ram = total_available_ram(ns)

  // Don't use more ram if we don't have to
  if (batch_ram_sum * 1.5 > total_max_ram(ns)) return

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
  targets = lmt(ns, false, false).filter(x=>!current_targets.includes(x.name))
  
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

  // find a time factor given how much available RAM we have
  let time_factor = 1.54
  for (let tf of [1.54, 2.22, 2.86, 3.2, 5.83, 6.45, 6.86, 8.57, 11.43, 13.14, 13.55, 14.17, 16.8, 17.14, 17.78, 18.46, 19.17, 20.83, 21.54, 22.22, 22.86, 23.2, 25.83, 26.45, 26.86, 28.57, 31.43, 33.14, 33.55, 34.17, 36.8, 37.14, 37.78, 38.46, 39.17, 40.83, 41.54, 42.22, 42.86, 43.2, 45.83, 46.45, 46.86, 48.57, 51.43, 53.14, 53.55, 54.17, 56.8, 57.14, 57.78, 58.46, 59.17, 60.83, 61.54, 62.22, 62.86, 63.2, 65.83, 66.45, 66.86, 68.57, 71.43, 73.14, 73.55, 74.17, 76.8, 77.14, 77.78, 78.46, 79.17, 80.83, 81.54, 82.22, 82.86, 83.2, 85.83, 86.45, 86.86]) 
  {
    if ((ns.getWeakenTime(target.name) / 5e2) < tf) break
    if (sum_threads * tf * 2.5 + ns.getScriptRam('batch/once.js') * tf > av_ram) break

    time_factor = tf
  }

  run_script(ns, 'batch/initiate.js', 1, target.name, time_factor.toString(), multiplier.toString(), '15')
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

  pid = run_script(ns, filename, threads, ...aargs)
  if (!pid) {
    log(ns, host_name + ': ' + filename + ' was not able to run due to unknown reason')
    pid = run_script(ns, filename, threads, ...aargs)
    await ns.sleep(50)
    return pid
  }
  return 0
}

let hgw_cbt_cur_target: IServerResult
export async function hgw_continuous_best_target(ns: NS, ram_fraction = .9) {
  // Gather some necesssary information
  let targets: IServerResult[] = lmt(ns, false, false, false)
  // hack difficulty is reasonable
  .filter(x=>x.hackingLv*2 < ns.getPlayer().skills.hacking)
  // no server has the capacity to be used to this degree
  // .filter(x=>
  // { 
  //   let hgw_ratios = hack_grow_weaken_ratios(ns,x.name)
  //   let y = hgw_ratios.grow_threads + hgw_ratios.hack_threads 
  //   let z = ram_fraction * total_max_ram(ns) / 2
  //   return y * 4 < z
  // }) 
  if (targets.length < 1) return
  let target = targets.shift() ?? { name: '', score: 0, hackingLv: 1_000_000}
  let a_ram = total_available_ram(ns, 2) * ram_fraction
  let max_ram = total_max_ram(ns)
  let hgw_rs = hack_grow_weaken_ratios(ns, target.name)
  let sum_threads_per_1_hack = hgw_rs.grow_threads_per_hack_thread + hgw_rs.weaken_threads_per_hack + 1

  // Check if we should NOT start a new cycle
  let condition1 = target && hgw_cbt_cur_target?.name === target.name
  let condition2 = !!hgw_cbt_cur_target // We already have a target
  let condition3 = (((hgw_cbt_cur_target?.score ?? 0) * 1.5) >= target.score) // The next best target isn't good enough in order for us to switch
  let condition4 = a_ram * 4 < max_ram // Not enough available ram is being wasted
  if (condition1 && condition2 && condition3 && condition4) {
    return
  }

  log(ns, 'Changing the ' + Colors.Highlight(hgw_continuous_best_target.name) + ' target to ' + Colors.Good(target.name))

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
  a_ram = total_available_ram(ns, 2) 
  let hgw_rs_multiple = Math.floor(a_ram / sum_threads_per_1_hack / 1.8)
  let hack_threads = Math.min(
    Math.max(
      Math.floor(hgw_rs_multiple), 
      1), 
    Math.floor(hgw_rs.hack_threads)
  )
  let grow_threads = Math.max(Math.ceil(hgw_rs_multiple * hgw_rs.grow_threads_per_hack_thread), 1)
  let weaken_threads = Math.max(Math.ceil(hgw_rs_multiple * hgw_rs.weaken_threads_per_hack), 1)

  run_script(ns, 'repeat/hack.js', hack_threads, target.name)
  run_script(ns, 'repeat/grow.js', grow_threads, target.name)
  run_script(ns, 'repeat/weaken.js', weaken_threads, target.name)

  hgw_cbt_cur_target = target
}

async function upgrade_port_exploits(ns: NS) {
  if (nonrooted_servers(ns).filter(s=>ns.getServerNumPortsRequired(s) < ports_we_can_hack(ns)).length > 0) {
    run_script(ns, 'hackall.js')
    await ns.sleep(50)
    await hgw_continuous_best_target(ns)
    await ns.sleep(50)
  }
}
async function commit_rob_store(ns: NS) {
  if (!ns.singularity.getCurrentWork()) {
    run_script(ns, 'simple/commit_crime.js', 1, 'Rob Store')
    await ns.sleep(50)
  }
}

/** Kills all OTHER scripts */
export async function kill_all_else(ns: NS) {
  run_script(ns, 'killall.js', 1, ns.pid.toString())
}

export async function buy_augs(ns: NS) {
  run_script(ns, 'simple/buy_augs.js', 1, next_faction_with_augs)
  await ns.sleep(250)
}

export async function install_augs(ns: NS) {
  let remaining_augs = ns.singularity.getAugmentationsFromFaction(next_faction_with_augs)
  .filter(a=>!ns.singularity.getOwnedAugmentations(true).includes(a)).length

  if (remaining_augs === 0) {
    ns.singularity.installAugmentations('singularity/start_after_reset.js')
  }
}

async function travel_if_needed(ns: NS) {
  if (next_faction_with_augs === 'Tian Di Hui') {
    ns.singularity.travelToCity('Ishima')
  }
}