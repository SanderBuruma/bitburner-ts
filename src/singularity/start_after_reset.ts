import { NS, ProcessInfo } from '@ns'
import { await_predicate, hack_grow_weaken_ratios, kill_previous, log, set_log_settings } from 'helpers/utils.js'
import { ports_we_can_hack } from 'hackall'
import { total_available_ram, nonrooted_servers, rooted_servers, run_script, total_max_ram, scan_all, run_script_with_fraction_threads, continuous_targets } from 'helpers/servers'
import { Colors } from 'helpers/colors'
import { Server } from '/classes/Server'
import { weaken_all } from '/simple/weaken_all'
import { buy_servers } from 'simple/buy_servers'
import { buy_nfgs } from '/simple/buy_augs'
import { connect_directly } from '/connect'

let runmode: string
let next_faction_with_augs: string

export async function main(ns: NS) {
  // Get the next faction to get augs for
  for (let f of ['CyberSec', 'NiteSec', 'Tian Di Hui', 'The Black Hand', 'BitRunners', 'Daedalus', 'END'])
  {
    if (f === 'END') {
      next_faction_with_augs = f
      await endgame_now(ns)
      return
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
    log(ns, "Running SAR loop: runmode "+ Colors.Highlight(runmode))

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
  let player_mults = ns.getPlayer().mults
  if (ns.getPlayer().skills.hacking < 50 && player_mults.hacking_exp * player_mults.hacking > 2.5) {
    ns.singularity.universityCourse('Rothman University', 'Algorithms Course', false)
    log(ns, 'Training ' + Colors.Good('hacking') + ' for ' + Colors.Highlight('15') + ' seconds with a hacking course')
    await ns.sleep(15000)

    log(ns, 'Running ' + Colors.Highlight('simple/weaken.js') + ' with max ram on ' + Colors.Highlight('foodnstuff') + ' for experience. ETA: ' + Colors.Highlight(ns.formatNumber(ns.getWeakenTime('foodnstuff')/1e3,0)) + ' seconds')
    run_script_with_fraction_threads(ns, 'simple/weaken.js', .99, 'foodnstuff')
    await ns.sleep(ns.getWeakenTime('foodnstuff'))
    ns.singularity.stopAction()
    await ns.sleep(50)
  } 
  await commit_rob_store(ns)

  while (ports_we_can_hack(ns) < 2 || ns.getPlayer().money < 200e3)
  {
    await b_servers(ns)
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
  await kill_all_else(ns)
  await ns.sleep(500)
  runmode = operating.name
}

async function operating(ns: NS) {
  while (ports_we_can_hack(ns) < 5) {
    await b_servers(ns)
    await upg_home_ram(ns)
    await buy_programs(ns)
    await upgrade_port_exploits(ns)
    await w_all(ns)
    await update_batchers(ns)
    await backdoor_everything(ns)
    await work_for_faction(ns)
    await ns.sleep(1000)
  }
  runmode = operating_lv_2.name
}
async function operating_lv_2(ns: NS) {
  await buy_augs(ns)
  await ns.sleep(250)
  while (true) {
    await b_servers(ns)
    await upg_home_ram(ns)
    await buy_programs(ns)
    await upgrade_port_exploits(ns)
    await w_all(ns)
    await update_batchers(ns)
    await backdoor_everything(ns)
    await work_for_faction(ns)
    await install_augs(ns)
    await use_surplus_ram(ns)
    rep_to_favor(ns)
    money_to_rep(ns)
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
    await await_predicate(ns, ()=>ns.getScriptRam('simple/upg_home_ram.js') < new Server(ns,'home').AvailableRam)
    log(ns, 'Upgrading home RAM from ' + ns.formatRam(ns.getServerMaxRam('home')))
    run_script(ns, 'simple/upg_home_ram.js', 1)
  }
}

async function b_servers(ns: NS) {
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

  buy_servers(ns, .1) 
}

export async function buy_programs(ns: NS) {
  
  if (!ns.hasTorRouter() && ns.getPlayer().money > 2e5) {
    run_script(ns, 'simple/purchase_tor.js')
    log(ns, 'Bought '+Colors.Good('TOR Router'))
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
      log(ns, 'Bought ' + Colors.Highlight(p.program))
      await ns.sleep(50)
      run_script(ns, 'hackall.js', 1)
      await ns.sleep(50)
    }
  }
}

async function backdoor_everything(ns: NS) {
  let servers = rooted_servers(ns)
  .filter(x=>!ns.getServer(x.Name).backdoorInstalled)
  .filter(x=>['CSEC', 'I.I.I.I', 'run4theh111z', 'avmnite-02h', 'The-Cave', 'w0r1d_d43m0n'].includes(x.Name))
  .sort((a,b)=>ns.getServerRequiredHackingLevel(a.Name) - ns.getServerRequiredHackingLevel(b.Name))

  for (let s of servers) {
    let server = ns.getServer(s.Name)
    if (!server.backdoorInstalled && ns.getPlayer().skills.hacking >= (server.requiredHackingSkill ?? 0)) {
      if (!run_script(ns, 'connect.js', 1, s.Name)) return
      await ns.sleep(250)
      await ns.singularity.installBackdoor()
      ns.singularity.connect('home')
      log(ns, 'Backdoor installed on ' + Colors.Good(s.Name))
    }
  }
}

async function update_batchers(ns: NS) {
  // Gather batching scripts
  let servers = rooted_servers(ns)
  let scripts: ProcessInfo[] = []
  for (let s of servers) {
    let s_scripts = s.RunningScripts
    scripts = scripts.concat(s_scripts)
  }
  scripts = scripts.filter(s=>s.filename == 'singularity/hack_manager.js')

  // Judge how much ram they use
  let batch_ram_sum = calculate_ram_sum(ns)

  // Don't use more ram if we're already using a lot
  if (batch_ram_sum / total_max_ram(ns) > .2) return
  
  // Start new batching script
  /** @type string[] */
  let targets: Server[]
  targets = continuous_targets(ns)
  
  if (targets.length === 0) return
  targets = targets.filter(s=>s.Name != 'n00dles')
  
  // Get a target which doesn't take too long to exploit
  let target: Server = new Server(ns, 'n00dles')
  if (targets.length < 1) return
  while (targets.length > 0) {
    target = targets.shift() ?? new Server(ns, 'n00dles')
    if (!target || ns.getWeakenTime(target.Name) < 5e3 * 60) break
  }
  // If target is already targeted, return
  if (scripts.reduce((a: string[],c)=>a.concat(c.args.map(x=>x.toString())), []).includes(target.Name)) return

  // Calculate a good batch multiplier (by how much money will grow because of the grow.js script)
  let multiplier: number = 1.5
  let sum_threads: number = 0
  let hack_threads = Math.floor((1-(1/multiplier))) / ns.hackAnalyze(target.Name)
  let grow_threads = Math.ceil(ns.growthAnalyze(target.Name, multiplier))
  let weaken_threads = Math.ceil(hack_threads / 25 + grow_threads / 12.5)
  sum_threads = hack_threads + grow_threads + weaken_threads

    
  // find a time factor given how much available RAM we have
  let new_time_factor = .95
  for (let tf of [1.54, 2.22, 2.86, 3.2, 5.83, 6.45, 6.86, 8.57, 11.43, 13.14, 13.55, 14.17, 16.8, 17.14, 17.78, 18.46, 19.17, 20.83, 21.54, 22.22, 22.86, 23.2, 25.83, 26.45, 26.86, 28.57, 31.43, 33.14, 33.55, 34.17, 36.8, 37.14, 37.78, 38.46, 39.17, 40.83, 41.54, 42.22, 42.86, 43.2, 45.83, 46.45, 46.86, 48.57, 51.43, 53.14, 53.55, 54.17, 56.8, 57.14, 57.78, 58.46, 59.17, 60.83, 61.54, 62.22, 62.86, 63.2, 65.83, 66.45, 66.86, 68.57, 71.43, 73.14, 73.55, 74.17, 76.8, 77.14, 77.78, 78.46, 79.17, 80.83, 81.54, 82.22, 82.86, 83.2, 85.83, 86.45, 86.86]) 
  {
    if ((ns.getWeakenTime(target.Name) / 5e2) < tf) break
    if ((tf * sum_threads * 1.5)/total_max_ram(ns) > (total_available_ram(ns) - batch_ram_sum)/total_max_ram(ns)) break

    new_time_factor = tf
  }

  if (new_time_factor < 1.5) return

  // Kill old scripts
  let old_scripts = scan_all(ns).reduce((a: ProcessInfo[],c)=>{
    return a.concat(c.RunningScripts)
  },[])
  .filter(s=>s.filename.includes('hack_manager'))
  .sort((a,b)=>{
    let a_server = new Server(ns, a.args[0].toString())
    let b_server = new Server(ns, b.args[0].toString())
    return a_server.StaticScore - b_server.StaticScore
  })
  while (old_scripts.length > 4) {
    let old_script = old_scripts.shift()
    // let old_time_factor = parseFloat(old_script?.args[1].toString() ?? '0')
    // let trgt = old_script?.args[0]?.toString() ?? ''
    // if (trgt === target.Name && new_time_factor / 1.1 <= old_time_factor) return
    ns.kill(old_script?.pid ?? 0)
  }

  // Run new script
  run_script(ns, 'singularity/hack_manager.js', 1, target.Name, new_time_factor.toString(), multiplier.toString())
  log(
    ns, 
    'Initiating batch on ' + Colors.Highlight(target.Name) 
    + ' tf: ' + Colors.Highlight(new_time_factor.toString()) 
    + ' multi: ' + Colors.Highlight(multiplier.toString())
  )
}

let hgw_cbt_cur_target: Server
export async function hgw_continuous_best_target(ns: NS, ram_fraction = .9) {
  // Gather some necesssary information
  let targets: Server[] = continuous_targets(ns)
  .filter(x=>x.HackingRequirement*2 < ns.getPlayer().skills.hacking)
  if (targets.length < 1) return
  let target: Server = targets.shift() ?? new Server(ns, 'error')
  let a_ram = total_available_ram(ns, 2) * ram_fraction
  let max_ram = total_max_ram(ns)
  let hgw_rs = hack_grow_weaken_ratios(ns, target.toString())
  let sum_threads_per_1_hack = hgw_rs.grow_threads_per_hack_thread + hgw_rs.weaken_threads_per_hack + 1

  // Check if we should NOT start a new cycle
  // let condition1_same_target = target && hgw_cbt_cur_target?.Name === target.Name // New target is different
  let condition2_no_target = !!hgw_cbt_cur_target // We already have a target
  let condition3_score = (((hgw_cbt_cur_target?.StaticScore ?? 0) * 1.5) >= target.StaticScore) // The next best target isn't good enough in order for us to switch
  // let condition4_a_ram = a_ram / max_ram < .4 // Not enough available ram is being wasted
  if (condition2_no_target && condition3_score) {//} && condition4_a_ram) {
    return
  }

  // if (condition1_same_target) 
  // {
  //   log(ns, 'updating ' +Colors.Highlight(hgw_continuous_best_target.name) + ' without a new target')
  // } else {
  log(ns, 'updating ' +Colors.Highlight(hgw_continuous_best_target.name)+ ' from ' + Colors.Highlight(hgw_cbt_cur_target?.Name ?? 'no server') + ' to ' + Colors.Highlight(target.Name))
  // }

  // Kill the old continuous cycle
  let y = rooted_servers(ns).reduce((a: number[],c)=>{
    return a.concat(
      c.RunningScripts
      .filter(x=>/^repeat\/(hack|grow|weaken).js$/.test(x.filename))
      .map(x=>x.pid)
    )
  },[]).forEach(x=>{
    ns.kill(x)
  })
  await ns.sleep(100)

  // Start the new continuous cycle
  a_ram = total_available_ram(ns, 2) 
  let hgw_rs_multiple = Math.floor(a_ram / sum_threads_per_1_hack / 3.8)
  let hack_threads = Math.min(
    Math.max(
      Math.floor(hgw_rs_multiple), 
      1), 
    Math.floor(hgw_rs.fraction/ns.hackAnalyze(target.Name))
  )
  let grow_threads = Math.max(Math.ceil(hack_threads * hgw_rs.grow_threads_per_hack_thread), 1)
  let weaken_threads = Math.max(Math.ceil(hack_threads * hgw_rs.weaken_threads_per_hack), 1)

  run_script(ns, 'repeat/hack.js', hack_threads, target.toString())
  run_script(ns, 'repeat/grow.js', grow_threads, target.toString())
  run_script(ns, 'repeat/weaken.js', weaken_threads, target.toString())

  hgw_cbt_cur_target = target
}

async function upgrade_port_exploits(ns: NS) {
  if (nonrooted_servers(ns).filter(s=>s.PortsRequirement < ports_we_can_hack(ns)).length > 0) {
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

async function w_all(ns: NS, fraction = .5) {
  weaken_all(ns, fraction)
  await ns.sleep(50)
}

async function use_surplus_ram(ns: NS) {
  if (total_available_ram(ns) / total_max_ram(ns) < .7) return
  run_script_with_fraction_threads(ns, 'repeat/weaken.js', .5, 'foodnstuff')
  run_script_with_fraction_threads(ns, 'repeat/share.js', .2, 'foodnstuff')
  await ns.sleep(100)
}

function calculate_ram_sum(ns: NS) {
  // Gather batching scripts
  let servers = rooted_servers(ns)
  let scripts: ProcessInfo[] = []
  for (let s of servers) {
    let s_scripts = s.RunningScripts
    scripts = scripts.concat(s_scripts)
  }
  scripts = scripts.filter(s=>s.filename == 'singularity/hack_manager.js')

  // Judge how much ram they use
  let batch_ram_sum = ns.getScriptRam('singularity/hack_manager.js') * scripts.length
  for (let s of scripts) {
    let target = s.args[0].toString()
    let timing_fraction = parseFloat(s.args[1].toString())
    let multiplier = parseFloat(s.args[2].toString())

    let hack_threads = Math.floor((multiplier-1) / ns.hackAnalyze(target))
    let grow_threads = Math.ceil(ns.growthAnalyze(target, multiplier))
    batch_ram_sum += timing_fraction * hack_threads * .25 * ns.getScriptRam('simple/hack.js')
    batch_ram_sum += timing_fraction * grow_threads * .8 * ns.getScriptRam('simple/grow.js')
    batch_ram_sum += timing_fraction * Math.ceil(hack_threads / 25 + grow_threads / 12.5)
  }
  
  return batch_ram_sum
}

/** Get enough favor for donations */
function rep_to_favor(ns: NS) { 
  let favor_gain = ns.singularity.getFactionFavorGain(next_faction_with_augs)
  let cur_favor = ns.singularity.getFactionFavor(next_faction_with_augs)
  if (cur_favor >= 150 || favor_gain+cur_favor<150) {
    return
  }
  buy_nfgs(ns,next_faction_with_augs)
  ns.singularity.installAugmentations('singularity/start_after_reset.js')
}

/** Get enough money for final rep requirements */
function money_to_rep(ns: NS) {
  let cur_favor = ns.singularity.getFactionFavor(next_faction_with_augs)

  if (cur_favor < 150) return

  if (ns.getPlayer().money < 2e12) return

  let faction_augs_sorted = ns.singularity.getAugmentationsFromFaction(next_faction_with_augs).sort((a,b)=>ns.singularity.getAugmentationRepReq(b)-ns.singularity.getAugmentationRepReq(a))
  let most_rep_intensive_aug = faction_augs_sorted.shift() ?? ''
  if (ns.singularity.getAugmentationRepReq(most_rep_intensive_aug) <= ns.singularity.getFactionRep(next_faction_with_augs)) {
    return
  }
  
  ns.singularity.donateToFaction(next_faction_with_augs, 1e12)
}

async function endgame_now(ns: NS) {
  await ns.sleep(250)
  ns.singularity.universityCourse('Rothman University', 'Algorithms Course', false)
  log(ns, 'Training ' + Colors.Good('hacking') + ' for ' + Colors.Highlight('15') + ' seconds with a hacking course')
  await ns.sleep(15000)

  log(ns, 'Running ' + Colors.Highlight('simple/weaken.js') + ' with max ram on ' + Colors.Highlight('foodnstuff') + ' for experience. ETA: ' + Colors.Highlight(ns.formatNumber(ns.getWeakenTime('foodnstuff')/1e3,0)) + ' seconds')
  run_script_with_fraction_threads(ns, 'simple/weaken.js', .99, 'foodnstuff')
  await ns.sleep(ns.getWeakenTime('foodnstuff'))
  ns.singularity.stopAction()
  await ns.sleep(50)

  while (ns.getPlayer().skills.hacking < ns.getServerRequiredHackingLevel('w0r1d_d43m0n')) {
    await b_servers(ns)
    await buy_programs(ns)
    await upgrade_port_exploits(ns)
    await w_all(ns)
    await update_batchers(ns)
    await backdoor_everything(ns)
    await ns.sleep(1000)
  }

  connect_directly(ns, 'w0r1d_d43m0n')
  ns.singularity.destroyW0r1dD43m0n(5, 'singularity/init_bitnode.js')
}