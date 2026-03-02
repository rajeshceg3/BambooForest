#!/bin/bash
for file in src/components/*.tsx; do
  echo "Checking $file"
  # Look for 'new ' inside useFrame or outside useMemo/useRef.
  # We already did a pretty exhaustive search. Let's look for any 'new THREE' not in a useMemo or useRef.
  grep -n "new THREE" "$file" | grep -v "useRef" | grep -v "useMemo" | grep -v "const mat ="
done
