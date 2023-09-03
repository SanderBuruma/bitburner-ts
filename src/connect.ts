import { log } from 'helpers/utils.js'
import { NS } from '@ns'

export async function main(ns: NS) {
    let target = ns.args[0].toString() || 'foodnstuff';
    let path = recur(ns, ['home'], target, 'home');
    for (let s of path) {
      ns.singularity.connect(s)
    }
    
    if (path) {
        log(ns, "connect " + path.join("; connect "));
        
    } else {
        log(ns, "No path found to the target.");
    }
}

function recur(ns: NS, currentPath: string[], target: string, host: string): string[] {
    // If current host is target, return the current path
    if (host == target) {
        return currentPath;
    }
    
    let servers = ns.scan(host);
    for (let s of servers) {
        // If server is target, append to current path and return
        if (s == target) {
            return currentPath.concat([target]);
        }
        
        // Avoid loops by checking if we've already visited this server
        if (currentPath.includes(s)) continue;

        let newPath = recur(ns, currentPath.concat([s]), target, s);
        
        // If a path is found in the recursion, return it.
        if (newPath) return newPath;
    }
    return []
}
