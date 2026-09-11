import { ComboBox, InlineLoading, Modal, RadioButton, RadioButtonGroup } from '@carbon/react';
import React, { useEffect, useState } from 'react';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import { fetchServiceQueuesByLocationUuid } from '../../../resources/queue.resource';
import { fetchCashPoints, fetchPaymentModes } from '../../../shared/services/billing.resource';
import EmergencySlotComponent from '../emergency-extension.component';
import { generateReferenceNumber, getAbbreviation, type EmergencyFormData } from '../type';
import { sendEmergencyClaimUnIdentified } from '../emergency.resource';

const NON_INSURANCE_PAYMENT_MODES = /cash|mpesa|m-pesa|waiver/i;

function decodeHtmlEntities(value: string): string {
  if (!value || typeof document === 'undefined') {
    return value;
  }

  const element = document.createElement('textarea');
  element.innerHTML = value;
  return element.value;
}

interface UnidentifiedEmergencyComponentProps {
  open: boolean;
  onClose: () => void;
}

const UnIdentifiedEmergencyComponent: React.FC<UnidentifiedEmergencyComponentProps> = ({ open, onClose }) => {
  const [triageRooms, setTriageRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'insurance' | 'cash'>('insurance');
  const [insuranceSchemes, setInsuranceSchemes] = useState<string[]>([]);
  const [selectedInsuranceScheme, setSelectedInsuranceScheme] = useState('');
  const [loadingPaymentOptions, setLoadingPaymentOptions] = useState(false);
  const [hasCashPoint, setHasCashPoint] = useState<boolean | null>(null);
  const [hasCashMode, setHasCashMode] = useState<boolean | null>(null);
  const [emergencyForm, setEmergencyForm] = useState<EmergencyFormData>();
  const [emergencyFormValid, setEmergencyFormValid] = useState(false);
  const [creatingVisit, setCreatingVisit] = useState(false);

  const session = useSession();
  const locationUuid = session?.sessionLocation?.uuid;

  useEffect(() => {
    if (!open || !locationUuid) {
      return;
    }

    let active = true;
    setLoadingRooms(true);

    fetchServiceQueuesByLocationUuid(locationUuid)
      .then((response) => {
        if (!active) {
          return;
        }

        const rooms = (response?.results ?? [])
          .filter((queue) => queue.location?.uuid === locationUuid)
          .filter((queue) => /triage/i.test(queue.name ?? queue.display ?? ''))
          .map((queue) => decodeHtmlEntities(queue.display || queue.name))
          .filter(Boolean);

        setTriageRooms(Array.from(new Set(rooms)));
      })
      .catch(() => {
        if (active) {
          showSnackbar({
            kind: 'error',
            title: 'Could not load triage rooms',
            subtitle: 'Please try again.',
          });
        }
      })
      .finally(() => {
        if (active) {
          setLoadingRooms(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, locationUuid]);

  useEffect(() => {
    if (!open || !locationUuid) {
      return;
    }

    let active = true;
    setLoadingPaymentOptions(true);

    Promise.all([fetchCashPoints(), fetchPaymentModes()])
      .then(([cashPoints, paymentModes]) => {
        if (!active) {
          return;
        }

        setHasCashPoint(
          (cashPoints ?? []).some((cashPoint) => !cashPoint.retired && cashPoint.location?.uuid === locationUuid),
        );
        setHasCashMode((paymentModes ?? []).some((mode) => !mode.retired && /cash/i.test(mode.name ?? '')));
        setInsuranceSchemes(
          Array.from(
            new Set(
              (paymentModes ?? [])
                .filter((mode) => !mode.retired && mode.name && !NON_INSURANCE_PAYMENT_MODES.test(mode.name))
                .map((mode) => decodeHtmlEntities(mode.name)),
            ),
          ),
        );
      })
      .catch(() => {
        if (active) {
          showSnackbar({
            kind: 'error',
            title: 'Could not load payment options',
            subtitle: 'Please try again.',
          });
        }
      })
      .finally(() => {
        if (active) {
          setLoadingPaymentOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, locationUuid]);

  const handleSubmit = async () => {
    if (!emergencyFormValid || !emergencyForm || !selectedRoom || !locationUuid) {
      showSnackbar({
        kind: 'error',
        title: 'Form is invalid',
        subtitle: 'Please fill in all required fields.',
      });
      return;
    }

    setCreatingVisit(true);

    try {
      const data = await sendEmergencyClaimUnIdentified(
        emergencyForm.modeOfArrival!,
        emergencyForm.broughtBy!,
        locationUuid,
        emergencyForm.interventionCode!,
        generateReferenceNumber(),
        '',
        emergencyForm.providerNationalId!,
        'National ID',
        getAbbreviation(emergencyForm.licensingBody!),
        emergencyForm.notes ?? '',
      );

      if (data?.error) {
        showSnackbar({
          kind: 'error',
          title: 'Emergency claim failed',
          subtitle: data.message ?? 'The emergency claim could not be created.',
        });
        return;
      }

      if (data) {
        showSnackbar({
          kind: 'success',
          title: 'Emergency claim created',
          subtitle: 'The unidentified emergency claim was created successfully.',
        });
        onClose();
      }
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Emergency claim failed',
        subtitle: 'The unidentified emergency claim could not be created. Please try again.',
      });
    } finally {
      setCreatingVisit(false);
    }
  };

  return (
    <Modal
      size="lg"
      aria-label="Unidentified emergency patient details"
      modalHeading="Patient visit details"
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      onSecondarySubmit={creatingVisit ? undefined : onClose}
      open={open}
      primaryButtonDisabled={!emergencyFormValid || !emergencyForm || !selectedRoom || creatingVisit}
      primaryButtonText="Start visit & send to triage"
      secondaryButtonText="Cancel"
    >
      {creatingVisit && <InlineLoading description="Creating emergency claim" status="active" />}
      <ComboBox
        id="triage-room"
        titleText="Triage room"
        placeholder={loadingRooms ? 'Loading triage rooms...' : 'Search or select a triage room'}
        items={triageRooms}
        itemToString={(item) => item ?? ''}
        selectedItem={selectedRoom || null}
        onChange={({ selectedItem }) => setSelectedRoom((selectedItem as string) ?? '')}
        disabled={loadingRooms || triageRooms.length === 0}
      />

      <div style={{ marginTop: '1.5rem' }}>
        {loadingPaymentOptions ? <InlineLoading description="Loading payment options" status="active" /> : null}
        <RadioButtonGroup
          legendText="Payment method"
          name="unidentified-payment-method"
          orientation="horizontal"
          valueSelected={paymentMethod}
          disabled={hasCashPoint === false}
          onChange={(value) => {
            setPaymentMethod(value as 'insurance' | 'cash');
            setSelectedInsuranceScheme('');
          }}
        >
          <RadioButton id="unidentified-payment-insurance" labelText="Insurance" value="insurance" />
          <RadioButton id="unidentified-payment-cash" labelText="Cash" value="cash" disabled={hasCashMode === false} />
        </RadioButtonGroup>

        {paymentMethod === 'insurance' ? (
          <ComboBox
            id="insurance-scheme"
            titleText="Insurance scheme"
            placeholder="Search or select an insurance scheme"
            items={insuranceSchemes}
            itemToString={(item) => item ?? ''}
            selectedItem={selectedInsuranceScheme || null}
            onChange={({ selectedItem }) => setSelectedInsuranceScheme((selectedItem as string) ?? '')}
          />
        ) : null}
      </div>
      <EmergencySlotComponent
        onFormChange={setEmergencyForm}
        onValidationChange={setEmergencyFormValid}
        showOtp={false}
      />
    </Modal>
  );
};

export default UnIdentifiedEmergencyComponent;
