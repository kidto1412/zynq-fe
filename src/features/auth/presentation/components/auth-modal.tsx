import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema, LoginInput, RegisterInput } from '../forms/auth.schema';
import { useAuthStore } from '../stores/useAuthStore';
import { Dialog, Input } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Lock, Mail, User, ShieldCheck, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, authTab, login, register: registerUser, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<'login' | 'register'>('login');
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setActiveTab(authTab);
    setServerError(null);
  }, [authTab, isAuthModalOpen]);

  // Login Form
  const {
    register: loginField,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLogin,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // Register Form
  const {
    register: registerField,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    reset: resetRegister,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onLogin = async (data: LoginInput) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      resetLogin();
    } catch (err: any) {
      setServerError(err.message || 'Login gagal');
    }
  };

  const onRegister = async (data: RegisterInput) => {
    setServerError(null);
    try {
      await registerUser(data.email, data.password, data.name);
      resetRegister();
    } catch (err: any) {
      setServerError(err.message || 'Pendaftaran gagal');
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={setAuthModalOpen}>
      <div className="flex flex-col space-y-4">
        {/* Header Icon & Title */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center text-primary">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-headline text-xl font-bold text-on-surface">
            {activeTab === 'login' ? 'Masuk ke UniBeam' : 'Daftar Akun Baru'}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {activeTab === 'login'
              ? 'Kelola perangkat terpercaya dan akses encrypted vault history'
              : 'Aktifkan persistent sync lintas ekosistem tanpa batas'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface-container-lowest p-1 rounded-xl border border-white/[0.05]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setServerError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
              activeTab === 'login'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setServerError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
              activeTab === 'register'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Daftar (Register)
          </button>
        </div>

        {serverError && (
          <div className="bg-error-container/20 border border-error/30 p-2.5 rounded-xl flex items-center gap-2 text-xs text-error font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-mono text-on-surface-variant">Email</label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  {...loginField('email')}
                  className="pl-9"
                />
                <Mail className="w-4 h-4 text-on-surface-variant absolute left-3 top-3.5" />
              </div>
              {loginErrors.email && (
                <span className="text-[11px] text-error font-mono">{loginErrors.email.message}</span>
              )}
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-mono text-on-surface-variant">Password</label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  {...loginField('password')}
                  className="pl-9"
                />
                <Lock className="w-4 h-4 text-on-surface-variant absolute left-3 top-3.5" />
              </div>
              {loginErrors.password && (
                <span className="text-[11px] text-error font-mono">{loginErrors.password.message}</span>
              )}
            </div>

            <Button type="submit" variant="primary" disabled={isLoading} className="w-full h-11 text-sm font-bold mt-2">
              {isLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}
            </Button>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-mono text-on-surface-variant">Nama Lengkap (Opsional)</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Nama atau alias Anda"
                  {...registerField('name')}
                  className="pl-9"
                />
                <User className="w-4 h-4 text-on-surface-variant absolute left-3 top-3.5" />
              </div>
              {registerErrors.name && (
                <span className="text-[11px] text-error font-mono">{registerErrors.name.message}</span>
              )}
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-mono text-on-surface-variant">Email</label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  {...registerField('email')}
                  className="pl-9"
                />
                <Mail className="w-4 h-4 text-on-surface-variant absolute left-3 top-3.5" />
              </div>
              {registerErrors.email && (
                <span className="text-[11px] text-error font-mono">{registerErrors.email.message}</span>
              )}
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-mono text-on-surface-variant">Password</label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  {...registerField('password')}
                  className="pl-9"
                />
                <Lock className="w-4 h-4 text-on-surface-variant absolute left-3 top-3.5" />
              </div>
              {registerErrors.password && (
                <span className="text-[11px] text-error font-mono">{registerErrors.password.message}</span>
              )}
            </div>

            <Button type="submit" variant="secondary" disabled={isLoading} className="w-full h-11 text-sm font-bold mt-2">
              {isLoading ? 'Mendaftarkan Akun...' : 'Daftar Akun'}
            </Button>
          </form>
        )}

        {/* Security Footer */}
        <div className="pt-2 border-t border-white/[0.04] flex items-center justify-center gap-1.5 text-[11px] font-mono text-on-surface-variant">
          <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
          <span>Enkripsi kata sandi Scrypt & JWT Token 256-bit</span>
        </div>
      </div>
    </Dialog>
  );
};
