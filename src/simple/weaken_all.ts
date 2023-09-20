import { rooted_servers, run_script, total_available_ram, total_max_ram } from 'helpers/servers.js'
import { NS, ProcessInfo } from '@ns'
import { log } from '/helpers/utils'
import { Colors } from '/helpers/colors'
import { ports_we_can_hack } from '/hackall'

export async function main(ns: NS) {
  ns.disableLog('ALL')
  let ram_fraction = parseFloat(ns.args[0]?.toString() ?? '.5')
  if (ram_fraction > 1 || ram_fraction <= 0) throw new Error('weaken_all needs a fraction argument between 0 and 1')
  log(ns, Colors.Warning() + 'Initiated weaken all versus some but not ALL servers with ' + Colors.Highlight(ports_we_can_hack(ns).toString()) + ' ports or less which were not at minimum security, will continue spawning weaken scripts until all rooted servers are reduced')
  while (!weaken_all(ns, ram_fraction)) {
    await ns.sleep(1e3)
  }
  log(ns, Colors.Good() + 'Initiated weaken all versus all servers with ' + Colors.Highlight(ports_we_can_hack(ns).toString()) + ' ports or less which were not at minimum security')
}
/** @param {number} ram_fraction How much of your total ram to use 
 * @return {boolean} whether or not all servers are being weakened
*/
export function weaken_all(ns: NS, ram_fraction: number = .5): boolean {
  let script_ram = ns.getScriptRam('simple/weaken.js')
  let tm_ram = total_max_ram(ns)
  for (let target of rooted_servers(ns).filter(server=>server.Rooted && !server.AtMinSec).sort((a,b)=>a.HackingRequirement - b.HackingRequirement))
  {
    /** How much more RAM we're willing to use */
    let ta_ram = total_available_ram(ns, script_ram) - tm_ram*(1-ram_fraction)
    if (ta_ram < script_ram) return false
    let w_threads = Math.ceil((target.Sec - target.MinSec)/.05)
    // Subtract existing weaken threads running against the target
    let w_existing_threads = rooted_servers(ns).reduce((a: ProcessInfo[],c)=>a.concat(c.RunningScripts.filter(x=>x.args.includes(target.Name))), []).reduce((a: number,c)=>a+c.threads,0)
    w_threads = Math.max(1,Math.min(w_threads, Math.floor(ta_ram / script_ram)))
    w_threads -= w_existing_threads
    if (w_threads < 1) continue
    if (ta_ram < w_threads * script_ram) {
      throw new RangeError('This shouldn\'t happen..., not enough available ram\nta_ram < w_threads * script_ram')
    }
    run_script(ns, 'simple/weaken.js', w_threads, target.Name, ns.getRunningScript()?.filename??'')
  }
  return true
}