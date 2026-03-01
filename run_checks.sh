#!/bin/bash
for file in src/components/*.tsx; do
  echo "Checking $file"
  # Look for 'new ' inside useFrame, but skip useMemo or useRef (which are usually fine if outside the callback, but just to be safe)
  grep -n "new " "$file" | grep -v "useRef" | grep -v "useMemo" | grep -v "useState" | grep -v "useEffect" | grep -v "const mat ="
done
