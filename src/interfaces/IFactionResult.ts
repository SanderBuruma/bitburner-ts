import { NS } from '@ns'
export interface IFactionResult {
    name: string,
    server: string,
    hackingReq: number
}

export function get_factions(ns: NS): IFactionResult[] {
    return [{
        name: 'CyberSec',
        server: 'CSEC',
        hackingReq: ns.getServerRequiredHackingLevel('CSEC')
    }, {
        name: 'NiteSec',
        server: 'avmnite-02h',
        hackingReq: ns.getServerRequiredHackingLevel('avmnite-02h')
    }, {
        name: 'The Black Hand',
        server: 'I.I.I.I',
        hackingReq: ns.getServerRequiredHackingLevel('I.I.I.I')
    }, {
        name: 'BitRunners',
        server: 'run4theh111z',
        hackingReq: ns.getServerRequiredHackingLevel('run4theh111z')
    }]
}