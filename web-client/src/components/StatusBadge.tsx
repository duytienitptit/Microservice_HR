import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeClass = (statusStr: string): string => {
    switch (statusStr.toUpperCase()) {
      // Job Statuses
      case 'OPEN':
        return 'badge badge-success';
      case 'DRAFT':
        return 'badge badge-warning';
      case 'CLOSED':
        return 'badge badge-danger';

      // Application Statuses
      case 'PENDING':
        return 'badge badge-warning';
      case 'PROCESSING':
        return 'badge badge-info';
      case 'READY_FOR_INTERVIEW':
        return 'badge badge-success';
      case 'CV_PARSE_FAILED':
        return 'badge badge-danger';
      case 'INVITED':
        return 'badge badge-info';
      case 'INTERVIEWING':
        return 'badge badge-info';
      case 'COMPLETED':
        return 'badge badge-success';
      case 'REJECTED':
        return 'badge badge-danger';
      case 'ARCHIVED':
        return 'badge badge-secondary';
      default:
        return 'badge';
    }
  };

  const getFriendlyName = (statusStr: string): string => {
    switch (statusStr.toUpperCase()) {
      case 'OPEN': return 'Đang tuyển';
      case 'DRAFT': return 'Bản nháp';
      case 'CLOSED': return 'Đã đóng';
      case 'PENDING': return 'Chờ xử lý';
      case 'PROCESSING': return 'Đang xử lý';
      case 'READY_FOR_INTERVIEW': return 'Sẵn sàng phỏng vấn';
      case 'CV_PARSE_FAILED': return 'Phân tích thất bại';
      case 'INVITED': return 'Đã mời';
      case 'INTERVIEWING': return 'Đang phỏng vấn';
      case 'COMPLETED': return 'Đã hoàn thành';
      case 'REJECTED': return 'Từ chối';
      case 'ARCHIVED': return 'Đã lưu trữ';
      default: return statusStr.replace(/_/g, ' ');
    }
  };

  return (
    <span className={getBadgeClass(status)}>
      {getFriendlyName(status)}
    </span>
  );
};

export default StatusBadge;
