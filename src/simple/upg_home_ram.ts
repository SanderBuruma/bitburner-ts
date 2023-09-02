import { NS } from '@ns'

export async function main(ns: NS) {
  let cost = ns.singularity.getUpgradeHomeRamCost()
  let player_money = ns.getPlayer().money
  if (cost * 1.5 < player_money) {
    ns.singularity.upgradeHomeRam()
  }
}