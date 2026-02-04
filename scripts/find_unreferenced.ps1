# Find files that are not referenced by filename anywhere else in the repo
$root = Get-Location
$all = Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch '\\.git\\' -and $_.FullName -notmatch '\\node_modules\\' }

$unreferenced = New-Object System.Collections.Generic.List[string]

Write-Output "Scanning $($all.Count) files for references (this may take a moment)..."

foreach ($f in $all) {
  $name = $f.Name
  $others = $all | Where-Object { $_.FullName -ne $f.FullName } | Select-Object -ExpandProperty FullName
  if ($others.Count -eq 0) { continue }
  try {
    $found = Select-String -Path $others -Pattern ([regex]::Escape($name)) -SimpleMatch -Quiet
  } catch {
    $found = $false
  }
  if (-not $found) {
    $unreferenced.Add($f.FullName)
  }
}

Write-Output "\nUnreferenced files (${unreferenced.Count}):"
$unreferenced | ForEach-Object { Write-Output "- $_" }

# Save to file for review
$out = Join-Path $root 'scripts' 'unreferenced_files.txt'
$unreferenced | Out-File -FilePath $out -Encoding utf8
Write-Output "\nSaved list to $out"
