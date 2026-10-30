'use client';
import { useId, useState } from 'react';
import { Pill,MousePointer2,ClipboardCheck,ChevronDown } from 'lucide-react';
const examples=[
 {group:'ACE inhibitors / ARBs',medicines:'ramipril, losartan',bloods:'U&Es / renal function, including creatinine, potassium and sodium.'},
 {group:'Statins',medicines:'atorvastatin, simvastatin',bloods:'Lipids; LFTs (ALT/AST) if due or indicated.'},
 {group:'DOACs',medicines:'apixaban, rivaroxaban, edoxaban, dabigatran',bloods:'U&Es / creatinine, FBC, LFTs. Check the creatinine-clearance (CrCl) review plan.'},
 {group:'DMARDs',medicines:'methotrexate, leflunomide',bloods:'FBC, LFTs, renal function / U&Es — follow the shared-care plan.'},
 {group:'Thyroid replacement',medicines:'levothyroxine',bloods:'TSH (TFTs); free T4 if indicated.'},
];
const sources=[
 ['ACE/ARBs','https://sps.nhs.uk/monitorings/ace-inhibitors-and-angiotensin-ii-receptor-blockers-monitoring/'],
 ['statins','https://sps.nhs.uk/monitorings/statins-monitoring/'],
 ['DOACs','https://sps.nhs.uk/monitorings/doacs-direct-oral-anticoagulants-monitoring/'],
 ['methotrexate','https://sps.nhs.uk/monitorings/methotrexate-monitoring/'],
 ['leflunomide','https://sps.nhs.uk/monitorings/leflunomide-monitoring/'],
 ['levothyroxine','https://sps.nhs.uk/monitorings/levothyroxine-monitoring/'],
];
export default function MedicationReminder(){const [showMedicines,setShowMedicines]=useState(false);const medicinePanelId=useId();return <div className="request-reminders">
 <aside className="cvneed-reminder" aria-labelledby="cvneed-reminder-title"><ClipboardCheck aria-hidden="true"/><div><h3 id="cvneed-reminder-title">Check CVNeed review tasks first</h3><p><MousePointer2 aria-hidden="true"/>Hover over <strong>GM | CVNeed Reviews Incomplete</strong> in the <strong>EMIS QOF box</strong>. Check the missing CORE / STRETCH items flagged for that patient, including BP, cholesterol, HbA1c, smoking status or urine albumin.</p><p className="cvneed-bloods"><strong>CVNeed bloods to check: FBC, LFTs and U&Es.</strong> Confirm whether these are due under the patient’s practice plan, alongside any other bloods flagged.</p></div></aside>
 <aside className="medication-reminder" aria-labelledby="medication-reminder-title"><header className="medication-reminder-heading"><Pill aria-hidden="true"/><h3 id="medication-reminder-title">Check medication monitoring</h3></header>
 <div className="medication-reminder-body"><p className="medication-reminder-intro"><strong>Check the medication record, latest results and individual/shared-care plan.</strong> The condition-based list may not include all medication monitoring.</p>
 <div className="medicine-reference"><button type="button" className="medicine-reference-toggle" aria-expanded={showMedicines} aria-controls={medicinePanelId} onClick={()=>setShowMedicines(value=>!value)}><span>{showMedicines?'Hide medication monitoring blood checks':'Click here to check for potential medication monitoring bloods'}<small>View medicine examples and the blood tests to check if due</small></span><ChevronDown aria-hidden="true"/></button><div id={medicinePanelId} className="medicine-reference-content" hidden={!showMedicines}><table className="monitoring-examples"><caption className="sr-only">Common medicine examples and blood tests to check against the patient’s monitoring plan</caption><thead><tr><th scope="col">Medicine examples</th><th scope="col">Bloods to check if due</th></tr></thead><tbody>{examples.map(item=><tr key={item.group}><th scope="row"><strong>{item.group}</strong><small>{item.medicines}</small></th><td>{item.bloods}</td></tr>)}</tbody></table>
 <p className="monitoring-sources">NHS SPS references · checked 30 Oct 2026: {sources.map(([label,url],i)=><span key={url}>{i>0?' · ':''}<a href={url} target="_blank" rel="noreferrer">{label}</a></span>)}</p></div></div>
 <p className="medication-reminder-note">Examples only, not a complete monitoring schedule. Confirm what is due under the individual monitoring/shared-care plan; ask a clinician if unclear.</p>
 </div></aside></div>;}
