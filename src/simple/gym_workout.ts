import { NS } from '@ns'

export async function main(ns: NS) {
   ns.singularity.gymWorkout(ns.args[0].toString(), ns.args[1].toString(), false) 
}