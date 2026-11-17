/* 主题：剪报拼贴。米色纸底、荧光绿、硬边黑影。直角、粗描边、不带模糊的投影。 */
export const THEME = {
  name: 'clipping',
  C: {
    acc: '#76B900', hi: '#B6F22E', paper: '#EFEADD', paper2: '#E4DECE', ink: '#121210', dark: '#0B0C0A',
    red: '#E8362C', white: '#FFFFFF', yellow: '#FFD23F', grey: '#8A867A', blue: '#2B6FFF',
  },
  glow: 'rgba(118,185,0,.22)',
  titleFont: 'hei' as const,
  radius: 0,
  border: 8,
  shadow: '14px 14px 0 rgba(0,0,0,.9)',
  motif: 'dots' as 'rings' | 'dots' | 'grid' | 'none',
  trans: ['whip', 'whipL', 'drop', 'flash'] as const,
};
