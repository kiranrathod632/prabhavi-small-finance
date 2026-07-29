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

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('adminUsers.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('adminUsers.joinedHint')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary"><HiDownload className="w-4 h-4 mr-1" /> {t('ui.export')}</button>
          <button onClick={openCreate} className="btn-primary"><HiPlus className="w-4 h-4 mr-1" /> {t('adminUsers.addUser')}</button>
        </div>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('adminUsers.searchPlaceholder')} className="mb-4 sm:w-80" />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-2">{t('table.name')}</th>
              <th className="text-left py-3 px-2">{t('table.email')}</th>
              <th className="text-left py-3 px-2">{t('table.role')}</th>
              <th className="text-left py-3 px-2">{t('adminUsers.selectAdmin')}</th>
              <th className="text-right py-3 px-2">{t('table.wallet')}</th>
              <th className="text-left py-3 px-2">{t('table.status')}</th>
              <th className="text-left py-3 px-2">{t('ui.joined')}</th>
              <th className="text-right py-3 px-2">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-b dark:border-gray-700/50">
                <td className="py-3 px-2 font-medium">
                  <button
                    type="button"
                    onClick={() => navigate(`${base}/users/${user._id}`)}
                    className="text-primary-700 hover:underline text-left"
                  >
                    {user.name}
                  </button>
                </td>
                <td className="py-3 px-2">{user.email}</td>
                <td className="py-3 px-2 capitalize">{user.role === 'admin' ? t('ui.admin') : user.role === 'user' ? t('ui.user') : user.role}</td>
                <td className="py-3 px-2">{user.adminId?.name || '-'}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(user.walletBalance)}</td>
                <td className="py-3 px-2">
                  {user.isSuspended ? <span className="text-red-500">{t('ui.suspended')}</span> :
                    user.isActive ? <span className="text-green-500">{t('ui.active')}</span> : <span className="text-gray-500">{t('ui.inactive')}</span>}
                </td>
                <td className="py-3 px-2">{formatDate(user.createdAt)}</td>
                <td className="py-3 px-2 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => navigate(`${base}/users/${user._id}`)}
                    className="text-primary-600"
                    title={t('view')}
                  >
                    <HiEye className="w-4 h-4 inline" />
                  </button>
                  <button onClick={() => openEdit(user)} className="text-primary-600"><HiPencil className="w-4 h-4 inline" /></button>
                  {user.role !== 'admin' && (
                    <button onClick={() => setDeleteUser(user)} className="text-red-500"><HiTrash className="w-4 h-4 inline" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && (
          <p className="p-4 text-center text-gray-500">{t('adminUsers.noJoinedUsers')}</p>
        )}
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

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
