import React, { useEffect, useMemo, useState } from 'react';
import styles from './claim-visit-details.component.scss';
import {
  type PatientFacilityBillDetails,
  type ClaimsVisit,
  ApplicableDocumentType,
  type ClaimVisitReponse,
  type ClaimVisitsDto,
} from '../../types';
import ClaimInvoiceDetails from '../claim-invoice-details/claim-invoice-details.component';
import ClaimInterventionDetails from '../claim-intervention-details/claim-intervention-details.component';
import ClaimDiagnosisDetails from '../claim-diagnosis-details/claim-diagnosis-details.component';
import { formatDate, launchWorkspace2, parseDate, showSnackbar, useVisit } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, Tile } from '@carbon/react';
import CloseClaimModal from '../modal/close-claim/close-claim.modal';
import SubmitClaimModal from '../modal/submit-claim/submit-claim.modal';
import {
  endVisit,
  fetchFacilityClaimVisits,
  useInvalidateProviderClaimPreview,
  usePayerClaimPreview,
} from '../../../../billing-claims.resource';
import ClaimDocuments from '../claim-documents/claim-documents';
import ClaimDoctors from '../claim-doctors/claim-doctors';
import AddClaimDoctorModal from '../modal/claim-doctors/add-claim-doctor/add-claim-doctor.modal';
import { VisitTypeUuids } from '../../../../../shared/constants/visit-types';
import { type VisitType } from '../../../../../claims';
import { canEditClaimContent } from '../../../v2/claim-statuses';
import { interventionHasBlockingPreauth, usePreauthPreview } from '../../../../../claims/claims.resource';
import PayerPreviewTile from '../payer-preview/payer-preview-tile.component';
import { Renew } from '@carbon/react/icons';
import { syncVisitToShr } from '../../../../../shr/shr-visit-sync';
import SubmitEmergencyClaimModal from '../modal/submit-emergency-claim/submit-emergency-claim.component';
import IdentifyEmergencyUnknownPatientModal from '../modal/identify-emergency-unknown-patient/identify-emergency-unknown-patient.component';
import { useFormEncounters } from '../../../../../death-reporting/death-reporting-form-button.resource';
import { type HieClient } from '../../../../../registry/types';
import { fetchClientRegistryData } from '../../../../../registry/registry.resource';
import { fetchClientEligibilityData } from '../../../../../registry/hie.resource';

interface claimVisitDetailsProps {
  claimsVisit: ClaimsVisit;
  locationUuid: string;
  patientBillDetails?: PatientFacilityBillDetails;
  onBillDetailsChange?: () => void;
  /** True while claim preview is revalidating — stand down content edits. */
  claimRefreshing?: boolean;
  billingDate?: string;
  patientUuid?: string;
}
const ClaimVisitDetails: React.FC<claimVisitDetailsProps> = ({
  claimsVisit,
  locationUuid,
  patientBillDetails,
  onBillDetailsChange,
  claimRefreshing = false,
  billingDate,
  patientUuid,
}) => {
  const [showCloseClaimModal, setShowCloseClaimModal] = useState<boolean>();
  const [showSubmitClaimModal, setSubmitCloseClaimModal] = useState<boolean>(false);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState<boolean>(false);
  const [triggerEndVisit, setTriggerEndVisit] = useState<boolean>(false);
  const { t } = useTranslation();
  const { activeVisit } = useVisit(patientBillDetails?.patient_uuid ?? '');
  const [showSubmitEmergencyModal, setshowSubmitEmergencyModal] = useState<boolean>(false);
  const [identifyPatient, setIdentifyPatient] = useState<boolean>(false);
  const { hasDeathReportingFormEncounter, isLoading } = useFormEncounters(patientUuid ?? '');
  const [principalContributor, setPrincipalContributor] = useState<HieClient | null>(null);
  const [claimPatient, setClaimPatient] = useState<HieClient | null>(null);
  const [claimVisits, setClaimVisits] = useState<ClaimVisitReponse[]>();
  const [loading, setLoading] = useState<boolean>(false);

  async function getFacilityClaimVisits() {
    setLoading(true);
    const facilityClaimsVisitsPayload = generateClaimsVisitPayload();
    try {
      const data = await fetchFacilityClaimVisits(facilityClaimsVisitsPayload);
      if (data) {
        setClaimVisits(data);
      }
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Error fetching facility bills',
        subtitle: 'An error occurred while fetehcing facility bills, please reload or contact support',
      });
    } finally {
      setLoading(false);
    }
  }

  function generateClaimsVisitPayload(): ClaimVisitsDto {
    return {
      consentToken: claimsVisit?.authorization_code ?? '',
    };
  }

  const detailedClaimVisit = claimVisits?.find((visit) => visit.authorizationCode === claimsVisit.authorization_code);

  const invoiceNumber = useMemo(() => {
    if (patientBillDetails) {
      return patientBillDetails.receipt_number;
    }
    return '';
  }, [patientBillDetails]);

  const { isLoading: isLoadingPayerPreview, payerPreviewResult } = usePayerClaimPreview(invoiceNumber, locationUuid);

  useEffect(() => {
    if (triggerEndVisit && activeVisit) {
      handleCloseVisit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerEndVisit, activeVisit]);

  useEffect(() => {
    if (claimsVisit) {
      fetchClientContactDetails();
      getFacilityClaimVisits();
    }
  }, [claimsVisit]);

  function handleCloseVisit() {
    const visitUuid = activeVisit?.uuid;
    endVisit(visitUuid)
      .then((v) => {
        showSnackbar({
          title: 'Success closing claim',
          kind: 'success',
          subtitle: 'Claim closed successfully',
        });
        // Claim is in and the visit just closed — push it to the SHR too. Pinned
        // to the visit just ended so the submission can't race onto a newer one;
        // failure is reported by syncVisitToShr and must not fail the claim flow.
        void syncVisitToShr(
          {
            patientUuid: patientBillDetails?.patient_uuid ?? '',
            locationUuid,
            ...(visitUuid ? { visitUuid } : {}),
          },
          t,
        );
      })
      .catch((err) => {
        console.error(err);
      });
  }

  const visitType: VisitType = useMemo(() => {
    if (activeVisit) {
      const visitTypeUuid = activeVisit?.visitType?.uuid;
      if (visitTypeUuid) {
        if (visitTypeUuid === VisitTypeUuids.OPD_VISIT_TYPE_UUID) {
          return 'OUTPATIENT';
        }
        if (visitTypeUuid === VisitTypeUuids.INPATIENT_VISIT_TYPE_UUID) {
          return 'INPATIENT';
        }
      }
    }
    return 'OUTPATIENT';
  }, [activeVisit, VisitTypeUuids]);

  const invalidateProviderClaimPreview = useInvalidateProviderClaimPreview();
  const { preview: preauthPreview } = usePreauthPreview(claimsVisit?.authorization_code, locationUuid);

  if (!claimsVisit) {
    return <>No Data</>;
  }

  function displayCloseClaimModal() {
    setShowCloseClaimModal(true);
  }
  function handleCloseClaimModal() {
    setShowCloseClaimModal(false);
  }
  async function displayCloseSubmitClaimModal() {
    setSubmitCloseClaimModal(true);
  }
  function handleCloseSubmitClaimModal() {
    setSubmitCloseClaimModal(false);
  }
  function onSubmitSuccess() {
    setTriggerEndVisit(true);
    handleCloseSubmitClaimModal();
    invalidateProviderClaimPreview();
  }
  function onCloseSuccess() {
    handleCloseClaimModal();
    invalidateProviderClaimPreview();
  }
  function handleAddDoctor() {
    setShowAddDoctorModal(true);
  }
  function handleCloseAddDoctorModal() {
    setShowAddDoctorModal(false);
  }

  const handleAddAttachment = () => {
    launchWorkspace2('upload-intervention-attachments-workspace', {
      consentToken: claimsVisit.authorization_code,
      patientUuid: '10',
      claimInterventions: claimsVisit.interventions,
      bill: patientBillDetails,
    });
  };

  const handleGenerateAttachment = () => {
    launchWorkspace2('generate-intervention-attachments-workspace', {
      consentToken: claimsVisit.authorization_code,
      patientUuid: '10',
      claimInterventions: claimsVisit.interventions,
      bill: patientBillDetails,
    });
  };

  // Same gates as v2: content edits only while claim is DRAFT / DRAFT_RESUBMIT and not refreshing.
  const canSwitchIntervention = canEditClaimContent(claimsVisit.workflow_state) && !claimRefreshing;
  const hasSwitchableIntervention = Boolean(
    claimsVisit.interventions?.some((iv) => {
      const active = (iv.workflow_state ?? '').toUpperCase() === 'ACTIVE';
      if (!active) return false;
      // Match row Actions: blocking preauth locks Switch together with Raise/Resubmit.
      return !interventionHasBlockingPreauth(preauthPreview, iv.intervention_code);
    }),
  );

  const canEditClaim = canEditClaimContent(claimsVisit.workflow_state) && !claimRefreshing;

  const handleSwitchIntervention = () => {
    if (!canSwitchIntervention || !hasSwitchableIntervention) {
      return;
    }
    launchWorkspace2('switch-intervention-workspace', {
      consentToken: claimsVisit.authorization_code,
      currentInterventions: claimsVisit.interventions,
      patientId: patientBillDetails?.cr_no ?? claimsVisit.patient_number,
      patientUuid: patientBillDetails?.patient_uuid,
      visitUuid: activeVisit?.uuid,
      billDate: patientBillDetails?.bill_date ?? claimsVisit.visit_start,
      onSwitchSuccess: () => {
        invalidateProviderClaimPreview();
        onBillDetailsChange?.();
      },
    });
  };

  const handleRefresh = () => {
    invalidateProviderClaimPreview();
  };

  const isEmergencyPatient = claimsVisit.service_type === 'EMERGENCY';

  const handleIdentifyUnknownPatient = () => {
    setIdentifyPatient(true);
  };

  async function fetchClientContactDetails() {
    const clientId = claimsVisit?.member_number ?? '';
    let principalContributorId = null;
    if (clientId) {
      const resp = await fetchClientEligibilityData(clientId, 'ClientRegistry ID', locationUuid);
      if (resp) {
        if (resp?.schemes && resp?.schemes.length > 0) {
          const principalContributor = resp?.schemes && resp?.schemes[0]?.principalContributor;
          principalContributorId = principalContributor.idNumber ?? '';
          await getPrincipalContributor(principalContributorId);
        }
      }
      await getClaimPatient(clientId);
    }
  }

  async function getClaimPatient(clientId: string) {
    const patient = await fetchClientRegistryData({
      identificationNumber: clientId,
      identificationType: 'ClientRegistry ID',
      locationUuid: locationUuid,
    });
    if (patient) {
      setClaimPatient(patient[0] ?? null);
    }
  }

  async function getPrincipalContributor(principalContributorId: string) {
    if (principalContributorId) {
      const resp = await fetchClientRegistryData({
        identificationNumber: principalContributorId,
        identificationType: 'National ID',
        locationUuid: locationUuid,
      });
      if (resp) {
        setPrincipalContributor(resp[0] ?? null);
      }
    }
  }

  return (
    <>
      <div className={styles.cvLayout}>
        <div className={styles.cvHeaderSection}>
          <div className={styles.headerTitle}>
            <h4>Claim Visit Details</h4>
          </div>
          <div className={styles.headerAction}>
            {isEmergencyPatient && claimsVisit?.member_number === 'SHANULL' && (
              <Button kind="primary" onClick={handleIdentifyUnknownPatient}>
                Identify Unknown Patient
              </Button>
            )}
            <Button kind="primary" onClick={displayCloseClaimModal} disabled={!canEditClaim}>
              Close Claim
            </Button>
            <Button kind="tertiary" onClick={displayCloseSubmitClaimModal} disabled={!canEditClaim}>
              Submit claim
            </Button>
            <Button
              kind="tertiary"
              onClick={handleSwitchIntervention}
              disabled={!canSwitchIntervention || !hasSwitchableIntervention}
            >
              Switch Intervention
            </Button>
          </div>
        </div>

        {!isLoading && hasDeathReportingFormEncounter ? (
          <InlineNotification
            className={styles.deathNotificationTile}
            hideCloseButton
            lowContrast
            kind="error"
            title="Death Notification"
            subtitle="The patient has been reported as deceased. Attach a Death Notification when submitting the claim."
          />
        ) : (
          <></>
        )}

        <Tile id="provider-preview">
          <div className={styles.tileHeader}>
            <dd>Provider preview</dd>
            <Button size="sm" kind="ghost" renderIcon={Renew} onClick={handleRefresh} disabled={claimRefreshing}>
              Refresh
            </Button>
          </div>
          <br />
          <br />
          <dl className={styles.detailsGrid}>
            <div className={styles.detailRow}>
              <dt>State</dt>
              <dd>{claimsVisit.workflow_state}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Status</dt>
              <dd>{claimsVisit.claim_auth_status}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Name</dt>
              <dd>{claimsVisit.patient_name}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Member Number</dt>
              <dd>{claimsVisit.member_number}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Scheme Code</dt>
              <dd>{claimsVisit.scheme_code}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Scheme Name</dt>
              <dd>{claimsVisit.scheme_name}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Service Type</dt>
              <dd>{claimsVisit.service_type}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Provider</dt>
              <dd>{claimsVisit.provider_name}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Phone No</dt>
              {claimsVisit.member_number === principalContributor?.id ? (
                <>
                  <dd>{principalContributor?.phone ?? ''}</dd>
                </>
              ) : (
                <>
                  <dd>{claimPatient?.phone ?? ''}</dd>
                </>
              )}
            </div>
            {principalContributor && (
              <div className={styles.detailRow}>
                <dt>Principal Contributor Phone No</dt>
                <dd>{principalContributor?.phone ?? ''}</dd>
              </div>
            )}

            <div className={styles.detailRow}>
              <dt>Visit Start</dt>
              <dd>{formatDate(parseDate(claimsVisit.visit_start))}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Total Amount</dt>
              <dd>{claimsVisit.total_claim_amount}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Total Net Amount</dt>
              <dd>{claimsVisit.total_claim_net_amount}</dd>
            </div>
          </dl>
        </Tile>
        {payerPreviewResult && (
          <PayerPreviewTile isLoadingPayerPreview={isLoadingPayerPreview} payerPreviewResult={payerPreviewResult} />
        )}
        <div className={styles.cvContentSection}>
          <section className={styles.section}>
            <h6>Invoices</h6>
            <div className={styles.tableScroll}>
              {claimsVisit.invoices && (
                <ClaimInvoiceDetails
                  claimInvoices={claimsVisit.invoices}
                  consentToken={claimsVisit.authorization_code}
                />
              )}
            </div>
          </section>
          <section className={styles.section}>
            <h6>Interventions</h6>
            <div className={styles.tableScroll}>
              {billingDate && claimsVisit.interventions && (
                <ClaimInterventionDetails
                  patientBillDetails={patientBillDetails}
                  memberNumber={claimsVisit.member_number}
                  claimInterventions={claimsVisit.interventions}
                  consentToken={claimsVisit.authorization_code}
                  visitUuid={activeVisit?.uuid ?? ''}
                  canSwitchIntervention={canSwitchIntervention}
                  onSwitchSuccess={() => {
                    invalidateProviderClaimPreview();
                    onBillDetailsChange?.();
                  }}
                  billingDate={billingDate}
                  hasDeathReportingFormEncounter={hasDeathReportingFormEncounter}
                />
              )}
            </div>
          </section>
          <section className={styles.section}>
            <h6>Diagnosis</h6>
            <div className={styles.tableScroll}>
              {claimsVisit.claim_diagnoses && <ClaimDiagnosisDetails claimDiagnosiss={claimsVisit.claim_diagnoses} />}
            </div>
          </section>
          <section className={styles.section}>
            <h6>Doctors</h6>
            <div className={styles.tableScroll}>
              <ClaimDoctors claimDoctors={claimsVisit.claim_doctors ?? []} />
            </div>
          </section>
          <section className={styles.section}>
            <h6>Attachments</h6>
            <ClaimDocuments claimAttachments={claimsVisit.claim_attachments ?? []} />
          </section>
        </div>
      </div>
      {showCloseClaimModal && (
        <CloseClaimModal
          locationUuid={locationUuid}
          open={showCloseClaimModal}
          onClose={handleCloseClaimModal}
          onSuccess={onCloseSuccess}
          consentToken={claimsVisit.authorization_code}
        />
      )}
      {showSubmitClaimModal && (
        <SubmitClaimModal
          locationUuid={locationUuid}
          open={showSubmitClaimModal}
          onClose={handleCloseSubmitClaimModal}
          onSuccess={onSubmitSuccess}
          claimsVisit={claimsVisit}
          invoiceNumber={invoiceNumber}
          visitType={visitType}
        />
      )}
      {showAddDoctorModal && (
        <AddClaimDoctorModal
          open={showAddDoctorModal}
          handleClose={handleCloseAddDoctorModal}
          claimDoctors={[]}
          consentToken={claimsVisit.authorization_code}
        />
      )}
      {showSubmitEmergencyModal && (
        <SubmitEmergencyClaimModal
          consentToken={claimsVisit.authorization_code}
          invoiceNumber={claimsVisit.invoices[0]?.invoice_number}
          open={showSubmitEmergencyModal}
          onClose={() => setshowSubmitEmergencyModal(false)}
          locationUuid={locationUuid}
        />
      )}
      {identifyPatient && (
        <IdentifyEmergencyUnknownPatientModal
          open={identifyPatient}
          onClose={() => setIdentifyPatient(false)}
          locationUuid={locationUuid}
          claimsVisit={detailedClaimVisit?.visitResponse}
          visitType={visitType}
        />
      )}
    </>
  );
};
export default ClaimVisitDetails;
