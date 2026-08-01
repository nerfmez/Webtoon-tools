export type TouchPoint={x:number;y:number};

export function distance(a:TouchPoint,b:TouchPoint){return Math.hypot(b.x-a.x,b.y-a.y)}

export function midpoint(a:TouchPoint,b:TouchPoint):TouchPoint{return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}

export function pinchZoom(startZoom:number,startDistance:number,currentDistance:number,min=.1,max=2){
  if(startDistance<=0)return startZoom;
  return Math.max(min,Math.min(max,startZoom*(currentDistance/startDistance)));
}

export function translateFromGesture(transform:number[],start:TouchPoint,current:TouchPoint,zoom:number){
  const next=[...transform];
  next[0]=zoom;next[3]=zoom;
  next[4]=(transform[4]??0)+current.x-start.x;
  next[5]=(transform[5]??0)+current.y-start.y;
  return next;
}
