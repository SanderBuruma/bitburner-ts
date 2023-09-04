import { rooted_servers } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {
  let servers = lmt(ns)
  ns.tprint({servers})

  for (let s of servers) {
    let paddedServerName = s.name.padEnd(16, ' ');
    ns.tprint('server:' + paddedServerName + 'score: ' + s.score + '\thackReq:' + s.hackingLv);
  }
}

export function lmt(ns: NS) {
  let servers = rooted_servers(ns)
  let filterByMinSecurity = ns.args[0]

  servers = servers
  .filter(s=>ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(s))
  .filter(s=>ns.getServerMaxMoney(s) > 1000)
  .sort((a,b)=>scoreTarget(ns, b) - scoreTarget(ns, a))
  if (filterByMinSecurity) {
    servers = servers.filter(s=>ns.getServerSecurityLevel(s) == ns.getServerMinSecurityLevel(s))
  }
  let maxLength = 0;
  for (let s of servers) {
    if (s.length > maxLength) {
      maxLength = s.length;
    }
  }
  let return_servers = servers.map(s=>{
    return {
      name: s,
      score: Math.floor(scoreTarget(ns, s)),
      hackingLv: ns.getServerRequiredHackingLevel(s)
    }
  })
  return return_servers
}

function scoreTarget(ns: NS, target: string) {
  let score = ns.getServerMaxMoney(target) || 1
  score /= ns.getServerMinSecurityLevel(target) || 1
  score /= Math.max(1, ns.growthAnalyze(target, 2) / 10000)
  return score/100_000
}