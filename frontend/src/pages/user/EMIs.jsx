
// import { useEffect, useState } from 'react';
// import { useTranslation } from 'react-i18next';
// import toast from 'react-hot-toast';
// import { emiAPI } from '../../services';
// import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
// import Badge from '../../components/Badge';
// import Pagination from '../../components/Pagination';
// import Modal from '../../components/Modal';
// import PageHeader from '../../components/PageHeader';
// import LoadingSpinner, { PageLoader } from '../../components/LoadingSpinner';
// import { HiDownload, HiCash, HiDeviceMobile, HiEye, HiEyeOff } from 'react-icons/hi';

// const UPI_QR_SRC = '/payments/phonepe-upi-qr.png';
// const PHONEPE_FALLBACK_URL = 'https://www.phonepe.com/';

// const openPhonePePay = ({ amount, note } = {}) => {
//   const upiId = String(import.meta.env.VITE_UPI_ID || '').trim();
//   const upiName = String(import.meta.env.VITE_UPI_NAME || 'Prabhavi Small Finance').trim();
//   const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
//   const am = amount != null && Number(amount) > 0 ? Number(amount).toFixed(2) : '';

//   if (upiId) {
//     const params = new URLSearchParams({
//       pa: upiId,
//       pn: upiName,
//       cu: 'INR',
//       tn: note || 'EMI Payment',
//     });
//     if (am) params.set('am', am);
//     const qs = params.toString();
//     const phonepeUrl = `phonepe://pay?${qs}`;
//     const upiUrl = `upi://pay?${qs}`;

//     if (isMobile) {
//       window.location.href = phonepeUrl;
//       setTimeout(() => {
//         window.location.href = upiUrl;
//       }, 900);
//       return;
//     }
//     window.open(upiUrl, '_blank', 'noopener,noreferrer');
//     return;
//   }

//   if (isMobile) {
//     window.location.href = 'phonepe://pay';
//     setTimeout(() => {
//       window.open(PHONEPE_FALLBACK_URL, '_blank', 'noopener,noreferrer');
//     }, 1200);
//     return;
//   }
//   window.open(PHONEPE_FALLBACK_URL, '_blank', 'noopener,noreferrer');
// };

// const LOAN_TYPE_KEYS = {
//   personal: 'ui.personal',
//   home: 'ui.homeLoan',
//   business: 'ui.business',
//   education: 'ui.education',
//   vehicle: 'ui.vehicle',
// };

// const EMIs = () => {
//   const { t } = useTranslation();
//   const [emis, setEmis] = useState([]);
//   const [groupedEmis, setGroupedEmis] = useState({});
//   const [expandedGroups, setExpandedGroups] = useState({});
//   const [meta, setMeta] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [status, setStatus] = useState('');
//   const [page, setPage] = useState(1);
//   const [payEmi, setPayEmi] = useState(null);
//   const [paymentMethod, setPaymentMethod] = useState('cash');
//   const [paying, setPaying] = useState(false);

//   const fetchEMIs = async () => {
//     setLoading(true);
//     try {
//       const res = await emiAPI.getAll({ page, limit: 10, status });
//       const data = res.data.data;
//       setEmis(data);
//       setMeta(res.data.meta);

//       const groups = {};
//       data.forEach((emi) => {
//         const loanId = emi.loan?.loanId || 'Unknown';
//         if (!groups[loanId]) {
//           groups[loanId] = [];
//         }
//         groups[loanId].push(emi);
//       });
//       setGroupedEmis(groups);
      
//       const firstKey = Object.keys(groups)[0];
//       if (firstKey && !expandedGroups[firstKey]) {
//         setExpandedGroups({ [firstKey]: true });
//       }
//     } catch {
//       toast.error(t('ui.loadFailed'));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchEMIs(); }, [page, status]);

//   const toggleGroup = (loanId) => {
//     setExpandedGroups((prev) => ({
//       ...prev,
//       [loanId]: !prev[loanId],
//     }));
//   };

//   const openPay = (emi) => {
//     setPaymentMethod('cash');
//     setPayEmi(emi);
//   };

//   const closePay = () => {
//     if (paying) return;
//     setPayEmi(null);
//     setPaymentMethod('cash');
//   };

//   const handlePay = async () => {
//     if (!payEmi) return;
//     setPaying(true);
//     try {
//       if (paymentMethod === 'upi') {
//         const total = (payEmi.amount || 0) + (payEmi.penalty || 0);
//         openPhonePePay({
//           amount: total,
//           note: `EMI #${payEmi.emiNumber || ''}`.trim(),
//         });
//       }
//       await emiAPI.pay({ emiId: payEmi._id, paymentMethod });
//       toast.success(t('ui.emiPaymentRequested'));
//       setPayEmi(null);
//       setPaymentMethod('cash');
//       fetchEMIs();
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//     } finally {
//       setPaying(false);
//     }
//   };

//   const handleDownload = async (id, receiptNumber) => {
//     try {
//       const res = await emiAPI.downloadReceipt(id);
//       const url = window.URL.createObjectURL(res.data);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `receipt-${receiptNumber || id}.pdf`;
//       a.click();
//     } catch {
//       toast.error(t('ui.downloadFailed'));
//     }
//   };

//   if (loading && !emis.length) return <PageLoader />;

//   const statusOptions = ['pending', 'pending_collection', 'paid', 'overdue'];
//   const payAmount = formatCurrency((payEmi?.amount || 0) + (payEmi?.penalty || 0));

//   const getCleanEmiNumber = (emiNumber) => {
//     if (!emiNumber) return 'N/A';
//     const parts = emiNumber.split('-');
//     if (parts.length > 1) {
//       return parts.slice(1).join('-');
//     }
//     return emiNumber;
//   };

//   const emiActions = (emi) => (
//     <>
//       {(emi.status === 'pending' || emi.status === 'overdue') && (
//         <button 
//           type="button" 
//           onClick={() => openPay(emi)} 
//           className="btn-primary text-[10px] py-0.5 px-2 rounded whitespace-nowrap"
//         >
//           {t('ui.payNow')}
//         </button>
//       )}
//       {emi.status === 'pending_collection' && (
//         <span className="text-[10px] text-slate-500 whitespace-nowrap">{t('ui.awaitingCollection')}</span>
//       )}
//       {emi.status === 'paid' && (
//         <button
//           type="button"
//           onClick={() => handleDownload(emi._id, emi.receiptNumber)}
//           className="text-accent-400 p-1"
//           title={t('emi.receipt')}
//         >
//           <HiDownload className="w-3.5 h-3.5" />
//         </button>
//       )}
//     </>
//   );

//   return (
//     <div className="page-stack min-h-screen w-full overflow-y-auto pb-20">
//       <PageHeader title={t('ui.emiManagement')} />

//       <div className="filter-bar">
//         <select className="input w-full sm:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
//           <option value="">{t('ui.allStatus')}</option>
//           {statusOptions.map((s) => (
//             <option key={s} value={s}>{t(`statusLabel.${s}`)}</option>
//           ))}
//         </select>
//       </div>

//       {/* ================= RESPONSIVE MOBILE TABLE WITH SCROLLING ================= */}
//       <div className="md:hidden px-3 space-y-4">
//         {Object.keys(groupedEmis).length > 0 ? (
//           Object.entries(groupedEmis).map(([loanId, emiList]) => {
//             const loan = emiList[0]?.loan || {};
//             const pendingEmis = emiList.filter(e => e.status === 'pending' || e.status === 'overdue').length;
//             const totalEmis = emiList.length;

//             return (
//               <div key={loanId} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
//                 {/* Loan Header */}
//                 <div 
//                   className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
//                   onClick={() => toggleGroup(loanId)}
//                 >
//                   <div className="flex items-center gap-2 text-sm overflow-x-auto">
//                     <span className="font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">{loanId}</span>
//                     <Badge status={loan.status || 'active'} size="sm" />
//                     <span className="text-slate-400 text-xs">•</span>
//                     <span className="text-slate-500 text-xs whitespace-nowrap">{t(LOAN_TYPE_KEYS[loan.loanType] || 'table.type')}</span>
//                     <span className="text-slate-400 text-xs">•</span>
//                     <span className="text-slate-500 text-xs whitespace-nowrap">{formatCurrency(loan.amount || 0)}</span>
//                     <span className="text-slate-400 text-xs">•</span>
//                     <span className={pendingEmis > 0 ? 'text-amber-600 text-xs whitespace-nowrap' : 'text-emerald-600 text-xs whitespace-nowrap'}>
//                       {pendingEmis} pending
//                     </span>
//                   </div>
//                   <button 
//                     type="button"
//                     className="flex-shrink-0 p-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm transition-colors"
//                   >
//                     {expandedGroups[loanId] 
//                       ? <HiEyeOff className="w-3.5 h-3.5 text-primary-600" /> 
//                       : <HiEye className="w-3.5 h-3.5 text-slate-500" />
//                     }
//                   </button>
//                 </div>

//                 {/* EMI Table with Horizontal Scroll */}
//                 {expandedGroups[loanId] && (
//                   <div>
//                     {/* Summary */}
//                     <div className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-4 text-[10px] font-medium text-slate-500 overflow-x-auto">
//                       <span className="whitespace-nowrap">Total EMIs: {totalEmis}</span>
//                       <span className={pendingEmis > 0 ? 'text-amber-600 whitespace-nowrap' : 'text-emerald-600 whitespace-nowrap'}>
//                         Pending: {pendingEmis}
//                       </span>
//                     </div>

//                     {/* Scrollable Table */}
//                     <div className="overflow-x-auto">
//                       <div className="min-w-[650px]">
//                         {/* Table Header */}
//                         <div className="grid grid-cols-7 gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
//                           <div className="col-span-1 min-w-[50px]">EMI #</div>
//                           <div className="col-span-1 text-right min-w-[65px]">Amount</div>
//                           <div className="col-span-1 text-right min-w-[55px]">Penalty</div>
//                           <div className="col-span-1 text-center min-w-[60px]">Due</div>
//                           <div className="col-span-1 text-center min-w-[60px]">Paid</div>
//                           <div className="col-span-1 text-center min-w-[55px]">Status</div>
//                           <div className="col-span-1 text-center min-w-[70px]">Actions</div>
//                         </div>

//                         {/* Each EMI Row */}
//                         {emiList.map((emi) => (
//                           <div 
//                             key={emi._id} 
//                             className="grid grid-cols-7 gap-1 px-3 py-1.5 items-center text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 last:border-0"
//                           >
//                             <div className="col-span-1 font-medium text-slate-700 dark:text-slate-300 truncate min-w-[50px]">
//                               {getCleanEmiNumber(emi.emiNumber)}
//                             </div>
//                             <div className="col-span-1 text-right font-medium text-slate-700 dark:text-slate-300 min-w-[65px]">
//                               {formatCurrency(emi.amount)}
//                             </div>
//                             <div className="col-span-1 text-right text-red-500 min-w-[55px]">
//                               {formatCurrency(emi.penalty || 0)}
//                             </div>
//                             <div className="col-span-1 text-center text-slate-500 text-[9px] min-w-[60px]">
//                               {formatDate(emi.dueDate)}
//                             </div>
//                             <div className="col-span-1 text-center text-slate-500 text-[9px] min-w-[60px]">
//                               {formatDate(emi.paidDate) || 'N/A'}
//                             </div>
//                             <div className="col-span-1 text-center min-w-[55px]">
//                               <Badge status={emi.status} size="sm" />
//                             </div>
//                             <div className="col-span-1 text-center min-w-[70px]">
//                               {emiActions(emi)}
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             );
//           })
//         ) : (
//           <div className="py-8 text-center">
//             <p className="text-slate-500 text-sm">{t('noData')}</p>
//           </div>
//         )}
//       </div>

//       {/* ================= DESKTOP VIEW ================= */}
//       <div className="card desktop-table hidden md:block overflow-visible">
//         <div className="data-table-wrap">
//           <table className="data-table w-full">
//             <thead>
//               <tr>
//                 <th>Loan ID</th>
//                 <th>Type</th>
//                 <th className="text-right">Amount</th>
//                 <th className="text-right">EMI Amount</th>
//                 <th className="text-right">Remaining</th>
//                 <th className="text-center">Total EMI</th>
//                 <th className="text-center">Pending EMI</th>
//                 <th>Status</th>
//                 <th>Date</th>
//                 <th className="text-center">Actions</th>
//               </tr>
//             </thead>
//           </table>

//           <div className="divide-y divide-slate-200 dark:divide-slate-700">
//             {Object.keys(groupedEmis).length > 0 ? (
//               Object.entries(groupedEmis).map(([loanId, emiList]) => {
//                 const loan = emiList[0]?.loan || {};
//                 const pendingEmis = emiList.filter(e => e.status === 'pending' || e.status === 'overdue').length;
//                 const totalEmis = emiList.length;

//                 return (
//                   <div key={loanId}>
//                     <div className="flex items-center px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
//                       <div className="w-28 font-bold text-primary-600 truncate">{loanId}</div>
//                       <div className="w-32 text-sm text-slate-700 dark:text-slate-300 truncate">
//                         {t(LOAN_TYPE_KEYS[loan.loanType] || 'table.type')}
//                       </div>
//                       <div className="w-24 text-right text-sm font-medium">{formatCurrency(loan.amount || 0)}</div>
//                       <div className="w-24 text-right text-sm font-medium">{formatCurrency(loan.emiAmount || 0)}</div>
//                       <div className="w-28 text-right text-sm font-medium">{formatCurrency(loan.remainingBalance || 0)}</div>
//                       <div className="w-20 text-center text-sm font-medium text-blue-600">{totalEmis}</div>
//                       <div className="w-24 text-center">
//                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                           pendingEmis > 0 
//                             ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' 
//                             : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
//                         }`}>
//                           {pendingEmis}
//                         </span>
//                       </div>
//                       <div className="w-24"><Badge status={loan.status || 'active'} /></div>
//                       <div className="w-28 text-sm text-slate-600">{formatDate(loan.createdAt)}</div>
//                       <div className="w-16 text-center">
//                         <button 
//                           type="button" 
//                           onClick={() => toggleGroup(loanId)}
//                           className="inline-flex items-center justify-center p-2 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm transition-colors"
//                         >
//                           {expandedGroups[loanId] 
//                             ? <HiEyeOff className="w-4 h-4 text-primary-600" /> 
//                             : <HiEye className="w-4 h-4 text-slate-500" />
//                           }
//                         </button>
//                       </div>
//                     </div>

//                     {expandedGroups[loanId] && (
//                       <div className="bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
//                         <div className="px-4 py-2 text-xs font-semibold text-slate-500 flex gap-4 border-b border-slate-200 dark:border-slate-700">
//                           <span>Total EMIs: {totalEmis}</span>
//                           <span className={pendingEmis > 0 ? 'text-amber-600' : 'text-emerald-600'}>
//                             Pending: {pendingEmis}
//                           </span>
//                         </div>
//                         <table className="data-table w-full !border-0">
//                           <thead className="bg-transparent">
//                             <tr>
//                               <th className="pl-6 text-xs font-medium text-slate-500">EMI #</th>
//                               <th className="text-right text-xs font-medium text-slate-500">Amount</th>
//                               <th className="text-right text-xs font-medium text-slate-500">Penalty</th>
//                               <th className="text-xs font-medium text-slate-500">Due Date</th>
//                               <th className="text-xs font-medium text-slate-500">Paid Date</th>
//                               <th className="text-xs font-medium text-slate-500">Status</th>
//                               <th className="text-right pr-6 text-xs font-medium text-slate-500">Actions</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {emiList.map((emi) => (
//                               <tr key={emi._id} className="hover:bg-white dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800">
//                                 <td className="font-medium pl-6 text-sm">
//                                   {getCleanEmiNumber(emi.emiNumber)}
//                                 </td>
//                                 <td className="text-right text-sm">{formatCurrency(emi.amount)}</td>
//                                 <td className="text-right text-sm">{formatCurrency(emi.penalty)}</td>
//                                 <td className="text-sm">{formatDate(emi.dueDate)}</td>
//                                 <td className="text-sm">{formatDate(emi.paidDate)}</td>
//                                 <td><Badge status={emi.status} /></td>
//                                 <td className="text-right pr-6">
//                                   <div className="inline-flex flex-wrap gap-1 justify-end">{emiActions(emi)}</div>
//                                 </td>
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>
//                     )}
//                   </div>
//                 );
//               })
//             ) : (
//               <p className="p-4 text-center text-slate-500 text-sm">{t('noData')}</p>
//             )}
//           </div>
//         </div>
//       </div>

//       <Pagination meta={meta} onPageChange={setPage} />

//       {/* ============ PAYMENT MODAL ============ */}
//       <Modal isOpen={!!payEmi} onClose={closePay} title={t('ui.payEmi')} size="sm">
//         <div className="space-y-4">
//           <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
//             {t('ui.payEmiConfirm', {
//               number: payEmi?.emiNumber,
//               amount: payAmount,
//             })}
//           </p>

//           <div>
//             <label className="label">{t('emi.paymentMethod')}</label>
//             <div className="grid grid-cols-2 gap-2">
//               <button
//                 type="button"
//                 onClick={() => setPaymentMethod('cash')}
//                 className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
//                   paymentMethod === 'cash'
//                     ? 'border-accent-400 bg-accent-400/10 text-accent-600 dark:text-accent-400'
//                     : 'border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5'
//                 }`}
//               >
//                 <HiCash className="w-5 h-5" />
//                 {t('paymentMethod.cash')}
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setPaymentMethod('upi')}
//                 className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
//                   paymentMethod === 'upi'
//                     ? 'border-accent-400 bg-accent-400/10 text-accent-600 dark:text-accent-400'
//                     : 'border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5'
//                 }`}
//               >
//                 <HiDeviceMobile className="w-5 h-5" />
//                 {t('ui.onlineUpi')}
//               </button>
//             </div>
//           </div>

//           {paymentMethod === 'upi' && (
//             <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-3 bg-black/[0.02] dark:bg-white/[0.03]">
//               <p className="text-center text-xs sm:text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
//                 {t('ui.scanUpiQr')}
//               </p>
//               <div className="mx-auto w-44 h-44 sm:w-52 sm:h-52 rounded-lg overflow-hidden bg-white p-2 shadow-sm">
//                 <img
//                   src={UPI_QR_SRC}
//                   alt="PhonePe UPI QR"
//                   className="w-full h-full object-contain"
//                 />
//               </div>
//               <p className="text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
//                 {t('ui.upiPayHint')}
//               </p>
//             </div>
//           )}

//           <div className="flex gap-3 justify-end pt-1">
//             <button type="button" onClick={closePay} disabled={paying} className="btn-secondary">
//               {t('cancel')}
//             </button>
//             <button type="button" onClick={handlePay} disabled={paying} className="btn-primary min-w-[7rem]">
//               {paying ? <LoadingSpinner size="sm" /> : t('ui.payNow')}
//             </button>
//           </div>
//         </div>
//       </Modal>
//     </div>
//   );
// };

// export default EMIs;

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { emiAPI } from '../../services';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import LoadingSpinner, { PageLoader } from '../../components/LoadingSpinner';
import { HiDownload, HiCash, HiDeviceMobile, HiEye, HiEyeOff } from 'react-icons/hi';

const UPI_QR_SRC = '/payments/phonepe-upi-qr.png';
const PHONEPE_FALLBACK_URL = 'https://www.phonepe.com/';

const openPhonePePay = ({ amount, note } = {}) => {
  const upiId = String(import.meta.env.VITE_UPI_ID || '').trim();
  const upiName = String(import.meta.env.VITE_UPI_NAME || 'Prabhavi Small Finance').trim();
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const am = amount != null && Number(amount) > 0 ? Number(amount).toFixed(2) : '';

  if (upiId) {
    const params = new URLSearchParams({
      pa: upiId,
      pn: upiName,
      cu: 'INR',
      tn: note || 'EMI Payment',
    });
    if (am) params.set('am', am);
    const qs = params.toString();
    const phonepeUrl = `phonepe://pay?${qs}`;
    const upiUrl = `upi://pay?${qs}`;

    if (isMobile) {
      window.location.href = phonepeUrl;
      setTimeout(() => {
        window.location.href = upiUrl;
      }, 900);
      return;
    }
    window.open(upiUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  if (isMobile) {
    window.location.href = 'phonepe://pay';
    setTimeout(() => {
      window.open(PHONEPE_FALLBACK_URL, '_blank', 'noopener,noreferrer');
    }, 1200);
    return;
  }
  window.open(PHONEPE_FALLBACK_URL, '_blank', 'noopener,noreferrer');
};

const LOAN_TYPE_KEYS = {
  personal: 'ui.personal',
  home: 'ui.homeLoan',
  business: 'ui.business',
  education: 'ui.education',
  vehicle: 'ui.vehicle',
};

const EMIs = () => {
  const { t } = useTranslation();
  const [emis, setEmis] = useState([]);
  const [groupedEmis, setGroupedEmis] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [payEmi, setPayEmi] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paying, setPaying] = useState(false);

  const fetchEMIs = async () => {
    setLoading(true);
    try {
      const res = await emiAPI.getAll({ page, limit: 10, status });
      const data = res.data.data;
      setEmis(data);
      setMeta(res.data.meta);

      const groups = {};
      data.forEach((emi) => {
        const loanId = emi.loan?.loanId || 'Unknown';
        if (!groups[loanId]) {
          groups[loanId] = [];
        }
        groups[loanId].push(emi);
      });
      setGroupedEmis(groups);
      
      const firstKey = Object.keys(groups)[0];
      if (firstKey && !expandedGroups[firstKey]) {
        setExpandedGroups({ [firstKey]: true });
      }
    } catch {
      toast.error(t('ui.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEMIs(); }, [page, status]);

  const toggleGroup = (loanId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));
  };

  const openPay = (emi) => {
    setPaymentMethod('cash');
    setPayEmi(emi);
  };

  const closePay = () => {
    if (paying) return;
    setPayEmi(null);
    setPaymentMethod('cash');
  };

  const handlePay = async () => {
    if (!payEmi) return;
    setPaying(true);
    try {
      if (paymentMethod === 'upi') {
        const total = (payEmi.amount || 0) + (payEmi.penalty || 0);
        openPhonePePay({
          amount: total,
          note: `EMI #${payEmi.emiNumber || ''}`.trim(),
        });
      }
      await emiAPI.pay({ emiId: payEmi._id, paymentMethod });
      toast.success(t('ui.emiPaymentRequested'));
      setPayEmi(null);
      setPaymentMethod('cash');
      fetchEMIs();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPaying(false);
    }
  };

  const handleDownload = async (id, receiptNumber) => {
    try {
      const res = await emiAPI.downloadReceipt(id);
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptNumber || id}.pdf`;
      a.click();
    } catch {
      toast.error(t('ui.downloadFailed'));
    }
  };

  if (loading && !emis.length) return <PageLoader />;

  const statusOptions = ['pending', 'pending_collection', 'paid', 'overdue'];
  const payAmount = formatCurrency((payEmi?.amount || 0) + (payEmi?.penalty || 0));

  const getCleanEmiNumber = (emiNumber) => {
    if (!emiNumber) return 'N/A';
    const parts = emiNumber.split('-');
    if (parts.length > 1) {
      return parts.slice(1).join('-');
    }
    return emiNumber;
  };

  const getUpcomingEmis = () => {
    const upcoming = [];
    Object.entries(groupedEmis).forEach(([loanId, emiList]) => {
      const pendingEmis = emiList
        .filter(e => e.status === 'pending' || e.status === 'overdue')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      if (pendingEmis.length > 0) {
        upcoming.push({
          loanId,
          emi: pendingEmis[0],
          totalPending: pendingEmis.length,
        });
      }
    });
    return upcoming;
  };

  const emiActions = (emi) => (
    <>
      {(emi.status === 'pending' || emi.status === 'overdue') && (
        <button 
          type="button" 
          onClick={() => openPay(emi)} 
          className="btn-primary text-[10px] py-0.5 px-2 rounded whitespace-nowrap"
        >
          {t('ui.payNow')}
        </button>
      )}
      {emi.status === 'pending_collection' && (
        <span className="text-[10px] text-slate-500 whitespace-nowrap">{t('ui.awaitingCollection')}</span>
      )}
      {emi.status === 'paid' && (
        <button
          type="button"
          onClick={() => handleDownload(emi._id, emi.receiptNumber)}
          className="text-accent-400 p-1"
          title={t('emi.receipt')}
        >
          <HiDownload className="w-3.5 h-3.5" />
        </button>
      )}
    </>
  );

  const upcomingEmis = getUpcomingEmis();

  return (
    <div className="page-stack min-h-screen w-full overflow-y-auto pb-20">
      {/* Header with Filter on the Right */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t('ui.emiManagement')}</h1>
        <select 
          className="text-xs py-1 px-2 w-28 sm:w-32 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          value={status} 
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">{t('ui.allStatus')}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{t(`statusLabel.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* ================= UPCOMING EMIs (visible on all screens) ================= */}
      {upcomingEmis.length > 0 && (
        <div className="px-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span>📅</span> {t('ui.upcomingEmis', 'Upcoming EMIs')}
              <span className="text-xs font-normal text-slate-400">({upcomingEmis.length})</span>
            </h3>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Header */}
                <div className="grid grid-cols-5 gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <div className="col-span-1 min-w-[80px]">LOAN</div>
                  <div className="col-span-1 min-w-[60px]">EMI #</div>
                  <div className="col-span-1 text-center min-w-[80px]">DUE DATE</div>
                  <div className="col-span-1 text-right min-w-[70px]">AMOUNT</div>
                  <div className="col-span-1 text-center min-w-[60px]">ACTION</div>
                </div>
                
                {/* Rows */}
                {upcomingEmis.map(({ loanId, emi, totalPending }) => (
                  <div 
                    key={loanId} 
                    className="grid grid-cols-5 gap-1 px-3 py-2 items-center text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 bg-white dark:bg-slate-800"
                  >
                    <div className="col-span-1 font-medium text-primary-600 dark:text-primary-400 min-w-[80px] flex items-center gap-1">
                      {loanId}
                      {totalPending > 1 && (
                        <span className="text-[9px] text-amber-600 font-bold">+{totalPending-1}</span>
                      )}
                    </div>
                    <div className="col-span-1 text-slate-700 dark:text-slate-300 min-w-[60px]">
                      {getCleanEmiNumber(emi.emiNumber)}
                    </div>
                    <div className="col-span-1 text-center text-slate-500 text-[9px] min-w-[80px]">
                      {formatDate(emi.dueDate)}
                    </div>
                    <div className="col-span-1 text-right font-medium text-slate-700 dark:text-slate-300 min-w-[70px]">
                      {formatCurrency(emi.amount)}
                    </div>
                    <div className="col-span-1 text-center min-w-[60px]">
                      <button 
                        type="button" 
                        onClick={() => openPay(emi)} 
                        className="btn-primary text-[9px] py-0.5 px-2 rounded whitespace-nowrap"
                      >
                        {t('ui.payNow')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN LOAN LIST ================= */}
      {/* MOBILE: Table with columns: #, Loan ID, Amount, Pending Amt, Total EMI, Pending EMI, Actions */}
      <div className="md:hidden px-3 mt-4">
        {Object.keys(groupedEmis).length > 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Header */}
                <div className="grid grid-cols-7 gap-0.5 px-2 py-1.5 bg-slate-100 dark:bg-slate-700/50 text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <div className="col-span-1 text-center min-w-[30px]">#</div>
                  <div className="col-span-1 min-w-[80px]">Loan ID</div>
                  <div className="col-span-1 text-right min-w-[70px]">Amount</div>
                  <div className="col-span-1 text-right min-w-[70px]">Pending Amt</div>
                  <div className="col-span-1 text-center min-w-[60px]">Total EMI</div>
                  <div className="col-span-1 text-center min-w-[60px]">Pending EMI</div>
                  <div className="col-span-1 text-center min-w-[40px]">Actions</div>
                </div>

                {/* Rows */}
                {Object.entries(groupedEmis).map(([loanId, emiList], index) => {
                  const loan = emiList[0]?.loan || {};
                  const pendingEmis = emiList.filter(e => e.status === 'pending' || e.status === 'overdue').length;
                  const totalEmis = emiList.length;
                  const pendingAmount = emiList
                    .filter(e => e.status === 'pending' || e.status === 'overdue' || e.status === 'partial')
                    .reduce((sum, e) => sum + (e.amount || 0) + (e.penalty || 0), 0);

                  return (
                    <div key={loanId}>
                      <div 
                        className="grid grid-cols-7 gap-0.5 px-2 py-2 items-center text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 cursor-pointer"
                        onClick={() => toggleGroup(loanId)}
                      >
                        <div className="col-span-1 text-center text-slate-400 min-w-[30px]">{index + 1}</div>
                        <div className="col-span-1 font-bold text-primary-600 truncate min-w-[80px]">{loanId}</div>
                        <div className="col-span-1 text-right font-medium text-slate-700 dark:text-slate-300 min-w-[70px]">
                          {formatCurrency(loan.amount || 0)}
                        </div>
                        <div className="col-span-1 text-right font-medium text-amber-600 min-w-[70px]">
                          {formatCurrency(pendingAmount)}
                        </div>
                        <div className="col-span-1 text-center font-medium text-blue-600 min-w-[60px]">{totalEmis}</div>
                        <div className="col-span-1 text-center min-w-[60px]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-medium ${
                            pendingEmis > 0 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' 
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          }`}>
                            {pendingEmis}
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[40px]">
                          <button 
                            type="button"
                            className="inline-flex items-center justify-center p-1 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleGroup(loanId); }}
                          >
                            {expandedGroups[loanId] 
                              ? <HiEyeOff className="w-3 h-3 text-primary-600" /> 
                              : <HiEye className="w-3 h-3 text-slate-500" />
                            }
                          </button>
                        </div>
                      </div>

                      {/* Expanded EMI Details */}
                      {expandedGroups[loanId] && (
                        <div className="bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                          <div className="px-3 py-1.5 flex items-center gap-4 text-[10px] font-medium text-slate-500 overflow-x-auto">
                            <span className="whitespace-nowrap">Total EMIs: {totalEmis}</span>
                            <span className={pendingEmis > 0 ? 'text-amber-600 whitespace-nowrap' : 'text-emerald-600 whitespace-nowrap'}>
                              Pending: {pendingEmis}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <div className="min-w-[650px]">
                              <div className="grid grid-cols-7 gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                <div className="col-span-1 min-w-[50px]">EMI #</div>
                                <div className="col-span-1 text-right min-w-[65px]">Amount</div>
                                <div className="col-span-1 text-right min-w-[55px]">Penalty</div>
                                <div className="col-span-1 text-center min-w-[60px]">Due</div>
                                <div className="col-span-1 text-center min-w-[60px]">Paid</div>
                                <div className="col-span-1 text-center min-w-[55px]">Status</div>
                                <div className="col-span-1 text-center min-w-[70px]">Actions</div>
                              </div>
                              {emiList.map((emi) => (
                                <div 
                                  key={emi._id} 
                                  className="grid grid-cols-7 gap-1 px-3 py-1.5 items-center text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 last:border-0"
                                >
                                  <div className="col-span-1 font-medium text-slate-700 dark:text-slate-300 truncate min-w-[50px]">
                                    {getCleanEmiNumber(emi.emiNumber)}
                                  </div>
                                  <div className="col-span-1 text-right font-medium text-slate-700 dark:text-slate-300 min-w-[65px]">
                                    {formatCurrency(emi.amount)}
                                  </div>
                                  <div className="col-span-1 text-right text-red-500 min-w-[55px]">
                                    {formatCurrency(emi.penalty || 0)}
                                  </div>
                                  <div className="col-span-1 text-center text-slate-500 text-[9px] min-w-[60px]">
                                    {formatDate(emi.dueDate)}
                                  </div>
                                  <div className="col-span-1 text-center text-slate-500 text-[9px] min-w-[60px]">
                                    {formatDate(emi.paidDate) || 'N/A'}
                                  </div>
                                  <div className="col-span-1 text-center min-w-[55px]">
                                    <Badge status={emi.status} size="sm" />
                                  </div>
                                  <div className="col-span-1 text-center min-w-[70px]">
                                    {emiActions(emi)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-slate-500 text-sm">{t('noData')}</p>
          </div>
        )}
      </div>

      {/* ================= DESKTOP VIEW (full table) ================= */}
      <div className="card desktop-table hidden md:block overflow-visible mt-4">
        <div className="data-table-wrap">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Type</th>
                <th className="text-right">Amount</th>
                <th className="text-right">EMI Amount</th>
                <th className="text-right">Remaining</th>
                <th className="text-center">Total EMI</th>
                <th className="text-center">Pending EMI</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
          </table>

          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {Object.keys(groupedEmis).length > 0 ? (
              Object.entries(groupedEmis).map(([loanId, emiList]) => {
                const loan = emiList[0]?.loan || {};
                const pendingEmis = emiList.filter(e => e.status === 'pending' || e.status === 'overdue').length;
                const totalEmis = emiList.length;

                return (
                  <div key={loanId}>
                    <div className="flex items-center px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="w-28 font-bold text-primary-600 truncate">{loanId}</div>
                      <div className="w-32 text-sm text-slate-700 dark:text-slate-300 truncate">
                        {t(LOAN_TYPE_KEYS[loan.loanType] || 'table.type')}
                      </div>
                      <div className="w-24 text-right text-sm font-medium">{formatCurrency(loan.amount || 0)}</div>
                      <div className="w-24 text-right text-sm font-medium">{formatCurrency(loan.emiAmount || 0)}</div>
                      <div className="w-28 text-right text-sm font-medium">{formatCurrency(loan.remainingBalance || 0)}</div>
                      <div className="w-20 text-center text-sm font-medium text-blue-600">{totalEmis}</div>
                      <div className="w-24 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pendingEmis > 0 
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' 
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}>
                          {pendingEmis}
                        </span>
                      </div>
                      <div className="w-24"><Badge status={loan.status || 'active'} /></div>
                      <div className="w-28 text-sm text-slate-600">{formatDate(loan.createdAt)}</div>
                      <div className="w-16 text-center">
                        <button 
                          type="button" 
                          onClick={() => toggleGroup(loanId)}
                          className="inline-flex items-center justify-center p-2 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm transition-colors"
                        >
                          {expandedGroups[loanId] 
                            ? <HiEyeOff className="w-4 h-4 text-primary-600" /> 
                            : <HiEye className="w-4 h-4 text-slate-500" />
                          }
                        </button>
                      </div>
                    </div>

                    {expandedGroups[loanId] && (
                      <div className="bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                        <div className="px-4 py-2 text-xs font-semibold text-slate-500 flex gap-4 border-b border-slate-200 dark:border-slate-700">
                          <span>Total EMIs: {totalEmis}</span>
                          <span className={pendingEmis > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                            Pending: {pendingEmis}
                          </span>
                        </div>
                        <table className="data-table w-full !border-0">
                          <thead className="bg-transparent">
                            <tr>
                              <th className="pl-6 text-xs font-medium text-slate-500">EMI #</th>
                              <th className="text-right text-xs font-medium text-slate-500">Amount</th>
                              <th className="text-right text-xs font-medium text-slate-500">Penalty</th>
                              <th className="text-xs font-medium text-slate-500">Due Date</th>
                              <th className="text-xs font-medium text-slate-500">Paid Date</th>
                              <th className="text-xs font-medium text-slate-500">Status</th>
                              <th className="text-right pr-6 text-xs font-medium text-slate-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emiList.map((emi) => (
                              <tr key={emi._id} className="hover:bg-white dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800">
                                <td className="font-medium pl-6 text-sm">
                                  {getCleanEmiNumber(emi.emiNumber)}
                                </td>
                                <td className="text-right text-sm">{formatCurrency(emi.amount)}</td>
                                <td className="text-right text-sm">{formatCurrency(emi.penalty)}</td>
                                <td className="text-sm">{formatDate(emi.dueDate)}</td>
                                <td className="text-sm">{formatDate(emi.paidDate)}</td>
                                <td><Badge status={emi.status} /></td>
                                <td className="text-right pr-6">
                                  <div className="inline-flex flex-wrap gap-1 justify-end">{emiActions(emi)}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="p-4 text-center text-slate-500 text-sm">{t('noData')}</p>
            )}
          </div>
        </div>
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      {/* ============ PAYMENT MODAL ============ */}
      <Modal isOpen={!!payEmi} onClose={closePay} title={t('ui.payEmi')} size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('ui.payEmiConfirm', {
              number: payEmi?.emiNumber,
              amount: payAmount,
            })}
          </p>

          <div>
            <label className="label">{t('emi.paymentMethod')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-accent-400 bg-accent-400/10 text-accent-600 dark:text-accent-400'
                    : 'border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <HiCash className="w-5 h-5" />
                {t('paymentMethod.cash')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-accent-400 bg-accent-400/10 text-accent-600 dark:text-accent-400'
                    : 'border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <HiDeviceMobile className="w-5 h-5" />
                {t('ui.onlineUpi')}
              </button>
            </div>
          </div>

          {paymentMethod === 'upi' && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-3 bg-black/[0.02] dark:bg-white/[0.03]">
              <p className="text-center text-xs sm:text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('ui.scanUpiQr')}
              </p>
              <div className="mx-auto w-44 h-44 sm:w-52 sm:h-52 rounded-lg overflow-hidden bg-white p-2 shadow-sm">
                <img
                  src={UPI_QR_SRC}
                  alt="PhonePe UPI QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('ui.upiPayHint')}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={closePay} disabled={paying} className="btn-secondary">
              {t('cancel')}
            </button>
            <button type="button" onClick={handlePay} disabled={paying} className="btn-primary min-w-[7rem]">
              {paying ? <LoadingSpinner size="sm" /> : t('ui.payNow')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EMIs;