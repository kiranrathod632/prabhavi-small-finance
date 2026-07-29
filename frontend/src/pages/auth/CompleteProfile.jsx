import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineOfficeBuilding,
  HiOutlineMail,
  HiSparkles,
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { completeProfileSetup } from '../../services/authService';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner, { PageLoader } from '../../components/LoadingSpinner';
import BrandLogo from '../../components/BrandLogo';

const CompleteProfile = () => {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/user/login', { replace: true });
      return;
    }
    if (!authLoading && user?.profileSetupComplete === true) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const loadAdmins = async () => {
      try {
        const { data } = await api.get('/auth/admins');
        setAdmins(data.data || []);
      } catch {
        toast.error(t('userRegister.loadAdminsFailed'));
      } finally {
        setAdminsLoading(false);
      }
    };
    loadAdmins();
  }, [t]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await completeProfileSetup({
        firstName: data.firstName.trim(),
        middleName: data.middleName?.trim() || '',
        lastName: data.lastName.trim(),
        adminId: data.adminId,
        password: data.password,
        ...(data.email?.trim() ? { email: data.email.trim() } : {}),
      });
      await refreshUser();
      toast.success(t('userRegister.profileCompleted'));
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <PageLoader />;

  return (
    <div className="min-h-[100dvh] panel-shell flex items-start sm:items-center justify-center px-4 py-6 sm:p-6">
      <div className="w-full max-w-[420px] sm:max-w-md">
        <div className="mb-5 text-center">
          <BrandLogo size="md" variant="light" className="mx-auto" />
        </div>

        <div className="auth-card px-5 py-7 sm:px-8 sm:py-9">
          <div className="auth-header">
            <div className="auth-header-icon">
              <HiSparkles className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h2 className="auth-title">{t('userRegister.completeProfileTitle')}</h2>
            <p className="auth-subtitle !mb-0">{t('userRegister.completeProfileSubtitle')}</p>
            {user?.mobile_number && (
              <p className="auth-hint mt-3 text-violet-300">{t('mobile')}: {user.mobile_number}</p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="auth-field">
              <label className="auth-label flex items-center gap-2">
                <HiOutlineUser className="w-4 h-4 text-violet-300" />
                {t('personalInfo')}
              </label>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div>
                  <input className="auth-input" placeholder={t('firstName')} {...register('firstName', { required: t('required') })} />
                  {errors.firstName && <p className="auth-error">{errors.firstName.message}</p>}
                </div>
                <div>
                  <input className="auth-input" placeholder={t('lastName')} {...register('lastName', { required: t('required') })} />
                  {errors.lastName && <p className="auth-error">{errors.lastName.message}</p>}
                </div>
                <div className="xs:col-span-2">
                  <input className="auth-input" placeholder={`${t('middleName')} (${t('optional')})`} {...register('middleName')} />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label flex items-center gap-2">
                <HiOutlineOfficeBuilding className="w-4 h-4 text-violet-300" />
                {t('userRegister.selectAdmin')}
              </label>
              <select
                className="auth-input"
                disabled={adminsLoading}
                {...register('adminId', { required: t('userRegister.selectAdminRequired') })}
              >
                <option value="">
                  {adminsLoading ? t('loading') : t('userRegister.selectAdminPlaceholder')}
                </option>
                {admins.map((admin) => (
                  <option key={admin._id} value={admin._id}>{admin.name}</option>
                ))}
              </select>
              {errors.adminId && <p className="auth-error">{errors.adminId.message}</p>}
              <p className="auth-hint mt-2">{t('userRegister.adminHint')}</p>
            </div>

            <div className="auth-field">
              <label className="auth-label flex items-center gap-2">
                <HiOutlineMail className="w-4 h-4 text-violet-300" />
                {t('email')} <span className="optional-badge">{t('optional')}</span>
              </label>
              <input className="auth-input" type="email" placeholder="you@example.com" {...register('email')} />
            </div>

            <div className="auth-field">
              <label className="auth-label flex items-center gap-2">
                <HiOutlineLockClosed className="w-4 h-4 text-violet-300" />
                {t('password')}
              </label>
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                {...register('password', {
                  required: t('required'),
                  minLength: { value: 6, message: t('passwordMin') },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: t('passwordHint'),
                  },
                })}
              />
              {errors.password && <p className="auth-error">{errors.password.message}</p>}
              <p className="auth-hint mt-2">{t('passwordHint')}</p>
            </div>

            <button
              type="submit"
              disabled={saving || adminsLoading || !admins.length}
              className="auth-btn-primary"
            >
              {saving ? <LoadingSpinner size="sm" /> : t('userRegister.finishSetup')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
