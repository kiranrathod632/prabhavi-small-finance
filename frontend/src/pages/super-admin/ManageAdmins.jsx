import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiEye } from 'react-icons/hi';
import adminPanelAPI from '../../services/adminPanelAPI';
import { getErrorMessage, formatDate, formatCurrency } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';

/**
 * Super Admin only — create Admins (e.g. Kiran).
 * Admins then create Users under themselves.
 */
const ManageAdmins = () => {
  const { t } = useTranslation();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [viewAdmin, setViewAdmin] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data } = await adminPanelAPI.getAdmins();
      setAdmins(data.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const openCreate = () => {
    setEditAdmin(null);
    setForm({ name: '', email: '', mobile: '', password: '' });
    setModalOpen(true);
  };

  const openEdit = (admin) => {
    setEditAdmin(admin);
    setForm({
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile || '',
      password: '',
    });
    setModalOpen(true);
  };

  const openViewUsers = (admin) => {
    setViewAdmin(admin);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editAdmin) {
        await adminPanelAPI.updateAdmin(editAdmin._id, {
          name: form.name,
          email: form.email,
          mobile: form.mobile,
        });
        toast.success(t('manageAdmins.updated') || 'Admin updated');
      } else {
        await adminPanelAPI.createAdmin({
          name: form.name,
          email: form.email,
          mobile: form.mobile,
          password: form.password,
        });
        toast.success(t('manageAdmins.created'));
      }
      setModalOpen(false);
      fetchAdmins();
    } catch (error) {
      toast.error(getErrorMessage(error));
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
      <button type="button" onClick={() => openEdit(admin)} className="btn-secondary action-chip">{t('update')}</button>
      <button type="button" onClick={() => toggleActive(admin)} className="btn-secondary action-chip">
        {admin.isActive ? t('ui.deactivate') : t('ui.activate')}
      </button>
    </>
  );

  return (
    <div className="page-stack">
      <PageHeader
        title={t('manageAdmins.title')}
        subtitle={t('manageAdmins.hint') || 'Create Admins like Kiran. They create Users under them.'}
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">{t('manageAdmins.createAdmin')}</button>
        }
      />

      <div className="mobile-list">
        {admins.map((admin) => (
          <div key={admin._id} className="mobile-list-item">
            <div className="mobile-list-head">
              <div className="min-w-0">
                <p className="mobile-list-title">{admin.name}</p>
                <p className="mobile-list-meta mt-0.5">{admin.email}</p>
              </div>
              <span className={`badge ${admin.isActive ? 'badge-green' : 'badge-red'}`}>
                {admin.isActive ? t('ui.active') : t('ui.inactive')}
              </span>
            </div>
            <div className="mobile-list-grid">
              <div className="mobile-list-field">
                <label>{t('table.mobile')}</label>
                <span>{admin.mobile || '-'}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('manageAdmins.joinedUsers')}</label>
                <span className="flex items-center gap-2">
                  {admin.joinedUsersCount || 0}
                  <button
                    type="button"
                    onClick={() => openViewUsers(admin)}
                    className="p-1 rounded-lg text-primary-700 hover:bg-primary-50 dark:text-accent-300 dark:hover:bg-gray-700"
                    title={t('manageAdmins.viewUsersList')}
                  >
                    <HiEye className="w-4 h-4" />
                  </button>
                </span>
              </div>
              <div className="mobile-list-field col-span-2">
                <label>{t('table.created')}</label>
                <span>{formatDate(admin.createdAt)}</span>
              </div>
            </div>
            <div className="mobile-list-actions">{adminActions(admin)}</div>
          </div>
        ))}
        {!admins.length && (
          <p className="py-8 text-center text-[12px] text-slate-500">{t('manageAdmins.noAdmins')}</p>
        )}
      </div>

      <div className="card desktop-table">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.name')}</th>
                <th>{t('table.email')}</th>
                <th>{t('table.mobile')}</th>
                <th>{t('manageAdmins.joinedUsers')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.created')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin._id}>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{admin.mobile || '-'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{admin.joinedUsersCount || 0}</span>
                      <button
                        type="button"
                        onClick={() => openViewUsers(admin)}
                        className="p-1.5 rounded-lg text-primary-700 hover:bg-primary-50 dark:text-accent-300 dark:hover:bg-gray-700"
                        title={t('manageAdmins.viewUsersList')}
                      >
                        <HiEye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${admin.isActive ? 'badge-green' : 'badge-red'}`}>
                      {admin.isActive ? t('ui.active') : t('ui.inactive')}
                    </span>
                  </td>
                  <td>{formatDate(admin.createdAt)}</td>
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editAdmin ? (t('manageAdmins.editTitle') || 'Edit Admin') : t('manageAdmins.createTitle')}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input" placeholder={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" type="email" placeholder={t('email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" placeholder={t('mobile')} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          {!editAdmin && (
            <input className="input" type="password" placeholder={t('password')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          )}
          <button type="submit" className="btn-primary w-full">{editAdmin ? t('update') : t('create')}</button>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewAdmin}
        onClose={() => setViewAdmin(null)}
        title={viewAdmin ? `${t('manageAdmins.joinedUsersList')} — ${viewAdmin.name}` : ''}
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
                        <p className="mobile-list-title">{user.name}</p>
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
                        <td className="font-medium">{user.name}</td>
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
