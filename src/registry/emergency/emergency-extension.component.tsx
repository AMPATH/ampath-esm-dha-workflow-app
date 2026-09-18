import React, { useEffect, useMemo, useRef, useState } from 'react';

import styles from './emergency.scss';
import { ComboBox, Dropdown, InlineLoading, TextArea } from '@carbon/react';
import EmergencyOtpComponent from './otp-component';
import { type HieClient } from '../types';
import {
  fetchEmergencyInterventions,
  fetchEmergencyProtocals,
  fetchProviders,
  sendEmergencyClaimIdentified,
} from './emergency.resource';
import { type Intervention } from 'src/claims';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import {
  type EmergencyProtocol,
  generateReferenceNumber,
  getAbbreviation,
  type EmergencyFormData,
  type Provider,
} from './type';
import { type ServicePrice, type CashPoint, type BillableService, type PayableBillableService } from 'src/shared/types';
import { type Bill } from 'src/billing/types';

import { fetchCashPoints } from '../../shared/services/billing.resource';
import { fetchBillableServicePage } from '../../shared/services/billable-service.resource';

interface EmergencySlotComponentProps {
  client?: HieClient;
  onFormChange: (data: EmergencyFormData) => void;
  onValidationChange: (isValid: boolean) => void;
  showValidationErrors?: boolean;
  showOtp?: boolean;
}

const EmergencySlotComponent: React.FC<EmergencySlotComponentProps> = ({
  client,
  onFormChange,
  onValidationChange,
  showOtp = true,
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
    protocol: false,
  });
  const [selectedCashPoint, setSelectedCashPoint] = useState<CashPoint | null>(null);
  const [allBillableServices, setAllBillableServices] = useState<BillableService[]>([]);
  const [selectedBillableService, setSelectedBillableService] = useState<BillableService | null>(null);
  const [filteredBillableServices, setFilteredBillableServices] = useState<BillableService[]>([]);
  const [cashPoints, setCashPoints] = useState<CashPoint[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [selectedServicePrice, setSelectedServicePrice] = useState<ServicePrice | null>(null);
  const userPickedService = useRef(false);
  const [patientBills, setPatientBills] = useState<Bill[]>([]);
  const [protocals, setProtocols] = useState<EmergencyProtocol[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<EmergencyProtocol | null>(null);

  const session = useSession();
  const locationUuid = session?.sessionLocation?.uuid;

  const normalizeText = (value?: string) =>
    (value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  useEffect(() => {
    if (!selectedIntervention?.code || !locationUuid) {
      setProtocols([]);
      setSelectedProtocol(null);
      return;
    }

    const loadProtocols = async () => {
      setProtocolsLoading(true);
      try {
        const res = await fetchEmergencyProtocals(selectedIntervention.code, locationUuid);
        const nextProtocols = res?.results ?? [];
        setProtocols(nextProtocols);
        setSelectedProtocol((prev) => {
          if (
            prev &&
            nextProtocols.some((protocol: EmergencyProtocol) => protocol.protocolCode === prev.protocolCode)
          ) {
            return prev;
          }
          return null;
        });
      } catch {
        setProtocols([]);
        setSelectedProtocol(null);
      } finally {
        setProtocolsLoading(false);
      }
    };

    loadProtocols();
  }, [selectedIntervention?.code, locationUuid]);

  useEffect(() => {
    const serviceNameMatchesProtocol = (service: BillableService, protocolNames: string[]) => {
      const serviceName = normalizeText(service.name ?? service.display ?? service.shortName ?? '');
      if (!serviceName) {
        return false;
      }

      const serviceWords = new Set(serviceName.split(/\s+/).filter(Boolean));
      return protocolNames.some((protocolName) => {
        const normalizedProtocol = normalizeText(protocolName);
        if (!normalizedProtocol) {
          return false;
        }

        if (normalizedProtocol.includes(serviceName) || serviceName.includes(normalizedProtocol)) {
          return true;
        }

        const protocolWords = new Set(normalizedProtocol.split(/\s+/).filter(Boolean));
        return [...protocolWords].some((word) => serviceWords.has(word) && word.length > 3);
      });
    };

    if (allBillableServices.length === 0) {
      setFilteredBillableServices([]);
      return;
    }

    const protocolNames = protocals.length > 0 ? protocals.map((protocol) => protocol.name).filter(Boolean) : [];
    const nextFiltered =
      protocolNames.length > 0
        ? allBillableServices.filter((service) => serviceNameMatchesProtocol(service, protocolNames))
        : allBillableServices;

    setFilteredBillableServices(nextFiltered);
    if (selectedBillableService && !nextFiltered.some((service) => service.uuid === selectedBillableService.uuid)) {
      setSelectedBillableService(null);
      setSelectedServicePrice(null);
    }
  }, [allBillableServices, protocals, selectedBillableService]);

  const handleModeOfArrivalChange = (item: any) => {
    if (item) {
      setModeOfArrival(item.selectedItem);
    }
  };

  useEffect(() => {
    const requiresProtocolSelection = protocals.length > 0;
    const isValid = Boolean(
      selectedCashPoint?.uuid &&
      selectedServicePrice?.uuid &&
      modeOfArrival &&
      broughtBy &&
      selectedIntervention?.code &&
      (!requiresProtocolSelection || selectedProtocol?.protocolCode) &&
      selectedProvider?.provider_national_id &&
      notes.trim() &&
      (!showOtp || (otpVerified && otp.length === 6)),
    );

    onValidationChange(isValid);

    onFormChange({
      cashpointUuid: selectedCashPoint?.uuid,
      servicePriceUuid: selectedServicePrice?.uuid,
      modeOfArrival,
      broughtBy,
      interventionCode: selectedIntervention?.code,
      protocolCode: selectedProtocol?.protocolCode,
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
    selectedProtocol,
    selectedProvider,
    notes,
    onFormChange,
    onValidationChange,
    otpVerified,
    otp,
    showOtp,
    protocals,
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

  // const initiateEmergencyClaim = async () => {
  //   const validationErrors = {
  //     modeOfArrival: !modeOfArrival,
  //     broughtBy: !broughtBy,
  //     intervention: !selectedIntervention?.code,
  //     provider: !selectedProvider,
  //     notes: !notes.trim(),
  //   };

  //   setErrors(validationErrors);

  //   const hasErrors = Object.values(validationErrors).some(Boolean);

  //   if (hasErrors) {
  //     return;
  //   }

  //   try {
  //     const res = await sendEmergencyClaimIdentified(
  //       modeOfArrival,
  //       broughtBy,
  //       locationUuid,
  //       selectedIntervention?.code,
  //       generateReferenceNumber(),
  //       client?.id,
  //       selectedProvider?.provider_national_id,
  //       'National ID',
  //       getAbbreviation(selectedProvider?.licensing_body),
  //       notes.trim(),
  //       otp,
  //     );
  //   } catch (error) {
  //     console.error('Error initiating emergency claim:', error);
  //   }
  // };

  const getProviders = async () => {
    const res = await fetchProviders();
    setProviders(res?.results ?? []);
  };

  const getProtocols = async () => {
    if (selectedIntervention?.code && locationUuid) {
      const res = await fetchEmergencyProtocals(selectedIntervention.code, locationUuid);
      setProtocols(res?.results ?? []);
      setSelectedProtocol(null);
    }
  };

  const handleInterventionChange = (item: any) => {
    if (item) {
      setSelectedIntervention(item.selectedItem);
      setSelectedProtocol(null);
    }
  };

  const handleProtocolChange = (item: any) => {
    if (item) {
      setSelectedProtocol(item.selectedItem ?? null);
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
      return bs?.shortName?.toLowerCase();
    });
    const outpatientServicePrices = outpatientServices.flatMap((bs) => bs.servicePrices ?? []);
    setAllBillableServices(outpatientServices);
    setSelectedBillableService(null);
    setSelectedServicePrice(null);
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
        {protocolsLoading ? <InlineLoading description="Loading protocols..." /> : null}
        <Dropdown
          autoAlign
          direction="top"
          id="protocol"
          invalidText="Kindly select protocol"
          items={protocals}
          itemToString={(item) => (item ? `${item.name} (${item.protocolCode})` : '')}
          label=""
          onChange={handleProtocolChange}
          size="md"
          titleText="Protocol"
          type="default"
          invalid={errors.protocol}
          disabled={protocolsLoading}
        />
      </div>
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
            items={allBillableServices ?? []}
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
      {showOtp ? (
        <EmergencyOtpComponent
          client={client}
          onOtpChange={setOtp}
          interventionCode={selectedIntervention?.code}
          onOtpVerificationStatusChange={setOtpVerified}
        />
      ) : null}
    </>
  );
};

export default EmergencySlotComponent;
