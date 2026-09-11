import { InlineLoading, Modal, RadioButton, RadioButtonGroup, Tag, TextInput } from '@carbon/react';
import React, { useState } from 'react';
import { createPatient, generateAmrsUniversalIdentifier } from '../../../resources/patient-resource';
import { IdentifierTypesUuids } from '../../../resources/identifier-types';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import { type CreatePatientDto } from 'src/registry/types';
import UnIdentifiedEmergencyComponent from './unidentified.component';

interface UnidentifiedRegistrationComponentProps {
  open: boolean;
  onClose: () => void;
}

const UnidentifiedRegistrationComponent: React.FC<UnidentifiedRegistrationComponentProps> = ({ open, onClose }) => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [gender, setGender] = useState('');
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [isSecondModalOpen, setIsSecondModalOpen] = useState(false);
  const [patientUuid, setPatientUuid] = useState('');

  const session = useSession();

  const locationUuid = session?.sessionLocation?.uuid;
  const isFormComplete = Boolean(firstName.trim() && familyName.trim() && gender);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingPatient(true);

    try {
      const patientPayload = await createPatientPayload();
      const res = await createPatient(patientPayload);

      const data = await res.json();
      if (data?.uuid) {
        showSnackbar({
          kind: 'success',
          title: 'Patient created',
          subtitle: `Patient ${data?.person?.display} was created successfully.`,
        });

        setPatientUuid(data.uuid);
        onClose();
        setIsSecondModalOpen(true);
      }
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: 'Patient creation failed',
        subtitle: 'The patient could not be created. Please try again.',
      });
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const createPatientPayload = async () => {
    const identifier = await generateAmrsUniversalIdentifier();
    const payload: CreatePatientDto = {
      identifiers: [
        {
          identifier: identifier,
          identifierType: IdentifierTypesUuids.AMRS_UNIVERSAL_ID_UUID,
          location: locationUuid,
          preferred: true,
        },
      ],
      person: {
        gender: gender,
        names: [
          {
            givenName: firstName.trim(),
            familyName: familyName.trim(),
          },
        ],
      },
    };
    return payload;
  };
  return (
    <>
      <Modal
        aria-label="Modal content"
        modalHeading="Unidentified Emergency Registration"
        onRequestClose={onClose}
        onRequestSubmit={handleSubmit}
        onSecondarySubmit={isCreatingPatient ? undefined : onClose}
        open={open}
        primaryButtonDisabled={!isFormComplete || isCreatingPatient}
        primaryButtonText="Register"
        secondaryButtonText="Cancel"
      >
        {isCreatingPatient && <InlineLoading description="Creating patient" status="active" />}
        <h5>Full Name</h5>
        <TextInput
          data-modal-primary-focus
          id="text-input-1"
          labelText="First Name"
          placeholder="patient first name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          style={{
            marginBottom: '24px',
          }}
        />
        <TextInput
          id="text-input-2"
          labelText={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Middle Name
              <Tag type="cool-gray">Optional</Tag>
            </span>
          }
          placeholder="patient middle name"
          value={middleName}
          onChange={(event) => setMiddleName(event.target.value)}
          style={{
            marginBottom: '24px',
          }}
        />
        <TextInput
          id="text-input-3"
          labelText="Family Name"
          placeholder="patient family name"
          value={familyName}
          onChange={(event) => setFamilyName(event.target.value)}
          style={{
            marginBottom: '24px',
          }}
        />
        <RadioButtonGroup
          invalidText="Invalid selection"
          legendText="Gender"
          name="gender"
          onChange={(value) => setGender(value?.toString() ?? '')}
          valueSelected={gender}
          warnText="Kindly select the gender of the patient"
        >
          <RadioButton id="male" labelText="Male" value="male" />
          <RadioButton id="female" labelText="Female" value="female" />
        </RadioButtonGroup>
      </Modal>
      <UnIdentifiedEmergencyComponent
        open={isSecondModalOpen}
        onClose={() => setIsSecondModalOpen(false)}
        patientUuid={patientUuid}
      />
    </>
  );
};

export default UnidentifiedRegistrationComponent;
