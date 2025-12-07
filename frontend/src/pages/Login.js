import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Typography, Box, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import PixelWindow from '../components/PixelWindow';
import PixelButton from '../components/PixelButton';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        toast.success('Вход выполнен успешно!');
        navigate('/dashboard');
      } else {
        setError(result.error || 'Ошибка входа');
        toast.error(result.error || 'Ошибка входа');
      }
    } catch (err) {
      setError('Произошла ошибка при входе');
      toast.error('Произошла ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 480 }}>
          <PixelWindow title="IntegrityOS LOGIN">
            <Typography
              component="h1"
              variant="h4"
              align="center"
              gutterBottom
              sx={{
                fontWeight: 800,
                letterSpacing: '0.06em',
                fontSize: 24,
              }}
            >
              IntegrityOS
            </Typography>
            <Typography
              variant="subtitle2"
              align="center"
              sx={{ mb: 2, opacity: 0.9 }}
            >
              Платформа мониторинга трубопроводов
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Имя пользователя"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Пароль"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PixelButton
                type="submit"
                fullWidth
                sx={{ mt: 3, mb: 2, justifyContent: 'center' }}
                disabled={loading}
              >
                {loading ? 'Вход...' : 'Войти'}
              </PixelButton>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                По умолчанию: admin / admin123
              </Typography>
            </Box>
          </PixelWindow>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;

