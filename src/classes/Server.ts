import { NS } from '@ns'

export class Server {
    public name: string
    private ns: NS
    constructor(ns: NS, name: string) {
        this.ns = ns
        this.name = name
    }
    public get availableRam() {
        return this.ns.getServerMaxRam(this.name) - this.ns.getServerUsedRam(this.name)
    }
}