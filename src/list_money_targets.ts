import { rooted_servers } from 'helpers/servers.js'
import { NS } from '@ns'
import { write_to_port } from 'helpers/utils.js'
import { IServerResult } from 'interfaces/IServerResult.js'

export async function main(ns: NS) {
  const method = ns.args[0]?.toString()
  const cur_money = ns.args[1]?.toString() === 'cur_money' ?? false
  const no_grow = ns.args[2]?.toString() === 'no_grow' ?? false
  const hack_chance = ns.args[3]?.toString() === 'hack_chance' ?? false

  if (method === 'lmt') {
    let servers = lmt(ns, cur_money, no_grow, hack_chance)
    for (let s of servers) {
      const paddedServerName = s.name.padEnd(16, ' ');
      ns.tprint('server:' + paddedServerName + 'score: ' + ns.formatNumber(s.score) + '\thackReq:' + s.hackingLv);
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
  let score: number
  if (use_cur_money) score = ns.getServerMoneyAvailable(target) || 1
  else score = ns.getServerMaxMoney(target) || 1

  score /= ns.getServerMinSecurityLevel(target) || 1
  score /= ns.getWeakenTime(target) / 1e3

  if (!no_grow) {
    score /= Math.min(1, ns.growthAnalyze(target, 2) / 10000)
    score /= 100
  }

  if (hack_chance) {
    score *= ns.hackAnalyzeChance(target)
  }

  return score/500
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