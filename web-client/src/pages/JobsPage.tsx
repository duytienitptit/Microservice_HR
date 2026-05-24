import React from 'react';
import { Routes, Route } from 'react-router-dom';
import JobListPage from './jobs/JobListPage';
import JobCreatePage from './jobs/JobCreatePage';
import JobEditPage from './jobs/JobEditPage';
import JobDetailPage from './jobs/JobDetailPage';

export const JobsPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<JobListPage />} />
      <Route path="/create" element={<JobCreatePage />} />
      <Route path="/:id/edit" element={<JobEditPage />} />
      <Route path="/:id" element={<JobDetailPage />} />
    </Routes>
  );
};

export default JobsPage;
