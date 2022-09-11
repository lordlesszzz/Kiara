/**
* @author camelot
* @rule t?
* @admin true
**/

const s = sender

let text = s.param(1) 
let packetId=text.replace(/.*\&packetId\=([^\&]*)\&?.*/g,"$1")
s.reply(`## 推一推极速\nexport tytpacketId="${packetId}"`)