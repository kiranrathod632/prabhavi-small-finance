import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  HiCamera,
  HiOutlineUser,
  HiOutlineOfficeBuilding,
  HiOutlineLockClosed,
  HiOutlinePhone,
  HiOutlineLocationMarker,
} from 'react-icons/hi';
import { profileAPI, authAPI } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner, { PageLoader } from '../../components/LoadingSpinner';
import LanguageSelector from '../../components/LanguageSelector';
import PageHeader from '../../components/PageHeader';

const Profile = () => {
  const { user, fetchUser, updateLanguage } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const { register, handleSubmit, reset } = useForm();
  const passwordForm = useForm();

  const displayName = [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .join(' ') || user?.name;

  const handleLanguageChange = async (lang) => {
    await updateLanguage(lang);
    toast.success(t('languageUpdated'));
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await profileAPI.get();
        const { user: profileUser, profile } = res.data.data;
        reset({
          ...(profile || {}),
          firstName: profileUser?.firstName || '',
          middleName: profileUser?.middleName || '',
          lastName: profileUser?.lastName || '',
        });
      } catch {
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [reset, t]);

  const onSaveProfile = async (data) => {
    setSaving(true);
    try {
      await profileAPI.update({
        ...data,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
      });
      toast.success(t('profileUpdated'));
      fetchUser();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (data) => {
    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success(t('success'));
      passwordForm.reset();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      await profileAPI.uploadAvatar(formData);
      toast.success(t('success'));
      fetchUser();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (loading) return <PageLoader />;

  const tabs = [
    { id: 'personal', label: t('personalInfo'), icon: HiOutlineUser },
    { id: 'bank', label: t('bankDetails'), icon: HiOutlineOfficeBuilding },
    { id: 'password', label: t('changePassword'), icon: HiOutlineLockClosed },
  ];

  return (
    <div className="page-stack max-w-5xl mx-auto">
      <PageHeader
        title={t('profile')}
        subtitle={t('tagline')}
        actions={
          <div className="w-full sm:w-auto">
            {/* <p className="text-[10px] sm:text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('selectLanguage')}</p>
            <LanguageSelector className="w-full sm:w-40 text-xs sm:text-sm" onChange={handleLanguageChange} /> */}
          </div>
        }
      />

      <div className="profile-hero">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-5">
          <div className="relative shrink-0 self-start">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full p-0.5 sm:p-1 bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-glow-sm">
              <div className="w-full h-full rounded-full bg-primary-600 flex items-center justify-center text-white text-xl sm:text-3xl font-bold overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  displayName?.charAt(0)?.toUpperCase()
                )}
              </div>
            </div>
            <label className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 bg-white text-slate-900 rounded-full p-1.5 sm:p-2 shadow-lg cursor-pointer hover:scale-105 transition-transform">
              <HiCamera className="w-3 h-3 sm:w-4 sm:h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          <div className="min-w-0">
            <h2 className="text-lg sm:text-3xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</h2>
            <p className="text-[12px] sm:text-base mt-0.5 sm:mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{user?.mobile_number || user?.email}</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">

            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`profile-tab ${activeTab === tab.id ? 'profile-tab-active' : 'profile-tab-idle'}`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'personal' && (
        <form onSubmit={handleSubmit(onSaveProfile)} className="card space-y-3.5 sm:space-y-5">
          <section className="form-section !p-3 sm:!p-4">
            <div className="form-section-title mb-1">
              <span className="form-section-icon">
                <HiOutlineUser className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
              {t('personalInfo')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="label">{t('firstName')}</label>
                <input className="input" defaultValue={user?.firstName} {...register('firstName')} />
              </div>
              <div>
                <label className="label">
                  {t('middleName')}
                  <span className="optional-badge">{t('optional')}</span>
                </label>
                <input className="input" defaultValue={user?.middleName} {...register('middleName')} />
              </div>
              <div>
                <label className="label">{t('lastName')}</label>
                <input className="input" defaultValue={user?.lastName} {...register('lastName')} />
              </div>
            </div>
          </section>

          <section className="form-section !p-3 sm:!p-4">
            <div className="form-section-title mb-1">
              <span className="form-section-icon">
                <HiOutlineLocationMarker className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
              {t('ui.address')}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <HiOutlinePhone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {t('mobile')}
                </label>
                <input className="input" {...register('phone')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('ui.address')}</label>
                <input className="input" {...register('address')} />
              </div>
              <div>
                <label className="label">{t('ui.city')}</label>
                <input className="input" {...register('city')} />
              </div>
              <div>
                <label className="label">{t('ui.state')}</label>
                <input className="input" {...register('state')} />
              </div>
            </div>
          </section>

          <button type="submit" disabled={saving} className="btn-primary min-w-[120px] sm:min-w-[140px]">
            {saving ? <LoadingSpinner size="sm" /> : t('save')}
          </button>
        </form>
      )}

      {activeTab === 'bank' && (
        <form onSubmit={handleSubmit(onSaveProfile)} className="card space-y-3.5 sm:space-y-5">
          <section className="form-section !p-3 sm:!p-4">
            <div className="form-section-title mb-1">
              <span className="form-section-icon">
                <HiOutlineOfficeBuilding className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
              {t('bankDetails')}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="label">{t('ui.bankName')}</label>
                <input className="input" {...register('bankName')} />
              </div>
              <div>
                <label className="label">{t('ui.accountNumber')}</label>
                <input className="input" {...register('accountNumber')} />
              </div>
              <div>
                <label className="label">{t('ui.ifsc')}</label>
                <input className="input" {...register('ifscCode')} />
              </div>
              <div>
                <label className="label">{t('ui.accountHolder')}</label>
                <input className="input" {...register('accountHolderName')} />
              </div>
            </div>
          </section>
          <button type="submit" disabled={saving} className="btn-primary min-w-[120px] sm:min-w-[140px]">
            {saving ? <LoadingSpinner size="sm" /> : t('save')}
          </button>
        </form>
      )}

      {activeTab === 'password' && (
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="card space-y-3 sm:space-y-4 max-w-md">
          <section className="form-section !p-3 sm:!p-4">
            <div className="form-section-title mb-1">
              <span className="form-section-icon">
                <HiOutlineLockClosed className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
              {t('changePassword')}
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="label">{t('currentPassword')}</label>
                <input type="password" className="input" {...passwordForm.register('currentPassword', { required: true })} />
              </div>
              <div>
                <label className="label">{t('newPassword')}</label>
                <input type="password" className="input" {...passwordForm.register('newPassword', { required: true, minLength: 6 })} />
              </div>
            </div>
          </section>
          <button type="submit" className="btn-primary min-w-[140px] sm:min-w-[180px]">{t('changePassword')}</button>
        </form>
      )}
    </div>
  );
};

export default Profile;
