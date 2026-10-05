import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Modal, ModalBody, Row, Select, SelectItem, TextInput } from '@carbon/react';
import { submitClaim } from '../../../../../billing-claims.resource';
import { showSnackbar, type Patient } from '@openmrs/esm-framework';
import { DischargeReasonType, type ClaimsVisit, type SubmitClaimDto } from '../../../types';
import { type HieClient, HieIdentificationType } from '../../../../../../registry/types';
import type { Intervention, VisitType } from '../../../../../../claims';
import { searchPatientByCrNumber } from '../../../../../../resources/patient-search.resource';
import { IdentifierTypesUuids } from '../../../../../../resources/identifier-types';
import ClaimsConsentExtension from '../../../../../../registry/modal/otp-verification-modal/extension/claims-consent.extension';
import { useFormEncounters } from '../../../../../../death-reporting/death-reporting-form-button.resource';

interface submitClaimModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    claimsVisit: ClaimsVisit;
    invoiceNumber: string;
    locationUuid: string;
    visitType: VisitType;
}
const SubmitClaimModal: React.FC<submitClaimModalProps> = ({ open, onClose, onSuccess, locationUuid, claimsVisit, invoiceNumber, visitType }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [otp, setOtp] = useState("");
    const [authGuid, setAuthGuid] = useState("");
    const [dischargeReason, setDischargeReason] = useState<DischargeReasonType>();
    const [notes, setNotes] = useState("");
    const [deathNotificationSerialNumber, setDeathNotificationSerialNumber] = useState('');
    const DischargeReasonTypes = Object.values(DischargeReasonType);
    const [patient, setPatient] = useState<Patient>();
    const [isLoadingPatient, setIsLoadingPatient] = useState(false);
    const { hasDeathReportingFormEncounter, isLoading: isLoadingDeathReportingStatus } = useFormEncounters(
        patient?.uuid ?? '',
    );
    const isDeathReportingEncounter = Boolean(patient && hasDeathReportingFormEncounter);
    const isDeathStatusReady = Boolean(patient) && !isLoadingPatient && !isLoadingDeathReportingStatus;
    const dateOfDeath = patient?.person?.deathDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';

    useEffect(() => {
        if (!isDeathStatusReady) {
            return;
        }

        if (isDeathReportingEncounter) {
            setDischargeReason(DischargeReasonType.DECEASED);
            setOtp('');
            setAuthGuid('');
        } else {
            setDeathNotificationSerialNumber('');
        }
    }, [isDeathReportingEncounter, isDeathStatusReady]);

    useEffect(() => {
        const fn = async () => {
            setIsLoadingPatient(true);
            try {
                const response = await searchPatientByCrNumber(claimsVisit.member_number);
                if (response.results.length) {
                    setPatient(response.results[0]);
                }
            } finally {
                setIsLoadingPatient(false);
            }
        }

        if (claimsVisit) {
            setPatient(undefined);
            fn();
        }
    }, [claimsVisit]);

    const consentComplete = useMemo(() => {
        if (!isDeathStatusReady) {
            return false;
        }
        if (isDeathReportingEncounter) {
            return Boolean(
                dischargeReason === DischargeReasonType.DECEASED && deathNotificationSerialNumber.trim() && dateOfDeath,
            );
        }
        if (otp || authGuid) {
            return true;
        }
        return false;
    }, [
        isDeathReportingEncounter,
        isDeathStatusReady,
        dischargeReason,
        deathNotificationSerialNumber,
        dateOfDeath,
        otp,
        authGuid,
    ]);

    const invalidValues = useMemo(() => {
        if (invoiceNumber && claimsVisit) {
            return false;
        }
        return true;
    }, [invoiceNumber, claimsVisit]);

    function onClientConsent({ otp, authGuid }: { otp?: string, authGuid?: string }) {
        if (otp) {
            setOtp(otp);
        }
        if (authGuid) {
            setAuthGuid(authGuid);
        }
    }

    const nationalId = useMemo(() => {
        if (patient) {
            const identifiers = patient.identifiers ?? [];
            return identifiers.find(i => i.identifierType?.uuid === IdentifierTypesUuids.NATIONAL_ID_UUID)?.identifier ?? "";
        }
    }, [patient]);

    // Under-18 clients skip biometric verification and whitelisting further down in
    // ClaimsConsentExtension — mirrors send-to-queue.modal.tsx's isMinor check, but reads
    // the OpenMRS REST person shape (person.age / person.birthdate) since this patient
    // comes from searchPatientByCrNumber rather than the FHIR-shaped usePatient().
    const isMinor = useMemo(() => {
        const age = patient?.person?.age;
        if (typeof age === 'number') {
            return age < 18;
        }
        const birthdate = patient?.person?.birthdate;
        if (!birthdate) {
            return false;
        }
        const computedAge = dayjs().diff(dayjs(birthdate), 'year');
        return Number.isFinite(computedAge) && computedAge < 18;
    }, [patient]);

    const consentPatient = useMemo<HieClient>(() => {
        return {
            id: String(claimsVisit.member_number),
            first_name: claimsVisit.patient_name ?? '',
            identification_type: HieIdentificationType.NationalID,
            identification_number: nationalId ? String(nationalId) : ""
        } as unknown as HieClient;
    }, [claimsVisit, nationalId]);

    const getIntervention = () => {
        const interventions = claimsVisit.interventions;
        if (interventions && interventions.length) {
            const intervention = interventions[interventions.length - 1];
            return {
                code: intervention.intervention_code,
                paymentMechanism: intervention.intervention_payment_mechanism
            } as Intervention;
        }
    }

    async function handleSubmitClaim() {
        setLoading(true);
        try {
            const submitClaimPayload = getSubmitClaimPayload();
            const resp = await submitClaim(submitClaimPayload, claimsVisit.service_type);
            if ('error' in resp) {
                let message = 'message' in resp ? String(resp?.message) : "An error occurred while submitting the claim. Kindy retry or contact support"
                showSnackbar({
                    title: 'Error submitting claim',
                    kind: 'error',
                    subtitle: message,
                });
                onSuccess();
            } else {
                showSnackbar({
                    title: 'Success submitting claim',
                    kind: 'success',
                    subtitle: 'Claim submitted successfully',
                });
                onSuccess();
            }
        } catch (error) {
            showSnackbar({
                kind: 'error',
                title: 'Error submitting claim',
                subtitle: 'An error occurred while submitting the claim. Kindy retry or contact support',
            });
        } finally {
            setLoading(false);
        }
    }
    function getSubmitClaimPayload(): SubmitClaimDto {
        const payload = {
            consentToken: claimsVisit.authorization_code,
            invoiceNumber,
            locationUuid,
            dischargeReason,
        } as SubmitClaimDto & Record<string, unknown>;
        if (isDeathReportingEncounter) {
            payload['deathNotificationSerialNumber'] = deathNotificationSerialNumber.trim();
            payload['dateOfDeath'] = dateOfDeath;
            payload['dischargeDate'] = dateOfDeath;
        }
        if (otp) {
            payload["otp"] = otp;
        }
        if (authGuid) {
            payload["dischargeAuthGuid"] = authGuid;
        }
        if (notes) {
            payload["notes"] = notes;
        }
        return payload;
    }
    function holderFunction() {
        return;
    }
    return (
        <>
            <Modal
                modalHeading="Submit Claim"
                open={open}
                size="md"
                onSecondarySubmit={onClose}
                onRequestClose={onClose}
                onRequestSubmit={!invalidValues ? (loading ? holderFunction : (consentComplete ? handleSubmitClaim : undefined)) : undefined}
                primaryButtonText={!invalidValues ? (loading ? 'Submitting claim...' : (consentComplete ? 'Submit claim' : undefined)) : undefined}
                secondaryButtonText="Close"
            >
                <ModalBody>
                    <Row>
                        <Select
                            id="discharge-reason"
                            labelText="Discharge reason"
                            value={dischargeReason ?? ''}
                            disabled={isDeathReportingEncounter}
                            onChange={($event) => setDischargeReason($event.target.value as DischargeReasonType)}
                        >
                            <SelectItem value="" text="Select" />;
                            {DischargeReasonTypes.map((c) => {
                                return <SelectItem value={c} text={c} />;
                            })}
                        </Select>
                    </Row>
                    {isDeathReportingEncounter && (
                        <>
                            <Row>
                                <TextInput
                                    id="death-notification-serial-number"
                                    labelText="Death notification serial number"
                                    value={deathNotificationSerialNumber}
                                    required
                                    onChange={($event) => setDeathNotificationSerialNumber($event.target.value)}
                                />
                            </Row>
                            <Row>
                                <TextInput
                                    id="date-of-death"
                                    type="date"
                                    labelText="Date of death"
                                    value={dateOfDeath}
                                    required
                                    readOnly
                                    invalid={!dateOfDeath}
                                    invalidText="No date of death is recorded for this patient. Update the patient record before submitting."
                                />
                            </Row>
                        </>
                    )}
                    <Row>
                        <TextInput
                            id="notes"
                            labelText="Notes"
                            onChange={($event) => setNotes($event.target.value)}
                        />
                    </Row>
                    {
                        (isDeathStatusReady && !isDeathReportingEncounter && dischargeReason && notes) &&
                        <ClaimsConsentExtension patient={consentPatient} intervention={getIntervention()} crIdentifierId={claimsVisit.member_number} visitType={visitType} onClientConsent={onClientConsent} consentToken={claimsVisit.authorization_code} isDischarge={true} isMinor={isMinor} />
                    }
                </ModalBody>
            </Modal>
        </>
    );
};
export default SubmitClaimModal;
