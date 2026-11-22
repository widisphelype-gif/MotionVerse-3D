# MotionVerse — Body Outline

Aplicativo desktop para Windows 10/11 que usa a webcam para reconhecer a pose corporal e desenhar um contorno aproximado em tempo real.

## Executar
```bash
npm install
npm run desktop:dev
```

## Gerar EXE
```bash
npm install
npm run package:win
```
Os arquivos serão gerados em `release/`. A primeira inicialização precisa de internet para baixar os modelos MediaPipe. O vídeo é processado localmente e não é enviado para servidores.

## GitHub Actions
Abra **Actions → Build MotionVerse for Windows → Run workflow**. Ao concluir, baixe o artefato **MotionVerse-Body-Outline-Windows**.
