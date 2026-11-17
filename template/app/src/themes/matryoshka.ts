/* 主题：套娃。深靛底、朱红主色、金黄亮色、奶油色窗口；圆角、同心描边、一层套一层。
   每期换一个主题文件：复制这份改名，改颜色、字体、圆角、底纹，再在 episode.json 里记下用的是哪个。 */
export const THEME = {
  name: 'matryoshka',
  C: {
    acc: '#D8402F',      // 主色：朱红
    hi: '#F5B83D',       // 亮色：金黄
    paper: '#F6ECD9',    // 浅底 / 窗口内容
    paper2: '#E9DBC1',
    ink: '#191830',      // 深色文字和描边
    dark: '#12112A',     // 深底
    red: '#E8362C', white: '#FFFFFF', yellow: '#F5B83D', grey: '#8D8679', blue: '#1F8A70',
  },
  glow: 'rgba(216,64,47,.28)',          // 深底中间的那团光
  titleFont: 'smiley' as const,         // 大标题用哪种字体（base.ts 的 F 里的键）
  radius: 30,                           // 窗口圆角
  border: 6,                            // 窗口描边
  shadow: '0 36px 90px rgba(0,0,0,.5)', // 窗口投影（这个主题用柔和的投影）
  motif: 'rings' as 'rings' | 'dots' | 'grid' | 'none',   // 底纹
  trans: ['zoom', 'whip', 'up', 'blur'] as const,          // 这一集偏好的转场
};
