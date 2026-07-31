import type {ProjectData} from '../types';
export function serializeProject(project:ProjectData){return JSON.stringify(project)}
export function deserializeProject(raw:string):ProjectData{const data:unknown=JSON.parse(raw);if(!data||typeof data!=='object'||(data as {version?:number}).version!==1)throw new Error('Unsupported project file');return data as ProjectData}
