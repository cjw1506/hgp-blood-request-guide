// A login lasts for the current UK calendar day, rather than a rolling 24 hours.
const ukDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
const ukHour=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'});
export function nextLondonMidnight(value:Date|string=new Date()):Date{
 const date=value instanceof Date?value:new Date(value);
 const parts=Object.fromEntries(ukDate.formatToParts(date).map(part=>[part.type,part.value]));
 const nextUtc=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)+1);
 // At UTC midnight London is either 00:00 (GMT) or 01:00 (BST).
 return new Date(nextUtc-Number(ukHour.format(new Date(nextUtc)))*3600000);
}
export function sessionExpiry(loginAt:string,storedExpiry:string):string{
 return new Date(Math.min(nextLondonMidnight(loginAt).getTime(),Date.parse(storedExpiry))).toISOString();
}
