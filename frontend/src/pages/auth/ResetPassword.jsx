import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authAPI } from '../../services';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

const ResetPassword = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.resetPassword(token, data.password);
      toast.success(t('ui.passwordResetSuccess'));
      navigate('/login');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">{t('ui.resetPassword')}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">{t('newPassword')}</label>
            <input type="password" className="input" placeholder="••••••••"
              {...register('password', {
                required: t('required'),
                minLength: { value: 6, message: t('passwordMin') },
                pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: t('passwordMin') },
              })} />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">{t('confirmPassword')}</label>
            <input type="password" className="input" placeholder="••••••••"
              {...register('confirmPassword', {
                validate: (val) => val === watch('password') || t('ui.passwordsMismatch'),
              })} />
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <LoadingSpinner size="sm" /> : t('ui.resetPassword')}
          </button>
        </form>
        <p className="text-center mt-4 text-sm">
          <Link to="/login" className="text-primary-600 hover:underline">{t('ui.backToLogin')}</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
