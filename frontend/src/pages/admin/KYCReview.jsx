import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { kycAPI } from '../../services';
import { formatDate } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">KYC Review</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-2">User</th>
              <th className="text-left py-3 px-2">Mobile</th>
              <th className="text-left py-3 px-2">PAN</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Submitted</th>
              <th className="text-right py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p._id} className="border-b dark:border-gray-700/50">
                <td className="py-3 px-2">{p.user?.name}</td>
                <td className="py-3 px-2">{p.user?.mobile || p.phone}</td>
                <td className="py-3 px-2 font-mono">{p.pan}</td>
                <td className="py-3 px-2"><Badge status={p.kycStatus} /></td>
                <td className="py-3 px-2">{formatDate(p.kycSubmittedAt)}</td>
                <td className="py-3 px-2 text-right space-x-2">
                  <button onClick={() => review(p.user._id, 'verified')} className="btn-success text-xs py-1 px-2">Verify</button>
                  <button onClick={() => review(p.user._id, 'rejected')} className="btn-danger text-xs py-1 px-2">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default KYCReview;
