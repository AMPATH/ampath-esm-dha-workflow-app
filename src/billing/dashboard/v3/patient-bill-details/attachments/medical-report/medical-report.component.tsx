import React, { forwardRef } from 'react';
import styles from './medical-report.scss';

// ---------------------------------------------------------------------------
// Generic Medical Report Template
// Pass a `report` object matching the shape of `DEMO_REPORT` below to reuse
// this component for any record. All data on this page is placeholder data.
// ---------------------------------------------------------------------------

const DEMO_REPORT = {
  facility: 'Sample Hospital',
  patient: {
    name: 'Jane A. Doe',
    mrn: 'SAMPLE-ID-0000000',
    dob: '01-01-1990',
    age: '36',
    sex: 'Female',
    visitDate: '01-Jan-2026',
    department: 'General Medicine',
    ward: 'WARD-00 - Sample Ward',
    referringFacility: 'Dr. Sample Referrer, Sample Clinic',
  },
  reason: {
    chiefComplaint: 'Sample presenting complaint as documented at intake.',
    referralReason: '—',
  },
  history: {
    presentingComplaint: 'Sample history of presenting complaint.',
    pastMedical: 'None reported.',
    pastSurgical: 'None reported.',
    medication: 'None reported.',
    allergy: 'No known allergies (NKA).',
    familySocial: 'Non-contributory.',
  },
  examination: {
    general: 'Patient alert, oriented, in no acute distress.',
    vitals: {
      bp: '112/67 mmHg',
      pulse: '76 bpm',
      respRate: '18 /min',
      temperature: '36.8 °C',
      spo2: '99 %',
      weight: '62.0 kg',
    },
    systemic: 'No focal abnormalities detected on systemic examination.',
  },
  investigations: [
    { category: 'Laboratory tests', date: '01-Jan-2026', result: 'Sample lab result, within normal limits.' },
    { category: 'Imaging', date: '—', result: 'None performed.' },
    { category: 'Other investigations', date: '—', result: 'None performed.' },
  ],
  investigationsSummary: 'No significant abnormal findings.',
  diagnosis: {
    primary: 'Sample primary diagnosis, unspecified.',
    secondary: 'None.',
    differential: 'None.',
  },
  treatment: {
    medication: 'Sample medication prescribed as documented.',
    procedures: 'None performed.',
    other: 'None.',
  },
  progress: 'Sample clinical progress notes.',
  responseToTreatment: 'Responding well to treatment.',
  currentStatus: {
    stable: true,
    improving: false,
    deteriorating: false,
    referred: false,
    admitted: false,
    discharged: false,
    condition: 'Vitally stable, tolerating oral intake.',
  },
  plan: {
    furtherInvestigations: 'None planned.',
    continuedTreatment: 'Continue current medication as prescribed.',
    followUpDate: '08-Jan-2026',
    referral: 'None.',
    other: 'None.',
  },
  conclusion: 'Sample overall conclusion summarizing the patient’s clinical course and outcome.',
  clinician: {
    name: 'Dr. Sample Physician',
    designation: 'Medical Officer',
    regNo: 'A0000',
    department: 'General Medicine',
    date: '01-Jan-2026',
  },
};

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className={styles['mr-field']}>
      <div className={styles['mr-field-label']}>{label}</div>
      <div className={styles['mr-field-value']}>{value || '—'}</div>
    </div>
  );
}

function SectionBlock({
  number,
  title,
  children,
}: {
  number: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={styles['mr-section']}>
      <h2 className={styles['mr-section-title']}>
        <span className={styles['mr-section-num']}>{number}</span> {title}
      </h2>
      <div className={styles['mr-section-body']}>{children}</div>
    </section>
  );
}

function Checkbox({ label, checked }: { label: React.ReactNode; checked: boolean }) {
  return (
    <div className={styles['mr-checkbox']}>
      <span className={`${styles['mr-checkbox-box']} ${checked ? styles['mr-checkbox-checked'] : ''}`}>
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </div>
  );
}

interface MedicalReportProps {
  report?: typeof DEMO_REPORT;
}

const MedicalReport = forwardRef<HTMLDivElement, MedicalReportProps>(({ report = DEMO_REPORT }, ref) => {
  const r = report;

  return (
    <div className={styles['mr-root']} ref={ref}>
      <div className={styles['mr-shell']}>
        <header className={styles['mr-header']}>
          <div className={styles['mr-header-bar']} />
          <div className={styles['mr-header-info']}>
            <p className={styles['mr-org']}>{r.facility}</p>
            <h1 className={styles['mr-title']}>Medical Report</h1>
          </div>
        </header>

        <SectionBlock number="1" title="Patient Details">
          <div className={styles['mr-field-grid']}>
            <Field label="Patient Name" value={r.patient.name} />
            <Field label="Patient Number / MRN" value={r.patient.mrn} />
            <Field label="Date of Birth" value={r.patient.dob} />
            <Field label="Age" value={r.patient.age} />
            <Field label="Sex" value={r.patient.sex} />
            <Field label="Date of Visit" value={r.patient.visitDate} />
            <Field label="Department / Clinic" value={r.patient.department} />
            <Field label="Ward" value={r.patient.ward} />
            <Field label="Referring Facility / Clinician" value={r.patient.referringFacility} />
          </div>
        </SectionBlock>

        <SectionBlock number="2" title="Reason for Medical Report">
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Chief Complaint / Reason for Visit</div>
            <p className={styles['mr-text']}>{r.reason.chiefComplaint}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Referral Reason, if applicable</div>
            <p className={styles['mr-text']}>{r.reason.referralReason}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="3" title="History">
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>History of Presenting Complaint</div>
            <p className={styles['mr-text']}>{r.history.presentingComplaint}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Past Medical History</div>
            <p className={styles['mr-text']}>{r.history.pastMedical}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Past Surgical History</div>
            <p className={styles['mr-text']}>{r.history.pastSurgical}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Medication History</div>
            <p className={styles['mr-text']}>{r.history.medication}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Allergy History</div>
            <p className={styles['mr-text']}>{r.history.allergy}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Family / Social History</div>
            <p className={styles['mr-text']}>{r.history.familySocial}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="4" title="Clinical Examination">
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>General Examination</div>
            <p className={styles['mr-text']}>{r.examination.general}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Vital Signs</div>
            <div className={styles['mr-field-grid']}>
              <Field label="Blood Pressure" value={r.examination.vitals.bp} />
              <Field label="Pulse Rate" value={r.examination.vitals.pulse} />
              <Field label="Respiratory Rate" value={r.examination.vitals.respRate} />
              <Field label="Temperature" value={r.examination.vitals.temperature} />
              <Field label="SpO₂" value={r.examination.vitals.spo2} />
              <Field label="Weight" value={r.examination.vitals.weight} />
            </div>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Systemic / Focused Examination</div>
            <p className={styles['mr-text']}>{r.examination.systemic}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="5" title="Investigations">
          <table className={styles['mr-table']}>
            <thead>
              <tr>
                <th>Investigation</th>
                <th>Date</th>
                <th>Result / Findings</th>
              </tr>
            </thead>
            <tbody>
              {r.investigations.map((inv, i) => (
                <tr key={i}>
                  <td className={styles['mr-inv-category']}>{inv.category}</td>
                  <td>{inv.date}</td>
                  <td>{inv.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Summary of Significant Findings</div>
            <p className={styles['mr-text']}>{r.investigationsSummary}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="6" title="Diagnosis / Clinical Impression">
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Primary Diagnosis</div>
            <p className={styles['mr-text']}>{r.diagnosis.primary}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Secondary Diagnosis(es), if applicable</div>
            <p className={styles['mr-text']}>{r.diagnosis.secondary}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Differential Diagnosis, if applicable</div>
            <p className={styles['mr-text']}>{r.diagnosis.differential}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="7" title="Treatment and Management">
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Medication Given / Prescribed</div>
            <p className={styles['mr-text']}>{r.treatment.medication}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Procedures / Interventions</div>
            <p className={styles['mr-text']}>{r.treatment.procedures}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Other Management</div>
            <p className={styles['mr-text']}>{r.treatment.other}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="8" title="Clinical Progress">
          <div className={styles['mr-subsection']}>
            <p className={styles['mr-text']}>{r.progress}</p>
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Response to Treatment</div>
            <p className={styles['mr-text']}>{r.responseToTreatment}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="9" title="Current Clinical Status">
          <div className={styles['mr-checkbox-grid']}>
            <Checkbox label="Stable" checked={r.currentStatus.stable} />
            <Checkbox label="Improving" checked={r.currentStatus.improving} />
            <Checkbox label="Deteriorating" checked={r.currentStatus.deteriorating} />
            <Checkbox label="Referred" checked={r.currentStatus.referred} />
            <Checkbox label="Admitted" checked={r.currentStatus.admitted} />
            <Checkbox label="Discharged" checked={r.currentStatus.discharged} />
          </div>
          <div className={styles['mr-subsection']}>
            <div className={styles['mr-subsection-title']}>Current Condition / Relevant Findings</div>
            <p className={styles['mr-text']}>{r.currentStatus.condition}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="10" title="Plan and Recommendations">
          <div className={styles['mr-field-grid']}>
            <Field label="Further Investigations" value={r.plan.furtherInvestigations} />
            <Field label="Medication / Continued Treatment" value={r.plan.continuedTreatment} />
            <Field label="Follow-up Date" value={r.plan.followUpDate} />
            <Field label="Referral" value={r.plan.referral} />
            <Field label="Other Recommendations" value={r.plan.other} />
          </div>
        </SectionBlock>

        <SectionBlock number="11" title="Conclusion">
          <p className={styles['mr-text']}>{r.conclusion}</p>
        </SectionBlock>

        <SectionBlock number="12" title="Healthcare Professional Details">
          <div className={styles['mr-field-grid']}>
            <Field label="Name" value={r.clinician.name} />
            <Field label="Designation" value={r.clinician.designation} />
            <Field label="Professional Registration Number" value={r.clinician.regNo} />
            <Field label="Department / Facility" value={r.clinician.department} />
            <Field label="Date" value={r.clinician.date} />
          </div>
          <div className={styles['mr-signoff']}>
            <div className={styles['mr-signature-line']}>
              <span className={styles['mr-field-label']}>Signature</span>
            </div>
            <div className={styles['mr-stamp-placeholder']}>Official Stamp</div>
          </div>
        </SectionBlock>

        <div className={styles['mr-confidentiality']}>
          <strong>Confidentiality Statement</strong>
          <p>
            This medical report contains confidential patient information and should only be accessed, used, or shared
            by authorized persons for legitimate healthcare or administrative purposes.
          </p>
        </div>
      </div>
    </div>
  );
});

MedicalReport.displayName = 'MedicalReport';

export default MedicalReport;
