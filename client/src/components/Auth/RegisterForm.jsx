import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%',
    maxWidth: '400px',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  input: {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  errorText: {
    fontSize: '0.8rem',
    color: '#e53e3e',
  },
  serverError: {
    padding: '0.75rem',
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '4px',
    color: '#c53030',
    fontSize: '0.875rem',
  },
  submitButton: {
    padding: '0.625rem 1rem',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  linkText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
  },
};

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function RegisterForm() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const newErrors = {};
    if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (displayName.trim().length < 1) {
      newErrors.displayName = 'Display name is required.';
    }
    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await register(email, displayName.trim(), password);
      navigate('/boards');
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        'Registration failed. Please try again.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={styles.container}
      noValidate
      aria-label="Register form"
    >
      <h1 style={styles.heading}>Create account</h1>

      {serverError && (
        <div role="alert" style={styles.serverError}>
          {serverError}
        </div>
      )}

      <div style={styles.fieldGroup}>
        <label htmlFor="register-email" style={styles.label}>
          Email
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={errors.email ? 'register-email-error' : undefined}
          aria-invalid={!!errors.email}
          style={{
            ...styles.input,
            ...(errors.email ? styles.inputError : {}),
          }}
        />
        {errors.email && (
          <span id="register-email-error" role="alert" style={styles.errorText}>
            {errors.email}
          </span>
        )}
      </div>

      <div style={styles.fieldGroup}>
        <label htmlFor="register-display-name" style={styles.label}>
          Display name
        </label>
        <input
          id="register-display-name"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          aria-describedby={
            errors.displayName ? 'register-display-name-error' : undefined
          }
          aria-invalid={!!errors.displayName}
          style={{
            ...styles.input,
            ...(errors.displayName ? styles.inputError : {}),
          }}
        />
        {errors.displayName && (
          <span
            id="register-display-name-error"
            role="alert"
            style={styles.errorText}
          >
            {errors.displayName}
          </span>
        )}
      </div>

      <div style={styles.fieldGroup}>
        <label htmlFor="register-password" style={styles.label}>
          Password
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={
            errors.password ? 'register-password-error' : undefined
          }
          aria-invalid={!!errors.password}
          style={{
            ...styles.input,
            ...(errors.password ? styles.inputError : {}),
          }}
        />
        {errors.password && (
          <span
            id="register-password-error"
            role="alert"
            style={styles.errorText}
          >
            {errors.password}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.submitButton,
          ...(loading ? styles.submitButtonDisabled : {}),
        }}
        aria-busy={loading}
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <p style={styles.linkText}>
        Already have an account?{' '}
        <Link to="/login" style={styles.link}>
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default RegisterForm;
