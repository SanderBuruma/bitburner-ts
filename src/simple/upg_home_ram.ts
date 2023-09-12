import { NS } from '@ns'
import { log, write_to_port } from 'helpers/utils'

export async function main(ns: NS) {
  let cost = ns.singularity.getUpgradeHomeRamCost()
  let player_money = ns.getPlayer().money
  if (cost < player_money) {
    if ( ns.singularity.upgradeHomeRam()) {
      log(ns, 'Upgraded home RAM for ' + ns.formatNumber(cost))
      await write_2_port(ns, 'true')
    } else {
      log(ns, JSON.stringify({msg:"Failure to upgrade home RAM", player_money, cost}, null, 2))
      await write_2_port(ns, 'false')
    }
  } else {
    await write_2_port(ns, 'false')
  }
}

async function write_2_port(ns: NS, value: string) {
  write_to_port(ns, [value])
  await ns.sleep(250)
  ns.clearPort(ns.pid)
}