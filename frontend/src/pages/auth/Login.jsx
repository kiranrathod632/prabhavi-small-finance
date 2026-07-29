import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiOutlineLockClosed, HiOutlineMail, HiSparkles } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import { isStaff } from '../../utils/roles';
import LoadingSpinner from '../../components/LoadingSpinner';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const session = await login(data.credential, data.password);
      const role = session?.user?.role;

      if (isStaff(role)) {
        toast.error(t('staffUseAdminLogin'));
        return navigate('/admin/login', { replace: true });
      }

      toast.success(t('loginSuccess'));
      navigate('/dashboard', { replace: true });
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
          <HiSparkles className="w-8 h-8 sm:w-9 sm:h-9" />
        </div>
        <p className="auth-eyebrow">{t('welcomeBack')}</p>
        <h2 className="auth-title">{t('signIn')}</h2>
        <p className="auth-subtitle mt-3">{t('userPortal')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="auth-field">
          <label className="auth-label flex items-center gap-2.5">
            <HiOutlineMail className="w-5 h-5 text-violet-400 shrink-0" />
            {t('emailOrMobile')}
          </label>
          <input
            type="text"
            className="auth-input"
            placeholder="you@example.com or 9876543210"
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
          <label className="auth-label flex items-center gap-2.5">
            <HiOutlineLockClosed className="w-5 h-5 text-violet-400 shrink-0" />
            {t('password')}
          </label>
          <input
            type="password"
            className="auth-input"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register('password', { required: t('required') })}
          />
          {errors.password && <p className="auth-error">{errors.password.message}</p>}
        </div>

        <div className="text-right">
          <Link to="/user/forgot-password" className="text-[15px] link-accent font-semibold">
            {t('forgotPassword')}
          </Link>
        </div>

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? <LoadingSpinner size="sm" /> : t('signIn')}
        </button>

        <p className="text-center text-[15px] text-slate-400 pt-2 pb-1">
          {t('noAccount')}{' '}
          <Link to="/user/register" className="link-accent font-bold">
            {t('register')}
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
