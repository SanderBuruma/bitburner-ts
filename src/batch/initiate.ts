import { rooted_servers, total_available_ram, get_server_available_ram, run_script } from 'helpers/servers.js'
import { NS } from '@ns'
import { Colors } from 'helpers/colors'

let exploitTiming: number
let timingFactor: number
let weaken_time2: number
let target: string

export async function main(ns: NS) {
  ns.disableLog('ALL')
  let exploit_start_time
  
  target = ns.args[0].toString() ?? 'n00dles'

  timingFactor = parseFloat(ns.args[1].toString() || '3.5')
  adjust_exploit_timing(ns)

  let multiplier = parseFloat(ns.args[2].toString() || '2')
  if (multiplier > 2) {
    ns.tprintf(Colors.warning()+'Multiplier with value ' + multiplier + ' is too high, should be less than or equal to 2, adjusting...')
    multiplier = 2
  }
  if (multiplier <= 1) {
    ns.tprintf(Colors.warning()+'Multiplier with value ' + multiplier + ' is too low, should be greater than 1, adjusting...')
    multiplier = 1.001
  }

  if (!ns.hasRootAccess(target)) {
    ns.alert('Error: We do not have root access to: ' + target)
    return
  }

  /** The leniency factor which tries to account for computer calculations lagging, in milliseconds */
  let timingLeniency = parseFloat(ns.args[3].toString() || '50')
  if (timingLeniency < 10) throw new Error("The timingLeniency argument must be greater than 10")
  if (timingLeniency >= 1500) throw new Error("The timingLeniency argument must be less than or equal to 1500")
  if (timingLeniency*5 >= weaken_time2) throw new Error("The timingLeniency argument * 5 must be greater than the weaken time " + weaken_time2)

  ns.tprintf(JSON.stringify({ multiplier, exploitTiming, timingFactor, timingLeniency, weaken_time2 }))

  ns.clearLog()
  let runmode = 'analyze'
  while (true) {
    ns.clearLog()
    let sleep_time = 0
    ns.printf('runmode: ' + runmode + ' server: ' + target)
      await ns.sleep(1e3)
    if (runmode === 'analyze') {

      if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)) {
        runmode = 'weaken'
      } else if (ns.getServerMaxMoney(target) > ns.getServerMoneyAvailable(target) * 1.2) {
        runmode = 'grow'
      } else {
        runmode = 'exploit'
      }
    } else if (runmode === 'weaken') {

      let secDifference = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)
      let maxThreads = Math.max(1, Math.floor(secDifference / .05 + 1))
      run_script(ns, 'simple/weaken.js', maxThreads, target)

      sleep_time = Math.ceil(((ns.getWeakenTime(target) + 500) || 1000) / 1000)

      runmode = 'analyze'
    } else if (runmode === 'grow') {

      let grow_threads = Math.ceil(
        ns.growthAnalyze(
          target,
          2
        )
      )
      ns.print('maxThreads: ' + grow_threads)
      let av_ram = total_available_ram(ns, 2)
      for (let i = 0; i < Math.log2(ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target)); i++){
        if (av_ram < grow_threads * 2.2) break
        run_script(ns, 'simple/grow.js', Math.floor(grow_threads), target)
        run_script(ns, 'simple/weaken.js', Math.ceil(grow_threads/8), target)
        av_ram -= grow_threads * 2.2
      }

      sleep_time = Math.ceil(((ns.getWeakenTime(target) + 500) || 1000) / 1000)
      ns.print('grow phase - sleep time: ' + sleep_time + ' seconds')

      runmode = 'analyze'

    } else if (runmode === 'exploit') {

      let hackPercentage = 1 - 1 / multiplier
      let growthThreads = Math.ceil(ns.growthAnalyze(target, multiplier))
      let hackThreads = Math.floor(ns.hackAnalyzeThreads(target, ns.getServerMoneyAvailable(target) * hackPercentage))
      let weakenThreads = Math.ceil(growthThreads / 12.5 + hackThreads / 25)
      let totalThreads = growthThreads + hackThreads + weakenThreads
      ns.print({
        msg: "Check",
        target,
        multiplier,
        host: ns.getHostname(),
        totalThreads,
        growthThreads,
        hackThreads,
        weakenThreads,
        total_available_ram: total_available_ram(ns)
      })

      exploit_start_time = Date.now()
      while (totalThreads * 1.85 < total_available_ram(ns)) {
        exploitTiming = ns.getWeakenTime(target) / timingFactor
        await ns.sleep(0)

        run_script(ns, 'batch/once.js', 1, target, multiplier.toString(), timingLeniency.toString())

        while (exploit_start_time + exploitTiming > Date.now()) await ns.sleep(1)
        if (!adjust_exploit_timing(ns)) {
          ns.tprintf(JSON.stringify({ msg: "Exploit timing became too small, terminating" }))
          return
        }
        exploit_start_time += exploitTiming
      }
      ns.tprintf(JSON.stringify({ msg:"Exited the while loop: " + totalThreads + " * 1.85 < " + total_available_ram(ns) + " - failed", totalThreads, total_available_ram: total_available_ram(ns), hackPercentage }))
      break

    } else {

      throw new Error('Runmode not found: ' + runmode);
    }

    await ns.sleep((sleep_time || 1) * 1e3)
  }
}

function adjust_exploit_timing(ns: NS) {
  weaken_time2 = ns.getWeakenTime(target)
  exploitTiming = weaken_time2 / timingFactor

  if (exploitTiming <= 1e3) {
    return false
  } else {
    return true
  }
}