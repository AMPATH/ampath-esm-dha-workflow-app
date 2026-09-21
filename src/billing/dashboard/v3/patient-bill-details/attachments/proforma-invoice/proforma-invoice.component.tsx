import React, { forwardRef } from 'react';
import styles from './proforma-invoice.scss';

const DEMO_INVOICE = {
  facility: {
    name: 'Sample Hospital',
    code: 'SAMPLE-FAC-000',
    address: 'Sample Town, P.O. Box 000-00000',
    phone: '0700000000',
    email: 'info@samplehospital.example',
    kraPin: 'P000000000A',
  },
  invoiceDetails: {
    number: 'PI-0000000',
    date: '01-Jan-2026',
    validUntil: '08-Jan-2026',
    currency: 'KES',
  },
  patient: {
    name: 'Jane A. Doe',
    patientId: 'SAMPLE-ID-0000000',
    dob: '01-01-1990',
    age: '36',
    sex: 'Female',
    phone: '0700000000',
    encounterNo: 'ENC-0000000',
    department: 'General Medicine',
    ward: '—',
  },
  payer: {
    type: {
      cash: true,
      insurance: false,
      sha: false,
      corporate: false,
      other: '',
    },
    insuranceProvider: '—',
    membershipNo: '—',
    principalMember: '—',
    authorizationNo: '—',
  },
  items: [
    { no: 1, description: 'Consultation', quantity: 1, unitCost: 500 },
    { no: 2, description: 'Laboratory Investigation', quantity: 1, unitCost: 1500 },
  ],
  costSummary: {
    discount: 0,
    tax: 0,
    otherCharges: 0,
    amountInWords: 'Two Thousand Kenya Shillings Only',
  },
  payment: {
    method: {
      cash: true,
      mobileMoney: false,
      bank: false,
      insurance: false,
      other: '',
    },
    terms: 'Due on service.',
    dueDate: '01-Jan-2026',
  },
  service: {
    proposedTreatment: 'Sample proposed service/treatment.',
    expectedDate: '02-Jan-2026',
    referringClinician: 'Dr. Sample Referrer',
    remarks: 'None.',
  },
  authorization: {
    preparedBy: 'Sample Cashier',
    preparedDesignation: 'Billing Officer',
    preparedDate: '01-Jan-2026',
    approvedBy: 'Sample Supervisor',
    approvedDesignation: 'Finance Officer',
    approvedDate: '01-Jan-2026',
  },
  systemReferences: {
    encounterId: 'ENC-0000000',
    patientId: 'SAMPLE-ID-0000000',
    transactionRef: 'TXN-0000000',
    generatedBy: 'Demo User',
    generatedAt: '2026-01-01 00:00:00',
  },
};

function Field({ label, value }) {
  return (
    <div className={styles['pi-field']}>
      <div className={styles['pi-field-label']}>{label}</div>
      <div className={styles['pi-field-value']}>{value || '—'}</div>
    </div>
  );
}

function SectionBlock({ number, title, children }) {
  return (
    <section className={styles['pi-section']}>
      <h2 className={styles['pi-section-title']}>
        {number && <span className={styles['pi-section-num']}>{number}</span>} {title}
      </h2>
      <div className={styles['pi-section-body']}>{children}</div>
    </section>
  );
}

function Checkbox({ label, checked }) {
  return (
    <div className={styles['pi-checkbox']}>
      <span className={`${styles['pi-checkbox-box']} ${checked ? styles['pi-checkbox-checked'] : ''}`}>
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </div>
  );
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ProformaInvoiceProps {
  invoice?: typeof DEMO_INVOICE;
  patientUuid: string;
}

const ProformaInvoice = forwardRef<HTMLDivElement, ProformaInvoiceProps>(({ invoice = DEMO_INVOICE }, ref) => {
  const inv = invoice;
  const currency = inv.invoiceDetails.currency;

  const itemsWithTotal = inv.items.map((item) => ({
    ...item,
    total: item.quantity * item.unitCost,
  }));
  const subtotal = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);
  const estimatedTotal = subtotal - inv.costSummary.discount + inv.costSummary.tax + inv.costSummary.otherCharges;

  const payerType = inv.payer.type;
  const paymentMethod = inv.payment.method;

  return (
    <div className={styles['pi-root']} ref={ref}>
      <div className={styles['pi-shell']}>
        <header className={styles['pi-header']}>
          <div className={styles['pi-header-bar']} />
          <div className={styles['pi-header-info']}>
            <h1 className={styles['pi-title']}>Proforma Invoice</h1>
          </div>
        </header>

        <div className={styles['pi-facility-grid']}>
          <Field label="Facility Name" value={inv.facility.name} />
          <Field label="Facility Code" value={inv.facility.code} />
          <Field label="Address" value={inv.facility.address} />
          <Field label="Telephone" value={inv.facility.phone} />
          <Field label="Email" value={inv.facility.email} />
          <Field label="KRA PIN" value={inv.facility.kraPin} />
        </div>

        <div className={styles['pi-invoice-meta']}>
          <Field label="Proforma Invoice No." value={inv.invoiceDetails.number} />
          <Field label="Date" value={inv.invoiceDetails.date} />
          <Field label="Valid Until" value={inv.invoiceDetails.validUntil} />
          <Field label="Currency" value={inv.invoiceDetails.currency} />
        </div>

        <SectionBlock number="1" title="Patient Details">
          <div className={styles['pi-field-grid']}>
            <Field label="Patient Name" value={inv.patient.name} />
            <Field label="Patient ID / AMRS ID" value={inv.patient.patientId} />
            <Field label="Date of Birth" value={inv.patient.dob} />
            <Field label="Age" value={inv.patient.age} />
            <Field label="Sex" value={inv.patient.sex} />
            <Field label="Phone Number" value={inv.patient.phone} />
            <Field label="Visit / Encounter No." value={inv.patient.encounterNo} />
            <Field label="Department / Clinic" value={inv.patient.department} />
            <Field label="Ward" value={inv.patient.ward} />
          </div>
        </SectionBlock>

        <SectionBlock number="2" title="Billing / Payer Details">
          <div className={styles['pi-subsection']}>
            <div className={styles['pi-subsection-title']}>Payer Type</div>
            <div className={styles['pi-checkbox-grid']}>
              <Checkbox label="Cash" checked={payerType.cash} />
              <Checkbox label="Insurance" checked={payerType.insurance} />
              <Checkbox label="NHIF / SHA" checked={payerType.sha} />
              <Checkbox label="Corporate" checked={payerType.corporate} />
            </div>
            {payerType.other && <p className={styles['pi-text']}>Other: {payerType.other}</p>}
          </div>
          <div className={styles['pi-field-grid']}>
            <Field label="Insurance Provider" value={inv.payer.insuranceProvider} />
            <Field label="Membership / Policy No." value={inv.payer.membershipNo} />
            <Field label="Principal Member Name" value={inv.payer.principalMember} />
            <Field label="Authorization / Pre-authorization No." value={inv.payer.authorizationNo} />
          </div>
        </SectionBlock>

        <SectionBlock number="3" title="Medical Services / Items">
          <table className={styles['pi-table']}>
            <thead>
              <tr>
                <th>No.</th>
                <th>Service / Item Description</th>
                <th className={styles['pi-num-col']}>Quantity</th>
                <th className={styles['pi-num-col']}>Unit Cost ({currency})</th>
                <th className={styles['pi-num-col']}>Total ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {itemsWithTotal.map((item) => (
                <tr key={item.no}>
                  <td>{item.no}</td>
                  <td>{item.description}</td>
                  <td className={styles['pi-num-col']}>{item.quantity}</td>
                  <td className={styles['pi-num-col']}>{item.unitCost.toLocaleString()}</td>
                  <td className={styles['pi-num-col']}>{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionBlock>

        <SectionBlock number="4" title="Cost Summary">
          <div className={styles['pi-cost-summary']}>
            <div className={styles['pi-cost-row']}>
              <span>Subtotal</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            <div className={styles['pi-cost-row']}>
              <span>Discount</span>
              <span>{formatMoney(inv.costSummary.discount, currency)}</span>
            </div>
            <div className={styles['pi-cost-row']}>
              <span>Tax / VAT, where applicable</span>
              <span>{formatMoney(inv.costSummary.tax, currency)}</span>
            </div>
            <div className={styles['pi-cost-row']}>
              <span>Other Charges</span>
              <span>{formatMoney(inv.costSummary.otherCharges, currency)}</span>
            </div>
            <div className={`${styles['pi-cost-row']} ${styles['pi-cost-total']}`}>
              <span>Estimated Total</span>
              <span>{formatMoney(estimatedTotal, currency)}</span>
            </div>
          </div>
          <div className={styles['pi-subsection']}>
            <div className={styles['pi-subsection-title']}>Amount in Words</div>
            <p className={styles['pi-text']}>{inv.costSummary.amountInWords}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="5" title="Payment Information">
          <div className={styles['pi-subsection']}>
            <div className={styles['pi-subsection-title']}>Payment Method</div>
            <div className={styles['pi-checkbox-grid']}>
              <Checkbox label="Cash" checked={paymentMethod.cash} />
              <Checkbox label="Mobile Money" checked={paymentMethod.mobileMoney} />
              <Checkbox label="Bank" checked={paymentMethod.bank} />
              <Checkbox label="Insurance" checked={paymentMethod.insurance} />
            </div>
            {paymentMethod.other && <p className={styles['pi-text']}>Other: {paymentMethod.other}</p>}
          </div>
          <div className={styles['pi-field-grid']}>
            <Field label="Payment Terms" value={inv.payment.terms} />
            <Field label="Payment Due Date" value={inv.payment.dueDate} />
          </div>
        </SectionBlock>

        <SectionBlock number="6" title="Service / Treatment Information">
          <div className={styles['pi-subsection']}>
            <div className={styles['pi-subsection-title']}>Proposed Service / Treatment</div>
            <p className={styles['pi-text']}>{inv.service.proposedTreatment}</p>
          </div>
          <div className={styles['pi-field-grid']}>
            <Field label="Expected Date of Service / Admission" value={inv.service.expectedDate} />
            <Field label="Referring Clinician / Department" value={inv.service.referringClinician} />
          </div>
          <div className={styles['pi-subsection']}>
            <div className={styles['pi-subsection-title']}>Remarks</div>
            <p className={styles['pi-text']}>{inv.service.remarks}</p>
          </div>
        </SectionBlock>

        <SectionBlock number="7" title="Terms and Conditions">
          <ol className={styles['pi-terms-list']}>
            <li>This is a proforma invoice and represents an estimated cost of the proposed medical services.</li>
            <li>
              The final amount may change depending on the actual services, investigations, medicines, procedures,
              length of stay, or other services provided.
            </li>
            <li>The proforma invoice does not constitute proof of payment.</li>
            <li>
              A final invoice/receipt should be issued according to the actual services provided and payment received.
            </li>
            <li>Insurance services are subject to eligibility, authorization, and the applicable payer terms.</li>
            <li>
              The patient/client should confirm the estimated costs and payment arrangements before the service, where
              applicable.
            </li>
          </ol>
        </SectionBlock>

        <SectionBlock number="8" title="Authorization">
          <div className={styles['pi-authorization-grid']}>
            <div className={styles['pi-auth-block']}>
              <Field label="Prepared By" value={inv.authorization.preparedBy} />
              <Field label="Designation" value={inv.authorization.preparedDesignation} />
              <Field label="Date" value={inv.authorization.preparedDate} />
              <div className={styles['pi-signature-line']}>
                <span className={styles['pi-field-label']}>Signature</span>
              </div>
            </div>
            <div className={styles['pi-auth-block']}>
              <Field label="Approved By" value={inv.authorization.approvedBy} />
              <Field label="Designation" value={inv.authorization.approvedDesignation} />
              <Field label="Date" value={inv.authorization.approvedDate} />
              <div className={styles['pi-signature-line']}>
                <span className={styles['pi-field-label']}>Signature / Stamp</span>
              </div>
            </div>
          </div>
        </SectionBlock>

        <section className={styles['pi-section']}>
          <h2 className={styles['pi-section-title']}>AMRS System References</h2>
          <div className={styles['pi-section-body']}>
            <div className={styles['pi-field-grid']}>
              <Field label="AMRS Encounter ID" value={inv.systemReferences.encounterId} />
              <Field label="AMRS Patient ID" value={inv.systemReferences.patientId} />
              <Field label="Invoice / Transaction Reference" value={inv.systemReferences.transactionRef} />
              <Field label="Generated By" value={inv.systemReferences.generatedBy} />
              <Field label="Date/Time Generated" value={inv.systemReferences.generatedAt} />
            </div>
          </div>
        </section>

        <div className={styles['pi-footer']}>Confidential — For authorized billing use only</div>
      </div>
    </div>
  );
});

ProformaInvoice.displayName = 'ProformaInvoice';

export default ProformaInvoice;
