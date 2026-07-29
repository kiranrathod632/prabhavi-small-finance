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

      <div className="mobile-list">
        {profiles.map((p) => (
          <div key={p._id} className="mobile-list-item">
            <div className="mobile-list-head">
              <div className="min-w-0">
                <p className="mobile-list-title">{p.user?.name}</p>
                <p className="mobile-list-meta mt-0.5">{p.user?.mobile || p.phone}</p>
              </div>
              <Badge status={p.kycStatus} />
            </div>
            <div className="mobile-list-grid">
              <div className="mobile-list-field">
                <label>PAN</label>
                <span className="font-mono">{p.pan}</span>
              </div>
              <div className="mobile-list-field">
                <label>Submitted</label>
                <span>{formatDate(p.kycSubmittedAt)}</span>
              </div>
            </div>
            <div className="mobile-list-actions">{kycActions(p)}</div>
          </div>
        ))}
        {!profiles.length && (
          <p className="py-8 text-center text-[12px] text-slate-500">No pending KYC applications</p>
        )}
      </div>

      <div className="card desktop-table">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Mobile</th>
                <th>PAN</th>
                <th>Status</th>
                <th>Submitted</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p._id}>
                  <td>{p.user?.name}</td>
                  <td>{p.user?.mobile || p.phone}</td>
                  <td className="font-mono">{p.pan}</td>
                  <td><Badge status={p.kycStatus} /></td>
                  <td>{formatDate(p.kycSubmittedAt)}</td>
                  <td className="text-right">
                    <div className="inline-flex flex-wrap gap-1 justify-end">{kycActions(p)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
};

export default KYCReview;
