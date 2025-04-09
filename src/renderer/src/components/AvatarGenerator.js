// 基于仓库ID生成独特的SVG头像
export function generateAvatar(repoId) {
  // 使用仓库ID生成随机但确定的特征
  const seed = repoId;
  const features = generateFeatures(seed);

  // 生成SVG
  return `
    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- 头部背景 -->
      <circle cx="60" cy="60" r="50" fill="${features.faceColor}" />
      
      <!-- 左眉毛 -->
      <path d="${features.leftEyebrow}" stroke="#1a237e" stroke-width="2" fill="none" />
      
      <!-- 右眉毛 -->
      <path d="${features.rightEyebrow}" stroke="#1a237e" stroke-width="2" fill="none" />
      
      <!-- 左眼 -->
      <path d="${features.leftEye}" fill="#1a237e" />
      
      <!-- 右眼 -->
      <path d="${features.rightEye}" fill="#1a237e" />
      
      <!-- 鼻子 -->
      <path d="${features.nose}" stroke="#1a237e" stroke-width="2" fill="none" />
      
      <!-- 嘴巴 -->
      <path d="${features.mouth}" stroke="#1a237e" stroke-width="2" fill="none" />
    </svg>
  `;
}

// 根据种子生成特征
function generateFeatures(seed) {
  const random = (min, max) => {
    const x = Math.sin(seed * 9999) * 10000;
    const result = min + (x - Math.floor(x)) * (max - min);
    seed = result;
    return result;
  };

  // 生成脸部颜色
  const faceColor = `hsl(${random(180, 240)}, 70%, 90%)`;

  // 生成眉毛路径
  const generateEyebrow = (isLeft) => {
    const x = isLeft ? 35 : 65;
    const curve = random(-5, 5);
    return `M${x},40 Q${x + 10},${40 + curve} ${x + 20},40`;
  };

  // 生成眼睛路径
  const generateEye = (isLeft) => {
    const x = isLeft ? 35 : 65;
    const style = Math.floor(random(0, 3));
    switch(style) {
      case 0: // 圆形
        return `M${x},55 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0`;
      case 1: // 杏形
        return `M${x},53 Q${x + 5},58 ${x + 10},53 Q${x + 5},48 ${x},53`;
      case 2: // 细长
        return `M${x},54 Q${x + 5},56 ${x + 10},54 Q${x + 5},52 ${x},54`;
    }
  };

  // 生成鼻子路径
  const noseStyle = Math.floor(random(0, 3));
  const nose = (() => {
    switch(noseStyle) {
      case 0: // L形
        return 'M60,60 L60,70 L65,70';
      case 1: // 点状
        return 'M58,65 Q60,67 62,65';
      case 2: // 弧形
        return 'M55,65 Q60,70 65,65';
    }
  })();

  // 生成嘴巴路径
  const mouthStyle = Math.floor(random(0, 3));
  const mouth = (() => {
    switch(mouthStyle) {
      case 0: // 微笑
        return 'M45,80 Q60,90 75,80';
      case 1: // 平直
        return 'M45,80 L75,80';
      case 2: // 惊讶
        return 'M45,80 Q60,75 75,80';
    }
  })();

  return {
    faceColor,
    leftEyebrow: generateEyebrow(true),
    rightEyebrow: generateEyebrow(false),
    leftEye: generateEye(true),
    rightEye: generateEye(false),
    nose,
    mouth
  };
}