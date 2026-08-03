import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { kycAPI } from '../../services';
import { formatDate } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';

const KYCReview = () => {
  const [profiles, setProfiles] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);

  const fetch = async () => {
    try {
      const res = await kycAPI.getPending({ page, limit: 10 });
      setProfiles(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error('Failed to load KYC applications');
    }
  };

  useEffect(() => { fetch(); }, [page]);

  const review = async (userId, status) => {
    const rejectedReason = status === 'rejected' ? prompt('Rejection reason:') : undefined;
    try {
      await kycAPI.review(userId, { status, rejectedReason });
      toast.success(`KYC ${status}`);
      fetch();
    } catch {
      toast.error('Failed to update KYC');
    }
  };

  const kycActions = (p) => (
    <>
      <button type="button" onClick={() => review(p.user._id, 'verified')} className="btn-success action-chip">Verify</button>
      <button type="button" onClick={() => review(p.user._id, 'rejected')} className="btn-danger action-chip">Reject</button>
    </>
  );

  return (
    <div className="page-stack">
      <PageHeader title="KYC Review" />

      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>User</th>
                <th>Mobile</th>
                <th>PAN</th>
                <th>Status</th>
                <th>Submitted</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, index) => (
                <tr key={p._id}>
                  <td className="text-slate-500">{((page || 1) - 1) * 10 + index + 1}</td>
                  <td>{p.user?.name || 'N/A'}</td>
                  <td>{p.user?.mobile || p.phone || 'N/A'}</td>
                  <td className="font-mono">{p.pan || 'N/A'}</td>
                  <td><Badge status={p.kycStatus} /></td>
                  <td className="whitespace-nowrap">{formatDate(p.kycSubmittedAt)}</td>
                  <td className="text-right !whitespace-nowrap">
                    <div className="table-actions flex !flex-row !flex-nowrap items-center gap-1 justify-end whitespace-nowrap">
                      {kycActions(p)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!profiles.length && (
          <p className="p-4 text-center text-slate-500 text-sm">No pending KYC applications</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
};

export default KYCReview;
