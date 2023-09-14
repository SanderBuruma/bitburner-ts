import { rooted_servers } from 'helpers/servers.js'
import { NS } from '@ns'
import { write_to_port } from 'helpers/utils.js'
import { Colors } from 'helpers/colors'
import { Server } from './classes/Server'

export async function main(ns: NS) {
  const method = ns.args[0]?.toString()
  const cur_money = ns.args[1]?.toString() === 'cur_money' ?? false
  const no_grow = ns.args[2]?.toString() === 'no_grow' ?? false
  const hack_chance = ns.args[3]?.toString() === 'hack_chance' ?? false

  if (method === 'lmt') {
    let servers = lmt(ns, cur_money, no_grow, hack_chance)
    ns.tprintf(
      '%s | %s | %s | %s', 
      Colors.Highlight('Server'.padEnd(17, ' ')), 
      Colors.Highlight('HackReq'.padEnd(8, ' ')), 
      Colors.Highlight('AtMinSec'.padEnd(9, ' ')),
      Colors.Highlight('StaticScore'.padEnd(11, ' ')),
    )
    ns.tprintf('%s', ''.padEnd(22+8+12+12, '-'))
    for (let s of servers) {
      ns.tprintf(
          '%s %s %s %s', 
          Colors.Highlight(s.Name.padEnd(22, ' ')),
          Colors.Highlight(s.HackingRequirement.toString().padEnd(8, " ")),
          (s.AtMinSec ? Colors.Good(s.AtMinSec.toString().padEnd(12, ' ')) : Colors.Bad(s.AtMinSec.toString().padEnd(12, ' '))),
          Colors.Highlight(ns.formatNumber(s.StaticScore)
        )
      )
    }
  } else if (method === 'lmt_to_ports') {
    write_to_port(ns, lmt(ns, cur_money, no_grow))
  } else if (method === 'summarize_repeat') {
    let result = summarize_repeat_scripts(ns)
    result.forEach(x=>ns.tprintf('name:' + x.name_args.padStart(20, ' -') + ' threads: ' + x.threads))
  }

}

export function lmt(ns: NS, cur_money = false, no_grow: boolean, hack_chance = false): Server[] {
  let servers = rooted_servers(ns)

  servers = servers
  .filter(s=>ns.getHackingLevel() >= s.HackingRequirement)
  .filter(s=>s.MaxMoney > 1000)
  .sort((a,b)=>score_target(b, cur_money, no_grow, hack_chance) - score_target(a, cur_money, no_grow, hack_chance))
  return servers
}

function score_target(target: Server, use_cur_money: boolean, no_grow: boolean, hack_chance: boolean = false) {
  if (target.Name === 'n00dles') return 0
  if (target.Name === 'foodnstuff') return 0


  let score: number
  if (use_cur_money) score = target.Money || 1
  else score = target.MaxMoney || 1

  score /= target.MinSec || 1

  score /= target.HackingRequirement * 1e3

  if (!no_grow) {
    score *= target.GrowthParam
    score /= 50
  }

  if (hack_chance) {
    score *= target.HackingChance
  }

  return score*20
}

function summarize_repeat_scripts(ns: NS) {
  let repeat_scripts = rooted_servers(ns)
  .map(server=>server.RunningScripts)
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