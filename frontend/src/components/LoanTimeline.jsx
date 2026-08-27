import { LOAN_STATUSES } from '../utils/roles';
import { formatDateTime } from '../utils/helpers';

const LoanTimeline = ({ timeline = [], currentStatus }) => {
  const statusOrder = LOAN_STATUSES.map((s) => s.value);
  const currentIdx = statusOrder.indexOf(currentStatus);

  return (
    <div className="card mb-6 p-4 sm:p-6">
      <h3 className="font-semibold mb-4 text-sm sm:text-base">Loan Status Timeline</h3>
      <div className="relative">
        {LOAN_STATUSES.filter((s) => ['pending', 'under_review', 'approved', 'disbursed', 'active', 'closed'].includes(s.value)).map((status, idx) => {
          const event = timeline.find((t) => t.status === status.value);
          const isCompleted = currentIdx >= statusOrder.indexOf(status.value);
          const isCurrent = currentStatus === status.value;

          return (
            <div key={status.value} className="flex gap-3 mb-3 last:mb-0">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-sm font-bold flex-shrink-0 ${
                  isCompleted ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                } ${isCurrent ? 'ring-2 ring-primary-200' : ''}`}>
                  {idx + 1}
                </div>
                {idx < 5 && <div className={`w-0.5 flex-1 min-h-[16px] sm:min-h-[24px] ${isCompleted ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
              </div>
              <div className="pb-1 flex-1 min-w-0">
                <p className={`font-medium text-sm sm:text-base ${isCurrent ? 'text-primary-600' : ''}`}>{status.label}</p>
                {event && (
                  <>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{event.description || event.title}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                      {formatDateTime(event.createdAt)}
                      {event.performedBy?.name && ` • ${event.performedBy.name}`}
                    </p>
                  </>
                )}
                {!event && isCompleted && <p className="text-[10px] sm:text-xs text-gray-400">Completed</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoanTimeline;