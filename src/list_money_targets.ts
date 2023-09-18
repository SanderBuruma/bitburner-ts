import { continuous_targets } from 'helpers/servers.js'
import { NS } from '@ns'
import { Colors } from 'helpers/colors'

export async function main(ns: NS) {

  let sort_by = ns.args[0]?.toString() ?? 'static_score'

  let servers = continuous_targets(ns, false)
  if (sort_by === 'hackr_x_minsec') 
  {
    servers = servers.sort((a,b)=>(b.HackingRequirement * b.MinSec)-(a.HackingRequirement * a.MinSec))
  }

  ns.tprintf(
    '%s|%s|%s|%s|%s|%s|%s', 
    Colors.Highlight('Server'.padEnd(19, ' ')), 
    Colors.Highlight('HackReq'.padEnd(8, ' ')), 
    Colors.Highlight('AtMinSec'.padEnd(9, ' ')),
    Colors.Highlight('StaticScore'.padEnd(11, ' ')),
    Colors.Highlight('HackR*MinSec'.padEnd(13, ' ')),
    Colors.Highlight('money'.padEnd(11, ' ')),
    Colors.Highlight('HWGW RAM'.padEnd(13, ' ')),
  )
  ns.tprintf('%s', ''.padEnd(10+8+12+12+13+11+13, '-'))
  for (let s of servers) {
    ns.tprintf(
      '%s|%s|%s|%s|%s|%s|%s', 
      Colors.Highlight(s.Name.padEnd(19, ' ')),
      Colors.Highlight(s.HackingRequirement.toString().padEnd(8, " ")),
      (s.AtMinSec ? Colors.Good(s.AtMinSec.toString().padEnd(9, ' ')) : Colors.Bad(s.AtMinSec.toString().padEnd(9, ' '))),
      Colors.Highlight(ns.formatNumber(s.StaticScore).padEnd(11, ' ')),
      Colors.Highlight((s.HackingRequirement * s.MinSec).toString().padEnd(13, ' ')),
      Colors.Highlight(ns.formatNumber(s.Money).padEnd(11, ' ')),
      Colors.Highlight(ns.formatRam(s.HWGWCycleRamForDouble).padEnd(13, ' ')),
    )
  }
}
