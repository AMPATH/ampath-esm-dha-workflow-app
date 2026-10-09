import { Button, Dropdown, Loading, Modal, RadioButton, Search, Tag, TextInput } from '@carbon/react';
import { Close, Identification, SearchLocate, WarningAltFilled } from '@carbon/react/icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  type ClientRegistrySearchRequest,
  type HieClient,
  IDENTIFIER_TYPES,
  type IdentifierType,
} from '../../../../../../registry/types';

import styles from './identify-emergencu-unknown-patient.scss';
import { fetchClientRegistryData } from '../../../../../../registry/registry.resource';
import { getReadableErrorMessage } from '../../../../../../registry/utils/error-handler';
import { getIntervention, isPatientMinor, isValidSeatchClientPayload, validateForm } from './identify-patient-helper';
import { maskCrNumber, maskExceptFirstAndLast } from '../../../../../../registry/utils/mask-data';
import { type ClaimsVisit } from '../../../types';
import ClaimsConsentExtension from '../../../../../../registry/modal/otp-verification-modal/extension/claims-consent.extension';
import { type VisitType, type Intervention } from '../../../../../../claims';
import { showSnackbar, type Patient } from '@openmrs/esm-framework';
import { fetchProviders, identifyUnidentifiedPatient } from '../../../../../../registry/emergency/emergency.resource';
import { type Provider, type identifyUnknownPatientDto } from '../../../../../../registry/emergency/type';

interface IdentifyEmergencyUnknownPatientModal {
  open: boolean;
  onClose: () => void;
  locationUuid: string;
  claimsVisit: ClaimsVisit;
  visitType: VisitType;
}

const IdentifyEmergencyUnknownPatientModal: React.FC<IdentifyEmergencyUnknownPatientModal> = ({
  open,
  onClose,
  locationUuid,
  claimsVisit,
  visitType,
}) => {
  const [identifierType, setIdentifierType] = useState<IdentifierType>('National ID');
  const [identifierValue, setIdentifierValue] = useState('');
  const [validationError, setValidationError] = useState('');
  const [notFound, setNotFound] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [principal, setPrincipal] = useState<HieClient | null>();
  const [fetchError, setFetchError] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<string>('principal');
  const [confirmedPatient, setConfirmedPatient] = useState<HieClient | null>(null);
  const [patient, setPatient] = useState<Patient>();
  const [otp, setOtp] = useState('');
  const [authGuid, setAuthGuid] = useState('');
  const [broughtBy, setBroughtBy] = useState<string>();
  const BROUGHT_BY = ['RELATIVE', 'UNKNOWN', 'SAMARITAN', 'PARAMEDICS'];
  const [errors, setErrors] = useState({
    broughtBy: false,
    provider: false,
  });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider>();

  const getProviders = async () => {
    const res = await fetchProviders();
    setProviders(res?.results ?? []);
  };

  useEffect(() => {
    getProviders();
  }, []);

  const handleClearIdentifier = () => {
    setIdentifierValue('');
    setValidationError('');
    setNotFound(false);
  };

  const handleSearchPatient = async () => {
    const error = validateForm(identifierValue, identifierType, locationUuid);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    setNotFound(false);
    setFetchError('');
    setLoading(true);
    try {
      const searchClientPayload = getSearchClientDto();

      if (!isValidSeatchClientPayload(searchClientPayload)) return false;

      const result = await fetchClientRegistryData(searchClientPayload);
      const patients = Array.isArray(result) ? result : [];

      if (patients.length === 0) {
        setPatient(undefined);
        setPrincipal(null);
        setNotFound(true);
        return;
      }

      const patient = patients[0];
      setPatient(patient);
      setPrincipal(patient);
      // Auto-select the principal by default so the worker can proceed immediately.
      setSelectedPatient('principal');
    } catch (err: any) {
      // Communicate the failure on the page (keep the worker's input so they can retry).
      const errorMessage = getReadableErrorMessage(err, 'We couldn’t reach the Client Registry.');
      setPrincipal(null);
      setFetchError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getSearchClientDto = (): ClientRegistrySearchRequest => {
    return {
      identificationNumber: identifierValue.trim(),
      identificationType: identifierType,
      locationUuid,
    };
  };

  const handleSelectedPatient = (sp: string) => {
    setSelectedPatient(sp);
    setOtp('');
    setAuthGuid('');
    setConfirmedPatient(null);
  };

  const handleCancelSelection = () => {
    setIdentifierValue('');
    setValidationError('');
    setNotFound(false);
    setFetchError('');
    setPatient(undefined);
    setPrincipal(null);
    setSelectedPatient('principal');
    setConfirmedPatient(null);
    setOtp('');
    setAuthGuid('');
  };

  const handleConfirmSelection = () => {
    if (!principal) {
      return;
    }

    const nextConfirmedPatient =
      selectedPatient === 'principal'
        ? principal
        : (principal.dependants?.find((d) => d?.result?.[0]?.id === selectedPatient)?.result?.[0] ?? null);

    if (!nextConfirmedPatient) {
      return;
    }

    setConfirmedPatient(nextConfirmedPatient);
    setOtp('');
    setAuthGuid('');
  };

  const filteredDependants = principal?.dependants?.filter((d) => d?.result?.[0]) ?? [];
  const consentIntervention = getIntervention(claimsVisit) ?? ({ code: '', paymentMechanism: '' } as Intervention);

  const isMinor = useMemo(() => {
    return isPatientMinor(patient);
  }, [patient]);

  function onClientConsent({ otp, authGuid }: { otp?: string; authGuid?: string }) {
    if (otp) {
      setOtp(otp);
    }
    if (authGuid) {
      setAuthGuid(authGuid);
    }
  }

  const handleSubmit = async () => {
    const unIdentifiedPatientDto = getIdentifyUnidentifiedPatientDto();

    try {
      const res = await identifyUnidentifiedPatient(unIdentifiedPatientDto);
      if (res?.error) {
        showSnackbar({
          kind: 'error',
          title: res.error ?? 'Error Identifying patient',
          subtitle: res.message ?? 'An error occurred while identifying the patient, please reload or contact support',
        });
      } else {
        showSnackbar({
          kind: 'success',
          title: 'Patient Identified Successfully',
          subtitle: 'The patient was identified successfully',
        });
      }
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Error Identifying patient',
        subtitle: 'An error occurred while identifying the patient, please reload or contact support',
      });
    } finally {
      setLoading(false);
    }
    onClose();
  };

  const getIdentifyUnidentifiedPatientDto = (): identifyUnknownPatientDto => {
    return {
      interventionCodes: [consentIntervention.code],
      modeOfArrival: claimsVisit?.mode_of_arrival || '',
      broughtBy: broughtBy || '',
      referenceNumber: claimsVisit?.reference_number,
      identificationNumber: selectedProvider?.provider_national_id || '',
      identificationType: 'National ID',
      regulationBody: selectedProvider?.licensing_body || '',
      notes: claimsVisit?.notes || 'notes',
      beneficiaryCrId: confirmedPatient?.id ?? '',
      otp,
      consentToken: claimsVisit?.authorization_code,
      locationUuid,
    };
  };

  const handleBroughtByChange = (item: any) => {
    if (item) {
      setBroughtBy(item.selectedItem);
    }
  };

  const handleProviderChange = (item: any) => {
    if (item) {
      setSelectedProvider(item.selectedItem);
    }
  };

  return (
    <>
      <Modal
        aria-label="Modal content"
        modalHeading="Identify Unknown Patient"
        onRequestClose={onClose}
        onRequestSubmit={handleSubmit}
        onSecondarySubmit={onClose}
        open={open}
        primaryButtonText="Submit"
        primaryButtonDisabled={!otp && !authGuid}
        secondaryButtonText="Cancel"
      >
        <div className={styles.sectionHeader}>
          <Identification size={20} className={styles.sectionIcon} />
          <h5 className={styles.sectionTitle}>Search client</h5>
        </div>
        <p className={styles.formIntro}>Search the national Client Registry by identification number to begin.</p>
        <div className={styles.formGrid}>
          <Dropdown
            id="identifier-type-dropdown"
            label="Select identifier type"
            titleText={
              <span className={styles.fieldLabel}>
                Identifier type<span className={styles.required}>*</span>
              </span>
            }
            items={IDENTIFIER_TYPES}
            selectedItem={identifierType}
            onChange={({ selectedItem }) => {
              const nextType = selectedItem as IdentifierType;
              setIdentifierType(nextType);
              if (!identifierValue.trim()) {
                setValidationError(`${nextType} number is required`);
              } else {
                setValidationError('');
              }
            }}
          />
          <div className={styles.clearableInput}>
            <TextInput
              id="identifier-value"
              labelText={
                <span className={styles.fieldLabel}>
                  {identifierType} number<span className={styles.required}>*</span>
                </span>
              }
              value={identifierValue}
              onChange={(e) => {
                setIdentifierValue(e.target.value);
                if (validationError) {
                  setValidationError('');
                }
                if (notFound) {
                  setNotFound(false);
                }
              }}
              onBlur={() => {
                if (!identifierValue.trim()) {
                  setValidationError(`${identifierType} number is required`);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchPatient();
                }
              }}
              invalid={!!validationError}
              invalidText={validationError}
              placeholder={`e.g. enter ${identifierType.toLowerCase()} number`}
            />
            {identifierValue && !validationError ? (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClearIdentifier}
                aria-label="Clear field"
              >
                <Close size={16} />
              </button>
            ) : null}
          </div>
        </div>
        <div className={styles.formBtn}>
          <Button
            className={styles.searchButton}
            size="sm"
            kind="primary"
            renderIcon={loading ? undefined : Search}
            onClick={handleSearchPatient}
            disabled={loading || !identifierValue.trim()}
          >
            {loading ? (
              <span className={styles.btnLoading}>
                <Loading small withOverlay={false} className={styles.btnSpinner} description="Searching" />
                Searching…
              </span>
            ) : (
              'Search'
            )}
          </Button>
        </div>
        {notFound ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <SearchLocate size={24} />
            </div>
            <div>
              <h5 className={styles.emptyTitle}>No match found</h5>
              <p className={styles.emptyText}>
                No client matching that <strong>{identifierType}</strong> was found in the Client Registry. Ask the
                patient to register on the{' '}
                <a href="https://afyayangu.go.ke/" target="_blank" rel="noopener noreferrer">
                  Afya Yangu portal
                </a>{' '}
                first, then search again — or use <strong>Emergency Registration</strong>.
              </p>
            </div>
          </div>
        ) : (
          <></>
        )}
        {fetchError ? (
          <div className={styles.errorState}>
            <div className={styles.errorStateIcon}>
              <WarningAltFilled size={24} />
            </div>
            <div>
              <h5 className={styles.errorStateTitle}>Couldn&apos;t complete the search</h5>
              <p className={styles.errorStateText}>{fetchError} Please check your connection and try again.</p>
            </div>
          </div>
        ) : (
          <></>
        )}
        {principal && (
          <div className={styles.hieData}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                <SearchLocate size={20} />
              </span>
              <h5 className={styles.sectionTitle}>Patient match</h5>
            </div>
            <p className={styles.formIntro}>Select the matching patient to continue.</p>

            <div className={styles.selectionHeader}>
              <p className={styles.summaryLine}>
                <span className={styles.summaryPrincipal} />1 principal
                {filteredDependants.length > 0 && (
                  <>
                    <span className={styles.summaryDot} />
                    <span className={styles.summaryDependant} />
                    {filteredDependants.length} {filteredDependants.length === 1 ? 'dependant' : 'dependants'}
                  </>
                )}
              </p>
            </div>

            <div className={styles.principalDependantSection}>
              <div className={styles.optionList}>
                <div
                  className={`${styles.optionCard} ${styles.principalOption} ${
                    selectedPatient === 'principal' ? styles.optionSelected : ''
                  }`}
                  onClick={() => handleSelectedPatient('principal')}
                >
                  <RadioButton
                    id="select-principal"
                    name="patient-selection"
                    labelText=""
                    value="principal"
                    checked={selectedPatient === 'principal'}
                    onChange={() => handleSelectedPatient('principal')}
                  />
                  <div className={styles.optionBody}>
                    <div className={styles.optionTopline}>
                      <span className={styles.optionName}>
                        {maskExceptFirstAndLast(principal.first_name)} {maskExceptFirstAndLast(principal.middle_name)}{' '}
                        {maskExceptFirstAndLast(principal.last_name)}
                      </span>
                      <Tag type="blue" size="sm">
                        Principal
                      </Tag>
                    </div>
                    <span className={styles.optionCr}>CR {maskCrNumber(principal.id)}</span>
                  </div>
                </div>

                {filteredDependants.map((d) => {
                  const dependant = d.result[0];
                  const relationship = d.relationship;
                  return (
                    <div
                      key={dependant.id}
                      className={`${styles.optionCard} ${styles.dependantOption} ${
                        selectedPatient === dependant.id ? styles.optionSelected : ''
                      }`}
                      onClick={() => handleSelectedPatient(dependant.id)}
                    >
                      <RadioButton
                        id={`select-${dependant.id}`}
                        name="patient-selection"
                        labelText=""
                        value={dependant.id}
                        checked={selectedPatient === dependant.id}
                        onChange={() => handleSelectedPatient(dependant.id)}
                      />
                      <div className={styles.optionBody}>
                        <div className={styles.optionTopline}>
                          <span className={styles.optionName}>
                            {maskExceptFirstAndLast(dependant.first_name)}{' '}
                            {maskExceptFirstAndLast(dependant.middle_name)}{' '}
                            {maskExceptFirstAndLast(dependant.last_name)}
                          </span>
                          <Tag type="teal" size="sm">
                            {relationship || 'Dependant'}
                          </Tag>
                        </div>
                        <span className={styles.optionCr}>CR {maskCrNumber(dependant.id)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.patientConfirmSelection}>
                <Button kind="secondary" size="sm" onClick={handleCancelSelection}>
                  Cancel
                </Button>
                <Button kind="primary" size="sm" onClick={handleConfirmSelection} disabled={!principal}>
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
        {confirmedPatient && (
          <>
            <div className={styles.dropDownContainer}>
              <div className={styles.dropDown} />
              <Dropdown
                autoAlign
                direction="top"
                id="brought-by"
                invalidText="Kindly select brought by"
                items={BROUGHT_BY}
                label=""
                onChange={handleBroughtByChange}
                size="md"
                titleText="Brought By"
                type="default"
                invalid={errors.broughtBy}
              />
            </div>
            <div className={styles.dropDownContainer}>
              <div className={styles.dropDown} />
              <Dropdown
                autoAlign
                direction="top"
                id="provider"
                invalidText="Kindly select a provider"
                items={providers}
                itemToString={(item) => item?.display ?? ''}
                label=""
                onChange={handleProviderChange}
                size="md"
                titleText="Provider"
                type="default"
                invalid={errors.provider}
              />
            </div>
            <ClaimsConsentExtension
              patient={confirmedPatient}
              intervention={consentIntervention}
              crIdentifierId={confirmedPatient.id}
              visitType={visitType}
              onClientConsent={onClientConsent}
              consentToken={claimsVisit.authorization_code}
              isDischarge={false}
              isMinor={isMinor}
            />
          </>
        )}
      </Modal>
    </>
  );
};

export default IdentifyEmergencyUnknownPatientModal;
