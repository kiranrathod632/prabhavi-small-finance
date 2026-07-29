import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { kycAPI, profileAPI } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import { PageLoader } from '../../components/LoadingSpinner';
import { Link } from 'react-router-dom';

const KYC = () => {
  const { kycCompleted, fetchUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const load = async () => {
      try {
        const [statusRes, profileRes] = await Promise.all([
          kycAPI.getStatus(),
          profileAPI.get(),
        ]);
        setStatus(statusRes.data.data);
        reset(profileRes.data.data?.profile || {});
      } catch {
        toast.error('Failed to load KYC data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      await profileAPI.update(data);
      await kycAPI.submit(data);
      toast.success('KYC submitted for review!');
      fetchUser();
      const res = await kycAPI.getStatus();
      setStatus(res.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (loading) return <PageLoader />;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-blue-100 text-blue-800',
    under_review: 'bg-indigo-100 text-indigo-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Complete KYC</h1>
      <p className="text-gray-500 mb-6">KYC verification is required before applying for loans</p>

      <div className={`inline-flex items-center px-4 py-2 rounded-lg mb-6 ${statusColors[status?.kycStatus] || ''}`}>
        Status: <strong className="ml-1 capitalize">{status?.kycStatus?.replace('_', ' ')}</strong>
      </div>

      {kycCompleted ? (
        <div className="card text-center py-12">
          <p className="text-green-600 font-semibold text-lg mb-2">KYC Verified ✓</p>
          <p className="text-gray-500 mb-4">You can now apply for loans</p>
          <Link to="/loans" className="btn-primary">Apply for Loan</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">PAN Number *</label>
              <input className="input uppercase" {...register('pan', { required: true })} />
            </div>
            <div>
              <label className="label">Aadhaar Number *</label>
              <input className="input" maxLength={12} {...register('aadhaar', { required: true })} />
            </div>
            <div>
              <label className="label">Occupation *</label>
              <input className="input" {...register('occupation', { required: true })} />
            </div>
            <div>
              <label className="label">Monthly Income (₹) *</label>
              <input type="number" className="input" {...register('monthlyIncome', { required: true })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address *</label>
              <input className="input" {...register('address', { required: true })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" {...register('city')} />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input className="input" {...register('pincode')} />
            </div>
            <div>
              <label className="label">Bank Name *</label>
              <input className="input" {...register('bankName', { required: true })} />
            </div>
            <div>
              <label className="label">Account Number *</label>
              <input className="input" {...register('accountNumber', { required: true })} />
            </div>
            <div>
              <label className="label">IFSC Code *</label>
              <input className="input uppercase" {...register('ifscCode', { required: true })} />
            </div>
            <div>
              <label className="label">Account Holder Name</label>
              <input className="input" {...register('accountHolderName')} />
            </div>
          </div>
          {status?.kycRejectedReason && (
            <p className="text-red-500 text-sm">Rejection reason: {status.kycRejectedReason}</p>
          )}
          <button type="submit" className="btn-primary" disabled={status?.kycStatus === 'submitted'}>
            {status?.kycStatus === 'submitted' ? 'Under Review' : 'Submit KYC'}
          </button>
        </form>
      )}
    </div>
  );
};

export default KYC;
