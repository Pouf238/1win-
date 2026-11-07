#!/bin/bash
# Surveillance extérieure du site pendant la rotation : GET seulement, 2 chemins (un sans session, un avec cookie), horodatage + code HTTP.
OUT=$1; N=$2; : > "$OUT"; JAR=$(mktemp)
for i in $(seq 1 $N); do
  t=$(date +%s.%N | cut -c1-14)
  a=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://symoprint.com/robots.txt?p=$i")
  if [ $((i % 4)) -eq 0 ]; then b=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -b $JAR -c $JAR "https://symoprint.com/catalogue"); else b="-"; fi
  echo "$t $a $b" >> "$OUT"; sleep 0.4
done
