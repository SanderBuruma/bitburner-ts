import { NS, ProcessInfo } from '@ns'
import { root_servers, available_ram, max_ram, run_script, kill_previous, log } from 'utils.js'
import { execute as list_money_targets} from 'list_money_targets.js'

let last_home_ram
let runmode

export async function main(ns: NS) {

  ns.disableLog('ALL')
  last_home_ram = ns.getServerMaxRam('home')
  runmode = 'initiating'
  kill_previous(ns)
  ns.atExit(async ()=>{
    await xrun(ns, 'killall.js')
    log(ns, 'Exiting ' + ns.getRunningScript()?.filename + ' and killing all scripts')
  })
  log(ns, 'Starting ' + ns.getRunningScript()?.filename)

  while (true) {
    await ns.sleep(1e3)
    
    if (runmode === 'initiating') {

      await xrun(ns, 'killall.js', 1, ns.getRunningScript()?.pid.toString()??'0')
      await ns.sleep(50)
      await xrun(ns, 'hackall.js')
      await ns.sleep(50)
      if (available_ram(ns) >= 256) {
        await xrun(ns, 
          'batch/initiate.js',
          1, 
          'foodnstuff', 
          '1.8', 
          Math.min(1.00004 ** ns.getServerMaxRam('home'), 1.5).toString(), 
          '50'
        )
        await ns.sleep(50)
        await xrun(ns, 'simple/commit_crime.js', 1, 'Rob Store')
        await ns.sleep(50)
      }
      await xrun(ns, 'weaken_all_r.js')
      await ns.sleep(50)

      log(ns, 'Initiated ' + ns.getRunningScript()?.filename)

      runmode = 'operating'

    } else if (runmode === 'operating') {

      await upg_home(ns)
      await buy_servers(ns)
      await buy_programs(ns)
      // await update_hacknet(ns)
      await backdoor_everything(ns)
      await update_batchers(ns)
      // await train_with_faction(ns)
      // await buy_augs(ns)
      // await install_augs(ns)
      // await run_stocks(ns)
    }
  }
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
      await ns.sleep(50)
      return
    }
  } else {
    cost = ns.getPurchasedServerCost(32)
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
      await xrun(ns, 'simple/purchase_program.js', 1, p.program)
      await ns.sleep(50)
      await xrun(ns, 'hackall.js', 1)
      await ns.sleep(50)
    }
  }
}

async function backdoor_everything(ns: NS) {
  let servers = root_servers(ns)

  for (let s of servers) {
    let server = ns.getServer(s)
    if (!server.backdoorInstalled && ns.getPlayer().skills.hacking >= (server.requiredHackingSkill ?? 0)) {
      if (!xrun(ns, 'connect.js', 1, s)) return
      await ns.sleep(250)
      await ns.singularity.installBackdoor()
      log(ns, 'Backdoor installed on ' + s)
    }
  }
}

async function update_batchers(ns: NS) {
  // Gather batching scripts
  let servers = root_servers(ns)
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
  targets = list_money_targets(ns)
  
  if (targets.length == 0) return
  targets = targets.filter(s=>s.name != 'n00dles')
  
  // Get a target which doesn't too long to exploit
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
  let host_name = ns.getHostname()
  if (ns.getServerMaxRam(host_name) - ns.getServerUsedRam(host_name) < ns.getScriptRam(filename) * threads) {
    log(ns, host_name + ': ' + filename + ' was not able to run due to lack of RAM')
    run_script(ns, filename, threads, ...aargs)
    await ns.sleep(50)
  }

  if (!ns.run(filename, threads, ...aargs)) {
    log(ns, host_name + ': ' + filename + ' was not able to run due to unknown reason')
    run_script(ns, filename, threads, ...aargs)
    await ns.sleep(50)
    return false
  }
  return true
}