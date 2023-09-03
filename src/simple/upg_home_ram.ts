import { NS } from '@ns'
import { log } from '/utils'

export async function main(ns: NS) {
  let cost = ns.singularity.getUpgradeHomeRamCost()
  let player_money = ns.getPlayer().money
  if (cost < player_money) {
    if ( ns.singularity.upgradeHomeRam()) {
      log(ns, 'Upgraded the player\'s RAM for ' + ns.formatNumber(cost))
    } else {
      log(ns, JSON.stringify({msg:"Failure to upgrade home RAM", player_money, cost}, null, 2))
    }
  }
}