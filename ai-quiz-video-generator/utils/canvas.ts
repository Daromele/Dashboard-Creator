
import { QuizQuestion, ColorTheme } from '../types';

interface DrawQuizSceneArgs {
  topic: string;
  questionData: QuizQuestion | null;
  questionIndex: number | null;
  totalQuestions: number;
  theme: ColorTheme;
  difficulty: string;
  quizType: string;
  backgroundMedia: HTMLImageElement | HTMLVideoElement | null;
  questionMedia: HTMLImageElement | HTMLVideoElement | null;
  aspectRatio: '9:16' | '16:9';
  backgroundMovement: string;
  watermark?: string;
}

interface AnimationState {
  time?: number;
  sceneElapsedTimeS?: number;
  countdownValue?: number;
}

export function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, baseFont: string, color: string, align: CanvasTextAlign = 'center') {
    context.textAlign = align;
    context.textBaseline = 'middle';
    context.fillStyle = color;

    const baseFontSizeMatch = baseFont.match(/(\d+)px/);
    let fontSize = baseFontSizeMatch ? parseInt(baseFontSizeMatch[1], 10) : 32;
    let font = baseFont;

    const getLines = (currentFont: string) => {
        context.font = currentFont;
        const words = text.split(' ');
        let line = '';
        const lines: string[] = [];
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line.trim());
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line.trim());
        return lines;
    };

    let lines = getLines(font);
    if (lines.length > 2) { // Allow up to 2 lines at full size
        const smallerFontSize = Math.max(20, Math.floor(fontSize * 0.85));
        font = baseFont.replace(`${fontSize}px`, `${smallerFontSize}px`);
        lines = getLines(font);
        lineHeight *= 0.9;
    }

    context.font = font;
    const lineCount = lines.length;
    const totalTextHeight = (lineCount - 1) * lineHeight;
    let currentY = y - totalTextHeight / 2;

    if (lineCount > 1) currentY -= lineHeight * 0.1;

    let lineX = x;
    if (align === 'left') lineX = x;
    else if (align === 'right') lineX = x;

    for (let i = 0; i < lines.length; i++) {
        context.fillText(lines[i], lineX, currentY);
        currentY += lineHeight;
    }
}

export function drawPillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, fontColor: string, pillColor: string, pillPadding: number) {
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const fontMatch = font.match(/\d+/);
    const textHeight = fontMatch ? parseInt(fontMatch[0], 10) * 0.8 : 20;
    const pillWidth = textWidth + pillPadding * 2;
    const pillHeight = textHeight + pillPadding;
    const pillX = x - pillWidth / 2;
    const pillY = y - pillHeight / 2;

    ctx.fillStyle = pillColor;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, [pillHeight / 2]);
    ctx.fill();

    ctx.fillStyle = fontColor;
    ctx.fillText(text, x, y);
}

function getProgressColor(progress: number): string {
    if (progress > 0.6) {
        const factor = (progress - 0.6) / 0.4;
        const r = Math.round(255 * (1 - factor));
        const g = Math.round(165 + (255 - 165) * factor);
        return `rgb(${r}, ${g}, 0)`;
    } else if (progress > 0.15) {
        const factor = (progress - 0.15) / 0.45;
        const g = Math.round(165 * factor);
        return `rgb(255, ${g}, 0)`;
    } else {
        return 'rgb(255, 0, 0)';
    }
}

const confettiParticles: any[] = [];
const NUM_CONFETTI = 50;
const confettiColors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];

function initializeConfetti(width: number, height: number) {
    confettiParticles.length = 0;
    for (let i = 0; i < NUM_CONFETTI; i++) {
        confettiParticles.push({
            x: Math.random() * width,
            y: Math.random() * height - height,
            size: Math.random() * 8 + 5,
            speed: Math.random() * 3 + 2,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            angle: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        });
    }
}

function drawConfetti(ctx: CanvasRenderingContext2D, width: number, height: number) {
    confettiParticles.forEach(p => {
        p.y += p.speed;
        p.angle += p.rotationSpeed;
        if (p.y > height + p.size) {
            p.y = -p.size;
            p.x = Math.random() * width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
    });
}

const backgroundParticles: any[] = [];
const NUM_PARTICLES = 150;
let lastThemeId: string | null = null;
let lastCanvasSize = { width: 0, height: 0 };


export function drawQuizScene(ctx: CanvasRenderingContext2D, { topic, questionData, questionIndex, totalQuestions, theme, difficulty, quizType, backgroundMedia, questionMedia, aspectRatio, watermark, backgroundMovement }: DrawQuizSceneArgs, phase = 'question', animationState: AnimationState = {}) {
  const { width, height } = ctx.canvas;
  const isPortrait = aspectRatio === '9:16';
  const scale = isPortrait ? width / 1080 : height / 1080; 

  const { time = performance.now(), sceneElapsedTimeS = 0 } = animationState;
  
  // Draw background
  if (backgroundMedia) {
    ctx.drawImage(backgroundMedia, 0, 0, width, height);
    // Add a dark overlay for text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
  } else {
    // New dynamic, wavy background with deep colors
    switch(backgroundMovement) {
        case 'particles': {
            if (lastThemeId !== theme.id || lastCanvasSize.width !== width || lastCanvasSize.height !== height) {
                backgroundParticles.length = 0;
                const colors = [theme.bgGradientMid, theme.bgGradientEnd, '#ffffff'];
                for (let i = 0; i < NUM_PARTICLES; i++) {
                    backgroundParticles.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        radius: Math.random() * 2 * scale + 1,
                        speedX: (Math.random() - 0.5) * 0.4,
                        speedY: (Math.random() - 0.5) * 0.4,
                        color: colors[Math.floor(Math.random() * colors.length)],
                    });
                }
                lastThemeId = theme.id;
                lastCanvasSize = { width, height };
            }
            ctx.fillStyle = theme.bgGradientStart;
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';
            backgroundParticles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x > width + p.radius) p.x = -p.radius;
                if (p.x < -p.radius) p.x = width + p.radius;
                if (p.y > height + p.radius) p.y = -p.radius;
                if (p.y < -p.radius) p.y = height + p.radius;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
                const particleGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
                particleGradient.addColorStop(0, `${p.color}ff`);
                particleGradient.addColorStop(1, `${p.color}00`);
                ctx.fillStyle = particleGradient;
                ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
            break;
        }
        case 'pulse': {
            const cx = width / 2;
            const cy = height / 2;
            const pulseFactor = 0.95 + Math.sin(time / 4000) * 0.05;
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * pulseFactor);
            gradient.addColorStop(0, theme.bgGradientMid);
            gradient.addColorStop(1, theme.bgGradientStart);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            break;
        }
        case 'none': {
            const staticGradient = ctx.createLinearGradient(0, 0, 0, height);
            staticGradient.addColorStop(0, theme.bgGradientStart);
            staticGradient.addColorStop(0.5, theme.bgGradientMid);
            staticGradient.addColorStop(1, theme.bgGradientEnd);
            ctx.fillStyle = staticGradient;
            ctx.fillRect(0, 0, width, height);
            break;
        }
        case 'wavy':
        default: {
            ctx.fillStyle = theme.bgGradientStart;
            ctx.fillRect(0, 0, width, height);
            const blobs = [
              { x: width * 0.5 + Math.sin(time / 4000) * (width * 0.3), y: height * 0.5 + Math.cos(time / 4500) * (height * 0.3), r: isPortrait ? width * 0.7 : height * 0.8, color: theme.bgGradientMid },
              { x: width * 0.5 + Math.cos(time / 3500) * (width * 0.4), y: height * 0.5 + Math.sin(time / 5000) * (height * 0.4), r: isPortrait ? width * 0.6 : height * 0.7, color: theme.bgGradientEnd },
              { x: width * 0.5 + Math.sin(time / 8000) * (width * 0.2), y: height * 0.5 + Math.cos(time / 7500) * (height * 0.2), r: isPortrait ? width * 0.8 : height * 0.9, color: theme.bgGradientStart }
            ];
            ctx.globalCompositeOperation = 'lighter';
            blobs.forEach(blob => {
              const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
              gradient.addColorStop(0, `${blob.color}ff`);
              gradient.addColorStop(0.5, `${blob.color}b0`);
              gradient.addColorStop(1, `${blob.color}00`);
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(blob.x, blob.y, blob.r, 0, 2 * Math.PI);
              ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
            break;
        }
    }

    // Add a subtle vignette to enhance the deep color feel
    const vignetteGradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.4, width / 2, height / 2, Math.max(width, height) * 0.8);
    vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Add a strong, centered shadow to all text for better visibility on any background
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (phase === 'cover') {
      const topicY = isPortrait ? height * 0.45 : height * 0.4;
      const typeY = isPortrait ? height * 0.62 : height * 0.55;
      const difficultyY = isPortrait ? height * 0.72 : height * 0.65;
      const countdownY = isPortrait ? height * 0.85 : height * 0.8;
      const topicMaxWidth = isPortrait ? width * 0.85 : width * 0.7;

      wrapText(ctx, topic, width / 2, topicY, topicMaxWidth, 100 * scale, `bold ${90 * scale}px Inter, sans-serif`, '#FFFFFF', 'center');
      const typeText = `${quizType}`;
      wrapText(ctx, typeText, width / 2, typeY, width * 0.8, 50 * scale, `italic ${45 * scale}px Inter, sans-serif`, '#EEEEEE', 'center');
      if (difficulty && difficulty !== "Default") {
          wrapText(ctx, `Difficulty: ${difficulty}`, width / 2, difficultyY, width * 0.9, 55 * scale, `bold ${45 * scale}px Inter, sans-serif`, '#FFD700', 'center');
      }
      const countdownTotal = 3;
      const countdownValue = countdownTotal - Math.floor(sceneElapsedTimeS);
      if (countdownValue > 0) {
          ctx.font = `bold ${160 * scale}px Inter, sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const animScale = 1 + (sceneElapsedTimeS - Math.floor(sceneElapsedTimeS)) * 0.5;
          ctx.save();
          ctx.translate(width / 2, countdownY);
          ctx.scale(animScale, animScale);
          ctx.fillText(String(countdownValue), 0, 0);
          ctx.restore();
      } else {
          wrapText(ctx, "Go!", width / 2, countdownY, width * 0.9, 160 * scale, `bold ${160 * scale}px Inter, sans-serif`, '#FFFFFF', 'center');
      }
  } else if (phase === 'final') {
      if (confettiParticles.length === 0) initializeConfetti(width, height);
      drawConfetti(ctx, width, height);
      ctx.font = `${80 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      const emojiYOffset = Math.sin(time / 500) * 10 * scale;
      ctx.fillText('🎉', width / 2 - 150 * scale, height * 0.2 + emojiYOffset);
      ctx.fillText('🥳', width / 2 + 150 * scale, height * 0.25 - emojiYOffset);
      ctx.fillText('🎊', width / 2, height * 0.75 + emojiYOffset);
      
      const titleY = isPortrait ? height * 0.4 : height * 0.35;
      const finalTitleText = quizType === 'This or That' ? "Have a better choice?" : "How many did you get right?";
      wrapText(ctx, finalTitleText, width / 2, titleY, width * 0.9, 90 * scale, `bold ${80 * scale}px Inter, sans-serif`, '#FFFFFF', 'center');
      
      let difficultyTextY;
      if (difficulty && difficulty !== "Default") {
          difficultyTextY = isPortrait ? height * 0.55 : height * 0.5;
          wrapText(ctx, `Difficulty: ${difficulty}`, width / 2, difficultyTextY, width * 0.9, 55 * scale, `bold ${45 * scale}px Inter, sans-serif`, '#FFD700', 'center');
      } else {
          difficultyTextY = isPortrait ? height * 0.5 : height * 0.45;
      }
      const lineY = difficultyTextY + 50 * scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2 * scale;
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.moveTo(width * 0.2, lineY);
      ctx.lineTo(width * 0.8, lineY);
      ctx.stroke();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      const finalCommentText = quizType === 'This or That' ? "Comment your best idea!" : "Comment your score!";
      wrapText(ctx, finalCommentText, width / 2, lineY + 70 * scale, width * 0.9, 55 * scale, `bold ${45 * scale}px Inter, sans-serif`, '#FFFFFF', 'center');
  } else if (questionData && questionIndex != null) {
      const { question, options, correctAnswerIndex } = questionData;
      const isThisOrThat = questionData.quizType === 'This or That';

      const questionNumberText = `Question ${questionIndex + 1} of ${totalQuestions}`;
      const pillFont = `bold ${32 * scale}px Inter, sans-serif`;
      const pillPadding = 20 * scale;

      // Draw Question Number Pill
      ctx.font = pillFont;
      const metrics = ctx.measureText(questionNumberText);
      const pillWidth = metrics.width + pillPadding * 2;
      const pillY = isPortrait ? height * 0.08 : height * 0.05;
      const pillX = isPortrait ? width / 2 : width - (40 * scale) - (pillWidth / 2);
      drawPillText(ctx, questionNumberText, pillX, pillY, pillFont, '#FFFFFF', 'rgba(0, 0, 0, 0.3)', pillPadding);

      let questionY, optionsStartY, questionAreaBottomY;
      let mediaBox: { x: number; y: number; width: number; height: number; } | null = null;
      
      if (questionMedia) {
          const maxMediaWidth = isPortrait ? width * 0.85 : width * 0.6;
          const maxMediaHeight = isPortrait ? height * 0.35 : height * 0.45;
          
          const mediaAspectRatio = questionMedia instanceof HTMLVideoElement 
            ? questionMedia.videoWidth / questionMedia.videoHeight 
            : questionMedia.naturalWidth / questionMedia.naturalHeight;

          let boxWidth = maxMediaWidth;
          let boxHeight = boxWidth / mediaAspectRatio;

          if (boxHeight > maxMediaHeight) {
              boxHeight = maxMediaHeight;
              boxWidth = boxHeight * mediaAspectRatio;
          }

          const mediaAreaCenterY = isPortrait ? height * 0.42 : height * 0.48;
          mediaBox = { 
            x: (width - boxWidth) / 2, 
            y: mediaAreaCenterY - boxHeight / 2, 
            width: boxWidth, 
            height: boxHeight 
          };

          questionY = mediaBox.y - (isPortrait ? 130 * scale : 100 * scale);
          questionAreaBottomY = mediaBox.y + mediaBox.height;
          optionsStartY = questionAreaBottomY + (isPortrait ? 140 * scale : 100 * scale);
          
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(mediaBox.x, mediaBox.y, mediaBox.width, mediaBox.height, [20 * scale]);
          ctx.clip();
          
          ctx.drawImage(questionMedia, mediaBox.x, mediaBox.y, mediaBox.width, mediaBox.height);
          
          ctx.restore();
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 3 * scale;
          ctx.beginPath();
          ctx.roundRect(mediaBox.x, mediaBox.y, mediaBox.width, mediaBox.height, [20 * scale]);
          ctx.stroke();

      } else {
          questionY = isPortrait ? height * 0.28 : height * 0.25;
          const questionApproxHeight = 120 * scale;
          questionAreaBottomY = questionY + questionApproxHeight / 2;
          optionsStartY = isPortrait ? height * 0.65 : height * 0.62;
      }
      
      if (questionData.quizType === 'Emoji') {
          const promptY = questionY - 40 * scale;
          wrapText(ctx, "Guess from the Emojis:", width / 2, promptY, width * 0.9, 45 * scale, `bold ${36 * scale}px Inter, sans-serif`, '#FFFFFF', 'center');
          wrapText(ctx, question, width / 2, questionY + 30 * scale, width * 0.85, 80 * scale, `bold ${72 * scale}px Inter, sans-serif`, '#FFFFFF', 'center');
      } else {
          wrapText(ctx, question, width / 2, questionY, isPortrait ? width * 0.85 : width * 0.9, 66 * scale, `bold ${60 * scale}px Inter, sans-serif`, '#FFFFFF', 'center');
      }

      if (phase === 'countdown' && animationState.countdownValue !== undefined) {
          const countdownBarY = questionAreaBottomY + (optionsStartY - questionAreaBottomY) / 2;

          if (isPortrait) {
              const guessNowY = countdownBarY - 40 * scale;
              wrapText(ctx, "Guess Now!", width / 2, guessNowY, width * 0.9, 45 * scale, `bold ${36 * scale}px Inter, sans-serif`, '#FFFFFF', 'center');
          }
          
          const { countdownValue } = animationState;
          const barWidth = isPortrait ? width * 0.85 : width * 0.6;
          const barHeight = 16 * scale;
          const barX = (width - barWidth) / 2;
          const barRadius = barHeight / 2;

          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
          
          // Draw background of the bar
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath(); ctx.roundRect(barX, countdownBarY, barWidth, barHeight, [barRadius]); ctx.fill();
          
          // Draw the colored progress part
          const progress = Math.max(0, countdownValue / 5);
          if (progress > 0) {
              ctx.fillStyle = getProgressColor(progress);
              ctx.beginPath(); ctx.roundRect(barX, countdownBarY, barWidth * progress, barHeight, [barRadius]); ctx.fill();
          }

          // Add a dark outline around the whole bar for contrast
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.roundRect(barX, countdownBarY, barWidth, barHeight, [barRadius]);
          ctx.stroke();

          // Restore text shadow for subsequent draws
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 8 * scale;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
      }
      
      const isBigOption = (questionData.quizType === "True/False" || isThisOrThat);

      if (isPortrait) {
        const optionBoxHeight = isBigOption ? 100 * scale : 80 * scale;
        const optionBoxWidth = width * 0.85;
        const optionMargin = 20 * scale;
        const totalOptionsHeight = (options.length * optionBoxHeight) + ((options.length - 1) * optionMargin);
        const startY = questionMedia ? optionsStartY : Math.max(optionsStartY, height * 0.5 - totalOptionsHeight / 2 + height*0.1);

        options.forEach((option, index) => {
            const boxY = startY + index * (optionBoxHeight + optionMargin);
            let boxColor = 'rgba(0, 0, 0, 0.4)';
            let textColor = '#FFFFFF';
            let shadowColor = 'transparent';
            let shadowBlur = 0;
            let shadowOffsetY = 0;

            if ((phase === 'reveal' || phase === 'answer_voiceover') && !isThisOrThat) {
                if (index === correctAnswerIndex) {
                    boxColor = '#28a745';
                    const pulseAlpha = 0.5 + Math.sin(time / 300) * 0.5;
                    shadowColor = `rgba(255, 255, 255, ${pulseAlpha * 0.7})`;
                    shadowBlur = (10 + pulseAlpha * 10) * scale;
                    shadowOffsetY = 0;
                } else {
                    boxColor = 'rgba(0, 0, 0, 0.2)';
                    textColor = '#AAAAAA';
                }
            }

            ctx.fillStyle = boxColor;
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlur;
            ctx.shadowOffsetY = shadowOffsetY;
            ctx.beginPath();
            ctx.roundRect((width - optionBoxWidth) / 2, boxY, optionBoxWidth, optionBoxHeight, [optionBoxHeight / 2]);
            ctx.fill();

            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 8 * scale;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            const optionFontSize = isBigOption ? `bold ${48 * scale}px Inter, sans-serif` : `bold ${40 * scale}px Inter, sans-serif`;
            const optionLineHeight = isBigOption ? 50 * scale : 42 * scale;
            const optionPrefix = isThisOrThat ? "" : `${String.fromCharCode(65 + index)}: `;
            wrapText(ctx, `${optionPrefix}${option}`, width / 2, boxY + optionBoxHeight / 2, optionBoxWidth * 0.9, optionLineHeight, optionFontSize, textColor, 'center');
        });
      } else { // Landscape Layout
        const optionBoxHeight = isBigOption ? 110 * scale : 90 * scale;
        const optionMargin = 25 * scale;
        const numCols = options.length > 2 ? 2 : options.length;
        const optionBoxWidth = numCols === 2 ? width * 0.42 : width * 0.7;
        const gridWidth = (optionBoxWidth * numCols) + (optionMargin * (numCols - 1));
        const startX = (width - gridWidth) / 2;
        
        options.forEach((option, index) => {
            const col = index % numCols;
            const row = Math.floor(index / numCols);
            const boxX = startX + col * (optionBoxWidth + optionMargin);
            const boxY = optionsStartY + row * (optionBoxHeight + optionMargin);

            let boxColor = 'rgba(0, 0, 0, 0.4)';
            let textColor = '#FFFFFF';
            let shadowColor = 'transparent';
            let shadowBlur = 0;
            let shadowOffsetY = 0;

            if ((phase === 'reveal' || phase === 'answer_voiceover') && !isThisOrThat) {
                if (index === correctAnswerIndex) {
                    boxColor = '#28a745';
                    const pulseAlpha = 0.5 + Math.sin(time / 300) * 0.5;
                    shadowColor = `rgba(255, 255, 255, ${pulseAlpha * 0.7})`;
                    shadowBlur = (10 + pulseAlpha * 10) * scale;
                } else {
                    boxColor = 'rgba(0, 0, 0, 0.2)';
                    textColor = '#AAAAAA';
                }
            }

            ctx.fillStyle = boxColor;
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlur;
            ctx.shadowOffsetY = shadowOffsetY;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, optionBoxWidth, optionBoxHeight, [optionBoxHeight / 2]);
            ctx.fill();

            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 8 * scale;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            const optionFontSize = isBigOption ? `bold ${48 * scale}px Inter, sans-serif` : `bold ${40 * scale}px Inter, sans-serif`;
            const optionLineHeight = isBigOption ? 50 * scale : 42 * scale;
            const optionPrefix = isThisOrThat ? "" : `${String.fromCharCode(65 + index)}: `;
            wrapText(ctx, `${optionPrefix}${option}`, boxX + optionBoxWidth / 2, boxY + optionBoxHeight / 2, optionBoxWidth * 0.9, optionLineHeight, optionFontSize, textColor, 'center');
        });
      }
  }

  if (watermark && watermark.trim()) {
      const watermarkText = watermark.startsWith('@') ? watermark : `@${watermark}`;
      const padding = 25 * scale;
      const watermarkFont = `bold ${28 * scale}px Inter, sans-serif`;
      ctx.save();
      ctx.font = watermarkFont;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillText(watermarkText, width - padding, height - padding);
      ctx.restore();
  }
  
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
}
