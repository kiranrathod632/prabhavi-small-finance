import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import adminPanelAPI from '../../services/adminPanelAPI';
import api from '../../services/api';
import { ROLES } from '../../utils/roles';
import { formatCurrency, formatDate, getErrorMessage, downloadBlob } from '../../utils/helpers';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiPlus, HiPencil, HiTrash, HiDownload, HiEye } from 'react-icons/hi';

const AdminUsers = () => {
  const { t } = useTranslation();
  const { dashboardPath, role, user: authUser } = useAuth();
  const navigate = useNavigate();
  const base = dashboardPath?.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminPanelAPI.getUsers({ page, limit: 10, search, includeAdmin: true });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setUsers(list);
      setMeta(res.data?.meta || null);
    } catch {
      toast.error(t('adminUsers.loadFailed'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      if (isSuperAdmin) {
        const { data } = await adminPanelAPI.getAdmins({ limit: 100, status: 'active' });
        setAdmins(data.data || []);
      } else {
        const { data } = await api.get('/auth/admins');
        setAdmins(data.data || []);
      }
    } catch {
      /* admins list optional for display */
    }
  };

  useEffect(() => { fetchUsers(); }, [page, search]);
  useEffect(() => { fetchAdmins(); }, [role, authUser?._id]);

  const openCreate = () => {
    setEditUser(null);
    reset({
      name: '',
      email: '',
      mobile: '',
      password: '',
      role: 'user',
      adminId: '',
    });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    reset({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editUser) {
        const { role: _role, password: _pw, adminId: _aid, ...rest } = data;
        await adminPanelAPI.updateUser(editUser._id, rest);
        toast.success(t('adminUsers.updated'));
      } else {
        const payload = {
          name: data.name,
          email: data.email,
          password: data.password,
          role: 'user',
        };
        if (data.mobile) payload.mobile = data.mobile;
        if (data.adminId) payload.adminId = data.adminId;
        await adminPanelAPI.createUser(payload);
        toast.success(t('adminUsers.created'));
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    try {
      await adminPanelAPI.deleteUser(deleteUser._id);
      toast.success(t('adminUsers.deleted'));
      setDeleteUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleExport = async () => {
    try {
      const res = await adminPanelAPI.exportUsers();
      downloadBlob(res.data, 'users.xlsx');
    } catch {
      toast.error(t('ui.exportFailed'));
    }
  };

  if (loading && !users.length) return <PageLoader />;

  const statusLabel = (user) =>
    user.isSuspended ? (
      <span className="text-red-600 dark:text-red-400 font-medium">{t('ui.suspended')}</span>
    ) : user.isActive ? (
      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t('ui.active')}</span>
    ) : (
      <span className="text-slate-500 font-medium">{t('ui.inactive')}</span>
    );

  const roleLabel = (user) =>
    user.role === 'admin' ? t('ui.admin') : user.role === 'user' ? t('ui.user') : user.role;

  const mobileOf = (user) => user.mobile_number || user.mobile || '-';

  const userActions = (user) => (
    <>
      <button
        type="button"
        onClick={() => navigate(`${base}/users/${user._id}`)}
        className="icon-btn-view"
        title={t('view')}
      >
        <HiEye className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => openEdit(user)} className="icon-btn-edit" title={t('edit')}>
        <HiPencil className="w-4 h-4" />
      </button>
      {user.role !== 'admin' && (
        <button type="button" onClick={() => setDeleteUser(user)} className="icon-btn-danger" title={t('delete')}>
          <HiTrash className="w-4 h-4" />
        </button>
      )}
    </>
  );

  return (
    <div className="page-stack">
      <PageHeader
        title={t('adminUsers.title')}
        subtitle={t('adminUsers.joinedHint')}
        actions={
          <>
            <button type="button" onClick={handleExport} className="btn-secondary">
              <HiDownload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> {t('ui.export')}
            </button>
            <button type="button" onClick={openCreate} className="btn-primary">
              <HiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> {t('adminUsers.addUser')}
            </button>
          </>
        }
      />

      <div className="filter-bar">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={t('adminUsers.searchPlaceholder')}
          className="w-full sm:w-80"
        />
      </div>

      {/* Mobile: single-line rows (shared list scroll) */}
      <div className="mobile-list">
        {users.map((user) => (
          <div key={user._id} className="mobile-list-item">
            <div className="mobile-list-grid">
              <div className="mobile-list-field">
                <label>{t('firstName')}</label>
                <button
                  type="button"
                  onClick={() => navigate(`${base}/users/${user._id}`)}
                  className="link-accent text-left font-medium"
                >
                  {user.firstName || '-'}
                </button>
              </div>
              <div className="mobile-list-field">
                <label>{t('middleName')}</label>
                <span>{user.middleName || '-'}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('lastName')}</label>
                <span>{user.lastName || '-'}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('mobile')}</label>
                <span>{mobileOf(user)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('table.role')}</label>
                <span>{roleLabel(user)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('table.status')}</label>
                <span>{statusLabel(user)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('adminUsers.selectAdmin')}</label>
                <span>{user.adminId?.name || '-'}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('table.wallet')}</label>
                <span>{formatCurrency(user.walletBalance)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('ui.joined')}</label>
                <span>{formatDate(user.createdAt)}</span>
              </div>
            </div>
            <div className="mobile-list-actions">{userActions(user)}</div>
          </div>
        ))}
        {!users.length && (
          <p className="py-6 text-center text-[11px] text-slate-500">{t('adminUsers.noJoinedUsers')}</p>
        )}
      </div>

      {/* Desktop table */}
      <div className="card desktop-table">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('firstName')}</th>
                <th>{t('middleName')}</th>
                <th>{t('lastName')}</th>
                <th>{t('mobile')}</th>
                <th>{t('table.role')}</th>
                <th>{t('adminUsers.selectAdmin')}</th>
                <th className="text-right">{t('table.wallet')}</th>
                <th>{t('table.status')}</th>
                <th>{t('ui.joined')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="font-medium">
                    <button
                      type="button"
                      onClick={() => navigate(`${base}/users/${user._id}`)}
                      className="link-accent text-left"
                    >
                      {user.firstName || '-'}
                    </button>
                  </td>
                  <td>{user.middleName || '-'}</td>
                  <td>{user.lastName || '-'}</td>
                  <td>{mobileOf(user)}</td>
                  <td>{roleLabel(user)}</td>
                  <td>{user.adminId?.name || '-'}</td>
                  <td className="text-right">{formatCurrency(user.walletBalance)}</td>
                  <td>{statusLabel(user)}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-0.5">{userActions(user)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!users.length && (
          <p className="p-4 text-center text-slate-500 text-sm">{t('adminUsers.noJoinedUsers')}</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? t('adminUsers.editUser') : t('adminUsers.addUser')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">{t('name')}</label>
            <input className="input" {...register('name', { required: t('required') })} />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">{t('email')}</label>
            <input type="email" className="input" {...register('email', { required: t('required') })} disabled={!!editUser} />
          </div>
          {!editUser && (
            <div>
              <label className="label">{t('mobile')}</label>
              <input
                type="tel"
                className="input"
                placeholder="9876543210"
                {...register('mobile', {
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: t('userRegister.invalidMobile') || 'Enter a valid 10-digit mobile number',
                  },
                })}
              />
              {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile.message}</p>}
            </div>
          )}
          {!editUser && (
            <div>
              <label className="label">{t('password')}</label>
              <input type="password" className="input" {...register('password', { required: t('required'), minLength: 6 })} />
            </div>
          )}
          {!editUser && (
            <div>
              <label className="label">{t('adminUsers.selectAdmin')}</label>
              <select
                className="input"
                {...register('adminId', {
                  required: !isSuperAdmin ? t('adminUsers.selectAdminRequired') : false,
                })}
              >
                <option value="">{t('adminUsers.selectAdminPlaceholder')}</option>
                {admins.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}{a.email ? ` (${a.email})` : ''}
                  </option>
                ))}
              </select>
              {errors.adminId && <p className="text-red-500 text-sm mt-1">{errors.adminId.message}</p>}
              <p className="text-xs text-gray-500 mt-1">{t('adminUsers.underAdminHint')}</p>
            </div>
          )}
          <input type="hidden" {...register('role')} value="user" />
          {editUser && (
            <>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('isActive')} /> {t('ui.active')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('isSuspended')} /> {t('ui.suspended')}
              </label>
            </>
          )}
          <button type="submit" className="btn-primary w-full">{editUser ? t('update') : t('create')}</button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
        title={t('adminUsers.deleteTitle')}
        message={t('adminUsers.deleteConfirm', { name: deleteUser?.name })}
        confirmText={t('delete')}
        danger
      />
    </div>
  );
};

export default AdminUsers;
