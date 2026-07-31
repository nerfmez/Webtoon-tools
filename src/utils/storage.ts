import {openDB} from 'idb'; import type {ProjectData} from '../types';
const db=()=>openDB('webtoon-studio',1,{upgrade(d){if(!d.objectStoreNames.contains('projects'))d.createObjectStore('projects')}});
export async function saveRecovery(p:ProjectData){return (await db()).put('projects',p,'recovery')}
export async function loadRecovery(){return (await db()).get('projects','recovery') as Promise<ProjectData|undefined>}
