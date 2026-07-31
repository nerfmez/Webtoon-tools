export function moveLayer<T>(items:T[],from:number,to:number){const copy=[...items];const [item]=copy.splice(from,1);copy.splice(Math.max(0,Math.min(to,copy.length)),0,item);return copy}
