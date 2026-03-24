#!/bin/bash

printf "%-30s %10s %15s\n" "VM_NAME" "vCPUs" "RAM(GB)"
printf "%-30s %10s %15s\n" "------------------------------" "------" "-------"

total_cpu=0
total_ram=0

while read -r vm; do
  [[ -z "$vm" ]] && continue

  cpu=$(virsh dominfo "$vm" | awk '/CPU\(s\)/ {print $2}')
  ram_kib=$(virsh dominfo "$vm" | awk '/Max memory/ {print $3}')
  ram_gb=$(awk "BEGIN {printf \"%.2f\", $ram_kib/1024/1024}")

  printf "%-30s %10s %15s\n" "$vm" "$cpu" "$ram_gb"

  total_cpu=$((total_cpu + cpu))
  total_ram=$(awk "BEGIN {print $total_ram + $ram_gb}")
done < <(virsh list --name)

printf "%-30s %10s %15s\n" "------------------------------" "------" "-------"
printf "%-30s %10s %15.2f\n" "TOTAL" "$total_cpu" "$total_ram"
