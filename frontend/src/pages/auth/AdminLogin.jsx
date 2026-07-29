import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import { isAdminPanelRole, getDashboardPath } from '../../utils/roles';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * Admin Portal — Login only (register at /admin/register)
 */
const AdminLogin = () => {
  const { adminPanelLogin, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const session = await adminPanelLogin(data.credential, data.password);
      const role = session?.user?.role;

      if (!isAdminPanelRole(role)) {
        await logout();
        toast.error(t('onlyAdminHere'));
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
      <p className="auth-eyebrow">{t('welcomeBack')}</p>
      <h2 className="auth-title">{t('adminLogin')}</h2>
      <p className="auth-subtitle">{t('adminPortal')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('emailOrMobile')}</label>
          <input
            type="text"
            className="input"
            placeholder="admin@financeloan.com or 9876543210"
            autoComplete="username"
            {...register('credential', {
              required: t('required'),
              validate: (value) => {
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                const isMobile = /^[6-9]\d{9}$/.test(value);
                if (!isEmail && !isMobile) {
                  return t('validEmailOrMobile');
                }
                return true;
              },
            })}
          />
          {errors.credential && <p className="text-red-400 text-sm mt-1">{errors.credential.message}</p>}
        </div>

        <div>
          <label className="label">{t('password')}</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register('password', { required: t('required') })}
          />
          {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>}
        </div>

        <div className="text-right">
          <Link to="/user/forgot-password" className="text-sm link-accent">
            {t('forgotPassword')}
          </Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full rounded-xl">
          {loading ? <LoadingSpinner size="sm" /> : t('signIn')}
        </button>
      </form>

      <p className="text-center mt-5 text-sm text-slate-500">
        {t('noAccount')}{' '}
        <Link to="/admin/register" className="link-accent font-medium">
          {t('adminRegister')}
        </Link>
      </p>
    </div>
  );
};

export default AdminLogin;
