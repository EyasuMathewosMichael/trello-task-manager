import LoginForm from '../components/Auth/LoginForm.jsx';

const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-secondary)',
  padding: '1rem',
};

const cardStyle = {
  background: 'var(--card-bg)',
  borderRadius: '8px',
  boxShadow: 'var(--shadow)',
  padding: '2rem',
  width: '100%',
  maxWidth: '440px',
};

function LoginPage() {
  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <LoginForm />
      </div>
    </main>
  );
}

export default LoginPage;
