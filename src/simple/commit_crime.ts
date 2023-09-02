import { CrimeType, NS } from '@ns'

export async function main(ns: NS) {
  let a = ns.args[0]?.toString() ?? 'Rob Store'
  let crime: CrimeType
  switch (a) {
    case CrimeType.robStore:
      crime = CrimeType.robStore;
      break;
    case CrimeType.bondForgery:
      crime = CrimeType.bondForgery;
      break;
    case CrimeType.dealDrugs:
      crime = CrimeType.dealDrugs;
      break;
    case CrimeType.heist:
      crime = CrimeType.heist;
      break;
    case CrimeType.grandTheftAuto:
      crime = CrimeType.grandTheftAuto;
      break;
    case CrimeType.assassination:
      crime = CrimeType.assassination;
      break;
    case CrimeType.homicide:
      crime = CrimeType.homicide;
      break;
    case CrimeType.kidnap:
      crime = CrimeType.kidnap;
      break;
    case CrimeType.larceny:
      crime = CrimeType.larceny;
      break;
    case CrimeType.mug:
      crime = CrimeType.mug;
      break;
    case CrimeType.shoplift:
      crime = CrimeType.shoplift;
      break;
    case CrimeType.traffickArms:
      crime = CrimeType.traffickArms;
      break;
    default:
      crime = CrimeType.robStore;
      break;
  }

  ns.tprint({crime})
  return ns.singularity.commitCrime(crime, false)
}