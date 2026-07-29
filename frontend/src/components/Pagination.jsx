import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const Pagination = ({ meta, onPageChange }) => {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages, hasPrevPage, hasNextPage } = meta;

  return (
    <div className="flex items-center justify-between mt-4 px-2">
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages} ({meta.total} items)
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          className="btn-secondary p-2"
        >
          <HiChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="btn-secondary p-2"
        >
          <HiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
