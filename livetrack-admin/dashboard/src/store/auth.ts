import { create } from "zustand";
import type { User } from "../types";
type Auth={user:User|null;accessToken:string|null;refreshToken:string|null;setAuth:(u:User,a:string,r:string)=>void;setAccess:(a:string)=>void;logout:()=>void};
const saved=localStorage.getItem("livetrack.auth");const initial=saved?JSON.parse(saved):{};
export const useAuth=create<Auth>(set=>({user:initial.user??null,accessToken:initial.accessToken??null,refreshToken:initial.refreshToken??null,setAuth:(user,accessToken,refreshToken)=>{localStorage.setItem("livetrack.auth",JSON.stringify({user,accessToken,refreshToken}));set({user,accessToken,refreshToken})},setAccess:accessToken=>set(s=>{const next={...s,accessToken};localStorage.setItem("livetrack.auth",JSON.stringify({user:s.user,accessToken,refreshToken:s.refreshToken}));return next}),logout:()=>{localStorage.removeItem("livetrack.auth");set({user:null,accessToken:null,refreshToken:null})}}));
