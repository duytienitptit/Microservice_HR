import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ApplicationListPage from './applications/ApplicationListPage';
import ApplicationDetailPage from './applications/ApplicationDetailPage';
import UploadCVPage from './applications/UploadCVPage';

export const ApplicationsPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ApplicationListPage />} />
      <Route path="/upload" element={<UploadCVPage />} />
      <Route path="/:id" element={<ApplicationDetailPage />} />
    </Routes>
  );
};

export default ApplicationsPage;
