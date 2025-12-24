export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 600;
export const MIN_VIEWER_WIDTH = 300;
export const MAX_VIEWER_WIDTH = 550;
export const MIN_CHAT_WIDTH = 600;

export const inputFieldSpecs = {
  position: 'fixed',
  bottom: '32px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '82.8%',
  maxWidth: '800px',
  zIndex: 150,
  containerStyle: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    background: 'var(--color-surface)',
    borderRadius: '50px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--color-border)',
    padding: '6px',
  },
  inputStyle: {
    flexGrow: 1,
    fontSize: '16px',
    fontWeight: '400',
    padding: '8px 12px',
    color: '#374151',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontFamily: 'var(--font-primary)',
    resize: 'none',
    overflowY: 'auto',
    minHeight: '40px',
    lineHeight: '20px',
  },
  buttonStyle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: '#000000',
    color: 'white',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    marginRight: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  mobileAdjustments: {
    width: '90%',
    bottom: '50px',
    padding: '12px 16px',
  }
};
