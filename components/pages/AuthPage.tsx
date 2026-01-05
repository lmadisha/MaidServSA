import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { IconSparkles, IconEye, IconEyeOff } from '../Icons';
import FormSelect from './FormSelect';
import { INPUT_CLASS, LABEL_CLASS } from './formStyles';

type Props = {
  onLogin: (email: string, password: string) => void | Promise<void>;
  onSignUp: (userData: Partial<User>, password: string) => void | Promise<void>;
};

const DEMO_PASSWORD = 'Password123!';

const AuthPage: React.FC<Props> = ({ onLogin, onSignUp }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup-only
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // showPasswords
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetErrors = () => setError(null);

  const safeAwait = async (fn: () => void | Promise<void>) => {
    try {
      setLoading(true);
      resetErrors();
      await Promise.resolve(fn());
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError('Please enter email + password.');
      return;
    }

    if (mode === 'signin') {
      await safeAwait(() => onLogin(email.trim(), password));
      return;
    }

    // signup validations
    const fullName = `${firstName} ${surname}`.trim();
    if (!fullName) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D9488&color=fff`;

    const userData: Partial<User> = {
      name: fullName,
      firstName: firstName.trim(),
      surname: surname.trim(),
      email: email.trim(),
      role,
      avatar,
      rating: 0,
      ratingCount: 0,
    };

    await safeAwait(() => onSignUp(userData, password));
  };

  const demoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    await safeAwait(() => onLogin(demoEmail, DEMO_PASSWORD));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 text-teal-600 flex justify-center">
            <IconSparkles className="w-12 h-12" />
          </div>

          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {mode === 'signin' ? 'Sign in' : 'Create your account'}
          </h2>

          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                mode === 'signin'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                mode === 'signup'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Sign up
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-100">
              {error}
            </div>
          )}
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>First name</label>
                  <input
                    className={INPUT_CLASS}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Surname</label>
                  <input
                    className={INPUT_CLASS}
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    required
                  />
                </div>
              </div>

              <FormSelect
                label="Account type"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={[
                  { value: UserRole.CLIENT, label: 'Client' },
                  { value: UserRole.MAID, label: 'Maid / Cleaner' },
                ]}
              />
            </>
          )}

          <div>
            <label className={LABEL_CLASS}>Email</label>
            <input
              type="email"
              autoComplete="email"
              className={INPUT_CLASS}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Password</label>
            <div className="relative">
              {' '}
              {/* Added relative container */}
              <input
                type={showPassword ? 'text' : 'password'} // Dynamic type
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className={`${INPUT_CLASS} pr-10`} // Added right padding for icon
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-teal-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className={LABEL_CLASS}>Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`${INPUT_CLASS} pr-10`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-teal-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60"
          >
            {loading ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Demo accounts</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => demoLogin('sarah@example.com')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => demoLogin('martha@example.com')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Maid
            </button>
            <button
              type="button"
              onClick={() => demoLogin('admin@maidservsa.com')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Admin
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-500 text-center">
            Demo password: <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
