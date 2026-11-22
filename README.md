# MotionVerse 3D

Repositório do aplicativo MotionVerse 3D para Windows 10/11.

## Gerar os executáveis

1. Baixe o arquivo **MotionVerse-3D-v0.3.zip** disponibilizado na conversa.
2. Abra este repositório no GitHub e toque em **Add file → Upload files**.
3. Envie o ZIP para a raiz do repositório, mantendo exatamente o nome `MotionVerse-3D-v0.3.zip`.
4. Faça commit na branch `main`.
5. Abra **Actions → Build MotionVerse for Windows → Run workflow**.
6. Quando terminar, abra a execução e baixe o artefato **MotionVerse-3D-Windows**.

O artefato conterá os executáveis Windows produzidos pelo electron-builder (instalador e versão portátil).

A primeira execução do app precisa de internet para carregar os modelos MediaPipe e as fontes externas. O processamento da webcam é local.
