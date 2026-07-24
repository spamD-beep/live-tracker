export type Status="ONLINE"|"IDLE"|"OFFLINE";
export type Location={id:string;deviceId:string;latitude:number;longitude:number;accuracy?:number;speed?:number;batteryLevel?:number;isCharging?:boolean;recordedAt:string};
export type LocationEstimate={id:string;confidence:number;status:"CONFIRMED"|"PROBABLE"|"NEAR"|"UNKNOWN";observedAt:string;staleAt?:string;office?:{name:string}|null;floor?:{name:string}|null;room?:{name:string}|null};
export type Device={id:string;deviceName:string;deviceUuid:string;platform:string;appVersion?:string;isTracking:boolean;lastSeenAt?:string;status:Status;user:{id?:string;fullName:string;email?:string};latestLocation?:Location|null;latestEstimate?:LocationEstimate|null};
export type User={id:string;fullName:string;email:string;role:"ADMIN"|"MANAGER"|"VIEWER"|"MOBILE_USER";managerId?:string|null;isActive:boolean};
