import { scan_all } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {
  let servers = scan_all(ns)  
  let dont_kill_pids = ns.args.map(n=>parseInt(n.toString()))

  for (let s of servers) {
    if (s.Name == 'home') {
      continue
    }
    let scripts = s.RunningScripts
    if (scripts.length < 1) { 
      continue
    }
    ns.print({server:s, scripts:scripts.map(x=>x.filename)})
    for (let scr of scripts) {
      if (scr.pid)
      ns.print({filename:scr.filename, s})
      ns.kill(scr.pid)
    }
  }

  let s = 'home'
  let scripts = ns.ps(s)
  for (let scr of scripts) {

    if (scr.filename == ns.getRunningScript()?.filename) { continue }
    if (dont_kill_pids.indexOf(scr.pid) != -1) continue
    
    ns.print(scr.filename + " " + s)
    ns.kill(scr.pid)
  }
}