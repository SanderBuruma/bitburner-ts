import { run_script } from 'helpers/servers.js'
import { NS } from '@ns'
import { Server } from '/classes/Server'

export async function main(ns: NS) {
  let target= ns.args[0].toString()
  if (!target || ns.getServer(target) === undefined) {
    throw new Error(`Please select a proper target`)
  }
  let target_server = new Server(ns, target)

  let now = Date.now()
  let multiplier = parseFloat(ns.args[1].toString() || '2')
  if (multiplier <= 1) throw new Error("The multiplier argument must be greater than 1")
  if (multiplier >= 5) throw new Error("The multiplier argument must be less than or equal to 5")
  ns.disableLog('ALL')

  let timingLeniency = parseFloat(ns.args[2].toString() || '50')
  if (timingLeniency <= 10) throw new Error("The timingLeniency argument must be greater than 10")
  if (timingLeniency >= 1500) throw new Error("The timingLeniency argument must be less than or equal to 1500")
  
  let growthThreads = Math.ceil(ns.growthAnalyze(target_server.name, multiplier))
  let x = 1 - 1/multiplier
  let hackThreads = Math.floor(ns.hackAnalyzeThreads(
    target_server.name, 
    x * ns.getServerMoneyAvailable(target_server.name) / 1.1
  ))
  let weakenThreads = Math.ceil(growthThreads / 10 + hackThreads / 20)
  ns.print({weakenThreads, growthThreads, hackThreads})

  // Start the weaken script
  while (!target_server.atMinSec) await ns.sleep(1)
  let wTime = ns.getWeakenTime(target_server.name)
  if (!run_script(ns, 'simple/weaken.js', weakenThreads, target_server.name)) return
  let weakenFinishTime = ((Date.now() + ns.getWeakenTime(target_server.name))/1e3) % 100
  ns.print({msg:'weakening', dn: Date.now() - now})

  // Wait to start growth script
  await ns.sleep(ns.getWeakenTime(target_server.name) - ns.getGrowTime(target_server.name) - 3*timingLeniency)
  while ((Date.now() - now) < (wTime - ns.getGrowTime(target_server.name) - 3*timingLeniency)) await ns.sleep(1)
  while (!target_server.atMinSec) await ns.sleep(1)
  if (!run_script(ns, 'simple/grow.js', growthThreads, target_server.name)) return
  let growFinishTime = ((Date.now() + ns.getGrowTime(target_server.name))/1e3) % 100
  ns.print({msg:'growing', dn: Date.now() - now})

  // Wait to start hack script
  await ns.sleep(ns.getGrowTime(target_server.name) - ns.getHackTime(target_server.name) - 5*timingLeniency * 2)
  while ((Date.now() - now) < (wTime - ns.getHackTime(target_server.name) - 5*timingLeniency * 2)) await ns.sleep(1)
  while (!target_server.atMinSec) await ns.sleep(1)
  if (!run_script(ns, 'simple/hack.js', hackThreads, target_server.name)) return
  let hackFinishTime = ((Date.now() + ns.getHackTime(target_server.name))/1e3) % 100
  ns.print({msg:'hacking', dn: Date.now() - now})

  if (hackFinishTime >= growFinishTime) ns.tprint({msg:"hack >= growTime", hackFinishTime,growFinishTime})
  if (growFinishTime >= weakenFinishTime) ns.tprint({msg:"grow >= weakenTime", growFinishTime,weakenFinishTime})

}
