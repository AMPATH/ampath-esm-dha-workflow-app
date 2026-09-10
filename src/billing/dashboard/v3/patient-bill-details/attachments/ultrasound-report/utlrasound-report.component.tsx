import React, { forwardRef } from 'react';
import styles from './ultrasound-report.scss';

// ---------------------------------------------------------------------------
// Generic Ultrasound Report Template
// Pass a `report` object matching the shape of `DEMO_REPORT` below to reuse
// this component for any record. All data on this page is placeholder data.
// ---------------------------------------------------------------------------

const DEMO_REPORT = {
  facility: 'Sample Hospital',
  patient: {
    name: 'Jane A. Doe',
    mrn: 'SAMPLE-ID-0000000',
    age: '36',
    sex: 'Female',
    examDate: '01-Jan-2026',
    encounterNo: 'ENC-0000000',
    department: 'Radiology',
    ward: '—',
    referringClinician: 'Dr. Sample Referrer',
    examRequested: 'Abdominal Ultrasound',
    clinicalIndication: 'Sample clinical indication / provisional diagnosis.',
  },
  technique: {
    examTypes: {
      abdominal: true,
      pelvic: false,
      obstetric: false,
      renal: false,
      hepatobiliary: false,
      thyroid: false,
      breast: false,
      softTissue: false,
      musculoskeletal: false,
      doppler: false,
      other: '',
    },
    approach: 'Transabdominal, curvilinear probe.',
    preparation: {
      fasting: true,
      fullBladder: false,
      other: '',
      notApplicable: false,
    },
  },
  findings: {
    organArea: 'Sample organ/area examined.',
    organFindings: 'Sample findings as documented.',
    measurements: [{ structure: 'Sample structure', measurement: '0.0 cm', reference: 'Normal' }],
    additional: 'None.',
    abnormality: {
      none: true,
      abnormal: false,
      furtherEval: false,
    },
  },
  organSpecific: {
    liver: {
      sizeAppearance: 'Normal size and echotexture.',
      echotexture: 'Homogeneous.',
      focalLesion: 'None.',
      other: '—',
    },
    gallbladder: { appearance: 'Normal.', stonesSludge: 'None.', wallThickness: 'Normal.', other: '—' },
    kidneys: { right: 'Normal.', left: 'Normal.', sizeAppearance: 'Normal bilaterally.', stonesMasses: 'None.' },
    spleen: { sizeAppearance: 'Normal size and echotexture.' },
    pancreas: { appearance: 'Normal, not obscured by bowel gas.' },
    bladder: { appearance: 'Normal, adequately distended.', prePostVoid: 'Not applicable.' },
    pelvis: {
      uterus: 'Normal size and contour.',
      endometrium: 'Normal thickness for cycle phase.',
      rightAdnexa: 'Normal.',
      leftAdnexa: 'Normal.',
      other: '—',
    },
  },
  obstetric: null, // set to an object matching the shape below when applicable
  doppler: null, // set to an object matching the shape below when applicable
  impression: 'Sample ultrasound impression.',
  overallImpression: 'No significant abnormality detected.',
  recommendations: {
    noFurtherImaging: true,
    clinicalCorrelation: false,
    followUp: false,
    additionalImaging: false,
    specialistReview: false,
    other: '',
  },
  comments: 'None.',
  clinician: {
    name: 'Dr. Sample Radiologist',
    designation: 'Radiologist',
    regNo: 'A0000',
    date: '01-Jan-2026',
    time: '00:00',
  },
  systemInfo: {
    patientId: 'SAMPLE-ID-0000000',
    encounterId: 'ENC-0000000',
    imagingOrderNo: 'ORD-0000000',
    accessionNo: 'ACC-0000000',
    status: {
      draft: false,
      preliminary: false,
      final: true,
      amended: false,
    },
    finalizedAt: '01-Jan-2026 00:00',
  },
};

function Field({ label, value }) {
  return (
    <div className={styles['us-field']}>
      <div className={styles['us-field-label']}>{label}</div>
      <div className={styles['us-field-value']}>{value || '—'}</div>
    </div>
  );
}

function SectionBlock({ number, title, children }) {
  return (
    <section className={styles['us-section']}>
      <h2 className={styles['us-section-title']}>
        <span className={styles['us-section-num']}>{number}</span> {title}
      </h2>
      <div className={styles['us-section-body']}>{children}</div>
    </section>
  );
}

function Checkbox({ label, checked }) {
  return (
    <div className={styles['us-checkbox']}>
      <span className={`${styles['us-checkbox-box']} ${checked ? styles['us-checkbox-checked'] : ''}`}>
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </div>
  );
}

function SubTitle({ children }) {
  return <div className={styles['us-subsection-title']}>{children}</div>;
}

interface UltrasoundReportProps {
  report?: typeof DEMO_REPORT;
  patientUuid: string;
}

const UltrasoundReport = forwardRef<HTMLDivElement, UltrasoundReportProps>(({ report = DEMO_REPORT }, ref) => {
  const r = report;
  const et = r.technique.examTypes;
  const prep = r.technique.preparation;
  const ab = r.findings.abnormality;
  const rec = r.recommendations;
  const st = r.systemInfo.status;

  return (
    <div className={styles['us-root']} ref={ref}>
      <div className={styles['us-shell']}>
        <header className={styles['us-header']}>
          <div className={styles['us-header-bar']} />
          <div className={styles['us-header-info']}>
            <p className={styles['us-org']}>{r.facility}</p>
            <h1 className={styles['us-title']}>Ultrasound Report</h1>
          </div>
        </header>

        <SectionBlock number="1" title="Patient &amp; Examination Details">
          <div className={styles['us-field-grid']}>
            <Field label="Patient Name" value={r.patient.name} />
            <Field label="AMRS Patient ID / MRN" value={r.patient.mrn} />
            <Field label="Age" value={r.patient.age} />
            <Field label="Sex" value={r.patient.sex} />
            <Field label="Date of Examination" value={r.patient.examDate} />
            <Field label="Encounter / Visit No." value={r.patient.encounterNo} />
            <Field label="Department / Clinic" value={r.patient.department} />
            <Field label="Ward" value={r.patient.ward} />
            <Field label="Referring Clinician" value={r.patient.referringClinician} />
            <Field label="Examination / Ultrasound Requested" value={r.patient.examRequested} />
          </div>
          <div className={styles['us-subsection']}>
            <SubTitle>Clinical Indication / Provisional Diagnosis</SubTitle>
            <p className={styles['us-text']}>{r.patient.clinicalIndication}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="2" title="Ultrasound Technique">
          <div className={styles['us-subsection']}>
            <SubTitle>Examination Type</SubTitle>
            <div className={styles['us-checkbox-grid']}>
              <Checkbox label="Abdominal" checked={et.abdominal} />
              <Checkbox label="Pelvic" checked={et.pelvic} />
              <Checkbox label="Obstetric" checked={et.obstetric} />
              <Checkbox label="Renal / Urinary Tract" checked={et.renal} />
              <Checkbox label="Hepatobiliary" checked={et.hepatobiliary} />
              <Checkbox label="Thyroid" checked={et.thyroid} />
              <Checkbox label="Breast" checked={et.breast} />
              <Checkbox label="Soft Tissue" checked={et.softTissue} />
              <Checkbox label="Musculoskeletal" checked={et.musculoskeletal} />
              <Checkbox label="Doppler" checked={et.doppler} />
            </div>
            {et.other && <p className={styles['us-text']}>Other: {et.other}</p>}
          </div>
          <div className={styles['us-subsection']}>
            <SubTitle>Technique / Approach</SubTitle>
            <p className={styles['us-text']}>{r.technique.approach}</p>
          </div>
          <div className={styles['us-subsection']}>
            <SubTitle>Preparation</SubTitle>
            <div className={styles['us-checkbox-grid']}>
              <Checkbox label="Fasting" checked={prep.fasting} />
              <Checkbox label="Full bladder" checked={prep.fullBladder} />
              <Checkbox label="Not applicable" checked={prep.notApplicable} />
            </div>
            {prep.other && <p className={styles['us-text']}>Other: {prep.other}</p>}
          </div>
        </SectionBlock>

        <SectionBlock number="3" title="Ultrasound Findings">
          <div className={styles['us-subsection']}>
            <SubTitle>A. Organ / Area Examined</SubTitle>
            <p className={styles['us-text']}>{r.findings.organArea}</p>
            <p className={styles['us-text']}>{r.findings.organFindings}</p>
          </div>
          <div className={styles['us-subsection']}>
            <SubTitle>B. Measurements</SubTitle>
            <table className={styles['us-table']}>
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Measurement</th>
                  <th>Reference / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {r.findings.measurements.map((m, i) => (
                  <tr key={i}>
                    <td className={styles['us-row-label']}>{m.structure}</td>
                    <td>{m.measurement}</td>
                    <td>{m.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles['us-subsection']}>
            <SubTitle>C. Additional Findings</SubTitle>
            <p className={styles['us-text']}>{r.findings.additional}</p>
          </div>
          <div className={styles['us-subsection']}>
            <SubTitle>Presence of Abnormality</SubTitle>
            <div className={styles['us-checkbox-grid']}>
              <Checkbox label="No significant abnormality detected" checked={ab.none} />
              <Checkbox label="Abnormal findings identified" checked={ab.abnormal} />
              <Checkbox label="Further evaluation recommended" checked={ab.furtherEval} />
            </div>
          </div>
        </SectionBlock>

        <SectionBlock number="4" title="Organ-Specific Findings">
          <div className={styles['us-organ-grid']}>
            <div className={styles['us-organ']}>
              <SubTitle>Liver</SubTitle>
              <Field label="Size / Appearance" value={r.organSpecific.liver.sizeAppearance} />
              <Field label="Echotexture" value={r.organSpecific.liver.echotexture} />
              <Field label="Focal Lesion" value={r.organSpecific.liver.focalLesion} />
              <Field label="Other" value={r.organSpecific.liver.other} />
            </div>
            <div className={styles['us-organ']}>
              <SubTitle>Gallbladder</SubTitle>
              <Field label="Appearance" value={r.organSpecific.gallbladder.appearance} />
              <Field label="Stones / Sludge" value={r.organSpecific.gallbladder.stonesSludge} />
              <Field label="Wall Thickness" value={r.organSpecific.gallbladder.wallThickness} />
              <Field label="Other" value={r.organSpecific.gallbladder.other} />
            </div>
            <div className={styles['us-organ']}>
              <SubTitle>Kidneys</SubTitle>
              <Field label="Right Kidney" value={r.organSpecific.kidneys.right} />
              <Field label="Left Kidney" value={r.organSpecific.kidneys.left} />
              <Field label="Size / Appearance" value={r.organSpecific.kidneys.sizeAppearance} />
              <Field label="Stones / Masses / Hydronephrosis" value={r.organSpecific.kidneys.stonesMasses} />
            </div>
            <div className={styles['us-organ']}>
              <SubTitle>Spleen</SubTitle>
              <Field label="Size / Appearance" value={r.organSpecific.spleen.sizeAppearance} />
            </div>
            <div className={styles['us-organ']}>
              <SubTitle>Pancreas</SubTitle>
              <Field label="Appearance" value={r.organSpecific.pancreas.appearance} />
            </div>
            <div className={styles['us-organ']}>
              <SubTitle>Urinary Bladder</SubTitle>
              <Field label="Appearance" value={r.organSpecific.bladder.appearance} />
              <Field label="Pre/Post-void Volume, if applicable" value={r.organSpecific.bladder.prePostVoid} />
            </div>
            <div className={styles['us-organ']}>
              <SubTitle>Pelvis / Reproductive Organs</SubTitle>
              <Field label="Uterus" value={r.organSpecific.pelvis.uterus} />
              <Field label="Endometrium" value={r.organSpecific.pelvis.endometrium} />
              <Field label="Right Adnexa / Ovary" value={r.organSpecific.pelvis.rightAdnexa} />
              <Field label="Left Adnexa / Ovary" value={r.organSpecific.pelvis.leftAdnexa} />
              <Field label="Other" value={r.organSpecific.pelvis.other} />
            </div>
          </div>
        </SectionBlock>

        <SectionBlock number="5" title="Obstetric Ultrasound — If Applicable">
          {r.obstetric ? (
            <div className={styles['us-field-grid']}>
              <Field label="Gestational Age by LMP" value={r.obstetric.gaByLmp} />
              <Field label="Estimated Gestational Age by Ultrasound" value={r.obstetric.gaByUltrasound} />
              <Field label="Fetal Number" value={r.obstetric.fetalNumber} />
              <Field label="Fetal Heart Rate" value={r.obstetric.fetalHeartRate} />
              <Field label="Presentation" value={r.obstetric.presentation} />
              <Field label="Placental Location" value={r.obstetric.placentalLocation} />
              <Field label="Amniotic Fluid" value={r.obstetric.amnioticFluid} />
              <Field label="Biparietal Diameter (BPD)" value={r.obstetric.bpd} />
              <Field label="Head Circumference (HC)" value={r.obstetric.hc} />
              <Field label="Abdominal Circumference (AC)" value={r.obstetric.ac} />
              <Field label="Femur Length (FL)" value={r.obstetric.fl} />
              <Field label="Estimated Fetal Weight" value={r.obstetric.estimatedFetalWeight} />
              <Field label="Estimated Due Date" value={r.obstetric.estimatedDueDate} />
              {r.obstetric.fetalAnatomy && (
                <div className={styles['us-field']} style={{ gridColumn: '1 / -1' }}>
                  <div className={styles['us-field-label']}>Fetal Anatomy / Other Findings</div>
                  <div className={styles['us-field-value']}>{r.obstetric.fetalAnatomy}</div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles['us-empty']}>Not applicable to this examination.</div>
          )}
        </SectionBlock>

        <SectionBlock number="6" title="Doppler — If Applicable">
          {r.doppler ? (
            <>
              <div className={styles['us-field-grid']}>
                <Field label="Vessel / Structure Examined" value={r.doppler.vessel} />
              </div>
              <div className={styles['us-subsection']}>
                <SubTitle>Flow / Velocity Findings</SubTitle>
                <p className={styles['us-text']}>{r.doppler.flowFindings}</p>
              </div>
              <div className={styles['us-subsection']}>
                <SubTitle>Doppler Measurements</SubTitle>
                <p className={styles['us-text']}>{r.doppler.measurements}</p>
              </div>
              <div className={styles['us-subsection']}>
                <SubTitle>Interpretation</SubTitle>
                <p className={styles['us-text']}>{r.doppler.interpretation}</p>
              </div>
            </>
          ) : (
            <div className={styles['us-empty']}>Not applicable to this examination.</div>
          )}
        </SectionBlock>

        <SectionBlock number="7" title="Impression / Conclusion">
          <div className={styles['us-subsection']}>
            <SubTitle>Ultrasound Impression</SubTitle>
            <p className={styles['us-text']}>{r.impression}</p>
          </div>
          <div className={styles['us-subsection']}>
            <SubTitle>Overall Impression</SubTitle>
            <p className={styles['us-text']}>{r.overallImpression}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="8" title="Recommendations">
          <div className={styles['us-checkbox-grid']}>
            <Checkbox label="No further imaging required" checked={rec.noFurtherImaging} />
            <Checkbox label="Clinical correlation recommended" checked={rec.clinicalCorrelation} />
            <Checkbox label="Follow-up ultrasound recommended" checked={rec.followUp} />
            <Checkbox label="Additional imaging recommended" checked={rec.additionalImaging} />
            <Checkbox label="Specialist review recommended" checked={rec.specialistReview} />
          </div>
          {rec.other && <p className={styles['us-text']}>Other: {rec.other}</p>}
          <div className={styles['us-subsection']}>
            <SubTitle>Comments / Recommendations</SubTitle>
            <p className={styles['us-text']}>{r.comments}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="9" title="Reporting Clinician">
          <div className={styles['us-field-grid']}>
            <Field label="Reported By" value={r.clinician.name} />
            <Field label="Designation" value={r.clinician.designation} />
            <Field label="Professional Registration No." value={r.clinician.regNo} />
            <Field label="Date" value={r.clinician.date} />
            <Field label="Time" value={r.clinician.time} />
          </div>
          <div className={styles['us-signoff']}>
            <div className={styles['us-signature-line']}>
              <span className={styles['us-field-label']}>Signature</span>
            </div>
            <div className={styles['us-stamp-placeholder']}>Facility Stamp</div>
          </div>
        </SectionBlock>

        <section className={styles['us-section']}>
          <h2 className={styles['us-section-title']}>AMRS System Information</h2>
          <div className={styles['us-section-body']}>
            <div className={styles['us-field-grid']}>
              <Field label="AMRS Patient ID" value={r.systemInfo.patientId} />
              <Field label="Encounter ID" value={r.systemInfo.encounterId} />
              <Field label="Imaging Order No." value={r.systemInfo.imagingOrderNo} />
              <Field label="Imaging Study / Accession No." value={r.systemInfo.accessionNo} />
              <Field label="Date/Time Report Finalized" value={r.systemInfo.finalizedAt} />
            </div>
            <div className={styles['us-subsection']}>
              <SubTitle>Report Status</SubTitle>
              <div className={styles['us-checkbox-grid']}>
                <Checkbox label="Draft" checked={st.draft} />
                <Checkbox label="Preliminary" checked={st.preliminary} />
                <Checkbox label="Final" checked={st.final} />
                <Checkbox label="Amended" checked={st.amended} />
              </div>
            </div>
          </div>
        </section>

        <div className={styles['us-footer']}>Confidential — For authorized clinical use only</div>
      </div>
    </div>
  );
});

UltrasoundReport.displayName = 'UltrasoundReport';

export default UltrasoundReport;
