#!/usr/bin/env bash
# Сборка APK: веб-сборка → проект Capacitor 6 → release → подпись. Запускается из android.yml.
# Ключ подписи — секрет SKAT2_KEYSTORE (base64 keystore, alias androiddebugkey, пароль android).
# Без секрета APK подписывается временным ключом: обновление поверх не встанет, только переустановка.
set -euo pipefail
CAP=6.2.3
ROOT=$(pwd)
VERSION=$(node -p "require('./package.json').version")
# versionCode растёт с каждой версией: 2.0.0-alpha.3 → 2000003, beta.N → +40, rc.N → +70, релиз → +99.
CODE=$(node -e "
const [, ma, mi, pa, tag, n] = '$VERSION'.match(/^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/);
const pre = tag ? { alpha: 0, beta: 40, rc: 70 }[tag] + Number(n) : 99;
console.log(((+ma * 100 + +mi) * 100 + +pa) * 100 + pre);")
echo "СКАТ 2.0 $VERSION, versionCode $CODE"

npm ci --no-audit --no-fund
npm run build

W=$(mktemp -d)
cd "$W"
npm init -y >/dev/null
npm i --no-audit --no-fund --save-exact "@capacitor/core@$CAP" "@capacitor/cli@$CAP" "@capacitor/android@$CAP"
cp "$ROOT/platforms/android/capacitor.config.json" .
cp -r "$ROOT/dist" www
npx cap add android

RES=android/app/src/main/res
rm -rf "$RES/mipmap-anydpi-v26"
for d in "$RES"/mipmap-*; do
  for f in ic_launcher.png ic_launcher_round.png ic_launcher_foreground.png; do
    if [ -f "$d/$f" ]; then cp "$ROOT/public/icon-512.png" "$d/$f"; fi
  done
done
sed -i -E "s/versionCode [0-9]+/versionCode $CODE/; s/versionName \"[^\"]*\"/versionName \"$VERSION\"/" android/app/build.gradle
npx cap sync android

cd android
chmod +x gradlew
./gradlew assembleRelease --no-daemon -q

KS="$W/key.jks"
if [ -n "${SKAT2_KEYSTORE:-}" ]; then
  echo "$SKAT2_KEYSTORE" | base64 -d > "$KS"
  echo "Постоянный ключ подписи подключён"
else
  keytool -genkeypair -keystore "$KS" -storepass android -keypass android -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=SKAT2" >/dev/null
  echo "::warning::Секрет SKAT2_KEYSTORE не задан — APK подписан временным ключом"
fi
BT=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
mkdir -p "$ROOT/out"
"$BT/zipalign" -f 4 app/build/outputs/apk/release/app-release-unsigned.apk "$W/aligned.apk"
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey \
  --out "$ROOT/out/SKAT2-$VERSION.apk" "$W/aligned.apk"
echo "Готово: out/SKAT2-$VERSION.apk"
