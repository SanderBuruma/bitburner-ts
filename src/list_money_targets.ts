import { rooted_servers } from 'helpers/servers.js'
import { NS } from '@ns'
import { write_to_port } from 'helpers/utils.js'
import { IServerResult } from 'interfaces/IServerResult.js'
import { Colors } from 'helpers/colors'
import { Server } from './classes/Server'

export async function main(ns: NS) {
  const method = ns.args[0]?.toString()
  const cur_money = ns.args[1]?.toString() === 'cur_money' ?? false
  const no_grow = ns.args[2]?.toString() === 'no_grow' ?? false
  const hack_chance = ns.args[3]?.toString() === 'hack_chance' ?? false

  if (method === 'lmt') {
    let servers = lmt(ns, cur_money, no_grow, hack_chance)
    for (let s of servers) {
      const atMinSec = new Server(ns, s.name).AtMinSec.toString()
      const paddedServerName = s.name.padEnd(16, ' ');
      ns.tprintf(
        'server: %s score: %s hackReq: %s atMinSec: %s', 
        Colors.Highlight(s.name.padEnd(16, ' ')),
        Colors.Highlight(ns.formatNumber(s.score).padEnd(8, " ")),
        Colors.Highlight(s.hackingLv.toString().padEnd(5, " ")),
        atMinSec==="true" ? Colors.Good(atMinSec) : Colors.Bad(atMinSec)
      )
    }
  } else if (method === 'lmt_to_ports') {
    write_to_port(ns, lmt(ns, cur_money, no_grow))
  } else if (method === 'summarize_repeat') {
    let result = summarize_repeat_scripts(ns)
    result.forEach(x=>ns.tprintf('name:' + x.name_args.padStart(20, ' -') + ' threads: ' + x.threads))
  }

}

export function lmt(ns: NS, cur_money = false, no_grow: boolean, hack_chance = false): IServerResult[] {
  let servers = rooted_servers(ns)

  servers = servers
  .filter(s=>ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(s))
  .filter(s=>ns.getServerMaxMoney(s) > 1000)
  .sort((a,b)=>score_target(ns, b, cur_money, no_grow, hack_chance) - score_target(ns, a, cur_money, no_grow, hack_chance))
  let return_servers: IServerResult[] = servers.map(s=>{
    return {
      name: s,
      score: score_target(ns, s, cur_money, no_grow, hack_chance),
      hackingLv: ns.getServerRequiredHackingLevel(s)
    }
  })
  return return_servers
}

function score_target(ns: NS, target: string, use_cur_money: boolean, no_grow: boolean, hack_chance: boolean = false) {
  if (target === 'n00dles') return 0
  if (target === 'foodnstuff') return 0

  let score: number
  if (use_cur_money) score = ns.getServerMoneyAvailable(target) || 1
  else score = ns.getServerMaxMoney(target) || 1

  score /= ns.getServerMinSecurityLevel(target) || 1

  score /= (ns.getServerRequiredHackingLevel(target)+50) * 1e3

  score *= ns.getServerGrowth(target)

  if (!no_grow) {
    score /= ns.getServerGrowth(target) + 100
    score *= 100
  }

  if (hack_chance) {
    score *= ns.hackAnalyzeChance(target)
  }

  return score*20
}

function summarize_repeat_scripts(ns: NS) {
  let repeat_scripts = rooted_servers(ns)
  .map(server=>ns.ps(server))
  .reduce((a,c)=>a.concat(c), [])
  .filter(script=>script.filename.includes('repeat/'))

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
  return ar
}