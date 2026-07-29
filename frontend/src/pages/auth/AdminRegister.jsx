import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiOutlineUser, HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineUserAdd } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminRegister = () => {
  const { adminPanelRegister } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await adminPanelRegister({
        name: data.name,
        credential: data.credential.trim(),
        password: data.password,
        registrationKey: data.registrationKey || undefined,
      });

      toast.success(t('adminRegistrationSuccess'));
      navigate('/admin/login', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="auth-header">
        <div className="auth-header-icon">
          <HiOutlineUserAdd className="w-5 h-5 sm:w-8 sm:h-8" />
        </div>
        <p className="auth-eyebrow">{t('createAccount')}</p>
        <h2 className="auth-title">{t('adminRegister')}</h2>
        <p className="auth-subtitle mt-1.5 sm:mt-2">{t('createAdminAccount')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-5">
        <div className="auth-field">
          <label className="auth-label flex items-center gap-1.5">
            <HiOutlineUser className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400 shrink-0" />
            {t('name')}
          </label>
          <input
            type="text"
            className="auth-input"
            placeholder="John Admin"
            {...register('name', { required: t('required') })}
          />
          {errors.name && <p className="auth-error">{errors.name.message}</p>}
        </div>

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
              placeholder="8+ chars, upper, number, symbol"
              autoComplete="new-password"
              {...register('password', {
                required: t('required'),
                minLength: { value: 6, message: t('passwordMin') },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: t('passwordHint'),
                },
              })}
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
          <p className="auth-hint mt-1.5">{t('passwordHint')}</p>
        </div>

        <button type="submit" disabled={loading} className="auth-btn-primary group">
          {loading ? <LoadingSpinner size="sm" /> : (
            <span className="flex items-center justify-center gap-1.5">
              {t('createAccount')}
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          )}
        </button>
      </form>

      <p className="text-center mt-3 sm:mt-5 text-[11px] sm:text-sm text-slate-400">
        {t('haveAccount')}{' '}
        <Link to="/admin/login" className="link-accent font-bold">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
};

export default AdminRegister;
