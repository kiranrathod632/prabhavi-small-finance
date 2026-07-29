import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import { ROLES, getDashboardPath } from '../../utils/roles';
import LoadingSpinner from '../../components/LoadingSpinner';

const SuperAdminLogin = () => {
  const { adminPanelLogin, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await adminPanelLogin(data.email, data.password);
      const role = res?.data?.user?.role;
      if (role !== ROLES.SUPER_ADMIN) {
        await logout();
        toast.error(t('onlySuperAdminHere'));
        return;
      }
      toast.success(t('loginSuccess'));
      navigate(getDashboardPath(role), { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-center text-amber-400">{t('superAdminLogin')}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label text-slate-300">{t('email')}</label>
          <input type="email" className="input bg-slate-700 border-slate-600 text-white" {...register('email', { required: true })} />
        </div>
        <div>
          <label className="label text-slate-300">{t('password')}</label>
          <input type="password" className="input bg-slate-700 border-slate-600 text-white" {...register('password', { required: true })} />
        </div>
        <button type="submit" disabled={loading} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg">
          {loading ? <LoadingSpinner size="sm" /> : t('signIn')}
        </button>
      </form>
      <p className="text-center mt-4 text-sm"><Link to="/admin/login" className="text-amber-400 hover:underline">{t('goToAdminLogin')}</Link></p>
    </div>
  );
};

export default SuperAdminLogin;
