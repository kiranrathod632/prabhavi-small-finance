import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authAPI } from '../../services';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

const isMobileCredential = (value) => /^[6-9]\d{9}$/.test(value?.trim() || '');

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('credential'); // credential | otp | email-sent
  const [mobile, setMobile] = useState('');

  const credentialForm = useForm();
  const otpForm = useForm();

  const onCredentialSubmit = async (data) => {
    const credential = data.credential.trim();
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(credential);
      const method = res?.data?.data?.method || (isMobileCredential(credential) ? 'otp' : 'email');
      const sentMobile = res?.data?.data?.mobile || (isMobileCredential(credential) ? credential : '');

      if (method === 'otp') {
        setMobile(sentMobile);
        setStep('otp');
        toast.success(t('ui.otpSent'));
      } else {
        setStep('email-sent');
        toast.success(t('ui.resetSent'));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.resetPasswordWithOtp({
        mobile,
        otp: data.otp.trim(),
        password: data.password,
      });
      toast.success(t('ui.passwordResetSuccess'));
      navigate('/user/login');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    if (!mobile) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword(mobile);
      toast.success(t('ui.otpSent'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email-sent') {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">{t('ui.checkEmail')}</h2>
        <p className="text-gray-500 mb-6">{t('ui.resetSent')}</p>
        <Link to="/user/login" className="btn-primary">{t('ui.backToLogin')}</Link>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-2 text-center">{t('ui.enterOtp')}</h2>
        <p className="text-gray-500 text-center mb-6 text-sm">
          {t('ui.otpSentTo')} {mobile}
        </p>
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
          <div>
            <label className="label">{t('otp')}</label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="6-digit OTP"
              autoComplete="one-time-code"
              {...otpForm.register('otp', {
                required: t('required'),
                minLength: { value: 4, message: t('ui.invalidOtp') },
              })}
            />
            {otpForm.formState.errors.otp && (
              <p className="text-red-500 text-sm mt-1">{otpForm.formState.errors.otp.message}</p>
            )}
          </div>
          <div>
            <label className="label">{t('newPassword')}</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              {...otpForm.register('password', {
                required: t('required'),
                minLength: { value: 6, message: t('passwordMin') },
                pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: t('passwordMin') },
              })}
            />
            {otpForm.formState.errors.password && (
              <p className="text-red-500 text-sm mt-1">{otpForm.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="label">{t('confirmPassword')}</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              {...otpForm.register('confirmPassword', {
                validate: (val) => val === otpForm.watch('password') || t('ui.passwordsMismatch'),
              })}
            />
            {otpForm.formState.errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{otpForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <LoadingSpinner size="sm" /> : t('ui.resetPassword')}
          </button>
        </form>
        <p className="text-center mt-4 text-sm">
          <button type="button" onClick={onResendOtp} disabled={loading} className="text-primary-600 hover:underline">
            {t('ui.resendOtp')}
          </button>
        </p>
        <p className="text-center mt-2 text-sm">
          <Link to="/user/login" className="text-primary-600 hover:underline">{t('ui.backToLogin')}</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-center">{t('ui.forgotTitle')}</h2>
      <p className="text-gray-500 text-center mb-6 text-sm">{t('ui.forgotHint')}</p>
      <form onSubmit={credentialForm.handleSubmit(onCredentialSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('emailOrMobile')}</label>
          <input
            type="text"
            className="input"
            placeholder="you@example.com or 9876543210"
            autoComplete="username"
            {...credentialForm.register('credential', {
              required: t('required'),
              validate: (value) => {
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                const isMobile = /^[6-9]\d{9}$/.test(value);
                if (!isEmail && !isMobile) {
                  return t('validEmailOrMobile');
                }
                return true;
              },
            })}
          />
          {credentialForm.formState.errors.credential && (
            <p className="text-red-500 text-sm mt-1">{credentialForm.formState.errors.credential.message}</p>
          )}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <LoadingSpinner size="sm" /> : t('ui.sendOtpOrLink')}
        </button>
      </form>
      <p className="text-center mt-4 text-sm">
        <Link to="/user/login" className="text-primary-600 hover:underline">{t('ui.backToLogin')}</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
