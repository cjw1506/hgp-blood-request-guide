/** @license SPDX-License-Identifier: Apache-2.0 */
/** Test rules imported unchanged from the supplied App.tsx. Clinical timings have not been revalidated. */
type FormState = {
    selectedDiseases: Set<string>;
    isOnDOAC: boolean;
    isOnLithium: boolean;
    isOnAntipsychotics: boolean;
    isOnMetformin: boolean;
    ckdStage: '3a' | '3b' | '4' | '5';
};

type Question = {
    key: keyof Omit<FormState, 'selectedDiseases'>;
    label: string;
    type: 'toggle' | 'select';
    options?: { value: string; label: string }[];
};

type Disease = {
    name: string;
    colorClass: string;
    questions?: Question[];
};

type CalculatedTest = {
    testName: string;
    frequencies: { frequency: string; diseases: string[] }[];
};

const diseases: Disease[] = [
    { name: "Atrial Fibrillation", colorClass: "icon-red", questions: [{ key: 'isOnDOAC', label: 'Is the patient on a DOAC?', type: 'toggle' }] },
    { name: "Cardiovascular Disease", colorClass: "icon-pink" },
    { name: "Chronic Kidney Disease", colorClass: "icon-purple", questions: [{ key: 'ckdStage', label: 'CKD Stage:', type: 'select', options: [{ value: '3a', label: 'CKD 3a (GFR: 45-59)' }, { value: '3b', label: 'CKD 3b (GFR: 30-44)' }, { value: '4', label: 'CKD 4 (GFR: 15-29)' }, { value: '5', label: 'CKD 5 (GFR: <15)' }] }] },
    { name: "Coronary Heart Disease", colorClass: "icon-red" },
    { name: "Diabetes Mellitus", colorClass: "icon-orange", questions: [{ key: 'isOnMetformin', label: 'Is the patient on Metformin?', type: 'toggle' }] },
    { name: "Heart Failure", colorClass: "icon-pink" },
    { name: "Hypertension", colorClass: "icon-red" },
    { name: "Hypothyroidism", colorClass: "icon-teal" },
    { name: "Learning Disability", colorClass: "icon-blue" },
    { name: "Mental Health", colorClass: "icon-blue", questions: [
        { key: 'isOnLithium', label: 'Is the patient on Lithium?', type: 'toggle' },
        { key: 'isOnAntipsychotics', label: 'Is the patient on Antipsychotics?', type: 'toggle' }
    ] },
    { name: "NHS Health Check", colorClass: "icon-green" },
    { name: "Non-Diabetic Hyperglycaemia", colorClass: "icon-orange" },
    { name: "Stroke/TIA", colorClass: "icon-purple" },
    { name: "B12 Anemia", colorClass: "icon-yellow" },
];

const bloodTests: Record<string, Record<string, any>> = {
    "FBC": { "Atrial Fibrillation": { conditionKey: "isOnDOAC", trueFrequency: "Annually", falseFrequency: null }, "Coronary Heart Disease": "Annually", "Heart Failure": "Annually", "Diabetes Mellitus": "Annually", "Chronic Kidney Disease": "Annually", "B12 Anemia": "10 days after starting treatment" },
    "U&Es": { "Atrial Fibrillation": { conditionKey: "isOnDOAC", trueFrequency: "Annually", falseFrequency: null }, "Coronary Heart Disease": "Annually", "Heart Failure": "Annually", "Hypertension": "Annually", "Stroke/TIA": "Annually", "Diabetes Mellitus": "Annually", "Mental Health": { conditionKey: "isOnLithium", trueFrequency: "3 monthly", falseFrequency: "Annually" }, "Chronic Kidney Disease": "Frequency based on CKD stage", "NHS Health Check": "5 yearly (40-74 years)", "Cardiovascular Disease": "Annually" },
    "LFTs": { "Atrial Fibrillation": { conditionKey: "isOnDOAC", trueFrequency: "Annually", falseFrequency: null }, "Coronary Heart Disease": "Annually", "Heart Failure": "Annually", "Stroke/TIA": "Annually", "Diabetes Mellitus": "Annually", "Mental Health": "Annually", "NHS Health Check": "5 yearly (40-74 years)" },
    "HbA1c": { "Atrial Fibrillation": "At diagnosis & every 3 years", "Coronary Heart Disease": "At diagnosis & every 3 years", "Heart Failure": "At diagnosis & every 3 years", "Hypertension": "At diagnosis & every 3 years", "Stroke/TIA": "Annually", "Diabetes Mellitus": "6 monthly", "Mental Health": "Annually", "Chronic Kidney Disease": "At diagnosis & every 3 years", "Non-Diabetic Hyperglycaemia": "Annually", "NHS Health Check": "5 yearly (40-74 years)", "Cardiovascular Disease": "Annually" },
    "TFTs": { "Atrial Fibrillation": "At diagnosis", "Diabetes Mellitus": "At diagnosis & every 3 years", "Mental Health": { conditionKey: "isOnLithium", trueFrequency: "6 monthly", falseFrequency: "Annually" }, "Hypothyroidism": "Annually if stable. After 3 months if dose changed" },
    "LIPIDS": { "Coronary Heart Disease": "Annually", "Heart Failure": "Annually (if on statin)", "Hypertension": "Following diagnosis to check CVD risk", "Stroke/TIA": "Annually", "Diabetes Mellitus": "Annually", "Mental Health": "Annually", "Chronic Kidney Disease": "Annually", "NHS Health Check": "5 yearly (40-74 years)", "Cardiovascular Disease": "Annually" },
    "LITHIUM": { "Mental Health": { conditionKey: "isOnLithium", trueFrequency: "3 monthly", falseFrequency: null } },
    "CALCIUM": { "Mental Health": { conditionKey: "isOnLithium", trueFrequency: "6 monthly", falseFrequency: null }, "Chronic Kidney Disease": "Frequency based on CKD stage" },
    "BNP": { "Heart Failure": "Once to make diagnosis. NO MONITORING" },
    "B12": { "Diabetes Mellitus": { conditionKey: "isOnMetformin", trueFrequency: "Annually", falseFrequency: null }, "B12 Anemia": "To make diagnosis & 1-2 months after treatment. NO MONITORING" },
    "URINE (ACR)": { "Diabetes Mellitus": "Annually", "Chronic Kidney Disease": "Annually" },
    "PROLACTIN": { "Mental Health": { conditionKey: "isOnAntipsychotics", trueFrequency: "Annually", falseFrequency: null } }
};

const isMonitoringFrequency = (freq: string): boolean => {
    const lowerFreq = freq.toLowerCase().trim();
    const exclusions = ["diagnosis", "to check cvd risk", "make diagnosis", "no monitoring", "after starting treatment"];
    if (lowerFreq.includes("diagnosis") && lowerFreq.includes("every")) return true;
    for (const term of exclusions) { if (lowerFreq.includes(term)) return false; }
    return true;
};

const getCKDFrequency = (stage: string, test: string) => {
    if (test === "U&Es") {
        switch (stage) {
            case "3a": return "Annually";
            case "3b": return "6 monthly";
            case "4": return "Every 4-6 months";
            case "5": return "3 monthly";
            default: return null;
        }
    }
    if (test === "CALCIUM") {
        switch (stage) {
            case "3a": return null;
            case "3b": return "6 monthly";
            case "4": return "3 monthly";
            case "5": return "Monthly";
            default: return null;
        }
    }
    return undefined;
};

const getFrequencyColor = (freq: string): string => {
    const f = freq.toLowerCase();
    if (f.includes('3 monthly')) return 'tag-red';
    if (f.includes('6 monthly')) return 'tag-orange';
    if (f.includes('4-6 months')) return 'tag-pink';
    if (f.includes('monthly')) return 'tag-yellow';
    if (f.includes('annually')) return 'tag-blue';
    if (f.includes('5 yearly')) return 'tag-green';
    if (f.includes('every 3 years')) return 'tag-teal';
    if (f.includes('10 days') || f.includes('1-2 months')) return 'tag-indigo';
    if (f.includes('diagnosis')) return 'tag-purple';
    return 'tag-gray';
};

const calculateRequiredTests = (formState: FormState): CalculatedTest[] => {
    const requiredTestsData: Record<string, { frequencies: Record<string, Set<string>> }> = {};
    const selectedDiseases = Array.from(formState.selectedDiseases);

    for (const [testName, conditionsForTest] of Object.entries(bloodTests)) {
        selectedDiseases.forEach(disease => {
            if (conditionsForTest.hasOwnProperty(disease)) {
                let rawEntry = conditionsForTest[disease];
                let freq: string | null = null;

                if (typeof rawEntry === 'string') {
                    freq = rawEntry;
                } else if (rawEntry && rawEntry.conditionKey) {
                    const met = formState[rawEntry.conditionKey as keyof FormState];
                    freq = met ? rawEntry.trueFrequency : rawEntry.falseFrequency;
                }
                
                if (disease === "Chronic Kidney Disease") {
                     const ckdFreq = getCKDFrequency(formState.ckdStage, testName);
                     if (ckdFreq !== undefined) freq = ckdFreq;
                }

                if (freq && freq !== "Frequency based on CKD stage") {
                    if (!requiredTestsData[testName]) requiredTestsData[testName] = { frequencies: {} };
                    if (!requiredTestsData[testName].frequencies[freq]) requiredTestsData[testName].frequencies[freq] = new Set();
                    requiredTestsData[testName].frequencies[freq].add(disease);
                }
            }
        });
    }

    const calculated = Object.entries(requiredTestsData).map(([testName, data]) => ({
        testName,
        frequencies: Object.entries(data.frequencies).map(([frequency, diseasesSet]) => ({
            frequency,
            diseases: Array.from(diseasesSet),
        })),
    }));
    
    const desiredOrder = ["U&Es", "LFTs", "CALCIUM", "LIPIDS", "TFTs", "B12", "URINE (ACR)", "FBC", "HbA1c", "LITHIUM", "BNP", "PROLACTIN"];
    return calculated.sort((a, b) => desiredOrder.indexOf(a.testName) - desiredOrder.indexOf(b.testName));
};


export { diseases, bloodTests, isMonitoringFrequency, getCKDFrequency, calculateRequiredTests };
export type { FormState, Question, Disease, CalculatedTest };
export const GUIDE_VERSION = "d58db47ed0f10b4e";
