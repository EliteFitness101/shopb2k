export type MartialXAssetType = "hero" | "executive" | "martial_x" | "rsdn";
export type MartialXAsset = { id:string; type:MartialXAssetType; url:string; assetKey:string; altSeed:string; contentRole:string };
export const MARTIAL_X_ASSETS: MartialXAsset[] = [
{ id:"martial-x-hero-01",type:"hero",url:"",assetKey:"martial-x-hero-01",altSeed:"Martial-X premium hero background",contentRole:"hero" },
{ id:"martial-x-hero-02",type:"hero",url:"",assetKey:"martial-x-hero-02",altSeed:"Martial-X premium hero background",contentRole:"hero" },
{ id:"martial-x-hero-03",type:"hero",url:"",assetKey:"martial-x-hero-03",altSeed:"Martial-X premium hero background",contentRole:"hero" },
{ id:"martial-x3-exec-01",type:"executive",url:"",assetKey:"martial-x3-exec-01",altSeed:"Martial-X3 executive fitness visual",contentRole:"executive product" },
{ id:"martial-x3-exec-02",type:"executive",url:"",assetKey:"martial-x3-exec-02",altSeed:"Martial-X3 executive training visual",contentRole:"executive program" },
{ id:"martial-x3-exec-03",type:"executive",url:"",assetKey:"martial-x3-exec-03",altSeed:"Martial-X3 executive elite visual",contentRole:"executive package" },
{ id:"martial-x3-exec-04",type:"executive",url:"",assetKey:"martial-x3-exec-04",altSeed:"Martial-X3 executive visual",contentRole:"executive supporting asset" },
{ id:"martial-x3-hero",type:"executive",url:"",assetKey:"martial-x3-hero",altSeed:"Martial-X3 executive hero visual",contentRole:"executive hero" },
{ id:"martial-x-01",type:"martial_x",url:"",assetKey:"martial-x-01",altSeed:"Martial-X training visual",contentRole:"Martial-X" },
{ id:"martial-x-02",type:"martial_x",url:"",assetKey:"martial-x-02",altSeed:"Martial-X training visual",contentRole:"Martial-X" },
{ id:"martial-x-03",type:"martial_x",url:"",assetKey:"martial-x-03",altSeed:"Martial-X training visual",contentRole:"Martial-X" },
{ id:"martial-x-04",type:"martial_x",url:"",assetKey:"martial-x-04",altSeed:"Martial-X training visual",contentRole:"Martial-X" },
{ id:"rsdn-mouau-01",type:"rsdn",url:"",assetKey:"rsdn-mouau-01",altSeed:"RSDN MOUAU project cover",contentRole:"RSDN project" },
{ id:"rsdn-mouau-02",type:"rsdn",url:"",assetKey:"rsdn-mouau-02",altSeed:"RSDN MOUAU network project cover",contentRole:"RSDN project" },
];
