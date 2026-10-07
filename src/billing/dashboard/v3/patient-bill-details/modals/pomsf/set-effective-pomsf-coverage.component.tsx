import React, { useEffect, useState } from 'react';
import { InlineLoading, Modal, ModalBody, RadioButton, RadioButtonGroup, TextInput } from '@carbon/react';
import { type Scheme } from 'src/registry/types';
import { type PomsfBalance } from '../../../../../../claims';
import { fetchPomsfBalance } from '../../../../../../claims/claims.resource';
import { formatKes } from '../../../../../../registry/drawer/pomsf-balance.util';
import { getSchemeBalance } from './pomsf-scheme-balance.util';
import styles from './set-effective-pomsf-coverage.scss';

interface SetEffectivePomsfCoverageModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (policyNumber: string) => void;
  locationUuid: string;
  consentToken: string;
  memberNumber: string;
  policyNumber: string;
  schemes: Scheme[];
}

const SetEffectivePomsfCoverageModal: React.FC<SetEffectivePomsfCoverageModalProps> = ({
  open,
  onClose,
  onSuccess,
  locationUuid,
  consentToken,
  memberNumber,
  policyNumber,
  schemes,
}) => {
  const [selectedPolicyNumber, setSelectedPolicyNumber] = useState(policyNumber);
  const [pomsfBalance, setPomsfBalance] = useState<PomsfBalance | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false);

  useEffect(() => {
    setSelectedPolicyNumber(policyNumber);
  }, [policyNumber, schemes]);

  useEffect(() => {
    if (!open || !memberNumber || !locationUuid) {
      return;
    }

    let active = true;
    setIsLoadingBalances(true);
    fetchPomsfBalance(memberNumber, locationUuid)
      .then((balance) => {
        if (active) {
          setPomsfBalance(balance ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setPomsfBalance(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingBalances(false);
        }
      });

    return () => {
      active = false;
    };
  }, [locationUuid, memberNumber, open]);

  function handleSetEffectiveCoverage() {
    if (selectedPolicyNumber) {
      onSuccess(selectedPolicyNumber);
      onClose();
    }
  }

  return (
    <Modal
      modalHeading="Set Effective POMSF Coverage"
      open={open}
      size="md"
      onSecondarySubmit={onClose}
      onRequestClose={onClose}
      onRequestSubmit={handleSetEffectiveCoverage}
      primaryButtonText="Set Effective Coverage"
      secondaryButtonText="Close"
    >
      <ModalBody>
        <div>
          <TextInput id="pomsf-location" labelText="Location UUID" value={locationUuid} readOnly />
          <TextInput id="pomsf-consent" labelText="Consent Token" value={consentToken} readOnly />
          {isLoadingBalances ? (
            <InlineLoading description="Loading POMSF balances…" />
          ) : (
            <RadioButtonGroup
              name="effective-pomsf-policy"
              legendText="Select a scheme to use for effective coverage"
              orientation="vertical"
            >
              <div className={styles.schemeCards}>
                {schemes.map((scheme) => {
                  const balance = getSchemeBalance(pomsfBalance, scheme);
                  const policyNumber = scheme.policy?.number ?? '';
                  const isSelected = selectedPolicyNumber === policyNumber;

                  return (
                    <div className={styles.schemeCard} key={`${scheme.schemeName}-${policyNumber}`}>
                      <RadioButton
                        id={`pomsf-scheme-${policyNumber}`}
                        labelText={`${scheme.schemeName} · ${policyNumber}`}
                        checked={isSelected}
                        onChange={() => setSelectedPolicyNumber(policyNumber)}
                      />
                      <div className={styles.balance}>
                        <strong>{formatKes(balance)}</strong>
                        <span>Available balance</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioButtonGroup>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default SetEffectivePomsfCoverageModal;
