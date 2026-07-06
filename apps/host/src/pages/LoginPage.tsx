import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Link,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowDropDown as ArrowDropDownIcon
} from '@mui/icons-material';
import { authService, languages } from '@traxeco/shared';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [username, setUsername] = useState(localStorage.getItem('saved_username') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleLangMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleLangMenuClose = (code?: string) => {
    if (code) {
      i18n.changeLanguage(code);
      localStorage.setItem('i18nextLng', code);
    }
    setAnchorEl(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- FIX FOR ANDROID WEBVIEW RESIZE BUG ---
    // Force keyboard/action bar to close and wait before navigating
    // This allows the OS to restore the WebView height natively
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise(resolve => setTimeout(resolve, 150));
    window.dispatchEvent(new Event('resize'));

    const u = username;
    const p = password;

    if (!u.trim() || !p.trim()) {
      setError(t('login.errorEmpty'));
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await authService.login(u.trim(), p.trim());
      localStorage.setItem('saved_username', u.trim());
      navigate('/');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
        setError(t('login.errorInvalid'));
      } else if (err instanceof Error && err.message === 'NO_APP_ACCESS') {
        setError(t('login.errorNoAppAccess', 'You do not have access to this application. Contact your administrator.'));
      } else {
        setError(t('login.errorServer', 'Server error. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const activeLang = languages.find(l => l.code === (i18n.language || 'vi')) || languages[0];

  return (
    <Box sx={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      display: 'flex', 
      backgroundColor: '#fff',
      overflow: 'hidden'
    }}>
      
      {/* Left Panel - Branding (Hidden on mobile) */}
      <Box 
        sx={{ 
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          height: '100%',
          position: 'relative',
          background: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          overflow: 'hidden'
        }}
      >
        {/* Abstract Background Glow */}
        <Box 
          sx={{
            position: 'absolute',
            width: '150%',
            height: '150%',
            background: 'radial-gradient(circle, rgba(59,165,92,0.1) 0%, rgba(0,0,0,0) 60%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }}
        />

        <Box sx={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Real Logo */}
          <Box sx={{ mb: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Company Logo" 
              style={{ 
                maxWidth: '220px', 
                height: 'auto', 
                objectFit: 'contain' 
              }} 
            />
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 500, mb: 1 }}>Leading</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>GARMENT TECHNOLOGIST</Typography>
            <Typography variant="h5" sx={{ fontWeight: 500 }}>in sportswear</Typography>
          </Box>
        </Box>

        {/* Footer */}
        <Typography 
          variant="body2" 
          sx={{ 
            position: 'absolute', 
            bottom: 30, 
            color: 'rgba(255,255,255,0.5)' 
          }}
        >
          Copyright © Trax Group. All rights reserved
        </Typography>
      </Box>

      {/* Right Panel - Login/Language wrapper */}
      <Box 
        sx={{ 
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <Box 
          sx={{ 
            minHeight: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            position: 'relative'
          }}
        >
        {/* Language Switcher */}
        <Box sx={{ position: 'absolute', top: 24, right: 24 }}>
          <Button 
            variant="outlined"
            onClick={handleLangMenuClick}
            endIcon={<ArrowDropDownIcon />}
            sx={{ 
              borderColor: '#e0e0e0', 
              color: '#333',
              borderRadius: '24px',
              px: { xs: 2, sm: 3 },
              py: 0.8,
              '&:hover': {
                borderColor: '#bdbdbd',
                backgroundColor: 'rgba(0,0,0,0.02)'
              }
            }}
          >
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              <img 
                loading="lazy" 
                width="20" 
                src={`${import.meta.env.BASE_URL}flags/${activeLang.country}.png`} 
                srcSet={`${import.meta.env.BASE_URL}flags/${activeLang.country}.png 2x`} 
                alt="" 
                style={{ display: 'block' }}
              />
            </Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{activeLang.label}</Typography>
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => handleLangMenuClose()}
            PaperProps={{
              sx: { mt: 1, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
            }}
          >
            {languages.map((lang) => (
              <MenuItem 
                key={lang.code} 
                selected={i18n.language === lang.code}
                onClick={() => handleLangMenuClose(lang.code)}
                sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center' }}
              >
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', mr: 1.5 }}>
                  <img 
                    loading="lazy" 
                    width="20" 
                    src={`${import.meta.env.BASE_URL}flags/${lang.country}.png`} 
                    srcSet={`${import.meta.env.BASE_URL}flags/${lang.country}.png 2x`} 
                    alt="" 
                    style={{ display: 'block' }}
                  />
                </Box>
                {lang.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>

          <Box 
          sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            px: { xs: 3, sm: 6, md: 8, lg: 12 }, /* Responsive padding */
            maxWidth: { xs: '100%', sm: 450, md: 500, lg: 600 }, /* Scaled width */
            mx: 'auto',
            width: '100%',
            py: { xs: 4, sm: 6, md: 4 }, /* Giảm padding dọc trên mobile để form không bị ép */
          }}
        >
          {/* Mobile Logo (Chỉ hiện trên điện thoại) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 4, mt: { xs: 4, sm: 0 } }}>
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Company Logo" 
              style={{ 
                maxWidth: '160px', 
                height: 'auto', 
                objectFit: 'contain' 
              }} 
            />
          </Box>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800, 
              color: '#1a1a1a', 
              mb: { xs: 4, md: 5 }, 
              textAlign: { xs: 'center', md: 'left' },
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem', lg: '3rem' } /* Cỡ chữ cân đối hơn trên đt */
            }}
          >
            {t('login.title')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Stack component="form" onSubmit={handleLogin} spacing={3}>
            <TextField
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              label={t('login.username')}
              variant="outlined"
              autoComplete="username"
              inputProps={{ autoCapitalize: 'none' }}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  backgroundColor: '#fff',
                  height: { xs: 54, md: 56 }, /* Cố định height tối ưu để không bị bóp */
                  '& input': { color: '#1a1a1a' },
                  '& fieldset': { borderColor: '#ccc' },
                },
                '& .MuiInputLabel-root': { color: '#666' },
              }}
            />
            
            <TextField
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label={t('login.password')}
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  backgroundColor: '#fff',
                  height: { xs: 54, md: 56 }, /* Cố định height tối ưu để không bị bóp */
                  '& input': { color: '#1a1a1a' },
                  '& input::-ms-reveal, & input::-webkit-credentials-auto-fill-button': { display: 'none' },
                  '& fieldset': { borderColor: '#ccc' },
                },
                '& .MuiInputLabel-root': { color: '#666' },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
              <Link 
                href="#" 
                underline="hover" 
                sx={{ 
                  color: '#1a1a1a', 
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                {t('login.forgotPassword')}
              </Link>
            </Box>

            <Button 
              type="submit" 
              variant="contained" 
              disableElevation
              disabled={loading}
              sx={{ 
                mt: 2, 
                height: 52, 
                fontSize: '1.1rem', 
                fontWeight: 600,
                borderRadius: 1.5,
                backgroundColor: '#3ba55c',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#2e8b4a'
                }
              }}
            >
              {loading ? <CircularProgress size={26} sx={{ color: '#fff' }} /> : t('login.button')}
            </Button>
          </Stack>
        </Box>
        </Box>
        {/* Huawei Keyboard Scroll Fix: Extra scrollable space to defeat adjustPan overlaps */}
        <Box sx={{ height: { xs: '55vh', lg: '10vh' }, flexShrink: 0 }} />
      </Box>
    </Box>
  );
}
