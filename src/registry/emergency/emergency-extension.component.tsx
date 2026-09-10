import React, { useEffect, useMemo, useRef, useState } from 'react';

import styles from './emergency.scss';
import { ComboBox, Dropdown, TextArea } from '@carbon/react';
import EmergencyOtpComponent from './otp-component';
import { type HieClient } from '../types';
import { fetchEmergencyInterventions, fetchProviders, sendEmergencyClaimIdentified } from './emergency.resource';
import { type Intervention } from 'src/claims';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import { generateReferenceNumber, getAbbreviation, type EmergencyFormData, type Provider } from './type';
import { type ServicePrice, type CashPoint, type BillableService, type PayableBillableService } from 'src/shared/types';
import { type Bill } from 'src/billing/types';

import { fetchCashPoints } from '../../shared/services/billing.resource';
import { fetchBillableServicePage } from '../../shared/services/billable-service.resource';

interface EmergencySlotComponentProps {
  client?: HieClient;
  onFormChange: (data: EmergencyFormData) => void;
  onValidationChange: (isValid: boolean) => void;
  showValidationErrors?: boolean;
}

const EmergencySlotComponent: React.FC<EmergencySlotComponentProps> = ({
  client,
  onFormChange,
  onValidationChange,
}) => {
  const [modeOfArrival, setModeOfArrival] = useState<string>();
  const [broughtBy, setBroughtBy] = useState<string>();
  const [notes, setNotes] = useState<string>('');
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention>();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider>();
  const MODE_OF_ARRIVAL = ['AMBULANCE', 'WALK-IN', 'OTHER'];
  const BROUGHT_BY = ['RELATIVE', 'UNKNOWN', 'SAMARITAN', 'PARAMEDICS'];
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({
    modeOfArrival: false,
    broughtBy: false,
    intervention: false,
    provider: false,
    notes: false,
  });
  const [selectedCashPoint, setSelectedCashPoint] = useState<CashPoint | null>(null);
  const [selectedBillableService, setSelectedBillableService] = useState<BillableService | null>(null);
  const [filteredBillableServices, setFilteredBillableServices] = useState<BillableService[]>([]);
  const [cashPoints, setCashPoints] = useState<CashPoint[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [selectedServicePrice, setSelectedServicePrice] = useState<ServicePrice | null>(null);
  const userPickedService = useRef(false);
  const [patientBills, setPatientBills] = useState<Bill[]>([]);

  const session = useSession();
  const locationUuid = session?.sessionLocation?.uuid;

  const handleModeOfArrivalChange = (item: any) => {
    if (item) {
      setModeOfArrival(item.selectedItem);
    }
  };

  useEffect(() => {
    const isValid = Boolean(
      selectedCashPoint?.uuid &&
      selectedServicePrice?.uuid &&
      modeOfArrival &&
      broughtBy &&
      selectedIntervention?.code &&
      selectedProvider?.provider_national_id &&
      notes.trim() &&
      otpVerified &&
      otp.length === 6,
    );

    onValidationChange(isValid);

    onFormChange({
      cashpointUuid: selectedCashPoint?.uuid,
      servicePriceUuid: selectedServicePrice?.uuid,
      modeOfArrival,
      broughtBy,
      interventionCode: selectedIntervention?.code,
      providerNationalId: selectedProvider?.provider_national_id,
      identificationType: 'National ID',
      licensingBody: getAbbreviation(selectedProvider?.licensing_body),
      notes,
      otp,
      intervention: selectedIntervention,
    });
  }, [
    selectedCashPoint,
    selectedServicePrice,
    modeOfArrival,
    broughtBy,
    selectedIntervention,
    selectedProvider,
    notes,
    onFormChange,
    onValidationChange,
    otpVerified,
    otp,
  ]);

  const getInterventions = async () => {
    const res = await fetchEmergencyInterventions();

    setInterventions(res?.results ?? []);
  };

  useEffect(() => {
    getInterventions();
    getProviders();
    getCashPoints();
    getBillableServices();
  }, []);

  const handleBroughtByChange = (item: any) => {
    if (item) {
      setBroughtBy(item.selectedItem);
    }
  };

  const handleNotes = (event: any) => {
    if (event) {
      setNotes(event.target.value);
    }
  };

  const initiateEmergencyClaim = async () => {
    const validationErrors = {
      modeOfArrival: !modeOfArrival,
      broughtBy: !broughtBy,
      intervention: !selectedIntervention?.code,
      provider: !selectedProvider,
      notes: !notes.trim(),
    };

    setErrors(validationErrors);

    const hasErrors = Object.values(validationErrors).some(Boolean);

    if (hasErrors) {
      return;
    }

    try {
      const res = await sendEmergencyClaimIdentified(
        modeOfArrival,
        broughtBy,
        locationUuid,
        selectedIntervention?.code,
        generateReferenceNumber(),
        client?.id,
        selectedProvider?.provider_national_id,
        'National ID',
        getAbbreviation(selectedProvider?.licensing_body),
        notes.trim(),
        otp,
      );
    } catch (error) {
      console.error('Error initiating emergency claim:', error);
    }
  };

  const getProviders = async () => {
    const res = await fetchProviders();
    setProviders(res?.results ?? []);
  };

  const handleInterventionChange = (item: any) => {
    if (item) {
      setSelectedIntervention(item.selectedItem);
    }
  };

  const handleProviderChange = (item: any) => {
    if (item) {
      setSelectedProvider(item.selectedItem);
    }
  };

  async function getCashPoints() {
    const cp = await fetchCashPoints();
    setCashPoints(cp);
    const firstFacilityCashPoint = cp.find((cashPoint) => cashPoint?.location?.uuid === locationUuid);
    setSelectedCashPoint(firstFacilityCashPoint ?? null);
  }

  async function getBillableServices() {
    const billableServices = await fetchBillableServicePage<BillableService>();
    const outpatientServices = billableServices.filter((bs) => {
      return bs?.shortName?.toLowerCase().includes('emergency');
    });
    const firstBillableService = outpatientServices[0] ?? null;
    const outpatientServicePrices = outpatientServices.flatMap((bs) => bs.servicePrices ?? []);
    const shaServicePrice = firstBillableService?.servicePrices?.find((servicePrice) => /sha/i.test(servicePrice.name));
    setSelectedBillableService(firstBillableService);
    setSelectedServicePrice(shaServicePrice ?? null);
    setFilteredBillableServices(outpatientServices);
    setServicePrices(outpatientServicePrices);
  }

  function generateServiceTypesList(billableServices: BillableService[]) {
    const sp: ServicePrice[] = [];
    for (let bs of billableServices) {
      if (bs.servicePrices) {
        const servicePrices = bs.servicePrices;
        for (let servicePrice of servicePrices) {
          sp.push(servicePrice);
        }
      }
    }
    setServicePrices(sp);
  }

  const selectInputText = (e: React.FocusEvent<HTMLElement>) => {
    const input = e.target as HTMLInputElement;
    if (input?.tagName === 'INPUT') {
      input.select();
    }
  };

  function getfacilityCashpoints() {
    return cashPoints.filter((cp) => {
      return cp && cp.location?.uuid === locationUuid;
    });
  }
  const showAlert = (alertType: 'error' | 'success', title: string, subtitle: string) => {
    showSnackbar({
      kind: alertType,
      title: title,
      subtitle: subtitle,
    });
  };

  const facilityCashPoints = useMemo(() => getfacilityCashpoints(), [cashPoints, locationUuid]);

  useEffect(() => {
    if (!selectedCashPoint && facilityCashPoints.length > 0) {
      setSelectedCashPoint(facilityCashPoints[0]);
    }
  }, [facilityCashPoints, selectedCashPoint]);

  const billableServicesHandler = (selectedBillableServiceUuid: string) => {
    const billableService = filteredBillableServices.find((service) => {
      return service.uuid === selectedBillableServiceUuid;
    });
    if (!billableService) {
      setSelectedBillableService(null);
      return;
    }

    setSelectedBillableService(billableService);
    const shaServicePrice = (billableService.servicePrices ?? []).find((servicePrice) =>
      /sha/i.test(servicePrice.name),
    );
    setSelectedServicePrice(shaServicePrice ?? billableService.servicePrices?.[0] ?? null);
    userPickedService.current = true;
  };
  const servicePricesHandler = (selectedServicePriceUuid: string) => {
    const sB = servicePrices.find((sp) => {
      return sp.uuid === selectedServicePriceUuid;
    });
    if (!sB) {
      setSelectedServicePrice(null);
      return;
    }

    setSelectedServicePrice(sB);

    if (userPickedService.current && !isValidBillableService(sB)) {
      showAlert('error', 'Existing bill', 'Patient has a similar bill');
    }
    userPickedService.current = true;
  };

  const isValidBillableService = (selectedService: ServicePrice) => {
    // check if patient has been billed for similar service
    let isValid = true;
    patientBills.forEach((b) => {
      const lineItems = b.lineItems;
      lineItems.forEach((l) => {
        if (l.billableService === selectedService.billableService.name) {
          isValid = false;
        }
      });
    });
    return isValid;
  };

  return (
    <>
      <div className={styles.formRow}>
        <div
          className={styles.formControl}
          onFocusCapture={selectInputText}
          onKeyDownCapture={(e) => {
            if (!selectedCashPoint || e.ctrlKey || e.metaKey || e.altKey) {
              return;
            }
            const showingLabel = (e.target as HTMLInputElement)?.value === (selectedCashPoint.name ?? '');
            if (showingLabel && (e.key === 'Backspace' || e.key === 'Delete')) {
              e.preventDefault();
              e.stopPropagation();
              setSelectedCashPoint(null);
            }
          }}
        >
          <ComboBox
            id="cash-point"
            titleText="Cash point"
            placeholder="Search cash point"
            items={facilityCashPoints ?? []}
            itemToString={(item) => item?.name ?? ''}
            shouldFilterItem={({ item, inputValue }) => {
              const selectedLabel = selectedCashPoint?.name ?? '';
              if (!inputValue || inputValue === selectedLabel) {
                return true;
              }
              return (item?.name ?? '').toLowerCase().includes(inputValue.toLowerCase());
            }}
            selectedItem={selectedCashPoint ?? null}
            onChange={({ selectedItem }) => setSelectedCashPoint(selectedItem ?? null)}
          />
        </div>
        <div
          className={styles.formControl}
          onFocusCapture={selectInputText}
          onKeyDownCapture={(e) => {
            if (!selectedBillableService || e.ctrlKey || e.metaKey || e.altKey) {
              return;
            }
            const label = `${selectedBillableService?.name} `;
            const showingLabel = (e.target as HTMLInputElement)?.value === label;
            if (showingLabel && (e.key === 'Backspace' || e.key === 'Delete')) {
              e.preventDefault();
              e.stopPropagation();
              setSelectedBillableService(null);
            }
          }}
        >
          <ComboBox
            id="billable-service"
            titleText="Billable service"
            placeholder="Search billable service"
            items={filteredBillableServices ?? []}
            itemToString={(item) => (item ? `${item?.name} ` : '')}
            shouldFilterItem={({ item, inputValue }) => {
              const selectedLabel = selectedBillableService ? `${selectedBillableService?.name}` : '';
              if (!inputValue || inputValue === selectedLabel) {
                return true;
              }
              const text = item ? `${item?.name} ` : '';
              return text.includes(inputValue.toLowerCase());
            }}
            selectedItem={selectedBillableService ?? null}
            onChange={({ selectedItem }) =>
              selectedItem ? billableServicesHandler(selectedItem.uuid) : setSelectedBillableService(null)
            }
          />
        </div>
        <div
          className={styles.formControl}
          onFocusCapture={selectInputText}
          onKeyDownCapture={(e) => {
            if (!selectedServicePrice || e.ctrlKey || e.metaKey || e.altKey) {
              return;
            }
            const label = `${selectedServicePrice?.name} `;
            const showingLabel = (e.target as HTMLInputElement)?.value === label;
            if (showingLabel && (e.key === 'Backspace' || e.key === 'Delete')) {
              e.preventDefault();
              e.stopPropagation();
              setSelectedServicePrice(null);
            }
          }}
        >
          <ComboBox
            id="service-price"
            titleText="Service price"
            placeholder="Search service price"
            items={servicePrices ?? []}
            itemToString={(item) => (item ? `(${item.name}: ${item?.price})` : '')}
            shouldFilterItem={({ item, inputValue }) => {
              const selectedLabel = selectedServicePrice
                ? `${selectedServicePrice?.name} (${selectedServicePrice.name}: ${selectedServicePrice?.price})`
                : '';
              if (!inputValue || inputValue === selectedLabel) {
                return true;
              }
              const text = item ? `${item?.name} ${item?.price}`.toLowerCase() : '';
              return text.includes(inputValue.toLowerCase());
            }}
            selectedItem={selectedServicePrice ?? null}
            onChange={({ selectedItem }) =>
              selectedItem ? servicePricesHandler(selectedItem.uuid) : setSelectedServicePrice(null)
            }
          />
        </div>
      </div>
      <div className={styles.dropDownContainer}>
        <div className={styles.dropDown} />
        <Dropdown
          autoAlign
          direction="top"
          id="mode-of-arrival"
          invalidText="Kindly select mode of arrival"
          items={MODE_OF_ARRIVAL}
          label=""
          onChange={handleModeOfArrivalChange}
          size="md"
          titleText="Mode of Arrival"
          type="default"
          invalid={errors.modeOfArrival}
        />
      </div>
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
      {/* <div className={styles.identifier}>
        <div>
          <TextInput
            defaultValue=""
            id="identifier-value"
            labelText="Identifier Value"
            maxCount={10}
            onChange={handleProviderIdentifierChange}
            placeholder="Identifier Value"
            size="md"
            type="text"
          />
        </div>
        <div className={styles.dropDownContainer}>
          <div className={styles.dropDown} />
          <Dropdown
            className={styles.identifierValue}
            autoAlign
            direction="top"
            id="identification-type"
            invalidText="Kindly select identification type"
            items={IDENTIFICATION_TYPES}
            label=""
            onChange={handleProviderIdentifierTypeChange}
            size="md"
            titleText="identification Type"
            type="default"
          />
        </div>
      </div>*/}
      {/* <div className={styles.dropDownContainer}>
        <div className={styles.dropDown} />
        <Dropdown
          autoAlign
          direction="top"
          id="regulatory-body"
          invalidText="Kindly select regulatory body"
          items={REGULATORY_BODIES}
          label=""
          onChange={handleRegulatoryBodyChange}
          size="md"
          titleText="Regulatory Body"
          type="default"
        />
      </div> */}
      <div className={styles.dropDownContainer}>
        <div className={styles.dropDown} />
        <Dropdown
          autoAlign
          direction="top"
          id="interventions"
          invalidText="Kindly select an intervention"
          items={interventions}
          itemToString={(item) => `${item?.name} - ${item?.code}`}
          label=""
          onChange={handleInterventionChange}
          size="md"
          titleText="Interventions"
          type="default"
          invalid={errors.intervention}
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
      <TextArea
        enableCounter
        helperText="Notes"
        id="notes"
        labelText=""
        maxCount={500}
        placeholder="notes"
        rows={4}
        value={notes}
        onChange={handleNotes}
      />
      <EmergencyOtpComponent
        client={client}
        onOtpChange={setOtp}
        interventionCode={selectedIntervention?.code}
        onOtpVerificationStatusChange={setOtpVerified}
      />
    </>
  );
};

export default EmergencySlotComponent;
