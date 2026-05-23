import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MchQueues from './mch/mch-queues.component';
import MaternityQueues from './maternity/maternity-queues.component';

const MNCHRoot: React.FC = () => {
  return (
    <BrowserRouter basename={`${window.spaBase}/home/mnch`}>
      <Routes>
        <Route path="/mch" element={<MchQueues/>} />
        <Route path="/maternity" element={<MaternityQueues />} />
      </Routes>
    </BrowserRouter>
  );
};

export default MNCHRoot;
