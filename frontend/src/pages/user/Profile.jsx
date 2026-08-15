import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  HiCamera,
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlinePhone,
  HiOutlineLocationMarker,
  HiOutlineIdentification,
  HiCheckCircle,
} from 'react-icons/hi';
import { profileAPI, authAPI } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, resolveMediaUrl } from '../../utils/helpers';
import LoadingSpinner, { PageLoader } from '../../components/LoadingSpinner';
import PageHeader from '../../components/PageHeader';

const Profile = () => {
  const { user, fetchUser } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [activeTab, setActiveTab] = useState('personal');
  const [profile, setProfile] = useState(null);
  const { register, handleSubmit, reset } = useForm();
  const passwordForm = useForm();

  const displayName = [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .join(' ') || user?.name;

  const kycCompleted = !!(user?.kycCompleted || (
    profile?.aadhaarDocument && profile?.panDocument && profile?.bankDocument
  ));

  const flattenProfileForForm = (profileUser, p) => ({
    firstName: profileUser?.firstName || '',
    middleName: profileUser?.middleName || '',
    lastName: profileUser?.lastName || '',
    phone: p?.phone || '',
    address: p?.address?.street || (typeof p?.address === 'string' ? p.address : '') || '',
    city: p?.address?.city || p?.city || '',
    state: p?.address?.state || p?.state || '',
    pan: p?.pan || '',
    aadhaar: p?.aadhaar || '',
  });

  const loadProfile = async () => {
    const res = await profileAPI.get();
    const { user: profileUser, profile: p } = res.data.data;
    setProfile(p || null);
    reset(flattenProfileForForm(profileUser, p));
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        await loadProfile();
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
      const payload = {
        ...data,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
      };
      // Avoid failing validators with empty identity fields on other tabs
      if (!payload.pan) delete payload.pan;
      if (!payload.aadhaar) delete payload.aadhaar;
      if (payload.pan) payload.pan = String(payload.pan).toUpperCase();

      await profileAPI.update(payload);
      toast.success(t('profileUpdated'));
      await fetchUser();
      await loadProfile();
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
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      await profileAPI.uploadAvatar(formData);
      toast.success(t('success'));
      await fetchUser();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      e.target.value = '';
    }
  };

  const handleDocUpload = async (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', type);
    setUploading(type);
    try {
      const res = await profileAPI.uploadDocument(formData);
      const updated = res.data.data;
      setProfile(updated);
      await fetchUser();
      if (updated?.kycCompleted) {
        toast.success(t('kyc.completed'));
      } else {
        toast.success(t('kyc.docUploaded'));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading('');
      e.target.value = '';
    }
  };

  if (loading) return <PageLoader />;

  const tabs = [
    { id: 'personal', label: t('personalInfo'), icon: HiOutlineUser },
    { id: 'kyc', label: t('kyc.title'), icon: HiOutlineIdentification },
    { id: 'password', label: t('changePassword'), icon: HiOutlineLockClosed },
  ];

  const DocUploadRow = ({ type, label, url }) => (
    <div className="rounded-xl border border-primary-200/60 dark:border-primary-700/60 p-3 sm:p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {url ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
            <HiCheckCircle className="w-4 h-4" /> {t('kyc.uploaded')}
          </span>
        ) : (
          <span className="text-xs text-amber-600 font-medium">{t('kyc.required')}</span>
        )}
      </div>
      {url && (
        <a
          href={resolveMediaUrl(url)}
          target="_blank"
          rel="noreferrer"
          className="text-xs link-accent break-all"
        >
          {t('kyc.viewDoc')}
        </a>
      )}
      <label className="btn-secondary inline-flex cursor-pointer text-sm">
        {uploading === type ? t('loading') : (url ? t('kyc.replaceDoc') : t('kyc.uploadDoc'))}
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          disabled={!!uploading}
          onChange={(e) => handleDocUpload(type, e)}
        />
      </label>
    </div>
  );

  return (
    <div className="page-stack max-w-5xl mx-auto">
      <PageHeader
        title={t('profile')}
        subtitle={t('tagline')}
      />

      <div className="profile-hero">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-5">
          <div className="relative shrink-0 self-start">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full p-0.5 sm:p-1 bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-glow-sm">
              <div className="w-full h-full rounded-full bg-primary-600 flex items-center justify-center text-white text-xl sm:text-3xl font-bold overflow-hidden">
                {user?.avatar ? (
                  <img src={resolveMediaUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
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
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${kycCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {kycCompleted ? t('kyc.completedBadge') : t('kyc.pendingBadge')}
              </span>
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
                <input className="input" {...register('firstName')} />
              </div>
              <div>
                <label className="label">
                  {t('middleName')}
                  <span className="optional-badge">{t('optional')}</span>
                </label>
                <input className="input" {...register('middleName')} />
              </div>
              <div>
                <label className="label">{t('lastName')}</label>
                <input className="input" {...register('lastName')} />
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

      {activeTab === 'kyc' && (
        <div className="card space-y-3.5 sm:space-y-5">
          <section className="form-section !p-3 sm:!p-4">
            <div className="form-section-title mb-1">
              <span className="form-section-icon">
                <HiOutlineIdentification className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
              {t('kyc.title')}
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('kyc.hint')}
            </p>

            <form onSubmit={handleSubmit(onSaveProfile)} className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="label">{t('ui.pan')} *</label>
                <input className="input uppercase" maxLength={10} {...register('pan', { required: true })} />
              </div>
              <div>
                <label className="label">{t('ui.aadhaar')} *</label>
                <input className="input" maxLength={12} {...register('aadhaar', { required: true })} />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={saving} className="btn-primary min-w-[120px]">
                  {saving ? <LoadingSpinner size="sm" /> : t('save')}
                </button>
              </div>
            </form>

            <div className="grid sm:grid-cols-3 gap-3">
              <DocUploadRow type="aadhaar" label={t('kyc.aadhaarCard')} url={profile?.aadhaarDocument} />
              <DocUploadRow type="pan" label={t('kyc.panCard')} url={profile?.panDocument} />
              <DocUploadRow type="bank" label={t('kyc.bankPhoto')} url={profile?.bankDocument} />
            </div>
          </section>
        </div>
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
