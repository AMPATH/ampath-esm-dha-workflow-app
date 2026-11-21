import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InlineLoading, Modal } from '@carbon/react';
import { openmrsFetch, restBaseUrl, usePatient } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useDefaultFacility } from '../../finalize-bill.resource';
import { type MappedBill } from '../../types';
import PrintableInvoice from './printable-invoice.component';
import styles from './bill-document-preview.scss';

const downloadPdf = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
};

export const InvoicePreview: React.FC<{ bill: MappedBill; onClose: () => void }> = ({ bill, onClose }) => {
  const { t } = useTranslation();
  const { patient, isLoading, error } = usePatient(bill.patientUuid);
  const { data: facility } = useDefaultFacility();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string>();
  const [generationError, setGenerationError] = useState(false);

  useEffect(() => {
    if (!patient || error || !invoiceRef.current) return;
    const invoiceElement = invoiceRef.current;
    let cancelled = false;
    let objectUrl: string;
    setInvoiceUrl(undefined);
    setGenerationError(false);

    const generateInvoice = async () => {
      try {
        const { default: html2pdf } = await import('html2pdf.js');
        const blob: Blob = await html2pdf()
          .set({ margin: 10, filename: `invoice_${bill.uuid}.pdf`, jsPDF: { unit: 'mm', format: 'a4' } })
          .from(invoiceElement)
          .outputPdf('blob');
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setInvoiceUrl(objectUrl);
      } catch (generationFailure) {
        if (!cancelled) setGenerationError(true);
      }
    };
    generateInvoice();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bill, patient, error, facility]);

  return createPortal(
    <Modal
      open
      size="lg"
      className={styles.documentModal}
      modalHeading={t('invoicePreview', 'Invoice preview')}
      passiveModal
      onRequestClose={onClose}
    >
      {error || generationError || (!isLoading && !patient) ? (
        <p role="alert">{t('invoiceLoadFailed', 'Could not load the invoice. Please try again.')}</p>
      ) : invoiceUrl ? (
        <>
          <p>{t('pdfViewerHint', 'Use the PDF viewer toolbar to print or download this document.')}</p>
          <iframe title={t('invoicePreview', 'Invoice preview')} src={invoiceUrl} style={{ width: '100%', height: '65vh', border: 0 }} />
        </>
      ) : (
        <InlineLoading description={t('preparingInvoice', 'Preparing invoice...')} />
      )}
      {patient && !error && (
        <div aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm', pointerEvents: 'none' }}>
          <PrintableInvoice bill={bill} patient={patient} defaultFacility={facility} componentRef={invoiceRef} />
        </div>
      )}
    </Modal>,
    document.body,
  );
};

export const ReceiptPreview: React.FC<{ billUuid: string; onClose: () => void }> = ({ billUuid, onClose }) => {
  const { t } = useTranslation();
  const [receiptUrl, setReceiptUrl] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string;
    const loadReceipt = async () => {
      try {
        const response = await openmrsFetch(
          `${restBaseUrl}/billing/receipt?billUuid=${encodeURIComponent(billUuid)}`,
          { signal: controller.signal, headers: { Accept: 'application/pdf' } },
        );
        if (!response.headers.get('content-type')?.toLowerCase().includes('application/pdf')) {
          throw new Error('Receipt is not a PDF');
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setReceiptUrl(objectUrl);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(true);
      }
    };
    loadReceipt();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [billUuid]);

  const downloadReceipt = () => {
    if (!receiptUrl) return;
    downloadPdf(receiptUrl, `receipt_${billUuid}.pdf`);
  };

  return createPortal(
    <Modal
      open
      size="lg"
      className={styles.documentModal}
      modalHeading={t('receiptPreview', 'Receipt preview')}
      primaryButtonText={t('downloadReceipt', 'Download receipt')}
      secondaryButtonText={t('close', 'Close')}
      primaryButtonDisabled={!receiptUrl}
      onRequestSubmit={downloadReceipt}
      onRequestClose={onClose}
    >
      {error ? (
        <p role="alert">{t('receiptLoadFailed', 'Could not load the receipt. Please try again.')}</p>
      ) : receiptUrl ? (
        <>
          <p>{t('pdfViewerHint', 'Use the PDF viewer toolbar to print or download this document.')}</p>
          <iframe title={t('receiptPreview', 'Receipt preview')} src={receiptUrl} style={{ width: '100%', height: '65vh', border: 0 }} />
        </>
      ) : (
        <InlineLoading description={t('loadingReceipt', 'Loading receipt...')} />
      )}
    </Modal>,
    document.body,
  );
};
