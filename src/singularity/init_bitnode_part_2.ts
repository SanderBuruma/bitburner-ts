import { NS } from '@ns'
import { hgw_continuous_best_target } from 'singularity/start_after_reset'
import { log, run_write_read } from '/helpers/utils'
import { hack_most_money } from 'singularity/init_bitnode'

export async function main(ns: NS) {
    ns.disableLog('ALL')
    await hgw_continuous_best_target(ns)

    // Wait for and install augments from CSEC
    while (
        // While there are augs remaining to be bought
        ns.singularity.getAugmentationsFromFaction('CyberSec')
        .filter(a=>!ns.singularity.getOwnedAugmentations(true).includes(a))
        .length > 0
    ) {
        let owned_augs = ns.singularity.getOwnedAugmentations(true)
        
        // Filter out augs we own or with unmet prereqs and sort descending by price
        let augs_to_get = ns.singularity.getAugmentationsFromFaction('CyberSec')
        .filter(a=>!owned_augs.includes(a))
        .filter(a=>{ 
            let prereqs = ns.singularity.getAugmentationPrereq(a)
            for (let prereq of prereqs) {
                if (!owned_augs.includes(prereq)) return false
            }
            return true
        })
        .sort((a,b)=>ns.singularity.getAugmentationPrice(b)-ns.singularity.getAugmentationPrice(a))

        // Get the most expensive aug
        let aug_to_get = augs_to_get.shift()
        aug_to_get = aug_to_get?.toString() ?? ''

        // Buy aug if possible
        if (
            ns.singularity.getAugmentationRepReq(aug_to_get) < ns.singularity.getFactionRep('CyberSec') &&
            ns.singularity.getAugmentationPrice(aug_to_get) < ns.getPlayer().money
        ) {
            ns.singularity.purchaseAugmentation('CyberSec', aug_to_get)
            log(ns, 'Bought ' + aug_to_get + ' for ' + ns.formatNumber(ns.singularity.getAugmentationPrice(aug_to_get)))
            continue
        }
        await ns.sleep(250)
    }

    // Upgrade home RAM with remaining money
    while (ns.getServerMaxRam('home') < 2**8) 
    {
        let predicate = await run_write_read(ns, 'simple/upg_home_ram.js', 1)
        if (predicate === 'true') break

        await hack_most_money(ns)
    }

    // Install augments and start singularity/start_after_reset.js
    ns.singularity.installAugmentations('singularity/start_after_reset.js')

}