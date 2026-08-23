import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiEye, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import adminPanelAPI from '../../services/adminPanelAPI';
import { getErrorMessage, formatCurrency, getShortName } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isMobile = (value) => /^[6-9]\d{9}$/.test(value);
const adminPhone = (admin) => admin?.mobile_number || admin?.mobile || '-';

/**
 * Super Admin only — create Admins via email/mobile OTP + name parts.
 * Admins then create Users under themselves.
 */
const ManageAdmins = () => {
  const { t } = useTranslation();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [viewAdmin, setViewAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    credential: '',
    otp: '',
    firstName: '',
    middleName: '',
    lastName: '',
    password: '',
    name: '',
    email: '',
    mobile: '',
  });

  // --- NEW: period filter state ---
  const [filterPeriod, setFilterPeriod] = useState('today'); // today | week | month | 3month | 6month | year
  const [selectedMonth, setSelectedMonth] = useState('');   // YYYY-MM
  const [useCustomMonth, setUseCustomMonth] = useState(false);

  // --- MODIFIED: fetchAdmins now accepts period/month params ---
  const fetchAdmins = async (params = {}) => {
    setLoading(true);
    try {
      const query = { ...params };
      if (useCustomMonth && selectedMonth) {
        query.month = selectedMonth;
      } else if (filterPeriod) {
        query.period = filterPeriod;
      }
      const { data } = await adminPanelAPI.getAdmins(query);
      setAdmins(data.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line
  }, []);

  // When filterPeriod changes, reset custom month and refetch
  const handlePeriodChange = (e) => {
    const period = e.target.value;
    setFilterPeriod(period);
    setUseCustomMonth(false);
    setSelectedMonth('');
    fetchAdmins({ period });
  };

  // Apply custom month
  const handleApplyMonth = () => {
    if (!selectedMonth) {
      toast.error(t('manageAdmins.selectMonth') || 'Please select a month');
      return;
    }
    setUseCustomMonth(true);
    fetchAdmins({ month: selectedMonth });
  };

  // Reset custom month
  const handleResetMonth = () => {
    setUseCustomMonth(false);
    setSelectedMonth('');
    fetchAdmins({ period: filterPeriod });
  };

  const resetCreateForm = () => {
    setCreateStep(1);
    setShowPassword(false);
    setForm({
      credential: '',
      otp: '',
      firstName: '',
      middleName: '',
      lastName: '',
      password: '',
      name: '',
      email: '',
      mobile: '',
    });
  };

  const openCreate = () => {
    setEditAdmin(null);
    resetCreateForm();
    setModalOpen(true);
  };

  const openEdit = (admin) => {
    setEditAdmin(admin);
    setForm({
      credential: '',
      otp: '',
      firstName: admin.firstName || '',
      middleName: admin.middleName || '',
      lastName: admin.lastName || '',
      password: '',
      name: admin.name || '',
      email: admin.email || '',
      mobile: admin.mobile_number || admin.mobile || '',
    });
    setModalOpen(true);
  };

  const openViewUsers = (admin) => {
    setViewAdmin(admin);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const credential = form.credential.trim();
    if (!isEmail(credential) && !isMobile(credential)) {
      toast.error(t('validEmailOrMobile'));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await adminPanelAPI.sendAdminInviteOtp({ credential });
      if (data?.data?.otp) {
        toast.success(`${t('otpSent')}: ${data.data.otp}`);
      } else {
        toast.success(t('otpSent'));
      }
      setCreateStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.otp.trim())) {
      toast.error(t('manageAdmins.validOtp') || 'Enter a valid 6-digit OTP');
      return;
    }
    setSubmitting(true);
    try {
      await adminPanelAPI.verifyAdminInviteOtp({
        credential: form.credential.trim(),
        otp: form.otp.trim(),
      });
      toast.success(t('manageAdmins.otpVerified') || 'OTP verified');
      setCreateStep(3);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setSubmitting(true);
    try {
      const { data } = await adminPanelAPI.sendAdminInviteOtp({
        credential: form.credential.trim(),
      });
      if (data?.data?.otp) {
        toast.success(`${t('ui.resendOtp')}: ${data.data.otp}`);
      } else {
        toast.success(t('ui.resendOtp'));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editAdmin) {
        await adminPanelAPI.updateAdmin(editAdmin._id, {
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          name: form.name || [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' '),
          email: form.email,
          mobile: form.mobile,
        });
        toast.success(t('manageAdmins.updated') || 'Admin updated');
      } else {
        await adminPanelAPI.createAdmin({
          credential: form.credential.trim(),
          firstName: form.firstName.trim(),
          middleName: form.middleName?.trim() || '',
          lastName: form.lastName.trim(),
          password: form.password,
        });
        toast.success(t('manageAdmins.created'));
      }
      setModalOpen(false);
      resetCreateForm();
      fetchAdmins(); // refresh with current filter
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (admin) => {
    try {
      if (admin.isActive) {
        await adminPanelAPI.deactivateAdmin(admin._id);
        toast.success(t('manageAdmins.deactivated'));
      } else {
        await adminPanelAPI.activateAdmin(admin._id);
        toast.success(t('manageAdmins.activated'));
      }
      fetchAdmins();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (loading) return <LoadingSpinner />;

  const joinedUsers = viewAdmin?.joinedUsers || [];

  const adminActions = (admin) => (
    <>
      <button
        type="button"
        onClick={() => openViewUsers(admin)}
        className="icon-btn-view"
        title={t('manageAdmins.viewUsersList')}
      >
        <HiEye className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => toggleActive(admin)} className="btn-secondary action-chip">
        {admin.isActive ? t('ui.deactivate') : t('ui.activate')}
      </button>
    </>
  );

  // --- Period label helper (same as in dashboard) ---
  const periodLabel = (key) => {
    const map = {
      today: t('adminDash.today'),
      week: t('adminDash.thisWeek'),
      month: t('adminDash.thisMonth'),
      '3month': t('adminDash.last3Months') || '3 Months',
      '6month': t('adminDash.last6Months') || '6 Months',
      year: t('adminDash.thisYear'),
    };
    return map[key] || key;
  };

  return (
    <div className="page-stack">
      <PageHeader
        title={t('manageAdmins.title')}
        subtitle={t('manageAdmins.hint') || 'Create Admins like Kiran. They create Users under them.'}
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">
            {t('manageAdmins.createAdmin')}
          </button>
        }
      />

      {/* --- NEW: Period Filter Bar --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-white dark:bg-primary-800 p-3 rounded-lg shadow-sm border border-primary-100 dark:border-primary-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {t('manageAdmins.filterByPeriod') || 'Filter by period:'}
          </span>
          <select
            value={filterPeriod}
            onChange={handlePeriodChange}
            className="form-select rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm dark:border-primary-700 dark:bg-primary-800"
          >
            <option value="today">{periodLabel('today')}</option>
            <option value="week">{periodLabel('week')}</option>
            <option value="month">{periodLabel('month')}</option>
            <option value="3month">{periodLabel('3month')}</option>
            <option value="6month">{periodLabel('6month')}</option>
            <option value="year">{periodLabel('year')}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-input rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm dark:border-primary-700 dark:bg-primary-800"
          />
          <button
            type="button"
            onClick={handleApplyMonth}
            className="btn-primary rounded-md px-4 py-1.5 text-sm"
          >
            {t('apply') || 'Apply'}
          </button>
          {useCustomMonth && (
            <button
              type="button"
              onClick={handleResetMonth}
              className="btn-secondary rounded-md px-4 py-1.5 text-sm"
            >
              {t('reset') || 'Reset'}
            </button>
          )}
        </div>
      </div>

      {/* Same clean table pattern as User Management — works on all mobile widths */}
      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.srNo')}</th>
                <th>{t('table.name')}</th>
                <th>{t('table.mobile')}</th>
                <th>{t('manageAdmins.joinedUsers')}</th>
                <th className="text-right">{t('manageAdmins.totalCommission') || 'Total Commission'}</th>
                <th className="text-right">{t('manageAdmins.totalPurchase') || 'Total Purchase'}</th>
                <th>{t('table.status')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin, index) => (
                <tr key={admin._id}>
                  <td className="text-slate-500">{index + 1}</td>
                  <td className="font-medium whitespace-nowrap">{getShortName(admin)}</td>
                  <td className="whitespace-nowrap">{adminPhone(admin)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openViewUsers(admin)}
                      className="link-accent font-medium inline-flex items-center gap-1"
                      title={t('manageAdmins.viewUsersList')}
                    >
                      {admin.joinedUsersCount || 0}
                    </button>
                  </td>
                  <td className="text-right font-semibold text-green-600 whitespace-nowrap">
                    {formatCurrency(admin.totalCommissionEarned || 0)}
                  </td>
                  <td className="text-right font-semibold whitespace-nowrap">
                    {formatCurrency(admin.totalPurchase || 0)}
                  </td>
                  <td>
                    <span className={`badge ${admin.isActive ? 'badge-green' : 'badge-red'}`}>
                      {admin.isActive ? t('ui.active') : t('ui.inactive')}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="inline-flex flex-wrap gap-1 justify-end">{adminActions(admin)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!admins.length && (
          <p className="p-4 text-center text-slate-500 text-sm">{t('manageAdmins.noAdmins')}</p>
        )}
      </div>

      {/* Create/Edit Modal (unchanged) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetCreateForm(); }}
        title={editAdmin ? (t('manageAdmins.editTitle') || 'Edit Admin') : t('manageAdmins.createTitle')}
      >
        {editAdmin ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="input"
              placeholder={t('firstName')}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder={`${t('middleName')} (${t('optional')})`}
              value={form.middleName}
              onChange={(e) => setForm({ ...form, middleName: e.target.value })}
            />
            <input
              className="input"
              placeholder={t('lastName')}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
            <input
              className="input"
              type="email"
              placeholder={t('email')}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="input"
              placeholder={t('mobile')}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <LoadingSpinner size="sm" /> : t('update')}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {t('manageAdmins.createStep', { step: createStep }) || `Step ${createStep} of 3`}
            </p>

            {createStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <input
                  className="input"
                  placeholder={t('emailOrMobile')}
                  value={form.credential}
                  onChange={(e) => setForm({ ...form, credential: e.target.value })}
                  required
                />
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? <LoadingSpinner size="sm" /> : t('sendOtp')}
                </button>
              </form>
            )}

            {createStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <p className="text-sm text-slate-600">
                  {t('ui.otpSentTo')} {form.credential}
                </p>
                <input
                  className="input"
                  placeholder={t('otp')}
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  maxLength={6}
                  required
                />
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? <LoadingSpinner size="sm" /> : t('verifyOtp')}
                </button>
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    className="text-primary-600 hover:underline"
                    onClick={() => setCreateStep(1)}
                    disabled={submitting}
                  >
                    {t('back') || 'Back'}
                  </button>
                  <button
                    type="button"
                    className="text-primary-600 hover:underline"
                    onClick={handleResendOtp}
                    disabled={submitting}
                  >
                    {t('ui.resendOtp')}
                  </button>
                </div>
              </form>
            )}

            {createStep === 3 && (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  className="input"
                  placeholder={t('firstName')}
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
                <input
                  className="input"
                  placeholder={`${t('middleName')} (${t('optional')})`}
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                />
                <input
                  className="input"
                  placeholder={t('lastName')}
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('password')}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-violet-500 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? <LoadingSpinner size="sm" /> : t('create')}
                </button>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* View Joined Users Modal (unchanged) */}
      <Modal
        isOpen={!!viewAdmin}
        onClose={() => setViewAdmin(null)}
        title={viewAdmin ? `${t('manageAdmins.joinedUsersList')} — ${getShortName(viewAdmin)}` : ''}
        size="xl"
      >
        {joinedUsers.length ? (
          <>
            <div className="mobile-list">
              {joinedUsers.map((user) => {
                const summary = user.summary || {};
                return (
                  <div key={user._id} className="mobile-list-item">
                    <div className="mobile-list-head">
                      <div className="min-w-0">
                        <p className="mobile-list-title">{getShortName(user)}</p>
                        <p className="mobile-list-meta">{user.mobile_number || '-'}</p>
                      </div>
                    </div>
                    <div className="mobile-list-grid">
                      <div className="mobile-list-field">
                        <label>{t('manageAdmins.totalEMIs')}</label>
                        <span>{summary.totalEMIs || 0}</span>
                      </div>
                      <div className="mobile-list-field">
                        <label>{t('manageAdmins.pendingEMIs')}</label>
                        <span>{summary.pendingEMIs || 0}</span>
                      </div>
                      <div className="mobile-list-field">
                        <label>{t('manageAdmins.totalEmiAmount')}</label>
                        <span>{formatCurrency(summary.totalEmiAmount || 0)}</span>
                      </div>
                      <div className="mobile-list-field">
                        <label>{t('manageAdmins.pendingEmiAmount')}</label>
                        <span>{formatCurrency(summary.pendingEmiAmount || 0)}</span>
                      </div>
                      <div className="mobile-list-field">
                        <label>{t('manageAdmins.totalLoans')}</label>
                        <span>{summary.totalLoans || 0}</span>
                      </div>
                      <div className="mobile-list-field">
                        <label>{t('manageAdmins.loanAmount')}</label>
                        <span>{formatCurrency(summary.totalLoanAmount || 0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="data-table-wrap hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('table.name')}</th>
                    <th>{t('table.mobile')}</th>
                    <th>{t('manageAdmins.totalEMIs')}</th>
                    <th>{t('manageAdmins.pendingEMIs')}</th>
                    <th className="text-right">{t('manageAdmins.totalEmiAmount')}</th>
                    <th className="text-right">{t('manageAdmins.pendingEmiAmount')}</th>
                    <th>{t('manageAdmins.totalLoans')}</th>
                    <th className="text-right">{t('manageAdmins.loanAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {joinedUsers.map((user) => {
                    const summary = user.summary || {};
                    return (
                      <tr key={user._id}>
                        <td className="font-medium">{getShortName(user)}</td>
                        <td>{user.mobile_number || '-'}</td>
                        <td>{summary.totalEMIs || 0}</td>
                        <td>{summary.pendingEMIs || 0}</td>
                        <td className="text-right">{formatCurrency(summary.totalEmiAmount || 0)}</td>
                        <td className="text-right">{formatCurrency(summary.pendingEmiAmount || 0)}</td>
                        <td>{summary.totalLoans || 0}</td>
                        <td className="text-right">{formatCurrency(summary.totalLoanAmount || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">{t('manageAdmins.noJoinedUsers')}</p>
        )}
      </Modal>
    </div>
  );
};

export default ManageAdmins;