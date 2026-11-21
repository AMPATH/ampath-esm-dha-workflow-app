import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextInput } from '@carbon/react';
import { type PaymentFormValue } from '../payments.component';
import { type GroupedLineItemPayment } from './payment-form.utils';
import styles from './payment-form.scss';

type PaymentFormProps = {
  disablePayment: boolean;
  payments: GroupedLineItemPayment[];
};

const PaymentForm: React.FC<PaymentFormProps> = ({ disablePayment, payments }) => {
  const { t } = useTranslation();
  const { control } = useFormContext<PaymentFormValue>();

  if (disablePayment) {
    return null;
  }

  return (
    <div className={styles.container}>
      {payments.map((payment, index) => (
        <div className={styles.paymentMethodContainer} key={payment.key}>
          <TextInput
            id={`payment-method-${payment.key}`}
            labelText={t('paymentMethod', 'Payment method')}
            value={payment.paymentModeName}
            readOnly
          />
          <TextInput
            id={`payment-amount-${payment.key}`}
            labelText={t('amount', 'Amount')}
            value={payment.amount.toFixed(2)}
            readOnly
          />
          <Controller
            name={`payments.${index}.referenceCode`}
            control={control}
            render={({ field }) => (
              <TextInput
                id={`payment-reference-${payment.key}`}
                labelText={t('referenceNumber', 'Reference number')}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                placeholder={t('enterReferenceNumber', 'Enter reference number')}
                type="text"
                value={field.value ?? ''}
              />
            )}
          />
        </div>
      ))}
    </div>
  );
};

export default PaymentForm;
