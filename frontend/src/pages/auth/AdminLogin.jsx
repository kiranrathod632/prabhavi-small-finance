import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiOutlineLockClosed, HiOutlineMail, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import { isAdminPanelRole, getDashboardPath } from '../../utils/roles';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminLogin = () => {
  const { adminPanelLogin, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="auth-header">
        <h2 className="auth-title">{t('adminLogin')}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-5">
        <div className="auth-field">
          <label className="auth-label flex items-center gap-1.5">
            <HiOutlineMail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400 shrink-0" />
            {t('emailOrMobile')}
          </label>
          <input
            type="text"
            className="auth-input"
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
          {errors.credential && <p className="auth-error">{errors.credential.message}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label flex items-center gap-1.5">
            <HiOutlineLockClosed className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400 shrink-0" />
            {t('password')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input pr-10"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password', { required: t('required') })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-400 transition-colors"
            >
              {showPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="auth-error">{errors.password.message}</p>}
        </div>

        <div className="text-right">
          <Link to="/user/forgot-password" className="text-[11px] sm:text-sm link-accent font-semibold">
            {t('forgotPassword')}
          </Link>
        </div>

        <button type="submit" disabled={loading} className="auth-btn-primary group">
          {loading ? <LoadingSpinner size="sm" /> : (
            <span className="flex items-center justify-center gap-1.5">
              {t('signIn')}
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          )}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
