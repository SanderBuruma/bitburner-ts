import { NS } from '@ns'
import { log } from '/helpers/utils'
import { Colors } from '/helpers/colors'

export async function main(ns: NS) {
    ns.disableLog('ALL')
    await wait_to_install_all_augs(ns, async ()=>{
    }, ns.args[0].toString())
}

export async function wait_to_install_all_augs(ns: NS, waiting_callback: () => Promise<void>, faction: string){
    log(ns,'Wait to install augments from '+ Colors.Highlight(faction))
    while (
        // While there are augs remaining to be bought
        ns.singularity.getAugmentationsFromFaction(faction)
        .filter(a=>!ns.singularity.getOwnedAugmentations(true).includes(a))
        .length > 0
    ) {
        let owned_augs = ns.singularity.getOwnedAugmentations(true)
        
        // Filter out augs we own or with unmet prereqs and sort descending by price
        let augs_to_get = ns.singularity.getAugmentationsFromFaction(faction)
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
            ns.singularity.getAugmentationRepReq(aug_to_get) < ns.singularity.getFactionRep(faction) &&
            ns.singularity.getAugmentationPrice(aug_to_get) < ns.getPlayer().money
        ) {
            ns.singularity.purchaseAugmentation(faction, aug_to_get)
            log(ns, 'Bought ' + Colors.Good(aug_to_get) + ' for ' + Colors.Highlight(ns.formatNumber(ns.singularity.getAugmentationPrice(aug_to_get))))
            continue
        }
        await waiting_callback()
        await ns.sleep(250)
    }

    // Buy as many NeuroFlux Governors as we can 
    let nfgLevels = 0
    while (ns.singularity.purchaseAugmentation(faction, 'NeuroFlux Governor')) nfgLevels++
    log(ns, 'Bought ' + Colors.Good(nfgLevels.toString()??'ERROR') + ' levels of the ' + Colors.Highlight('NeuroFlux Governor'))
}