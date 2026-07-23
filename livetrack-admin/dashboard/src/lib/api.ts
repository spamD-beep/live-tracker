import axios from "axios";
import { useAuth } from "../store/auth";
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL??"http://localhost:4000/api"});
api.interceptors.request.use(c=>{const t=useAuth.getState().accessToken;if(t)c.headers.Authorization=`Bearer ${t}`;return c});
let refreshing:Promise<string>|null=null;
api.interceptors.response.use(r=>r,async error=>{const original=error.config;if(error.response?.status!==401||original._retry)return Promise.reject(error);original._retry=true;const state=useAuth.getState();if(!state.refreshToken){state.logout();location.href="/login";return Promise.reject(error)}try{refreshing??=api.post("/auth/refresh",{refreshToken:state.refreshToken}).then(r=>r.data.accessToken).finally(()=>refreshing=null);const token=await refreshing;state.setAccess(token);original.headers.Authorization=`Bearer ${token}`;return api(original)}catch(e){state.logout();location.href="/login";return Promise.reject(e)}});
