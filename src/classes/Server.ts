import { NS } from '@ns'

export class Server {
    private _name: string
    private ns: NS
    private _maxRam: number
    private _maxMoney: number
    private _minSec: number
    private _growthParam: number
    private _hackingReq: number
    private _portsReq: number
    constructor(ns: NS, name: string) {
        this.ns = ns
        this._name = name
        this._maxRam = ns.getServerMaxRam(name)
        this._maxMoney = ns.getServerMaxMoney(name)
        this._minSec = ns.getServerMinSecurityLevel(name)
        this._growthParam = ns.getServerGrowth(name)
        this._portsReq = this.ns.getServerNumPortsRequired(this.name)
        this._hackingReq = this.ns.getServerRequiredHackingLevel(this.name)
    }
    public get name() {
        return this._name
    }
    public get availableRam() {
        return this._maxRam - this.usedRam
    }
    public get usedRam() {
        return this.ns.getServerUsedRam(this.name)
    }
    public get maxRam() {
        return this._maxRam
    }
    public get files() {
        return this.ns.ls(this.name)
    }
    public get money() {
        return this.ns.getServerMoneyAvailable(this.name)
    }
    public get maxMoney() {
        return this._maxMoney
    }
    public get growthParam() {
        return this._growthParam
    }
    public get sec() {
        return this.ns.getServerSecurityLevel(this.name)
    }
    public get minSec() {
        return this._minSec
    }
    public get portsReq() {
        return this._portsReq
    }
    public get hackingReq() {
        return this._hackingReq
    }
    /** Whether or not the server is at minimum security */
    public get atMinSec(): boolean {
        return this._minSec === this.sec
    }
    
}