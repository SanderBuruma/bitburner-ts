import { NS } from '@ns'

export async function main(ns: NS) {
    await travel(ns)
}

/** Spend as much money as possible on int gain */
export async function travel(ns: NS) {
    while (ns.getPlayer().money > 2e7) {
        await ns.sleep(0)
        for (let i = 0; i < 100; i++) {
            ns.singularity.travelToCity('Ishima')
            ns.singularity.travelToCity('Aevum')
        }
    }
}