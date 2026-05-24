import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--spacing-md) 0',
        marginTop: 'var(--spacing-md)',
        borderTop: '1px solid var(--border-glass)',
        gap: 'var(--spacing-md)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Showing <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{startItem}</span> to{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{endItem}</span> of{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{totalItems}</span> entries
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
        >
          &larr; Prev
        </button>

        {Array.from({ length: totalPages }).map((_, idx) => {
          const pageNum = idx + 1;
          // Render logic: always show page 1, current page, last page, and adjacent pages
          const isNearCurrent = Math.abs(pageNum - currentPage) <= 1;
          const isEdge = pageNum === 1 || pageNum === totalPages;

          if (!isNearCurrent && !isEdge) {
            // Render ellipsis if we are between page 1 and adjacent page, or adjacent page and last page
            if (pageNum === 2 || pageNum === totalPages - 1) {
              return (
                <span key={`ell-${pageNum}`} style={{ padding: '0 6px', color: 'var(--text-muted)' }}>
                  ...
                </span>
              );
            }
            return null;
          }

          const isCurrent = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              style={{
                minWidth: '32px',
                height: '32px',
                padding: '0 6px',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass)',
                backgroundColor: isCurrent ? 'hsl(var(--color-primary))' : 'rgba(255, 255, 255, 0.03)',
                color: 'var(--text-primary)',
                fontWeight: isCurrent ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
