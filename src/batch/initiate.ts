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
  let start = Date.now()
  
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

      if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) * 1.2) {
        runmode = 'weaken'
      } else if (ns.getServerMaxMoney(target) > ns.getServerMoneyAvailable(target) * 1.2) {
        runmode = 'grow'
      } else {
        runmode = 'exploit'
      }
    } else if (runmode === 'weaken') {

      let own_servers = rooted_servers(ns)

      let secDifference = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)
      let maxThreads = Math.floor(secDifference / .05)
      run_script(ns, 'simple/weaken.js', maxThreads, target)

      sleep_time = Math.ceil(((ns.getWeakenTime(target) + 500) || 1000) / 1000)

      runmode = 'analyze'
    } else if (runmode === 'grow') {

      let own_servers = rooted_servers(ns)

      let maxActualRatio = ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target)
      let maxThreads = Math.floor(
        ns.growthAnalyze(
          target,
          Math.min(5, maxActualRatio)
        )
      )
      ns.print('maxThreads: ' + maxThreads)
      run_script(ns, 'simple/grow.js', maxThreads, target)

      sleep_time = Math.ceil(((ns.getGrowTime(target) + 500) || 1000) / 1000)
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
        await ns.sleep(0)
        let hosts = rooted_servers(ns)
          .sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
          .filter(s => ns.getScriptRam('batch/once.js') + ns.getServerUsedRam(s) < ns.getServerMaxRam(s))
        let host = hosts[0]
        if (host) {
          ns.print({msg:"Executing batch/once.js", host, date:Math.floor((Date.now()-start)/1e3)})
          if (!run_script(ns, 'batch/once.js', 1, target, multiplier.toString(), timingLeniency.toString())) {
            ns.tprintf(JSON.stringify({
              msg: Colors.bad("Error: ") + "unknown reason",
              target,
              multiplier,
              host,
              totalThreads,
              growthThreads,
              hackThreads,
              weakenThreads,
              total_available_ram: total_available_ram(ns)
            }))
            return
          }
        } else {
          ns.tprintf(JSON.stringify({
            msg: "Error: not enough hosts with enough RAM: " + ns.formatRam(ns.getScriptRam('batch/once.js')),
            target, 
            multiplier,
            host: ns.getHostname(),
            totalThreads,
            growthThreads,
            hackThreads,
            weakenThreads,
            total_available_ram: total_available_ram(ns)
          }))
        }

        while (exploit_start_time + exploitTiming > Date.now()) await ns.sleep(0)
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

    await ns.sleep((sleep_time || 1) * 1000)
  }
}

function adjust_exploit_timing(ns: NS) {
  weaken_time2 = ns.getWeakenTime(target)
  exploitTiming = weaken_time2 / timingFactor

  if (exploitTiming <= 100) {
    return false
  } else {
    return true
  }
}