import { NS } from '@ns'

export async function main(ns: NS){
  let d: Document = eval('document')

  let method = ns.args[0]?.toString()??goto_terminal.name
  if (method == goto_terminal.name) await goto_terminal(ns)
  else if (method == exe_command.name) await exe_command(ns, d, ns.args[1]?.toString()??'home;')
}

export async function goto_terminal(ns: NS) {
  let node = eval('document').evaluate('/html/body/div/div[2]/div[1]/div/ul/div[2]/div/div/div[1]', eval('document'), null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  
  if (node instanceof HTMLElement) { 
    node.click();
    await ns.sleep(100);
  } else {
    ns.tprintf("Node is not an instance of HTMLElement or not found");
  }
}

export async function exe_command(ns: NS, d: Document, command: string) {
  /** @type {HTMLInputElement} */
  const ti = eval("document").getElementById("terminal-input");
  ti.value = command;
  const hd = Object.keys(ti)[1];
  ti[hd].onChange({ target: ti });
  if (true) ti[hd].onKeyDown({ key: "Enter", preventDefault: () => null });
  await ns.sleep(100)
}