import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiEye } from 'react-icons/hi';
import adminPanelAPI from '../../services/adminPanelAPI';
import { getErrorMessage, formatDate, formatCurrency } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('manageAdmins.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('manageAdmins.hint') || 'Create Admins like Kiran. They create Users under them.'}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">{t('manageAdmins.createAdmin')}</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-left">
              <th className="p-3">{t('table.name')}</th>
              <th className="p-3">{t('table.email')}</th>
              <th className="p-3">{t('table.mobile')}</th>
              <th className="p-3">{t('manageAdmins.joinedUsers')}</th>
              <th className="p-3">{t('table.status')}</th>
              <th className="p-3">{t('table.created')}</th>
              <th className="p-3">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin._id} className="border-b dark:border-gray-700">
                <td className="p-3">{admin.name}</td>
                <td className="p-3">{admin.email}</td>
                <td className="p-3">{admin.mobile || '-'}</td>
                <td className="p-3">
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
                <td className="p-3">
                  <span className={`badge ${admin.isActive ? 'badge-green' : 'badge-red'}`}>
                    {admin.isActive ? t('ui.active') : t('ui.inactive')}
                  </span>
                </td>
                <td className="p-3">{formatDate(admin.createdAt)}</td>
                <td className="p-3 space-x-2">
                  <button onClick={() => openEdit(admin)} className="btn-secondary text-xs">{t('update')}</button>
                  <button onClick={() => toggleActive(admin)} className="btn-secondary text-xs">
                    {admin.isActive ? t('ui.deactivate') : t('ui.activate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!admins.length && <p className="p-4 text-gray-500 text-center">{t('manageAdmins.noAdmins')}</p>}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 text-left">
                  <th className="py-2 pr-3">{t('table.name')}</th>
                  <th className="py-2 pr-3">{t('table.mobile')}</th>
                  <th className="py-2 pr-3">{t('manageAdmins.totalEMIs')}</th>
                  <th className="py-2 pr-3">{t('manageAdmins.pendingEMIs')}</th>
                  <th className="py-2 pr-3 text-right">{t('manageAdmins.totalEmiAmount')}</th>
                  <th className="py-2 pr-3 text-right">{t('manageAdmins.pendingEmiAmount')}</th>
                  <th className="py-2 pr-3">{t('manageAdmins.totalLoans')}</th>
                  <th className="py-2 pr-3 text-right">{t('manageAdmins.loanAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {joinedUsers.map((user) => {
                  const summary = user.summary || {};
                  return (
                    <tr key={user._id} className="border-b dark:border-gray-700/50">
                      <td className="py-2 pr-3 font-medium">{user.name}</td>
                      <td className="py-2 pr-3">{user.mobile_number || '-'}</td>
                      <td className="py-2 pr-3">{summary.totalEMIs || 0}</td>
                      <td className="py-2 pr-3">{summary.pendingEMIs || 0}</td>
                      <td className="py-2 pr-3 text-right">{formatCurrency(summary.totalEmiAmount || 0)}</td>
                      <td className="py-2 pr-3 text-right">{formatCurrency(summary.pendingEmiAmount || 0)}</td>
                      <td className="py-2 pr-3">{summary.totalLoans || 0}</td>
                      <td className="py-2 pr-3 text-right">{formatCurrency(summary.totalLoanAmount || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">{t('manageAdmins.noJoinedUsers')}</p>
        )}
      </Modal>
    </div>
  );
};

export default ManageAdmins;
