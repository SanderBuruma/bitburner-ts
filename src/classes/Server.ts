import { NS } from '@ns'

export class Server {
    public name: string
    private ns: NS
    constructor(ns: NS, name: string) {
        this.ns = ns
        this.name = name
    }
    public get availableRam() {
        return this.maxRam - this.usedRam
    }
    public get maxRam() {
        return this.ns.getServerMaxRam(this.name)
    }
    public get usedRam() {
        return this.ns.getServerUsedRam(this.name)
    }
    public get files() {
        return this.ns.ls(this.name)
    }
    public get money() {
        return this.ns.getServerMoneyAvailable(this.name)
    }
    public get maxMoney() {
        return this.ns.getServerMaxMoney(this.name)
    }
    public get minSec() {
        return this.ns.getServerMinSecurityLevel(this.name)
    }
    public get sec() {
        return this.ns.getServerSecurityLevel(this.name)
    }
    public get growthParam() {
        return this.ns.getServerGrowth(this.name)
    }
    public get portsReq() {
        return this.ns.getServerNumPortsRequired(this.name)
    }
    public get hackingReq() {
        return this.ns.getServerRequiredHackingLevel(this.name)
    }
    
}