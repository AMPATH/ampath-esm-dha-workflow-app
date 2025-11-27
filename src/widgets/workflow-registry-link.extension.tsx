import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink } from '@openmrs/esm-framework';

export const spaBasePath = `${window.spaBase}/workflow`;

const WorkflowRegistryLink = () => {
  const { t } = useTranslation();
  return <ConfigurableLink to={`${spaBasePath}/registry`}>Registry</ConfigurableLink>;
};

export default WorkflowRegistryLink;
