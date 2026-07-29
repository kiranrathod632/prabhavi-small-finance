import { formatCurrency } from '../utils/helpers';

const FeeBreakup = ({ feeBreakup, loan }) => {
  const data = feeBreakup || (loan?.processingFee ? {
    loanAmount: loan.amount,
    processingFee: loan.processingFee,
    gstAmount: loan.gstAmount,
    netDisbursed: loan.netDisbursedAmount,
  } : null);

  if (!data) return null;

  return (
    <div className="card mb-6">
      <h3 className="font-semibold mb-4">Processing Fee Breakup</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between py-2 border-b dark:border-gray-700">
          <span className="text-gray-500">Loan Amount</span>
          <span className="font-medium">{formatCurrency(data.loanAmount)}</span>
        </div>
        <div className="flex justify-between py-2 border-b dark:border-gray-700">
          <span className="text-gray-500">Processing Fee</span>
          <span className="font-medium text-red-600">- {formatCurrency(data.processingFee)}</span>
        </div>
        {data.gstAmount > 0 && (
          <div className="flex justify-between py-2 border-b dark:border-gray-700">
            <span className="text-gray-500">GST</span>
            <span className="font-medium text-red-600">- {formatCurrency(data.gstAmount)}</span>
          </div>
        )}
        <div className="flex justify-between py-3 bg-green-50 dark:bg-green-900/20 px-3 rounded-lg">
          <span className="font-semibold text-green-700 dark:text-green-400">Net Disbursed Amount</span>
          <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(data.netDisbursed)}</span>
        </div>
      </div>
    </div>
  );
};

export default FeeBreakup;
