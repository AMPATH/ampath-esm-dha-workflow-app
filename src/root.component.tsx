/**
 * From here, the application is pretty typical React, but with lots of
 * support from `@openmrs/esm-framework`. Check out `Greeter` to see
 * usage of the configuration system, and check out `PatientGetter` to
 * see data fetching using the OpenMRS FHIR API.
 *
 * Check out the Config docs:
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes } from './boxes/slot/boxes.component';
import Greeter from './greeter/greeter.component';
import PatientGetter from './patient-getter/patient-getter.component';
import Resources from './resources/resources.component';
import styles from './root.scss';
import { useConfig, useLeftNav } from '@openmrs/esm-framework';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import RegistryComponent from './registry/registry.component';

const Root: React.FC = () => {
  const { t } = useTranslation();
  return (
    <main className="omrs-main-content">
      <BrowserRouter basename={window.spaBase}>
        <Routes>
          <Route path="/workflow" element={<RegistryComponent />} />
          <Route path="/workflow/registry" element={<RegistryComponent />} />
        </Routes>
      </BrowserRouter>
    </main>
  );
};

export default Root;
