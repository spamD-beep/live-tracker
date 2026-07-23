export type Status="ONLINE"|"IDLE"|"OFFLINE";
export type Location={id:string;deviceId:string;latitude:number;longitude:number;accuracy?:number;speed?:number;batteryLevel?:number;isCharging?:boolean;recordedAt:string};
export type Device={id:string;deviceName:string;deviceUuid:string;platform:string;appVersion?:string;isTracking:boolean;lastSeenAt?:string;status:Status;user:{id?:string;fullName:string;email?:string};latestLocation?:Location|null};
export type User={id:string;fullName:string;email:string;role:"ADMIN"|"VIEWER"|"MOBILE_USER";isActive:boolean};
