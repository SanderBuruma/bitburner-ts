import { NS } from '@ns'
import { rooted_servers, run_script } from 'helpers/servers.js'
import { Colors } from 'helpers/colors.js'
import { Server } from '/classes/Server'

export async function main(ns: NS) {
  let f: string = ns.args[0].toString() || 'servers'
  let target: string = ns.args[1]?.toString() || 'n00dles'

  if (f == 'target_analyze') {
    ns.tprintf("target_analyze")
    await target_analyze(ns, target)
  } else if (f == 'net_worth') {
    ns.tprintf("net_worth: "+net_worth(ns))
  } else if (f == 'gthreads') {
    let result = hack_grow_weaken_ratios(ns, ns.args[1]?.toString())
    ns.printf(JSON.stringify(result, null, 2))
  } else if (f == 'summarize_scripts') {
    let results = summarize_scripts(ns)
    for (let result of results)
    {
      ns.tprintf('%s uses %s threads', Colors.Highlight(result.name_args.padEnd(60)), Colors.Highlight(ns.formatNumber(result.threads, 0)))
    }
  } else {
    throw new Error('Variable f doesn\'t call for a valid value')
  }
}

/** @description calculates how many continuous grow and hack threads need to run to counter 1 hack thread */
export function hack_grow_weaken_ratios(ns: NS, target: string = 'foodnstuff', multiplier = 1.25) {
  if (!target) throw new Error('No target selected')
  let grow_threads = ns.growthAnalyze(target, multiplier)
  let fraction = 1-1/multiplier
  let hack_threads = ns.hackAnalyzeThreads(target, ns.getServerMoneyAvailable(target) * fraction)
  let grow_threads_per_hack_thread = grow_threads / hack_threads * 4
  let weaken_threads_per_hack = (1.2*grow_threads_per_hack_thread/10 + 4/25)
  return {target, grow_threads, hack_threads, multiplier, fraction, grow_threads_per_hack_thread, weaken_threads_per_hack}
}



/** @description gives weaken time, max and current money, minsec, sec, hack req */
export function target_analyze(ns: NS, target: string) {
  ns.tprintf('Target wTime    :' + Colors.Highlight(ns.formatNumber(ns.getWeakenTime(target)/1e3)))
  ns.tprintf('Target max money:' + Colors.Highlight(ns.formatNumber(ns.getServerMaxMoney(target))))
  ns.tprintf('Target cur money:' + Colors.Highlight(ns.formatNumber(ns.getServerMoneyAvailable(target))))
  ns.tprintf('Target minsec   :' + Colors.Highlight(ns.getServerMinSecurityLevel(target).toString()))
  ns.tprintf('Target sec      :' + Colors.Highlight(ns.getServerSecurityLevel(target).toString()))
  ns.tprintf('Target hack req :' + Colors.Highlight(ns.getServerRequiredHackingLevel(target).toString()))
}

let print_to_terminal = true
let print_to_file = true
/** @description sets the default setting for logging for the running script */
export function set_log_settings(ns: NS, ptt=true, ptf=true, default_log=false) {
  print_to_terminal = ptt
  print_to_file = ptf

  if (!default_log) ns.disableLog('ALL')
  else ns.enableLog('ALL')
}

export function log(ns: NS, log_message: string) {
  ns.printf(log_message)
  if (print_to_terminal) ns.tprintf(log_message)

  let date = new Date();
  let parts = date.toLocaleString('en-US', {hour12: false}).split(', ');
  let dateParts = parts[0].split('/');
  let year = dateParts[2];
  let month = dateParts[0].padStart(2, '0');
  let day = dateParts[1].padStart(2, '0');
  let timePart = parts[1].split(':').slice(0, 2).join(':');  // Take hours and minutes
  let reversedDate = `${year}-${month}-${day} ${timePart}`;
  if (print_to_file) ns.write('log/' + ns.getRunningScript()?.filename +'.txt', reversedDate + ' ' + log_message + '\n', 'a')
}

/** @description returns your total net worth (ie. how much money you'll have if you sell everything you can sell) */
export function net_worth(ns: NS) {
  let stocks_value = ns.stock.getSymbols().map(x=>ns.stock.getPosition(x)[0]*ns.stock.getBidPrice(x))
  let sum = stocks_value.reduce((a,c)=>{
    return a + c
  }, 0)
  return sum + ns.getPlayer().money
}

/** @description Kills all previous instances of the calling script on the host */
export function kill_previous(ns: NS) {
  let previous = ns.ps().filter(
    x=> {
      return (
        x.filename === ns.getRunningScript()?.filename && 
        x.pid != ns.getRunningScript()?.pid
      )
    }
  )
  previous.forEach(x=>ns.kill(x.pid))
}

/** @description writes data to a port matching the pid of the running script */
export function write_to_port(ns: NS, data: object) {
  ns.writePort(ns.getRunningScript()?.pid ?? 0, JSON.stringify(data))
}

/** @description runs a script, reads and returns the data as an object when finished. REQUIRES that data will be written and that the data be an object.
 */
export async function run_write_read(ns: NS, filename: string, threads: number, ...args: any[]) {
  // Wait for enough RAM to free up
  let server = new Server(ns, ns.getHostname())
  await await_predicate(ns, ()=>ns.getScriptRam(filename) * threads < server.AvailableRam) 
  
  // Execute!
  let pid = run_script(ns, filename, threads, ...args)
  if (pid === 0) throw new Error('Failure to run ' + filename + ' threads: ' + threads + ' args ' + JSON.stringify(args))
  let port = ns.getPortHandle(pid)
  await await_predicate(ns, ()=>port.peek() != "NULL PORT DATA", 250)
  let data = port.read().toString()
  return JSON.parse(data)
}

/** @description waits for the predicate to become true. The timeout should be longer than how long the predicate is expected to take at any point
 * @param {() => boolean} predicate return a boolean value which will release the await when true
 * @param {number} timeout how long (ms) to wait before throwing a timeout error, default = Infinity
*/
export async function await_predicate(ns: NS, predicate: () => boolean, timeout: number = Infinity) {
  let init_time = Date.now()
  while (!predicate() && init_time + timeout > Date.now()) await ns.sleep(5)
  if (init_time + timeout <= Date.now()) {
    throw new Error('Timed out in ' + await_predicate.name + ' predicate: ' + predicate.toString() + '\nPerhaps the timeout was too short at ' + ns.formatNumber(timeout/1e3))
  }
}

export async function await_predicate_then_do_callback(ns: NS, predicate: () => boolean, callback: () => Promise<void>, timeout: number = Infinity) {
  await await_predicate(ns, predicate, timeout)
  await callback()
}

function summarize_scripts(ns: NS) {
  let repeat_scripts = rooted_servers(ns)
  .map(server=>server.RunningScripts)
  .reduce((a,c)=>a.concat(c), [])
  .sort()

  let targets_plus_args = repeat_scripts.map(script=>{
    return {
      name_args: script.filename + " " + script.args.join(', '),
      threads: script.threads
    }
  })
  let ar: {name_args: string, threads: number}[] = []
  for (let tpa of targets_plus_args) {
    if (ar.filter(x=>x.name_args == tpa.name_args).length>0) {
      let index = ar.findIndex(x=>x.name_args === tpa.name_args)
      ar[index].threads += tpa.threads
    } else {
      ar.push(tpa)
    }
  }
  ar = ar.sort((a,b)=>a.threads - b.threads)
  return ar
}