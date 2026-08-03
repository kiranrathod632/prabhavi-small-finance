import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import adminPanelAPI from '../../services/adminPanelAPI';
import api from '../../services/api';
import { ROLES } from '../../utils/roles';
import { formatCurrency, formatDateTime, getErrorMessage, downloadBlob, getFullName } from '../../utils/helpers';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiPlus, HiPencil, HiTrash, HiDownload, HiEye, HiOutlineEye, HiOutlineEyeOff, HiCheck } from 'react-icons/hi';

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
  const [showPassword, setShowPassword] = useState(false);
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
    setShowPassword(false);
    reset({
      firstName: '',
      middleName: '',
      lastName: '',
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
    setShowPassword(false);
    reset({
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
      name: user.name,
      email: user.email || '',
      role: user.role,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowPassword(false);
  };

  const onSubmit = async (data) => {
    try {
      if (editUser) {
        const { role: _role, password: _pw, adminId: _aid, mobile: _m, ...rest } = data;
        await adminPanelAPI.updateUser(editUser._id, {
          firstName: rest.firstName?.trim(),
          middleName: rest.middleName?.trim() || '',
          lastName: rest.lastName?.trim(),
          email: rest.email || undefined,
          isActive: rest.isActive,
          isSuspended: rest.isSuspended,
        });
        toast.success(t('adminUsers.updated'));
      } else {
        const payload = {
          firstName: data.firstName.trim(),
          middleName: data.middleName?.trim() || '',
          lastName: data.lastName.trim(),
          name: [data.firstName, data.middleName, data.lastName]
            .map((p) => (p || '').trim())
            .filter(Boolean)
            .join(' '),
          mobile: data.mobile,
          password: data.password,
          role: 'user',
        };
        if (data.email?.trim()) payload.email = data.email.trim();
        if (data.adminId) payload.adminId = data.adminId;
        await adminPanelAPI.createUser(payload);
        toast.success(t('adminUsers.created'));
      }
      setShowModal(false);
      setShowPassword(false);
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
      <span className="badge-red inline-flex items-center gap-1">
        {t('ui.suspended')}
      </span>
    ) : user.isActive ? (
      <span className="badge-green inline-flex items-center gap-1">
        <HiCheck className="w-3 h-3" />
        {t('ui.active')}
      </span>
    ) : (
      <span className="badge inline-flex items-center gap-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {t('ui.inactive')}
      </span>
    );

  const mobileOf = (user) => user.mobile_number || user.mobile || 'N/A';
  const rowNumber = (index) => ((page || 1) - 1) * 10 + index + 1;

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

      {/* Clean table list (mobile + desktop) — same row format for every user */}
      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.srNo')}</th>
                <th>{t('table.name')}</th>
                <th>{t('mobile')}</th>
                <th>{t('adminUsers.selectAdmin')}</th>
                <th className="text-right">{t('table.wallet')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.createdAt')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user._id}>
                  <td className="text-slate-500">{rowNumber(index)}</td>
                  <td className="font-medium">
                    <button
                      type="button"
                      onClick={() => navigate(`${base}/users/${user._id}`)}
                      className="link-accent text-left"
                    >
                      {getFullName(user) || user.name || 'N/A'}
                    </button>
                  </td>
                  <td>{mobileOf(user)}</td>
                  <td>{user.adminId?.name || 'N/A'}</td>
                  <td className="text-right">{formatCurrency(user.walletBalance)}</td>
                  <td>{statusLabel(user)}</td>
                  <td className="whitespace-nowrap">{formatDateTime(user.createdAt)}</td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1.5">{userActions(user)}</div>
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

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editUser ? t('adminUsers.editUser') : t('adminUsers.addUser')}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="user-form-card space-y-2.5 sm:space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <div>
              <label className="label">{t('firstName')}</label>
              <input className="input" autoComplete="given-name" {...register('firstName', { required: t('required') })} />
              {errors.firstName && <p className="text-red-500 text-[10px] sm:text-sm mt-0.5">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">{t('lastName')}</label>
              <input className="input" autoComplete="family-name" {...register('lastName', { required: t('required') })} />
              {errors.lastName && <p className="text-red-500 text-[10px] sm:text-sm mt-0.5">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">{t('middleName')} <span className="text-slate-400 font-normal">({t('optional')})</span></label>
            <input className="input" autoComplete="additional-name" {...register('middleName')} />
          </div>
          <div>
            <label className="label">{t('email')} <span className="text-slate-400 font-normal">({t('optional')})</span></label>
            <input type="email" className="input" autoComplete="email" {...register('email')} disabled={!!editUser} />
          </div>
          {!editUser && (
            <div>
              <label className="label">{t('mobile')}</label>
              <input
                type="tel"
                inputMode="numeric"
                className="input"
                placeholder="9876543210"
                autoComplete="tel"
                {...register('mobile', {
                  required: t('required'),
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: t('userRegister.invalidMobile') || 'Enter a valid 10-digit mobile number',
                  },
                })}
              />
              {errors.mobile && <p className="text-red-500 text-[10px] sm:text-sm mt-0.5">{errors.mobile.message}</p>}
            </div>
          )}
          {!editUser && (
            <div>
              <label className="label">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register('password', { required: t('required'), minLength: 6 })}
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
              {errors.password && <p className="text-red-500 text-[10px] sm:text-sm mt-0.5">{errors.password.message}</p>}
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
              {errors.adminId && <p className="text-red-500 text-[10px] sm:text-sm mt-0.5">{errors.adminId.message}</p>}
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-snug">{t('adminUsers.underAdminHint')}</p>
            </div>
          )}
          <input type="hidden" {...register('role')} value="user" />
          {editUser && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-0.5">
              <label className="flex items-center gap-2 text-[12px] sm:text-sm">
                <input type="checkbox" {...register('isActive')} /> {t('ui.active')}
              </label>
              <label className="flex items-center gap-2 text-[12px] sm:text-sm">
                <input type="checkbox" {...register('isSuspended')} /> {t('ui.suspended')}
              </label>
            </div>
          )}
          <button type="submit" className="btn-primary w-full mt-1">
            {editUser ? t('update') : t('create')}
          </button>
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
