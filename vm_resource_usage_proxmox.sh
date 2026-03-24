#!/bin/bash

# Output CSV file
output_file="vm_resources.csv"

# Get host machine's total resources
echo "Collecting host machine's resources..."
total_cpu=$(nproc)  # Total CPU cores
total_ram=$(free -g | awk '/^Mem:/{print $2}')  # Total RAM in GB
total_storage=$(df -BG --total | awk '/^total/{print $2}' | sed 's/G//')  # Total storage in GB

# Write header for CSV file
echo "Machine,CPU Cores,RAM (GB),Storage (GB),Status" > "$output_file"

# Write host machine's resources to CSV
echo "Writing host resources to CSV..."
echo "Host,$total_cpu,$total_ram,$total_storage,Running" >> "$output_file"

# Get list of all VMs
echo "Retrieving VM list..."
vms=$(qm list | awk 'NR>1 {print $2}')  # Get VM IDs
total_vms=$(echo "$vms" | wc -l)

# Loop through each VM to get assigned resources and status
count=0
for vmid in $vms; do
    if [ -n "$vmid" ]; then
        # Update progress bar
        count=$((count + 1))
        echo -ne "Processing VM $count/$total_vms: ID $vmid\r"
        
        # Get VM status
        vm_status=$(qm status "$vmid")  # Running or Stopped
        
        # Get CPU cores assigned to VM
        vm_cpu=$(qm config "$vmid" | awk '/cores/{print $2}')  # Get number of cores
        
        # Get RAM assigned to VM (output in MB, so convert to GB)
        vm_ram_mb=$(qm config "$vmid" | awk '/memory/{print $2}')
        vm_ram_gb=$((vm_ram_mb / 1024))  # Convert MB to GB
        
        # Get VM storage information
        storage_info=$(qm config "$vmid" | grep '^virtio0:' | awk '{print $2}')  # Assuming the primary disk is virtio0
        if [[ $storage_info == *","* ]]; then
            # Get storage size in GB
            vm_storage_gb=$(echo "$storage_info" | awk -F',' '{print $1}' | sed 's/.*\([0-9]*\).*/\1/')
        else
            vm_storage_gb=0  # No disk found for this VM
        fi
        
        # Write VM resources to CSV with the status
        echo "$vmid,$vm_cpu,$vm_ram_gb,$vm_storage_gb,$vm_status" >> "$output_file"
    fi
done

# Clear the progress bar line
echo -ne "\nAll VMs processed.\n"

# Notify user that CSV file creation is complete
echo "Resource information has been written to $output_file"

# Display the content of the CSV file
echo "Displaying contents of $output_file:"
cat "$output_file"
