import { NS } from '@ns'

export async function main(ns: NS) {
  let a: string = ns.args[0]?.toString()

  if (a === "Rob Store")        return ns.singularity.commitCrime("Rob Store", false)
  if (a === "Shoplift")         return ns.singularity.commitCrime("Shoplift", false)
  if (a === "Bond Forgery")     return ns.singularity.commitCrime("Bond Forgery", false)
  if (a === "Homicide")         return ns.singularity.commitCrime("Homicide", false)
  if (a === "Mug")              return ns.singularity.commitCrime("Mug", false)
  if (a === "Larceny")          return ns.singularity.commitCrime("Larceny", false)
  if (a === "Deal Drugs")       return ns.singularity.commitCrime("Deal Drugs", false)
  if (a === "Traffick Arms")    return ns.singularity.commitCrime("Traffick Arms", false)
  if (a === "Grand Theft Auto") return ns.singularity.commitCrime("Grand Theft Auto", false)
  if (a === "Kidnap")           return ns.singularity.commitCrime("Kidnap", false)
  if (a === "Assassination")    return ns.singularity.commitCrime("Assassination", false)
  if (a === "Heist")            return ns.singularity.commitCrime("Heist", false)

  throw new Error('Crime \'' + a + '\' is not an available crime')
}
