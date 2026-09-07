#!/usr/bin/env bash
# App Store Connect'ten indirilen tek kullanımlık teklif kodlarını
# promoAdmin üzerinden kupon havuzuna yükler.
#
#   ./scripts/promo-upload-codes.sh [kampanyaId] [klasör]
#   ADMIN_KEY (veya KEY) export edilmiş olmalı.
#
# Varsayılan klasör: oneTimeOfferCodes/  (git'e girmiyor, .gitignore'da)
#
# CSV'lerde BAŞLIK SATIRI YOKTUR: ilk satır da bir koddur, atlanmaz.
# 1. sütun kod, 2. sütun Apple'ın kullanma linki.
set -euo pipefail

CAMPAIGN="${1:-hosgeldin55}"
DIR="${2:-oneTimeOfferCodes}"
BASE="https://europe-west1-pt-app-native.cloudfunctions.net/promoAdmin"

# ADMIN_KEY yoksa KEY'e de bak. Sık düşülen tuzak: değişken shell'de tanımlı
# ama export edilmemişse alt süreç olan bu betik onu göremez.
SECRET="${ADMIN_KEY:-${KEY:-}}"
if [ -z "$SECRET" ]; then
    echo "ADMIN_KEY (veya KEY) tanımlı ve export edilmiş olmalı." >&2
    echo "  export ADMIN_KEY=\"...\"   ya da   ADMIN_KEY=\"\$ADMIN_KEY\" $0 $*" >&2
    exit 1
fi

shopt -s nullglob
files=("$DIR"/*.csv)
if [ ${#files[@]} -eq 0 ]; then
    echo "$DIR içinde .csv bulunamadı." >&2
    exit 1
fi

for f in "${files[@]}"; do
    # Eşleme dosya adının birebir yazımına güvenmiyor: ASC indirmelerinde
    # "sutdio", "studiu", "anually" gibi yazım hataları çıkabiliyor.
    # Paket eleme yoluyla, dönem "month" var mı diye bakılarak bulunuyor.
    name="$(basename "$f" | tr '[:upper:]' '[:lower:]')"

    case "$name" in
    *core*) TIER="core" ;;
    *pro*) TIER="pro" ;;
    *) TIER="studio" ;;
    esac

    case "$name" in
    *month*) PERIOD="monthly" ;;
    *) PERIOD="annually" ;;
    esac

    PID="athletrack_${TIER}_${PERIOD}"

    CODES="$(cut -d, -f1 "$f" | tr -d '\r' | tr '\n' ' ')"
    COUNT="$(printf '%s' "$CODES" | wc -w | tr -d ' ')"

    RESULT="$(curl -s -X POST "$BASE" \
        -H "X-Admin-Key: $SECRET" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg c "$CODES" --arg p "$PID" --arg g "$CAMPAIGN" \
            '{action:"uploadCodes",campaignId:$g,productId:$p,codes:$c}')")"

    echo "$(basename "$f") → $PID | dosyada $COUNT kod | sunucu: $RESULT"
done
