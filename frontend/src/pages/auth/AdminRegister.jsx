import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * Admin Portal — Register as admin (login at /admin/login)
 */
const AdminRegister = () => {
  const { adminPanelRegister } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
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
      <h2 className="text-2xl font-bold mb-1 text-center text-accent-300">
        {t('adminRegister')}
      </h2>
      <p className="text-sm text-primary-400 text-center mb-6">
        {t('createAdminAccount')}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label text-primary-300">{t('name')}</label>
          <input
            type="text"
            className="input bg-primary-950 border-primary-700 text-white focus:ring-accent-300/40 focus:border-accent-400"
            placeholder="John Admin"
            {...register('name', { required: t('required') })}
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label text-primary-300">{t('emailOrMobile')}</label>
          <input
            type="text"
            className="input bg-primary-950 border-primary-700 text-white focus:ring-accent-300/40 focus:border-accent-400"
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
          <label className="label text-primary-300">{t('password')}</label>
          <input
            type="password"
            className="input bg-primary-950 border-primary-700 text-white focus:ring-accent-300/40 focus:border-accent-400"
            placeholder="••••••••"
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
          {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>}
          <p className="text-xs text-primary-500 mt-1">{t('passwordHint')}</p>
        </div>

        <div>
          {/* <label className="label text-primary-300">{t('adminRegistrationKey')}</label>
          <input
            type="password"
            className="input bg-primary-950 border-primary-700 text-white focus:ring-accent-300/40 focus:border-accent-400"
            placeholder={t('adminRegistrationKeyPlaceholder')}
            {...register('registrationKey')}
          />
          <p className="text-xs text-primary-500 mt-1">{t('adminRegistrationKeyHint')}</p> */}
        </div>

        <button type="submit" disabled={loading} className="btn-accent w-full">
          {loading ? <LoadingSpinner size="sm" /> : t('createAccount')}
        </button>
      </form>

      <p className="text-center mt-5 text-sm text-primary-400">
        {t('haveAccount')}{' '}
        <Link to="/admin/login" className="text-accent-300 hover:text-accent-200 font-medium">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
};

export default AdminRegister;
