import './style.css';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const $ = id => document.getElementById(id);
const video = $('cam');
const canvas = $('draw');
const ctx = canvas.getContext('2d');

let stream = null;
let tracker = null;
let active = false;
let raf = 0;
let lastTime = -1;
let lastTick = 0;

const links = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[27,31],[24,26],[26,28],[28,30],[30,32],[28,32]];
const outline = [11,13,15,17,19,15,21,15,13,11,12,14,16,18,20,16,22,16,14,12,24,26,28,30,32,28,26,24,23,25,27,29,31,27,25,23,11];

function status(on, message = 'CÂMERA DESLIGADA') {
  $('topStatus').textContent = on ? 'CÂMERA ATIVA' : message;
  $('cameraStatus').textContent = on ? 'CÂMERA ATIVA' : message;
  $('liveDot').classList.toggle('on', on);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const visible = point => point && Number.isFinite(point.x) && Number.isFinite(point.y) && (point.visibility ?? 1) > 0.35;

function drawPose(points) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  if (!points) {
    $('body').textContent = 'Não detectado';
    $('bodyDot').classList.remove('on');
    $('points').textContent = '0 pontos';
    return;
  }

  const xy = index => ({ x: (1 - points[index].x) * width, y: points[index].y * height });
  const count = points.filter(visible).length;
  $('points').textContent = count + ' pontos';

  const detected = [11, 12, 23, 24].every(index => visible(points[index]));
  $('body').textContent = detected ? 'Corpo detectado' : 'Ajuste sua posição';
  $('bodyDot').classList.toggle('on', detected);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(126,255,204,.62)';
  ctx.lineWidth = 2.2;

  for (const [a, b] of links) {
    if (!visible(points[a]) || !visible(points[b])) continue;
    const p = xy(a), q = xy(b);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }

  ctx.beginPath();
  let started = false;
  for (const index of outline) {
    if (!visible(points[index])) { started = false; continue; }
    const point = xy(index);
    if (!started) { ctx.moveTo(point.x, point.y); started = true; }
    else ctx.lineTo(point.x, point.y);
  }
  ctx.strokeStyle = '#c7ff68';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#baff58';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (let index = 0; index < points.length; index++) {
    if (!visible(points[index])) continue;
    const point = xy(index);
    ctx.beginPath();
    ctx.arc(point.x, point.y, index === 0 ? 4 : 2.8, 0, Math.PI * 2);
    ctx.fillStyle = '#c7ff68';
    ctx.shadowColor = '#c7ff68';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

async function makeTracker() {
  const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');
  const model = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: model, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1
    });
  } catch (error) {
    console.warn('GPU indisponível; tentando CPU.', error);
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: model, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numPoses: 1
    });
  }
}

function waitForVideo() {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('A webcam não enviou vídeo. Feche outros aplicativos que possam estar usando a câmera e tente novamente.'));
    }, 15000);

    const onReady = () => {
      if (video.videoWidth > 0) {
        cleanup();
        resolve();
      }
    };
    const onError = () => {
      cleanup();
      reject(new Error('O Windows não conseguiu carregar o vídeo da webcam.'));
    };
    function cleanup() {
      clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('error', onError);
    }

    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('error', onError);
    onReady();
  });
}

async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('O acesso à webcam não está disponível. Abra o aplicativo MotionVerse no Windows e verifique as permissões de câmera.');
  }

  const constraints = [
    { audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } } },
    { audio: false, video: true }
  ];

  let lastError;
  for (const constraint of constraints) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraint);
    } catch (error) {
      lastError = error;
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') break;
    }
  }
  throw lastError || new Error('Não foi possível acessar a webcam.');
}

async function start() {
  $('start').disabled = true;
  $('error').textContent = '';
  $('cameraStatus').textContent = 'SOLICITANDO PERMISSÃO…';

  try {
    stream = await openCamera();
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;
    await waitForVideo();
    await video.play();

    $('placeholder').classList.add('hide');
    resize();
    status(true);
    $('stop').disabled = false;
    $('fps').textContent = 'CÂMERA · AO VIVO';
    $('cameraStatus').textContent = 'CÂMERA CONECTADA';

    // A imagem da webcam permanece ativa mesmo se o modelo de rastreamento falhar.
    $('cameraStatus').textContent = 'CARREGANDO RASTREAMENTO…';
    try {
      tracker = await makeTracker();
      active = true;
      lastTime = -1;
      lastTick = 0;
      $('fps').textContent = 'POSE TRACKING · LIVE';
      loop();
    } catch (trackingError) {
      console.error('A câmera abriu, mas o rastreamento não carregou:', trackingError);
      $('cameraStatus').textContent = 'CÂMERA ATIVA · SEM RASTREAMENTO';
      $('error').textContent = 'A câmera está funcionando, mas não foi possível carregar o modelo corporal. Confira a internet e tente novamente.';
      $('fps').textContent = 'CÂMERA · AO VIVO';
    }
  } catch (error) {
    console.error('Falha ao abrir a webcam:', error);
    stop();
    $('error').textContent = error?.message || 'Não foi possível abrir a câmera. Verifique a permissão de câmera do Windows.';
    $('cameraStatus').textContent = 'FALHA NA CÂMERA';
  } finally {
    $('start').disabled = !!stream;
  }
}

function loop() {
  if (!active || !tracker) return;
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastTime) {
    lastTime = video.currentTime;
    try {
      const result = tracker.detectForVideo(video, performance.now());
      drawPose(result.landmarks?.[0] || null);
      const now = performance.now();
      if (lastTick) $('fps').textContent = 'POSE TRACKING · ' + Math.min(60, Math.round(1000 / (now - lastTick))) + ' FPS';
      lastTick = now;
    } catch (error) {
      console.error('Erro no rastreamento corporal:', error);
      $('error').textContent = 'A câmera continua ligada, mas ocorreu um erro no rastreamento.';
    }
  }
  raf = requestAnimationFrame(loop);
}

function stop() {
  active = false;
  cancelAnimationFrame(raf);
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.pause();
  video.srcObject = null;
  if (tracker) { tracker.close(); tracker = null; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  $('placeholder').classList.remove('hide');
  $('start').disabled = false;
  $('stop').disabled = true;
  $('body').textContent = 'Aguardando';
  $('bodyDot').classList.remove('on');
  $('points').textContent = '0 pontos';
  $('fps').textContent = 'POSE TRACKING · OFF';
  status(false);
}

$('start').addEventListener('click', start);
$('stop').addEventListener('click', stop);
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', stop);
status(false);
