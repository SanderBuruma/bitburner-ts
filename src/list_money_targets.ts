import { rooted_servers } from 'helpers/servers.js'
import { NS } from '@ns'
import { write_to_port } from 'helpers/utils'
import { ServerResult } from 'interfaces/ServerResult'

export async function main(ns: NS) {
  let method = ns.args[0]?.toString() ?? 'lmt'
  let cur_money = ns.args[1]?.toString() ?? '' ? true : false

  if (method === 'lmt') {
    let servers = lmt(ns, cur_money)
    for (let s of servers) {
      let paddedServerName = s.name.padEnd(16, ' ');
      ns.tprint('server:' + paddedServerName + 'score: ' + s.score + '\thackReq:' + s.hackingLv);
    }
  } else if (method === 'lmt_to_ports') {
    let servers = lmt(ns, cur_money)
    write_to_port(ns, lmt(ns, cur_money))
  } else if (method === 'summarize_repeat') {
    let result = summarize_repeat_scripts(ns)
    result.forEach(x=>ns.tprintf('name:' + x.name_args.padStart(20, ' -') + ' threads: ' + x.threads))
  }

}

export function lmt(ns: NS, cur_money = false): ServerResult[] {
  let servers = rooted_servers(ns)
  let filterByMinSecurity = ns.args[0]

  servers = servers
  .filter(s=>ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(s))
  .filter(s=>ns.getServerMaxMoney(s) > 1000)
  .sort((a,b)=>scoreTarget(ns, b, cur_money) - scoreTarget(ns, a, cur_money))
  if (filterByMinSecurity) {
    servers = servers.filter(s=>ns.getServerSecurityLevel(s) == ns.getServerMinSecurityLevel(s))
  }
  let maxLength = 0;
  for (let s of servers) {
    if (s.length > maxLength) {
      maxLength = s.length;
    }
  }
  let return_servers: ServerResult[] = servers.map(s=>{
    return {
      name: s,
      score: Math.floor(scoreTarget(ns, s)),
      hackingLv: ns.getServerRequiredHackingLevel(s)
    }
  })
  return return_servers
}

function scoreTarget(ns: NS, target: string, use_cur_money = false) {
  let score: number
  if (use_cur_money) score = ns.getServerMoneyAvailable(target) || 1
  else score = ns.getServerMaxMoney(target) || 1
  score /= ns.getServerMinSecurityLevel(target) || 1
  score /= Math.max(1, ns.growthAnalyze(target, 2) / 10000)
  return score/100_000
}

function summarize_repeat_scripts(ns: NS) {
  let repeat_scripts = rooted_servers(ns, true)
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