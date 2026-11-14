import fs from 'node:fs';
const file='ios/App/App/Info.plist';
if(!fs.existsSync(file))throw Error('Run cap add ios first.');
let content=fs.readFileSync(file,'utf8');
const values={NSCameraUsageDescription:'Nocturne uses the camera to observe and record the sky.',NSMicrophoneUsageDescription:'Nocturne can include audio in observation recordings.',NSLocationWhenInUseUsageDescription:'Your location is used on this device to calculate sky positions.',NSMotionUsageDescription:'Motion sensors align astronomical labels with the direction of your phone.'};
for(const [key,value] of Object.entries(values)){if(!content.includes(`<key>${key}</key>`))content=content.replace('</dict>',`<key>${key}</key><string>${value}</string>\n</dict>`);}
fs.writeFileSync(file,content);
console.log('iOS permission descriptions configured.');
