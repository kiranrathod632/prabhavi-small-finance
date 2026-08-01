import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiOutlinePhone, HiOutlineKey, HiOutlineShieldCheck } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { otpAPI } from '../../services';
import { registerMobileUser } from '../../services/authService';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

const Register = () => {
  const { establishSession } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedMobile, setVerifiedMobile] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const mobile = watch('mobile');

  const handleSendOtp = async () => {
    const value = (mobile || '').trim();
    if (!/^[6-9]\d{9}$/.test(value)) {
      toast.error(t('validMobile'));
      return;
    }

    setOtpSending(true);
    try {
      const response = await otpAPI.send({ mobile: value, purpose: 'registration' });
      const devOtp = response?.data?.data?.otp;
      setOtpSent(true);
      setVerifiedMobile(value);
      if (devOtp) {
        toast.success(`${t('otpSent')} — OTP: ${devOtp}`, { duration: 12000 });
      } else {
        toast.success(t('otpSent'));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setOtpSending(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const session = await registerMobileUser({
        mobile: data.mobile.trim(),
        otp: data.otp.trim(),
      });
      establishSession(session);
      toast.success(t('registrationSuccess'));
      navigate('/complete-profile', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="auth-header">
        <p className="auth-eyebrow">{t('createAccount')}</p>
        {/* <h2 className="auth-title">{t('register')}</h2> */}
        <p className="auth-subtitle mt-1.5 sm:mt-3">
          {/* {t('userRegister.mobileFirstSubtitle')} */}
        </p>
      </div>

      <div className="auth-steps">
        <span className={`auth-step-pill ${!otpSent ? 'auth-step-pill-active' : 'auth-step-pill-done'}`}>
          <span className="auth-step-num">{otpSent ? '✓' : '1'}</span>
          {t('mobile')}
        </span>
        <span className="w-5 sm:w-8 h-px bg-white/10" />
        <span className={`auth-step-pill ${otpSent ? 'auth-step-pill-active' : ''}`}>
          <span className="auth-step-num">2</span>
          {t('otp')}
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-5">
        <div className="auth-field">
          <label className="auth-label flex items-center gap-1.5">
            <HiOutlinePhone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400 shrink-0" />
            {t('mobile')}
          </label>
          <input
            type="tel"
            className="auth-input"
            placeholder="9876543210"
            autoComplete="tel"
            inputMode="numeric"
            maxLength={10}
            {...register('mobile', {
              required: t('required'),
              pattern: {
                value: /^[6-9]\d{9}$/,
                message: t('validMobile'),
              },
            })}
          />
          {errors.mobile && <p className="auth-error">{errors.mobile.message}</p>}

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={otpSending || !mobile}
            className="auth-btn-ghost mt-2.5 sm:mt-3"
          >
            {otpSending ? <LoadingSpinner size="sm" /> : t('sendOtp')}
          </button>

          {otpSent ? (
            <p className="auth-hint mt-2 text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[9px]">✓</span>
              {t('otpSent')} — {verifiedMobile}
            </p>
          ) : (
            <p className="auth-hint mt-2">{t('userRegister.mobileOtpHint')}</p>
          )}
        </div>

        <div className="auth-divider" />

        <div className="auth-field">
          <label className="auth-label flex items-center gap-1.5">
            <HiOutlineKey className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400 shrink-0" />
            {t('verifyOtp')}
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="otp-input"
            placeholder="000000"
            disabled={!otpSent}
            autoComplete="one-time-code"
            {...register('otp', {
              required: t('required'),
              minLength: { value: 4, message: t('enterOtp') },
            })}
          />
          {errors.otp && <p className="auth-error">{errors.otp.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || !otpSent}
          className="auth-btn-primary group"
        >
          {loading ? <LoadingSpinner size="sm" /> : (
            <span className="flex items-center justify-center gap-1.5">
              {t('userRegister.continueToProfile')}
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          )}
        </button>

        <p className="text-center text-[11px] sm:text-sm text-slate-400 pt-1 pb-0.5">
          {t('haveAccount')}{' '}
          <Link to="/user/login" className="link-accent font-bold">{t('signIn')}</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
