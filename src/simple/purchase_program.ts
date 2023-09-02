import { NS } from "@ns";

export async function main(ns: NS) {
  ns.singularity.purchaseProgram(ns.args[0].toString())
}