import RegisterForm from '../components/Auth/RegisterForm.jsx';

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

function RegisterPage() {
  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <RegisterForm />
      </div>
    </main>
  );
}

export default RegisterPage;
