import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ReportListPage } from './reports/ReportListPage';
import { ReportDetailPage } from './reports/ReportDetailPage';

export const ReportsPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ReportListPage />} />
      <Route path="/:id" element={<ReportDetailPage />} />
    </Routes>
  );
};

export default ReportsPage;
