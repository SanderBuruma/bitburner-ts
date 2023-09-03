import { NS } from '@ns'
import { log } from 'helpers/utils'

export async function main(ns: NS) {
  let cost = ns.singularity.getUpgradeHomeCoresCost()
  let player_money = ns.getPlayer().money
  if (cost < player_money) {
    if ( ns.singularity.upgradeHomeCores()) {
      log(ns, 'Upgraded the player\'s Cores for ' + ns.formatNumber(cost))
    } else {
      log(ns, JSON.stringify({msg:"Failure to upgrade home Cores", player_money, cost}, null, 2))
    }
  }
}