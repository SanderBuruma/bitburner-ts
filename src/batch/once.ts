import { get_server_available_ram, rooted_servers } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {
  let target= ns.args[0].toString()
  if (!target) {
    throw new Error(`Please select a target`)
  }

  let now = Date.now()
  let multiplier = parseFloat(ns.args[1].toString() || '2')
  if (multiplier <= 1) throw new Error("The multiplier argument must be greater than 1")
  if (multiplier >= 5) throw new Error("The multiplier argument must be less than or equal to 5")
  ns.disableLog('ALL')

  let timingLeniency = parseFloat(ns.args[2].toString() || '50')
  if (timingLeniency <= 10) throw new Error("The timingLeniency argument must be greater than 10")
  if (timingLeniency >= 1500) throw new Error("The timingLeniency argument must be less than or equal to 1500")
  
  let growthThreads = Math.ceil(ns.growthAnalyze(target, multiplier))
  let x = 1 - 1/multiplier
  let hackThreads = Math.floor(ns.hackAnalyzeThreads(
    target, 
    x * ns.getServerMoneyAvailable(target) / 1.1
  ))
  let weakenThreads = Math.ceil(growthThreads / 10 + hackThreads / 20)
  ns.print({weakenThreads, growthThreads, hackThreads})

  // Start the weaken script
  let wTime = ns.getWeakenTime(target)
  if (!runScript(ns, target, 'line1/weaken.js', weakenThreads)) return
  let weakenFinishTime = Date.now() + wTime
  ns.print({msg:'weakening', dn: Date.now() - now})

  // Wait to start growth script
  await ns.sleep(ns.getWeakenTime(target) - ns.getGrowTime(target) - timingLeniency)
  while ((Date.now() - now) < (wTime - ns.getGrowTime(target) - timingLeniency)) await ns.sleep(1)
  if (!runScript(ns, target, 'simple/grow.js', growthThreads)) return
  ns.print({msg:'growing', dn: Date.now() - now})
  let growFinishTime = Date.now() + ns.getGrowTime(target)

  // Wait to start hack script
  await ns.sleep(ns.getGrowTime(target) - ns.getHackTime(target) - timingLeniency * 2)
  while ((Date.now() - now) < (wTime - ns.getHackTime(target) - timingLeniency * 2)) await ns.sleep(1)
  if (!runScript(ns, target, 'simple/hack.js', hackThreads)) return
  let hackFinishTime = Date.now() + ns.getHackTime(target)
  ns.print({msg:'hacking', dn: Date.now() - now})

  // Wait to finish the script
  await ns.sleep(ns.getHackTime(target) - timingLeniency * 1)
  while ((Date.now() - now) < (ns.getWeakenTime(target) + timingLeniency * 3)) await ns.sleep(1)
  ns.print({msg: ns.getRunningScript()?.filename ?? 'error' + ' completed', dn: Date.now() - now, 
  weakenMgrow: weakenFinishTime-growFinishTime, 
  growMhack: growFinishTime-hackFinishTime})

}

function runScript(ns: NS, target: string, scriptName: string, threads: number) {
  let servers = rooted_servers(ns)
  for (let s of servers) {
    let availableRam = get_server_available_ram(ns, s)
    if (availableRam > threads * ns.getScriptRam(scriptName)) {
      
      if (!ns.exec(scriptName, s, threads, target)) 
      { 
        ns.print({msg: "Failed execution; no individual server has enough ram", scriptName, threads, target, host:ns.getHostname()})
        return false
      }
      return true
    }
  }
  ns.print({msg: "Not enough ram", scriptName, threads, target, host:ns.getHostname()})
  return false
}