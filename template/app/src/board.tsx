/* 分镜表：这一集从头到尾每个镜头是什么。一行一个镜头：S(开始时刻, 画面, 转场)。
   时间只用 T('句子键') 和 K('句子键', '关键词')，不写写定的秒数，这样改稿、重配音之后画面自动跟着走。
   七成的镜头用 blocks.tsx 里的积木块拼；这一集独有的主视觉写在 scenes/ 里再引进来。下面是一个能直接打包的最小例子。 */
import React from 'react';
import {C, H, W} from './base';
import {Pop} from './kit';
import {Bg, BigLines, Chapter, CommentBox, EndCard, S, Say, Stats, Steps, Triple} from './blocks';
import {E, END, K, T} from './time';

export const shots = [
  S(0, <><Bg />
    <BigLines lines={[{at: T('a01'), text: '第一句：钩子', hi: '钩子'}, {at: T('a02'), text: '第二句接着砸', size: 90, col: C.hi}]} /></>),
  S(T('b01'), <><Bg v="paper" /><Chapter at={T('b01')} num="01" title="它能干什么" sub="WHAT IT DOES" />
    <Steps dark={false} items={[{at: K('b01', '第一步'), label: '装上', icon: '📦'}, {at: K('b01', '第二步'), label: '说一句话', icon: '💬'}, {at: K('b01', '第三步'), label: '拿结果', icon: '🎁', stop: true}]} /></>, 'zoom'),
  S(T('b02'), <><Bg /><Say at={T('b02')} text="数字不许只是数字" hi="数字" /><Stats items={[{at: K('b02', '三十'), to: 30, label: '装好', post: ' 秒'}, {at: K('b02', '五'), to: 5, label: '个例子'}]} /></>, 'whip'),
  S(T('c01'), <><Bg /><Triple at={T('c01')} press={[K('c01', '点赞'), K('c01', '收藏'), K('c01', '关注')]} /></>, 'up'),
  S(T('c02'), <><Bg /><CommentBox at={T('c02')} send={E('c02') - 0.2} phrase="我也想要" /></>, 'blur'),
  S(END, <><Bg /><EndCard at={END} title="片名写这里" sub="点个关注，下期见" foot={['旁白：作者本人声音的 AI 克隆 · 配乐：ACE-Step 生成', '画面由代码渲染']} /></>, 'zoom'),
];
