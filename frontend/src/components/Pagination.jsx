import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const Pagination = ({ meta, onPageChange }) => {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages, hasPrevPage, hasNextPage } = meta;

  return (
    <div className="flex items-center justify-between mt-3 sm:mt-4 px-1 sm:px-2 gap-2">
      <p className="text-[10px] sm:text-sm text-slate-400 truncate">
        Page {page} of {totalPages} ({meta.total})
      </p>
      <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          className="btn-secondary !p-1.5 sm:!p-2 !min-h-0"
        >
          <HiChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="btn-secondary !p-1.5 sm:!p-2 !min-h-0"
        >
          <HiChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
